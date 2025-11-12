import { Bootstrap, Encrypt, MongoClientDB, Repository } from "./repository/Bootstrap";
import app from "./app"; // This import is unused but is required for Bootstrap to run correctly

const RESEARCHER_COUNT = 3
const PER_STUDY_PARTICIPANT_COUNT = 3
const TEST_PASSWORD = "M1ndLamp"

const ACTIVITY_SPECS = [
    {
        "_id": "lamp.goals",
        "description": null,
        "executable": "https://raw.githubusercontent.com/BIDMCDigitalPsychiatry/LAMP-activities/dist/out/goals.html.b64",
        "static_data": {},
        "temporal_slices": {},
        "settings": {},
        "category": null,
    },
    {
        "_id": "lamp.survey",
        "_parent": null,
        "_rev": "1-967a00dff5e02add41819138abb3284d",
        "category": null,
        "executable": "https://raw.githubusercontent.com/BIDMCDigitalPsychiatry/LAMP-activities/dist/out/survey.html.b64",
        "help_contents": null,
        "script_contents": null,
        "settings_schema": null,
        "static_data_schema": null,
        "temporal_slice_schema": null
    },
    {
    "_id": "lamp.medications",
    "description": null,
    "executable": "https://raw.githubusercontent.com/BIDMCDigitalPsychiatry/LAMP-activities/dist/out/medications.html.b64",
    "static_data": {},
    "temporal_slices": {},
    "settings": {},
    "category": null,
    "_deleted": false
},
]
const ACTIVITIES = [
    {
        "spec": "lamp.goals",
        "name": "goals",
        "settings": {
            "unit": "meter",
            "value": 10
        },
        "schedule": [],
        "category": [
            "assess"
        ],
    },
    {
        "spec": "lamp.medications",
        "name": "Medication 1",
        "settings": {
            "unit": "Kg",
            "value": 10
        },
        "schedule": [
            {
                "start_date": "2022-07-12T01:00:00.000Z",
                "time": "2022-07-12T11:00:00.000Z",
                "custom_time": null,
                "repeat_interval": "every6h",
                "notification_ids": [
                    422038
                ]
            }
        ],
        "category": [
            "manage"
        ],
    },
    {
            "spec": "lamp.survey",
            "name": "Survey 1",
            "settings": [
                {
                    "text": "Text: Today I have had thoughts racing through my head",
                    "type": "text",
                    "required": true
                },
                {
                    "text": "List: Today I feel confused or puzzled",
                    "type": "list",
                    "options": [
                        "Nearly All the Time",
                        "More than Half the Time",
                        "Several Times"
                    ],
                    "required": true
                },
                {
                    "text": "Multiselect: In the last THREE DAYS, I have...",
                    "type": "multiselect",
                    "options": [
                        "Walked somewhere",
                        "Taken the bus",
                        "Driven a car",
                        "Taken a train",
                        "Taken a plan"
                    ],
                    "required": true
                },
                {
                    "text": "Slider: In the last THREE DAYS, I have felt uneasy with groups of people slider",
                    "type": "slider",
                    "options": [
                        0,
                        1,
                        2
                    ],
                    "required": true
                },
                {
                    "text": "Short Answer: In the last three days I felt uneasy",
                    "type": "short",
                    "required": false
                },
                {
                    "text": "Rating: Today I feel unable to cope and have difficulty with everyday tasks",
                    "type": "rating",
                    "options": [
                        0,
                        1,
                        2,
                        3
                    ],
                    "required": true
                },
                {
                    "text": "Time: Today I have heard voices or saw things others cannot",
                    "type": "time",
                    "options": [
                        {
                            "value": "standard"
                        }
                    ],
                    "required": true
                },
                {
                    "text": "Likert: Today I have had thoughts racing through my head",
                    "type": "likert",
                    "required": true
                },
            ],
            "schedule": [
                {
                    "start_date": "2022-07-12T01:00:00.000Z",
                    "time": "2022-07-12T10:00:00.000Z",
                    "custom_time": null,
                    "repeat_interval": "hourly",
                    // "notification_ids": [
                    //     965627
                    // ]
                }
            ],
            "category": [
                "assess"
            ],
        },
]

const SENSOR_SPECS = [
    {
        "_id": "lamp.heart_rate",
        "_parent": null,
        "_rev": "4-6df412d924dccc1495029bcef4bb6f1a",
        "type": "object",
        "properties": {
            "value": {
                "type": "number"
            },
            "units": {
                "type": "string"
            }
        },
        "description": "",
        "required": {},
        "additionalProperties": false
    },
    {
        "_id": "lamp.sleep",
        "_parent": null,
        "_rev": "4-8f4ba2cb84c4bf7f8378856cf1f08ce3",
        "type": "object",
        "properties": {
            "value": {
                "type": "number"
            },
            "event_type": {
                "type": "string",
                "enum": [
                    "in_bed",
                    "in_sleep",
                    "in_awake"
                ]
            }
        },
        "description": "",
        "required": {},
        "additionalProperties": false,
        "settings_schema": null
    },
    {
        "_id": "lamp.telephony",
        "_parent": null,
        "_rev": "2-22d99a300c056762b1804a63a57a9b71",
        "type": "object",
        "properties": {
            "type": {
                "type": "string",
                "enum": [
                    "incoming",
                    "outgoing",
                    "missed",
                    "busy"
                ]
            },
            "duration": {
                "type": "number"
            },
            "trace": {
                "type": "string"
            }
        },
        "description": "",
        "required": {},
        "additionalProperties": false,
        "settings_schema": null
    }
]

const SENSORS = [
    {
        "spec": "lamp.heart_rate",
        "name": "heartrate",
        "settings": {},
    },
    {
        "spec": "lamp.telephony",
        "name": "phone",
        "settings": {},
    },
    {
        "spec": "lamp.sleep",
        "name": "sleep",
        "settings": {},
    },
]

async function loadTestData() {
    await Bootstrap()
    
    const TEST_PASSWORD = "testpassword1!"
    const encoded_password = Encrypt(TEST_PASSWORD, "AES256");
    const TEST_EMAIL_DOMAIN = "example.com"

    const repository = new Repository()

    const ResearcherRepository = repository.getResearcherRepository()
    const StudyRepository = repository.getStudyRepository()
    const ActivityRepository = repository.getActivityRepository()
    const SensorRepository = repository.getSensorRepository()
    const ParticipantRepository = repository.getParticipantRepository()
    const TypeRepository = repository.getTypeRepository()
    const CredentialRepository = repository.getCredentialRepository()

    // Add activity specs
    const ActivitySpecRepository = repository.getActivitySpecRepository()
    await Promise.all(ACTIVITY_SPECS.map((spec) => ActivitySpecRepository._insert(spec)))

    // Add sensor specs
    const SensorSpecRepository = repository.getSensorSpecRepository()
    await Promise.all(SENSOR_SPECS.map((spec) => SensorSpecRepository._insert(spec)))


    for(let i = 1; i <= RESEARCHER_COUNT; i++) {
        // Create researcher and study
        const researcherId = await ResearcherRepository._insert({
            name: `Researcher ${i}`,
            email: `researcher_${i}@${TEST_EMAIL_DOMAIN}`,
            address: `Researcher ${i} address`
        })
        const studyId = await StudyRepository._insert(
            researcherId,
            {
                name: `Study ${i}`,
                isMessagingEnabled: true
            }
        )

        // Create Researcher Credential
        CredentialRepository._insert(researcherId, {
            origin: researcherId,
            access_key: `researcher_${i}@${TEST_EMAIL_DOMAIN}`,
            secret_key: TEST_PASSWORD,
            description: `Researcher ${i} Test Credential`
        })

        // Create sensors and activities
        const activityIds = await Promise.all(ACTIVITIES.map((activity) => ActivityRepository._insert(studyId, activity)))
        const sensorIds = await Promise.all(SENSORS.map((sensor) => SensorRepository._insert(studyId, sensor)))

        // Create participants
        for (let j=1; j <= PER_STUDY_PARTICIPANT_COUNT; j++) {
            const participantId = await ParticipantRepository._insert(studyId, {})

            CredentialRepository._insert(participantId.id, {
                origin: participantId.id, 
                access_key: `participant_${i}_${j}@${TEST_EMAIL_DOMAIN}`,
                secret_key: TEST_PASSWORD,
                description: `Participant ${j} Test Credential`
            })
        }
    }

    // Add Miscellaneous Tags
    await TypeRepository._set(
        undefined,
        "*",
        '', // type_id => How is it set to null?
        'lamp.dashboard.security_preferences',
        '{"password_rule":"^.*(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).*$"}'
    )

}

console.log("=== START ===")
loadTestData().then(() => {console.log("=== END ===")})