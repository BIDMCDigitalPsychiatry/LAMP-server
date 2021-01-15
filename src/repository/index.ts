import nano from "nano"
export * from "./TypeRepository"
export * from "./CredentialRepository"
export * from "./ResearcherRepository"
export * from "./StudyRepository"
export * from "./ParticipantRepository"
export * from "./ActivityRepository"
export * from "./ActivityEventRepository"
export * from "./ActivitySpecRepository"
export * from "./SensorRepository"
export * from "./SensorEventRepository"
export * from "./SensorSpecRepository"

// Initialize the CouchDB databases if any of them do not exist.
export async function _bootstrap_db(Database: nano.ServerScope): Promise<void> {
  console.group("Initializing database connection...")
  const _db_list = await Database.db.list()
  if (!_db_list.includes("activity_spec")) {
    console.log("Initializing ActivitySpec database...")
    await Database.db.create("activity_spec")
  }
  console.log("ActivitySpec database online.")
  if (!_db_list.includes("sensor_spec")) {
    console.log("Initializing SensorSpec database...")
    await Database.db.create("sensor_spec")
  }
  console.log("SensorSpec database online.")
  if (!_db_list.includes("researcher")) {
    console.log("Initializing Researcher database...")
    await Database.db.create("researcher")
    Database.use("researcher").bulk({
      docs: [
        {
          _id: "_design/timestamp-index",
          language: "query",
          views: {
            timestamp: {
              map: {
                fields: {
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-parent-timestamp-index",
          language: "query",
          views: {
            "id-parent-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "#parent", "timestamp"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Researcher database online.")
  if (!_db_list.includes("study")) {
    console.log("Initializing Study database...")
    await Database.db.create("study")
    Database.use("study").bulk({
      docs: [
        {
          _id: "_design/timestamp-index",
          language: "query",
          views: {
            timestamp: {
              map: {
                fields: {
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-parent-timestamp-index",
          language: "query",
          views: {
            "id-parent-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "#parent", "timestamp"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Study database online.")
  if (!_db_list.includes("participant")) {
    console.log("Initializing Participant database...")
    await Database.db.create("participant")
    Database.use("participant").bulk({
      docs: [
        {
          _id: "_design/timestamp-index",
          language: "query",
          views: {
            timestamp: {
              map: {
                fields: {
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-parent-timestamp-index",
          language: "query",
          views: {
            "id-parent-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "#parent", "timestamp"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Participant database online.")
  if (!_db_list.includes("activity")) {
    console.log("Initializing Activity database...")
    await Database.db.create("activity")
    Database.use("activity").bulk({
      docs: [
        {
          _id: "_design/timestamp-index",
          language: "query",
          views: {
            timestamp: {
              map: {
                fields: {
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-parent-timestamp-index",
          language: "query",
          views: {
            "id-parent-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-timestamp-index",
          language: "query",
          views: {
            "id-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "timestamp"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Activity database online.")
  if (!_db_list.includes("sensor")) {
    console.log("Initializing Sensor database...")
    await Database.db.create("sensor")
    Database.use("sensor").bulk({
      docs: [
        {
          _id: "_design/timestamp-index",
          language: "query",
          views: {
            timestamp: {
              map: {
                fields: {
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "timestamp"],
                },
              },
            },
          },
        },
        {
          _id: "_design/id-parent-timestamp-index",
          language: "query",
          views: {
            "id-parent-timestamp": {
              map: {
                fields: {
                  _id: "asc",
                  "#parent": "asc",
                  timestamp: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["_id", "#parent", "timestamp"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Sensor database online.")
  if (!_db_list.includes("activity_event")) {
    console.log("Initializing ActivityEvent database...")
    await Database.db.create("activity_event")
    Database.use("activity_event").bulk({
      docs: [
        {
          _id: "_design/parent-activity-timestamp-index",
          language: "query",
          views: {
            "parent-activity-timestamp": {
              map: {
                fields: {
                  "#parent": "desc",
                  activity: "desc",
                  timestamp: "desc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: [
                    {
                      "#parent": "desc",
                    },
                    {
                      activity: "desc",
                    },
                    {
                      timestamp: "desc",
                    },
                  ],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "desc",
                  timestamp: "desc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: [
                    {
                      "#parent": "desc",
                    },
                    {
                      timestamp: "desc",
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("ActivityEvent database online.")
  if (!_db_list.includes("sensor_event")) {
    console.log("Initializing SensorEvent database...")
    await Database.db.create("sensor_event")
    Database.use("sensor_event").bulk({
      docs: [
        {
          _id: "_design/parent-sensor-timestamp-index",
          language: "query",
          views: {
            "parent-sensor-timestamp": {
              map: {
                fields: {
                  "#parent": "desc",
                  sensor: "desc",
                  timestamp: "desc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: [
                    {
                      "#parent": "desc",
                    },
                    {
                      sensor: "desc",
                    },
                    {
                      timestamp: "desc",
                    },
                  ],
                },
              },
            },
          },
        },
        {
          _id: "_design/parent-timestamp-index",
          language: "query",
          views: {
            "parent-timestamp": {
              map: {
                fields: {
                  "#parent": "desc",
                  timestamp: "desc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: [
                    {
                      "#parent": "desc",
                    },
                    {
                      timestamp: "desc",
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("SensorEvent database online.")
  if (!_db_list.includes("credential")) {
    console.log("Initializing Credential database...")
    await Database.db.create("credential")
    Database.use("credential").bulk({
      docs: [
        {
          _id: "_design/access_key-index",
          language: "query",
          views: {
            access_key: {
              map: {
                fields: {
                  access_key: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["access_key"],
                },
              },
            },
          },
        },
        {
          _id: "_design/origin-index",
          language: "query",
          views: {
            origin: {
              map: {
                fields: {
                  origin: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["origin"],
                },
              },
            },
          },
        },
        {
          _id: "_design/origin-access_key-index",
          language: "query",
          views: {
            "origin-access_key": {
              map: {
                fields: {
                  origin: "asc",
                  access_key: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["origin", "access_key"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Credential database online.")
  if (!_db_list.includes("tag")) {
    console.log("Initializing Tag database...")
    await Database.db.create("tag")
    Database.use("tag").bulk({
      docs: [
        {
          _id: "_design/parent-type-key-index",
          language: "query",
          views: {
            "parent-type-key": {
              map: {
                fields: {
                  "#parent": "asc",
                  type: "asc",
                  key: "asc",
                },
                partial_filter_selector: {},
              },
              reduce: "_count",
              options: {
                def: {
                  fields: ["#parent", "type", "key"],
                },
              },
            },
          },
        },
      ],
    })
  }
  console.log("Tag database online.")
  console.groupEnd()
  console.log("Database verification complete.")
}
