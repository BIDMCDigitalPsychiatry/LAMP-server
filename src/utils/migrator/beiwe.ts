const unzip = require('unzip-stream') 
import { URLSearchParams } from 'url'
import fetch from 'node-fetch'
import csv from 'csv-parser'
import stream from 'stream'
const _omap = (obj: object, fn: (x: any) => any) => Object.assign({}, ...Object.entries(obj).map(([k, v]) => ({ [k]: fn(v) })))
const _date = (str: number) => { let d = new Date(str); d.setMinutes(0, 0, 0); return d.toJSON().split('.')[0] }
const _clean = (obj: object) => JSON.parse(JSON.stringify(obj))

import { SensorEventRepository, TypeRepository } from '../../repository'
import { Query } from '../../service'

// Download Beiwe objects for a given Participant, given the parameters listed.
export async function BeiweAPI(

	// The URL for the active Beiwe API.
	beiwe_url: string,

	// The data access key in the Beiwe API.
	access_key: string,

	// The data secret key in the Beiwe API.
	secret_key: string,

	// The Study ID of the Study in the Beiwe API.
	study_id: string,

	// The array of User IDs of Participants in the Beiwe API.
	user_ids: string[],

	// The array of data streams (see BeiweIdentifier) in the Beiwe API.
	data_streams: Array<
		'identifiers' | 
		'accelerometer' |
		'gyro' |
		'magnetometer' |
		'devicemotion' | 
		'reachability' | 
		'bluetooth' | 
		'calls' | 
		'gps' | 
		'proximity' |
		'power_state' | 
		'texts' | 
		'wifi' | 
		'audio_recordings' | 
		'survey_answers' | 
		'survey_timings' | 
		'image_survey' | 
		'app_log' | 
		'ios_log'
	>,

	// 
	time_start: number | null, // YYYY-MM-DDThh:mm:ss

	// 
	time_end: number | null, // YYYY-MM-DDThh:mm:ss

	// The callback that receives processed events.
	stream_submit: (arg: any) => Promise<void>
): Promise<void> {

	// Call the stream submission fn ONLY if timestamp is within range and after parsing.
	const _maybe_submit = async (event: any, fn: (arg: object) => Promise<void>) => {
		if ((!!time_start && (<any>event).timestamp < time_start) || 
			(!!time_end && (<any>event).timestamp >= time_end))
			return // culls events outside of `(start, end]` range.
		event.data = _omap(event.data, x => isNaN(Number(x)) ? x : Number(x))
		await fn(_clean(event)) // after maybe-float parsing ^
	}

	// Request batch ZIP file and stream thru an unzipper into our parser.
	let piped = (await fetch(`${beiwe_url}/get-data/v1`, { 
		method: 'POST', 
		body: new URLSearchParams(_clean({
			access_key: access_key,
			secret_key: secret_key,
			study_pk: study_id,
			user_ids: user_ids.length === 0 ? undefined : JSON.stringify(user_ids),
			data_streams: data_streams.length === 0 ? undefined : JSON.stringify(data_streams),
			time_start: time_start === null ? undefined : _date(time_start),
			time_end: time_end === null ? undefined : _date(time_end)
		}))
	})).body.pipe(unzip.Parse()).pipe(new stream.Transform({
		objectMode: true,
		transform: (chunk: any, encoding: any, callback: any) => {

			// Ignore non-data/non-CSV files/directories.
			if (chunk.path !== 'registry' && chunk.type !== 'Directory' && !chunk.path.includes('/identifiers/')) {
				let sensor_name = chunk.path.split('/')[1]
                let promises = []
				chunk.pipe(csv())
					.on('data', (row: any) => {
                        chunk.pause()
                        _maybe_submit({
                            timestamp: parseInt(row.timestamp) ?? -1,
                                sensor: `beiwe.${sensor_name}`,
                                data: { ...row, 
                                    timestamp: undefined, 'UTC time': undefined 
                                }
						}, stream_submit)
                        .then(() => chunk.resume())
                   }).on('end', callback)
			} else {
				chunk.autodrain()
				callback()
			}
		}
	}))

	// Do not return immediately; await the stream to completion.
	return new Promise((resolve, reject) => {
		piped.on('error', reject)
		piped.on('finish', resolve)
	})
}

// Download and process the data to console.
export async function BeiweMigrate(resIDs: string[]) {
	for (let researcherID of resIDs) {

        // Pull a Beiwe Connector map from the tags on self & sub-objects.
        let map = await Query(`{ 
            "root": $Tags_view("${researcherID}", "lamp.beiwe_connector"), 
            "base": $Participant_all("${researcherID}").{ 
                "id": id, "beiwe": $Tags_view(id, "lamp.beiwe_connector") 
            }
        }`, undefined, false)

		// Iterate all valid Beiwe Connectors.
		for (let tag of map.base) {
			if (tag.beiwe === null)
				continue

			// Request all Beiwe data for the current Connector's context. 
			let _lastUpdate = 0
			await BeiweAPI(
				map.root.serverAddress,
				map.root.accessKey,
				map.root.secretKey,
				map.root.studyID,
				[tag.beiwe.beiweID],
				[],
				tag.beiwe.lastUpdate > 0 ? tag.beiwe.lastUpdate : null,
				null,
				async event => {
					_lastUpdate = event.timestamp
					//console.log(JSON.stringify({ 'id': tag.id, ...event }, null, 4)) // TEST ONLY

					// Upload the current migrated event.
                    let notCreated = 3 /* max retries = 3 */
                    while (notCreated > 0) {
                        try {
                            let res = await SensorEventRepository._insert(tag.id, [event]) // FIXME
                            notCreated = 0 /* ok */
                        } catch(err) {
                            console.error({ obj: event, msg: err })
                            notCreated -= 1 /* try again */
                        }
                    }
				}
			)

			// Update the lastUpdate point for the current Beiwe Connector.
            try {
                let res = await TypeRepository._set('a', tag.id, researcherID, 'lamp.beiwe_connector', { 
                    beiweID: tag.beiwe.beiweID, 
                    lastUpdate: _lastUpdate
                })
            } catch(err) {
                console.error({ obj: { tag: tag, upd: _lastUpdate }, msg: err })
            }
		}
	}
}

/*;(async function() { // TEST ONLY
	await BeiweAPI(
		'https://studies.beiwe.org',
		'oSzOTLtHDQmDcfq36cfV1/JcZ4wsHMCtXdLQC9r3/QQhKXQKQyqNxXmsCpgW1rnW',
		'JT6af4/SDLPSaBZJv/6bD/gF37ky2poCJNT/BHjjHq9aUBMnsmMV9jBJxQLIsopt',
		'626',
		['8mxwfzgb'],
		['gps'],
		1547429712694,
		null,
		event => console.log(JSON.stringify(event, null, 4))
	)
})()*/

