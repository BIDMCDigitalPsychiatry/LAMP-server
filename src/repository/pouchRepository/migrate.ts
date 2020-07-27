import { Database, SQL, Encrypt, Decrypt } from '../../app';
import {
  SensorEvent,
  SensorName,
  LocationContext,
  SocialContext,
} from '../../model/SensorEvent';
import { ActivityEvent, TemporalSlice } from '../../model/ActivityEvent';
import { ActivityRepository } from '../../repository/ActivityRepository';
import { customAlphabet } from 'nanoid';
import { MaybeDocument } from 'nano';
const uuid = customAlphabet('1234567890abcdefghjkmnpqrstvwxyz', 20); // crockford-32

// TODO: Switch to _local/ documents!

// IMPORTANT!
// This isn't synchronized/atomic yet.
// Maybe this needs to be a job queue instead.
let _migrator_active = false;

///
///
///

declare global {
  interface NumberConstructor {
    parse(input: string | number | undefined | null): number | undefined;
  }
}

// Object.defineProperty(Number, "parse", {
//   value: function (input: string | number | undefined | null): number | undefined {
//     if (input === null || input === undefined) return undefined
//     if (typeof input === "number") return input
//     return isNaN(Number(input)) ? undefined : Number(input)
//   },
// })

///
///
///

export async function _migrate_sensor_event() {
  if (_migrator_active) {
    return console.info(
      'sensor_event migration aborted due to existing migrator activity',
    );
  }
  _migrator_active = true;
  try {
    const MigratorLink = Database.use('root');

    const change_tracking = (await MigratorLink.get('#change_tracking')) as any;
    const change_version: number = change_tracking.db.sensor_event;
    if (change_version === undefined) {
      return console.info(
        'sensor_event migration aborted due to missing change_version token',
      );
    }
    const next_version =
      Number.parse(
        (await SQL!.query`SELECT CHANGE_TRACKING_CURRENT_VERSION()`)
          .recordset[0][''],
      ) ?? 0;
    change_tracking.db.sensor_event = next_version;
    if (next_version - change_version === 0) {
      return console.info(
        'sensor_event migration aborted due to no tracked changes',
      );
    }
    console.dir(
      `sensor_event migration from ${change_version ?? 0} to ${
        next_version ?? 0
      }`,
    );

    const result1 = (
      await SQL!.request().query(`
        SELECT 
            timestamp, 
            type, 
            data, 
            X.StudyId AS [#parent]
        FROM (
            SELECT
                Users.AdminID, 
                Users.StudyId, 
                Users.IsDeleted,
                DATEDIFF_BIG(MS, '1970-01-01', U.CreatedOn) AS timestamp, 
                U.type,
                U.data
            FROM HealthKit_DailyValues
            UNPIVOT (data FOR type IN (
                Height, Weight, HeartRate, BloodPressure, 
                RespiratoryRate, Sleep, Steps, FlightClimbed, 
                Segment, Distance
            )) U
            LEFT JOIN Users
                ON U.UserID = Users.UserID
            WHERE U.data != ''
                AND HKDailyValueID IN (
                    SELECT C.HKDailyValueID
                    FROM CHANGETABLE(CHANGES HealthKit_DailyValues, ${
                      change_version ?? 'NULL'
                    }) AS C 
                    WHERE SYS_CHANGE_CONTEXT IS NULL
                )
            UNION ALL 
            SELECT
                Users.AdminID, 
                Users.StudyId, 
                Users.IsDeleted,
                DATEDIFF_BIG(MS, '1970-01-01', DateTime) AS timestamp,
                REPLACE(HKParamName, ' ', '') AS type,
                Value AS data
            FROM HealthKit_ParamValues
            LEFT JOIN Users
                ON HealthKit_ParamValues.UserID = Users.UserID
            LEFT JOIN HealthKit_Parameters
                ON HealthKit_Parameters.HKParamID = HealthKit_ParamValues.HKParamID
            WHERE HKParamValueID IN (
                SELECT C.HKParamValueID
                FROM CHANGETABLE(CHANGES HealthKit_ParamValues, ${
                  change_version ?? 'NULL'
                }) AS C 
                WHERE SYS_CHANGE_CONTEXT IS NULL
            )
        ) X
	;`)
    ).recordset.map((raw: any) => {
      const obj = new SensorEvent();
      (obj as any)['#parent'] = Decrypt(raw['#parent'])?.replace(/^G/, '');
      obj.timestamp = Number.parse(raw.timestamp) ?? 0;
      obj.sensor = Object.entries(HK_LAMP_map).filter(
        (x) => x[1] === (raw.type as string),
      )[0][0] as SensorName;
      obj.data = ((HK_to_LAMP as any)[obj.sensor!] || ((x: any) => x))(
        raw.data,
      );
      return obj;
    });

    console.dir('[HealthKit_Values] migrating ' + result1.length + ' events');
    for (let i = 0; i < Math.ceil(result1.length / 30_000); i++) {
      const out = await Database.use('sensor_event').bulk({
        docs: result1.slice(i * 30_000, (i + 1) * 30_000),
      });
      console.dir(out.filter((x) => !!x.error));
    }

    const result2 = (
      await SQL!.request().query(`
	SELECT 
        DATEDIFF_BIG(MS, '1970-01-01', Locations.CreatedOn) AS timestamp,
        Latitude AS lat,
        Longitude AS long,
        LocationName AS location_name,
        Users.StudyId AS [#parent]
    FROM Locations
    LEFT JOIN Users
        ON Locations.UserID = Users.UserID
    WHERE LocationID IN (
        SELECT C.LocationID
        FROM CHANGETABLE(CHANGES Locations, ${change_version ?? 'NULL'}) AS C 
        WHERE SYS_CHANGE_CONTEXT IS NULL
    )
    ;`)
    ).recordset.map((raw: any) => {
      const x = toLAMP(raw.location_name);
      const obj = new SensorEvent();
      (obj as any)['#parent'] = Decrypt(raw['#parent'])?.replace(/^G/, '');
      obj.timestamp = Number.parse(raw.timestamp) ?? 0;
      obj.sensor = SensorName.ContextualLocation;
      obj.data = {
        latitude: parseFloat(Decrypt(raw.lat) || raw.lat),
        longitude: parseFloat(Decrypt(raw.long) || raw.long),
        accuracy: -1,
        context: {
          environment: x[0] || null,
          social: x[1] || null,
        },
      };
      return obj;
    });

    console.dir('[Locations] migrating ' + result2.length + ' events');
    for (let i = 0; i < Math.ceil(result2.length / 30_000); i++) {
      const out = await Database.use('sensor_event').bulk({
        docs: result2.slice(i * 30_000, (i + 1) * 30_000),
      });
      console.dir(out.filter((x) => !!x.error));
    }

    // UserDevices: [DeviceType, DeviceID<decrypt>, DeviceToken, LastLoginOn, OSVersion, DeviceModel]
    /*
    ALTER TRIGGER TR_UserDevicesLogin
        ON LAMP.dbo.UserDevices
        AFTER INSERT, UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        INSERT INTO LAMP_Aux.dbo.CustomSensorEvent
        SELECT 
          UserID AS UserID, 
          DATEDIFF_BIG(MS, '1970-01-01', LastLoginOn) AS timestamp,
          'lamp.analytics' AS sensor_name,
          (SELECT 
            CASE DeviceType 
              WHEN 1 THEN 'iOS'
              WHEN 2 THEN 'Android'
            END AS device_type
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS data
        FROM INSERTED;
    END;
    */

    await MigratorLink.insert(change_tracking);
    console.dir('sensor_event migration completed');
  } catch (e) {
    console.error(e);
  } finally {
    _migrator_active = false;
  }
}

export async function _migrate_activity_event(): Promise<void> {
  if (_migrator_active) {
    return console.info(
      'activity_event migration aborted due to existing migrator activity',
    );
  }
  _migrator_active = true;
  try {
    const MigratorLink = Database.use('root');

    //
    const change_tracking = (await MigratorLink.get('#change_tracking')) as any;
    const change_version: number = change_tracking.db.activity_event;
    if (change_version === undefined) {
      return console.info(
        'activity_event migration aborted due to missing change_version token',
      );
    }
    const next_version =
      Number.parse(
        (await SQL!.query`SELECT CHANGE_TRACKING_CURRENT_VERSION()`)
          .recordset[0][''],
      ) ?? 0;
    change_tracking.db.activity_event = next_version;
    if (next_version - change_version === 0) {
      return console.info(
        'activity_event migration aborted due to no tracked changes',
      );
    }
    console.dir(
      `activity_event migration from ${change_version ?? 0} to ${
        next_version ?? 0
      }`,
    );

    //
    const _lookup_table = await _migrator_lookup_table();
    const _lookup_migrator_id = (legacyID: string): string => {
      let match = _lookup_table[legacyID];
      if (match === undefined) {
        match = uuid(); // 20-char id for non-Participant objects
        _lookup_table[legacyID] = match;
        console.log(`inserting migrator link: ${legacyID} => ${match}`);
        MigratorLink.insert({
          _id: `_local/${legacyID}`,
          value: match,
        } as MaybeDocument);
      }
      return match;
    };

    // Collect the set of legacy Activity tables and stitch the full query. // FIXME: slice!!!
    const result = ActivityIndex.map(async (entry: any) => {
      // Perform the result lookup for every Activity table.
      // prettier-ignore
      const events = (
        await SQL!.request().query(`
				SELECT
          Users.StudyId AS uid,
          [${entry.IndexColumnName}] AS id,
          DATEDIFF_BIG(MS, '1970-01-01', [${entry.StartTimeColumnName}]) AS timestamp,
          DATEDIFF_BIG(MS, [${entry.StartTimeColumnName}], [${entry.EndTimeColumnName}]) AS duration,
          ${!entry.Slot1Name ? "" : `[${entry.Slot1ColumnName}] AS [static_data.${entry.Slot1Name}],`}
          ${!entry.Slot2Name ? "" : `[${entry.Slot2ColumnName}] AS [static_data.${entry.Slot2Name}],`}
          ${!entry.Slot3Name ? "" : `[${entry.Slot3ColumnName}] AS [static_data.${entry.Slot3Name}],`}
          ${!entry.Slot4Name ? "" : `[${entry.Slot4ColumnName}] AS [static_data.${entry.Slot4Name}],`}
          ${!entry.Slot5Name ? "" : `[${entry.Slot5ColumnName}] AS [static_data.${entry.Slot5Name}],`}
          ${!!entry.TemporalTableName ? `(
              SELECT
                  ${
                    !!entry.Temporal1ColumnName
                      ? `[${entry.TemporalTableName}].[${entry.Temporal1ColumnName}]`
                      : "(NULL)"
                  } AS item,
                  ${
                    !!entry.Temporal2ColumnName
                      ? `[${entry.TemporalTableName}].[${entry.Temporal2ColumnName}]`
                      : "(NULL)"
                  } AS value,
                  ${
                    !!entry.Temporal3ColumnName
                      ? `[${entry.TemporalTableName}].[${entry.Temporal3ColumnName}]`
                      : "(NULL)"
                  } AS type,
                  ${
                    !!entry.Temporal4ColumnName
                      ? `CAST(CAST([${entry.TemporalTableName}].[${entry.Temporal4ColumnName}] AS float) * 1000 AS bigint)`
                      : "(NULL)"
                  } AS duration,
                  ${
                    !!entry.Temporal5ColumnName
                      ? `[${entry.TemporalTableName}].[${entry.Temporal5ColumnName}]`
                      : "(NULL)"
                  } AS level
              FROM [${entry.TemporalTableName}]
              WHERE [${entry.TableName}].[${entry.IndexColumnName}] = [${entry.TemporalTableName}].[${entry.IndexColumnName}]
              FOR JSON PATH, INCLUDE_NULL_VALUES
          ) AS [slices],` : "(NULL) AS [slices],"}
          ${entry.LegacyCTestID !== null ? `(
            SELECT AdminCTestSettingID 
              FROM Admin_CTestSettings
              WHERE Admin_CTestSettings.AdminID = Users.AdminID
                AND Admin_CTestSettings.CTestID = ${entry.LegacyCTestID}
            ) AS aid` : `SurveyID AS aid`}
        FROM [${entry.TableName}]
        LEFT JOIN Users
            ON [${entry.TableName}].UserID = Users.UserID
        WHERE [${entry.IndexColumnName}] IN (
          SELECT C.[${entry.IndexColumnName}]
          FROM CHANGETABLE(CHANGES [${entry.TableName}], ${change_version ?? "NULL"}) AS C 
          WHERE SYS_CHANGE_CONTEXT IS NULL
        )
			;`)
      ).recordset

      console.dir(`[${entry.TableName}] migrating ${events.length} events`);
      if (events.length === 0) return [];

      // Map from SQL DB to the local ActivityEvent type.
      const res = events.map((row: any) => {
        const activity_event = new ActivityEvent();
        activity_event.timestamp = Number.parse(row.timestamp) ?? 0;
        activity_event.duration = Number.parse(row.duration) ?? 0;
        (activity_event as any)['#parent'] = Decrypt(row.uid);

        // Map internal ID sub-components into the single mangled ID form.
        const _activity_original_id = ActivityRepository._pack_id({
          ctest_id: entry.LegacyCTestID !== null ? row.aid : 0,
          survey_id: entry.LegacyCTestID === null ? row.aid : 0,
          group_id: 0,
        });
        activity_event.activity = _lookup_migrator_id(_activity_original_id);

        // Copy static data fields if declared.
        activity_event.static_data = {};
        if (!!entry.Slot1ColumnName)
          activity_event.static_data[entry.Slot1Name] =
            row[`static_data.${entry.Slot1Name}`];
        if (!!entry.Slot2ColumnName)
          activity_event.static_data[entry.Slot2Name] =
            row[`static_data.${entry.Slot2Name}`];
        if (!!entry.Slot3ColumnName)
          activity_event.static_data[entry.Slot3Name] =
            row[`static_data.${entry.Slot3Name}`];
        if (!!entry.Slot4ColumnName)
          activity_event.static_data[entry.Slot4Name] =
            row[`static_data.${entry.Slot4Name}`];
        if (!!entry.Slot5ColumnName)
          activity_event.static_data[entry.Slot5Name] =
            row[`static_data.${entry.Slot5Name}`];

        // Decrypt all static data properties if known to be encrypted.
        // TODO: Encryption of fields should also be found in the activity index table!
        //if (!!activity_event.static_data.survey_name)
        //  activity_event.static_data.survey_name = "___DEPRECATED_USE_ACTIVITY_ID_INSTEAD___"
        //activity_event.static_data.survey_id = undefined
        if (!!activity_event.static_data.drawn_fig_file_name) {
          const fname =
            'file://./_assets/3dfigure/' +
            (Decrypt(activity_event.static_data.drawn_fig_file_name) ||
              activity_event.static_data.drawn_fig_file_name);
          activity_event.static_data.drawn_figure = fname; //(await Download(fname)).toString('base64')
          activity_event.static_data.drawn_fig_file_name = undefined;
        }
        if (!!activity_event.static_data.scratch_file_name) {
          const fname =
            'file://./_assets/scratch/' +
            (Decrypt(activity_event.static_data.scratch_file_name) ||
              activity_event.static_data.scratch_file_name);
          activity_event.static_data.scratch_figure = fname; //(await Download(fname)).toString('base64')
          activity_event.static_data.scratch_file_name = undefined;
        }
        if (!!activity_event.static_data.game_name)
          activity_event.static_data.game_name =
            Decrypt(activity_event.static_data.game_name) ||
            activity_event.static_data.game_name;
        if (!!activity_event.static_data.collected_stars)
          activity_event.static_data.collected_stars =
            Decrypt(activity_event.static_data.collected_stars) ||
            activity_event.static_data.collected_stars;
        if (!!activity_event.static_data.total_jewels_collected)
          activity_event.static_data.total_jewels_collected =
            Decrypt(activity_event.static_data.total_jewels_collected) ||
            activity_event.static_data.total_jewels_collected;
        if (!!activity_event.static_data.total_bonus_collected)
          activity_event.static_data.total_bonus_collected =
            Decrypt(activity_event.static_data.total_bonus_collected) ||
            activity_event.static_data.total_bonus_collected;
        if (!!activity_event.static_data.score)
          activity_event.static_data.score =
            Decrypt(activity_event.static_data.score) ||
            activity_event.static_data.score;

        // Copy all temporal events for this result event by matching parent ID.
        activity_event.temporal_slices = JSON.parse(row.slices ?? '[]').map(
          (slice_row: any) => {
            const temporal_slice = new TemporalSlice();
            temporal_slice.item = slice_row.item;
            temporal_slice.value = slice_row.value;
            temporal_slice.type = slice_row.type;
            temporal_slice.duration = Number.parse(slice_row.duration) ?? 0;
            temporal_slice.level = slice_row.level;

            // Special treatment for surveys with encrypted answers.
            if (entry.LegacyCTestID === null) {
              // survey
              temporal_slice.item =
                Decrypt(temporal_slice.item) || temporal_slice.item;
              temporal_slice.value =
                Decrypt(temporal_slice.value) || temporal_slice.value;
              temporal_slice.type = !temporal_slice.type
                ? undefined
                : (temporal_slice.type as string).toLowerCase();

              // Adjust the Likert scaled values to numbers.
              if (
                ['Not at all', '12:00AM - 06:00AM', '0-3'].indexOf(
                  temporal_slice.value,
                ) >= 0
              ) {
                temporal_slice.value = 0;
              } else if (
                ['Several Times', '06:00AM - 12:00PM', '3-6'].indexOf(
                  temporal_slice.value,
                ) >= 0
              ) {
                temporal_slice.value = 1;
              } else if (
                ['More than Half the Time', '12:00PM - 06:00PM', '6-9'].indexOf(
                  temporal_slice.value,
                ) >= 0
              ) {
                temporal_slice.value = 2;
              } else if (
                ['Nearly All the Time', '06:00PM - 12:00AM', '>9'].indexOf(
                  temporal_slice.value,
                ) >= 0
              ) {
                temporal_slice.value = 3;
              }
            }
            return temporal_slice;
          },
        );

        // Finally return the newly created event.
        return activity_event;
      });
      return res;
    });

    const all_res = ([] as ActivityEvent[]).concat(
      ...(await Promise.all(result)),
    );
    for (let i = 0; i < Math.ceil(all_res.length / 30_000); i++) {
      const out = await Database.use('activity_event').bulk({
        docs: all_res.slice(i * 30_000, (i + 1) * 30_000),
      });
      console.dir(out.filter((x) => !!x.error));
    }

    await MigratorLink.insert(change_tracking);
    console.dir('activity_event migration completed');
  } catch (e) {
    console.error(e);
  } finally {
    _migrator_active = false;
  }
}

// old ID (table PK) -> new ID (random UUID)
export const _migrator_lookup_table = async (): Promise<{
  [key: string]: string;
}> => {
  return (await _migrator_dual_table())[0];
};

// new ID (random UUID) -> old ID (table PK)
export const _migrator_export_table = async (): Promise<{
  [key: string]: string;
}> => {
  return (await _migrator_dual_table())[1];
};

// BOTH of the above; more performant as well
export const _migrator_dual_table = async (): Promise<
  [{ [key: string]: string }, { [key: string]: string }]
> => {
  const _res = await Database.use('root').baseView(
    '',
    '',
    { viewPath: '_local_docs' },
    { include_docs: true },
  );
  console.log(_res.rows);
  const output: { [key: string]: string }[] = [{}, {}];
  for (const x of _res.rows) {
    output[0][x.id.replace('_local/', '')] = x.doc.value;
    output[1][x.doc.value] = x.id.replace('_local/', '');
  }
  return output as any;
};

/**
 *
 */
const toLAMP = (value?: string): [LocationContext?, SocialContext?] => {
  if (!value) return [];
  const matches =
    (Decrypt(value) || value)
      .toLowerCase()
      .match(/(?:i am )([ \S\/]+)(alone|in [ \S\/]*|with [ \S\/]*)/) || [];
  return [
    ({
      home: LocationContext.Home,
      'at home': LocationContext.Home,
      'in school/class': LocationContext.School,
      'at work': LocationContext.Work,
      'in clinic/hospital': LocationContext.Hospital,
      outside: LocationContext.Outside,
      'shopping/dining': LocationContext.Shopping,
      'in bus/train/car': LocationContext.Transit,
    } as any)[(matches[1] || ' ').slice(0, -1)],
    ({
      alone: SocialContext.Alone,
      'with friends': SocialContext.Friends,
      'with family': SocialContext.Family,
      'with peers': SocialContext.Peers,
      'in crowd': SocialContext.Crowd,
    } as any)[matches[2] || ''],
  ];
};

/**
 *
 */
const fromLAMP = (
  value: [LocationContext?, SocialContext?],
): string | undefined => {
  if (!value[0] && !value[1]) return undefined;
  return Encrypt(
    'i am' +
      ({
        home: ' at home',
        school: ' in school/class',
        work: ' at work',
        hospital: ' in clinic/hospital',
        outside: ' outside',
        shopping: ' shopping/dining',
        transit: ' in bus/train/car',
      } as any)[value[0] || ''] +
      ({
        alone: 'alone',
        friends: 'with friends',
        family: 'with family',
        peers: 'with peers',
        crowd: 'in crowd',
      } as any)[value[1] || ''],
  );
};

const _decrypt = function (str: string) {
  const v = Decrypt(str);
  return !v || v === '' || v === 'NA' ? null : v.toLowerCase();
};
const _convert = function (
  x: string | null,
  strip_suffix = '',
  convert_number = false,
) {
  return !x
    ? null
    : convert_number
    ? parseFloat(x.replace(strip_suffix, ''))
    : x.replace(strip_suffix, '');
};
const _clean = function (x: any) {
  return x === 0 ? null : x;
};

/**
 *
 */
const HK_to_LAMP = {
  'lamp.height': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' cm', true),
    units: 'cm',
  }),
  'lamp.weight': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' kg', true),
    units: 'kg',
  }),
  'lamp.heart_rate': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' bpm', true),
    units: 'bpm',
  }),
  'lamp.blood_pressure': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' mmhg', false),
    units: 'mmHg',
  }),
  'lamp.respiratory_rate': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' breaths/min', true),
    units: 'bpm',
  }),
  'lamp.sleep': (raw: string): any => ({ value: _decrypt(raw), units: '' }),
  'lamp.steps': (raw: string): any => ({
    value: _clean(_convert(_decrypt(raw), ' steps', true)),
    units: 'steps',
  }),
  'lamp.flights': (raw: string): any => ({
    value: _clean(_convert(_decrypt(raw), ' steps', true)),
    units: 'flights',
  }),
  'lamp.segment': (raw: string): any => ({
    value: _convert(_decrypt(raw), '', true),
    units: '',
  }),
  'lamp.distance': (raw: string): any => ({
    value: _convert(_decrypt(raw), ' meters', true),
    units: 'meters',
  }),
};

/**
 *
 */
const LAMP_to_HK = {
  // TODO: Consider 0/NA values
  'lamp.height': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} cm`,
  'lamp.weight': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} kg`,
  'lamp.heart_rate': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} bpm`,
  'lamp.blood_pressure': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} mmhg`,
  'lamp.respiratory_rate': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} breaths/min`,
  'lamp.sleep': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)}`,
  'lamp.steps': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} steps`,
  'lamp.flights': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} steps`,
  'lamp.segment': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)}`,
  'lamp.distance': (obj: { value: any; units: string }): string =>
    `${Encrypt(obj.value)} meters`,
};

/**
 *
 */
const HK_LAMP_map = {
  'lamp.height': 'Height',
  'lamp.weight': 'Weight',
  'lamp.heart_rate': 'HeartRate',
  'lamp.blood_pressure': 'BloodPressure',
  'lamp.respiratory_rate': 'RespiratoryRate',
  'lamp.sleep': 'Sleep',
  'lamp.steps': 'Steps',
  'lamp.flights': 'FlightClimbed',
  'lamp.segment': 'Segment',
  'lamp.distance': 'Distance',
  Height: 'lamp.height',
  Weight: 'lamp.weight',
  HeartRate: 'lamp.heart_rate',
  BloodPressure: 'lamp.blood_pressure',
  RespiratoryRate: 'lamp.respiratory_rate',
  Sleep: 'lamp.sleep',
  Steps: 'lamp.steps',
  FlightClimbed: 'lamp.flights',
  Segment: 'lamp.segment',
  Distance: 'lamp.distance',
};

const _escapeMSSQL = (val: string) =>
  val.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s: string) => {
    switch (s) {
      case '\0':
        return '\\0';
      case '\n':
        return '\\n';
      case '\r':
        return '\\r';
      case '\b':
        return '\\b';
      case '\t':
        return '\\t';
      case '\x1a':
        return '\\Z';
      case "'":
        return "''";
      case '"':
        return '""';
      default:
        return '\\' + s;
    }
  });

export const ActivityIndex: any[] = [
  {
    ActivityIndexID: '1',
    Name: 'lamp.survey',
    TableName: 'SurveyResult',
    IndexColumnName: 'SurveyResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: null,
    Slot1ColumnName: null,
    Slot2Name: null,
    Slot2ColumnName: null,
    Slot3Name: null,
    Slot3ColumnName: null,
    Slot4Name: null,
    Slot4ColumnName: null,
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: 'SurveyResultDtl',
    TemporalIndexColumnName: 'SurveyResultDtlID',
    Temporal1ColumnName: 'Question',
    Temporal2ColumnName: 'CorrectAnswer',
    Temporal3ColumnName: 'ClickRange',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: null,
  },
  {
    ActivityIndexID: '2',
    Name: 'lamp.nback',
    TableName: 'CTest_NBackResult',
    IndexColumnName: 'NBackResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'score',
    Slot1ColumnName: 'Score',
    Slot2Name: 'correct_answers',
    Slot2ColumnName: 'CorrectAnswers',
    Slot3Name: 'wrong_answers',
    Slot3ColumnName: 'WrongAnswers',
    Slot4Name: 'total_questions',
    Slot4ColumnName: 'TotalQuestions',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 1,
  },
  {
    ActivityIndexID: '3',
    Name: 'lamp.trails_b',
    TableName: 'CTest_TrailsBResult',
    IndexColumnName: 'TrailsBResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'rating',
    Slot2ColumnName: 'Rating',
    Slot3Name: 'score',
    Slot3ColumnName: 'Score',
    Slot4Name: 'total_attempts',
    Slot4ColumnName: 'TotalAttempts',
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: 'CTest_TrailsBResultDtl',
    TemporalIndexColumnName: 'TrailsBResultDtlID',
    Temporal1ColumnName: 'Alphabet',
    Temporal2ColumnName: null,
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Sequence',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 2,
  },
  {
    ActivityIndexID: '4',
    Name: 'lamp.spatial_span',
    TableName: 'CTest_SpatialResult',
    IndexColumnName: 'SpatialResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: 'type',
    Slot5ColumnName: 'Type',
    TemporalTableName: 'CTest_SpatialResultDtl',
    TemporalIndexColumnName: 'SpatialResultDtlID',
    Temporal1ColumnName: 'GameIndex',
    Temporal2ColumnName: 'Sequence',
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Level',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 3,
  },
  {
    ActivityIndexID: '5',
    Name: 'lamp.simple_memory',
    TableName: 'CTest_SimpleMemoryResult',
    IndexColumnName: 'SimpleMemoryResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'score',
    Slot1ColumnName: 'Score',
    Slot2Name: 'correct_answers',
    Slot2ColumnName: 'CorrectAnswers',
    Slot3Name: 'wrong_answers',
    Slot3ColumnName: 'WrongAnswers',
    Slot4Name: 'total_questions',
    Slot4ColumnName: 'TotalQuestions',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 5,
  },
  {
    ActivityIndexID: '6',
    Name: 'lamp.serial7s',
    TableName: 'CTest_Serial7Result',
    IndexColumnName: 'Serial7ResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'total_attempts',
    Slot3ColumnName: 'TotalAttempts',
    Slot4Name: 'total_questions',
    Slot4ColumnName: 'TotalQuestions',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 6,
  },
  {
    ActivityIndexID: '7',
    Name: 'lamp.cats_and_dogs',
    TableName: 'CTest_CatAndDogResult',
    IndexColumnName: 'CatAndDogResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'rating',
    Slot2ColumnName: 'Rating',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: 'total_questions',
    Slot5ColumnName: 'TotalQuestions',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 7,
  },
  {
    ActivityIndexID: '8',
    Name: 'lamp.3d_figure_copy',
    TableName: 'CTest_3DFigureResult',
    IndexColumnName: '3DFigureResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'drawn_fig_file_name',
    Slot2ColumnName: 'DrawnFigFileName',
    Slot3Name: 'game_name',
    Slot3ColumnName: 'GameName',
    Slot4Name: null,
    Slot4ColumnName: null,
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 8,
  },
  {
    ActivityIndexID: '9',
    Name: 'lamp.visual_association',
    TableName: 'CTest_VisualAssociationResult',
    IndexColumnName: 'VisualAssocResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'total_attempts',
    Slot3ColumnName: 'TotalAttempts',
    Slot4Name: 'total_questions',
    Slot4ColumnName: 'TotalQuestions',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 9,
  },
  {
    ActivityIndexID: '10',
    Name: 'lamp.digit_span',
    TableName: 'CTest_DigitSpanResult',
    IndexColumnName: 'DigitSpanResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: 'type',
    Slot5ColumnName: 'Type',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 10,
  },
  {
    ActivityIndexID: '11',
    Name: 'lamp.cats_and_dogs_new',
    TableName: 'CTest_CatAndDogNewResult',
    IndexColumnName: 'CatAndDogNewResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 11,
  },
  {
    ActivityIndexID: '12',
    Name: 'lamp.temporal_order',
    TableName: 'CTest_TemporalOrderResult',
    IndexColumnName: 'TemporalOrderResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 12,
  },
  {
    ActivityIndexID: '13',
    Name: 'lamp.nback_new',
    TableName: 'CTest_NBackNewResult',
    IndexColumnName: 'NBackNewResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'correct_answers',
    Slot3ColumnName: 'CorrectAnswers',
    Slot4Name: 'wrong_answers',
    Slot4ColumnName: 'WrongAnswers',
    Slot5Name: 'total_questions',
    Slot5ColumnName: 'TotalQuestions',
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 14,
  },
  {
    ActivityIndexID: '14',
    Name: 'lamp.trails_b_new',
    TableName: 'CTest_TrailsBNewResult',
    IndexColumnName: 'TrailsBNewResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'rating',
    Slot2ColumnName: 'Rating',
    Slot3Name: 'score',
    Slot3ColumnName: 'Score',
    Slot4Name: 'total_attempts',
    Slot4ColumnName: 'TotalAttempts',
    Slot5Name: 'version',
    Slot5ColumnName: 'Version',
    TemporalTableName: 'CTest_TrailsBNewResultDtl',
    TemporalIndexColumnName: 'TrailsBNewResultDtlID',
    Temporal1ColumnName: 'Alphabet',
    Temporal2ColumnName: null,
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Sequence',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 15,
  },
  {
    ActivityIndexID: '15',
    Name: 'lamp.trails_b_dot_touch',
    TableName: 'CTest_TrailsBDotTouchResult',
    IndexColumnName: 'TrailsBDotTouchResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'rating',
    Slot2ColumnName: 'Rating',
    Slot3Name: 'score',
    Slot3ColumnName: 'Score',
    Slot4Name: 'total_attempts',
    Slot4ColumnName: 'TotalAttempts',
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: 'CTest_TrailsBDotTouchResultDtl',
    TemporalIndexColumnName: 'TrailsBDotTouchResultDtlID',
    Temporal1ColumnName: 'Alphabet',
    Temporal2ColumnName: null,
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Sequence',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 16,
  },
  {
    ActivityIndexID: '16',
    Name: 'lamp.jewels_a',
    TableName: 'CTest_JewelsTrailsAResult',
    IndexColumnName: 'JewelsTrailsAResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'total_attempts',
    Slot3ColumnName: 'TotalAttempts',
    Slot4Name: 'total_bonus_collected',
    Slot4ColumnName: 'TotalBonusCollected',
    Slot5Name: 'total_jewels_collected',
    Slot5ColumnName: 'TotalJewelsCollected',
    TemporalTableName: 'CTest_JewelsTrailsAResultDtl',
    TemporalIndexColumnName: 'JewelsTrailsAResultDtlID',
    Temporal1ColumnName: 'Alphabet',
    Temporal2ColumnName: null,
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Sequence',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 17,
  },
  {
    ActivityIndexID: '17',
    Name: 'lamp.jewels_b',
    TableName: 'CTest_JewelsTrailsBResult',
    IndexColumnName: 'JewelsTrailsBResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'score',
    Slot2ColumnName: 'Score',
    Slot3Name: 'total_attempts',
    Slot3ColumnName: 'TotalAttempts',
    Slot4Name: 'total_bonus_collected',
    Slot4ColumnName: 'TotalBonusCollected',
    Slot5Name: 'total_jewels_collected',
    Slot5ColumnName: 'TotalJewelsCollected',
    TemporalTableName: 'CTest_JewelsTrailsBResultDtl',
    TemporalIndexColumnName: 'JewelsTrailsBResultDtlID',
    Temporal1ColumnName: 'Alphabet',
    Temporal2ColumnName: null,
    Temporal3ColumnName: 'Status',
    Temporal4ColumnName: 'TimeTaken',
    Temporal5ColumnName: 'Sequence',
    SettingsSlots: '',
    SettingsDefaults: null,
    LegacyCTestID: 18,
  },
  {
    ActivityIndexID: '18',
    Name: 'lamp.scratch_image',
    TableName: 'CTest_ScratchImageResult',
    IndexColumnName: 'ScratchImageResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'EndTime',
    Slot1Name: 'point',
    Slot1ColumnName: 'Point',
    Slot2Name: 'scratch_file_name',
    Slot2ColumnName: 'DrawnFigFileName',
    Slot3Name: 'game_name',
    Slot3ColumnName: 'GameName',
    Slot4Name: null,
    Slot4ColumnName: null,
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: null,
    SettingsDefaults: null,
    LegacyCTestID: 19,
  },
  {
    ActivityIndexID: '19',
    Name: 'lamp.spin_wheel',
    TableName: 'CTest_SpinWheelResult',
    IndexColumnName: 'SpinWheelResultID',
    StartTimeColumnName: 'StartTime',
    EndTimeColumnName: 'GameDate',
    Slot1Name: 'collected_stars',
    Slot1ColumnName: 'CollectedStars',
    Slot2Name: 'day_streak',
    Slot2ColumnName: 'DayStreak',
    Slot3Name: 'streak_spin',
    Slot3ColumnName: 'StrakSpin',
    Slot4Name: null,
    Slot4ColumnName: null,
    Slot5Name: null,
    Slot5ColumnName: null,
    TemporalTableName: null,
    TemporalIndexColumnName: null,
    Temporal1ColumnName: null,
    Temporal2ColumnName: null,
    Temporal3ColumnName: null,
    Temporal4ColumnName: null,
    Temporal5ColumnName: null,
    SettingsSlots: null,
    SettingsDefaults: null,
    LegacyCTestID: 20,
  },
];
