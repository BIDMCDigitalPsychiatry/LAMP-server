import { Router } from "express"
import { TypeService } from "./TypeService"
import { CredentialService } from "./CredentialService"
import { ResearcherService } from "./ResearcherService"
import { StudyService } from "./StudyService"
import { ParticipantService } from "./ParticipantService"
import { ActivityService } from "./ActivityService"
import { ActivitySpecService } from "./ActivitySpecService"
import { ActivityEventService } from "./ActivityEventService"
import { SensorService } from "./SensorService"
import { SensorSpecService } from "./SensorSpecService"
import { SensorEventService } from "./SensorEventService"
import { QueryAPI } from "./Query"
import { ListenerAPI } from "../utils/ListenerAPI"
import { PushNotificationAPI } from "../utils/PushNotificationAPI"

const API = Router()
API.use(TypeService)
API.use(CredentialService)
API.use(ResearcherService)
API.use(StudyService)
API.use(ParticipantService)
API.use(ActivityService)
API.use(ActivitySpecService)
API.use(ActivityEventService)
API.use(SensorService)
API.use(SensorSpecService)
API.use(SensorEventService)
API.use(QueryAPI)
API.use("/subscribe", ListenerAPI)
API.use("/send", PushNotificationAPI)
export default API
