import nano from "nano"
export * from "./LegacyAPI"
export * from "./PushNotification"
export * from "./ScriptRunner"
export * from "./Migrate"

declare global {
  interface NumberConstructor {
    parse(input: string | number | undefined | null): number | undefined
  }
}

Object.defineProperty(Number, "parse", {
  value: function (input: string | number | undefined | null): number | undefined {
    if (input === null || input === undefined) return undefined
    if (typeof input === "number") return input
    return isNaN(Number(input)) ? undefined : Number(input)
  },
})

export const HTTPS_CERT = {
  passphrase: "localhost",
  key: `-----BEGIN ENCRYPTED PRIVATE KEY-----
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
6CMlq+Yko7ZnovATOHp44BrCmg==
-----END ENCRYPTED PRIVATE KEY-----`,
  cert: `-----BEGIN CERTIFICATE-----
MIIFrjCCA5YCCQD+q//Qt55eFTANBgkqhkiG9w0BAQsFADCBlzELMAkGA1UEBhMC
VVMxCzAJBgNVBAgMAk1BMQ8wDQYDVQQHDAZCb3N0b24xLTArBgNVBAoMJEJldGgg
SXNyYWVsIERlYWNvbmVzcyBNZWRpY2FsIENlbnRlcjEnMCUGA1UECwweRGl2aXNp
b24gb2YgRGlnaXRhbCBQc3ljaGlhdHJ5MRIwEAYDVQQDDAlsb2NhbGhvc3QwIBcN
MjAwMTA1MDM0NTA0WhgPMjExOTEyMTIwMzQ1MDRaMIGXMQswCQYDVQQGEwJVUzEL
MAkGA1UECAwCTUExDzANBgNVBAcMBkJvc3RvbjEtMCsGA1UECgwkQmV0aCBJc3Jh
ZWwgRGVhY29uZXNzIE1lZGljYWwgQ2VudGVyMScwJQYDVQQLDB5EaXZpc2lvbiBv
ZiBEaWdpdGFsIFBzeWNoaWF0cnkxEjAQBgNVBAMMCWxvY2FsaG9zdDCCAiIwDQYJ
KoZIhvcNAQEBBQADggIPADCCAgoCggIBALj096AYEwGbl6AXOrcssC4CN4v8YPlY
i59JOTBUyYm8f66wCxSLLMZ3HbrxtqvxpQl6nMNQsofxcWBiwDiNjWtI33Yyci8M
9w1zYT3CmS4+8tn+LS47e2KodHdRZX39TzcqxRxQrwT7oc9XeNE7nwjX6dMQG1Db
ebDAsPcaINRo0nwGMlDdNWwRqvWXTtVjq2l4ORlhgzx604Squ0SBjiZFNNdJeXlG
MoAxeq4NEMlWIi0XHD43wMAHjA82WQ23T0NLFMQJGBJkeV6Y4D53M3nLZk/6kbw6
Rk7WbiYOgL+Bv1oNF2IPNR/NI2248+feltJRehTQKeCPXblMM9k/CvV+s63LiEc/
Rn4KyQ+oS6rS9WY8G8hZ0lXp9nlsTUUS0PfcioGyQ9r5gkEHDVkbPFEvU9q8wy/b
ueBM1akTkF89dXb4O0zrBWQJ79Fv7pxHdhNWto+OWUw0ARrJWTy2kysTqyZOlU2p
iv87enMMxCHPpgVkzIIwhzZC2b2JZ9htpyt6em/j6sSRBuBTffdOtzwHln0uRyRg
lK0cOC2O3ZKeuBDYIYEcT2ecqfngApRuzmnDcJ/511O2t6tTkViGvrjNwpon2tdd
lODK6gWZF0aD0dNojtXgcle3txsPFStT6vtRLVzb9Gyh/wr+6KZ/q8WCDNY41QAR
l0+4pmZ9qHynAgMBAAEwDQYJKoZIhvcNAQELBQADggIBAE1jv8jp2pC7mb07Fwiq
XFI2AUhzxiGuk/HH+7uNca0lvXfgVFF9jKnUnN6lR/Z2FQHZo/b9p8xZOuEkPgPc
fEJniJgFY9cZUvouEEd7+ljTgdOe3Mf6YYLAR0tT0NSxiSN7rCBbarVp10ULyoBV
itENnpQdbohx57TDdfCR3IfKbyAvFMto6Mrzj3PTMjGWEfyEkFVZhj+B2eKq6rol
G4Lskb+RD0rfQTqV4UY/D9ArQxklxzxt4JlID17gIb1NULfYl6GLQqinVZNki0nT
c9bPTwEyfILzjxI2clF8ZR3NvLDLz2bmbdHWXFsAAKA14Pqhd9EVX7pzsXXG1mBe
Fb7ZIjp4qQchetgKx7wTh5uR9Eo2/AZFI0gnADn9wBzLG3Y4WmTaeBLerur8fdSA
fgd43mHp6Q4taQ3Mm2+9K5E7EQL06BP2OWF2fRm2G8bQ9XJgV0q8kpc96ZblgGuy
0cOVOblm66Y4uPg/DV96U0sYWkZuLzkKP7MIKCqI5UEZvQ0QySMsYpku6i6hgtKI
bUFnraLvMJAzLQNN7BrrbdFTot7viPmZYe1Y12unlZ+yqHtusO5AdLF7p0F/t5k/
R/mQB9d2LJUy81BZrO05VHrz91sHSDRRPg4lDw2GVSFtUE1ILDc3usb7JwJYZIXT
fARYG40rIsYJipV76ICGNXSp
-----END CERTIFICATE-----`,
}

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
    Database.use("sensor_event").bulk({
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
    Database.use("sensor_event").bulk({
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
