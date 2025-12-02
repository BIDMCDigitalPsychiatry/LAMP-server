import { Researcher } from "../../model/Researcher"
import { Study } from "../../model/Study"
import { Participant } from "../../model/Participant"
import { Activity } from "../../model/Activity"
import { Sensor } from "../../model/Sensor"
import { ActivityEvent } from "../../model/ActivityEvent"
import { SensorEvent } from "../../model/SensorEvent"
import { SensorSpec } from "../../model/SensorSpec"
import { ActivitySpec } from "../../model/ActivitySpec"

//Interface for Researcher Repository
export interface ResearcherInterface {
  _select(id?: string): Promise<Researcher[]>
  _insert(object: {}): Promise<string>
  _update(id: string, object: {}): Promise<{}>
  _delete(id: string): Promise<{}>
  _listUsers(id: string, studies: string[], search: string, sort: string, page: string, limit: string): Promise<{}>
  _listActivities(id: string, studies: string[], search: string, sort: string, page: string, limit: string): Promise<{}>
  _listSensors(id: string, studies: string[], search: string, sort: string, page: string, limit: string): Promise<{}>
}

//Interface for Study Repository
export interface StudyInterface {
  _select(id: string | null, parent?: boolean): Promise<Study[]>
  _insert(researcher_id: string, object: {}): Promise<string>
  _update(study_id: string, object: {}): Promise<{}>
  _delete(id: string): Promise<{}>
}

//Interface for Participant Repository
export interface ParticipantInterface {
  _select(id: string | null, parent?: boolean): Promise<Participant[]>
  _insert(study_id: string, object: {}): Promise<any>
  _update(participant_id: string, object: {}): Promise<{}>
  _delete(participant_id: string): Promise<{}>
  _lookup(id: string | null, parent?: boolean): Promise<Participant[]>
  _rank?(study_id: string): Promise<any>
}

//Interface for Activity Repository
export interface ActivityInterface {
  _select(
    study_id: string,
    parent?: boolean,
    ignore_binary?: boolean,
    limit?: number,
    offset?: number,
    participantId?: string
  ): Promise<{ data: any[]; total: number } | any[]>
  _list(id?: string, tab?: string, limit?: number, offset?: number): Promise<{ data: any; total: number }>
  _insert(study_id: string, object: {}): Promise<string>
  _update(activity_id: string, object: {}): Promise<{}>
  _delete(activity_id: string): Promise<{}>
  _lookup(id: string | null, parent?: boolean): Promise<Activity[]>
  _listModule(module_id: string, participant_id: string): Promise<any[]>
  _getFeedDetails(participantId: string, dateMs: string, tzOffsetMinutes?: number): Promise<any>
  _deleteActivities(activities: string[]): Promise<{}>
}

//Interface for Sensor Repository
export interface SensorInterface {
  _select(id: string | null, parent?: boolean, ignore_binary?: boolean): Promise<Sensor[]>
  _insert(study_id: string, object: any): Promise<string>
  _update(sensor_id: string, object: any): Promise<{}>
  _delete(sensor_id: string): Promise<{}>
  _lookup(id: string | null, parent?: boolean): Promise<Sensor[]>
}

//Interface for ActivityEvent Repository
export interface ActivityEventInterface {
  _select(
    id?: string,
    ignore_binary?: boolean,
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]>
  _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}>
  _rank?(participantIds: any, fromDate: any): Promise<any>
}

//Interface for SensorEvent Repository
export interface SensorEventInterface {
  _select(
    id?: string,
    ignore_binary?: boolean,
    sensor_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<SensorEvent[]>
  _insert(participant_id: string, objects: SensorEvent[]): Promise<{}>
  _bulkWrite(objects: SensorEvent[]): Promise<{}>
}

//Interface for ActivitySpec Repository
export interface ActivitySpecInterface {
  _select(id?: any, ignore_binary?: boolean): Promise<ActivitySpec[]>
  _insert(object: {}): Promise<{}>
  _update(id: string, object: {}): Promise<{}>
  _delete(id: string): Promise<{}>
}

//Interface for SensorSpec Repository
export interface SensorSpecInterface {
  _select(id?: any, ignore_binary?: boolean): Promise<SensorSpec[]>
  _insert(object: SensorSpec): Promise<{}>
  _update(id: string, object: SensorSpec): Promise<{}>
  _delete(id: string): Promise<{}>
}

//Interface for TypeSpec Repository
export interface TypeInterface {
  _parent(type_id: string): Promise<{}>
  _self_type(type_id: string): Promise<string>
  _owner(type_id: string): Promise<string | null>
  _parent_type(type_id: string): Promise<string[]>
  _parent_id(type_id: string, type: string): Promise<string>
  _set(mode: any, type: string, type_id: string, key: string, value?: any): Promise<{}>
  _get(mode: any, type_id: string, attachment_key: string): Promise<any | undefined>
  _list(mode: any, type_id: string): Promise<string[]>
  _cordinator(type_id: string): Promise<any | undefined>
}

//Interface for Credential Repository
export interface CredentialInterface {
  _find(access_key: string, secret_key?: string): Promise<string>
  _select(type_id: string | null): Promise<any>
  _insert(type_id: string | null, credential: any): Promise<{}>
  _update(type_id: string | null, access_key: string, credential: any): Promise<{}>
  _delete(type_id: string | null, access_key: string): Promise<{}>
  _login(accessKey: string | null, secretKey: string): Promise<any>
  _renewToken(refreshToken: string | null): Promise<any>
  _logout(token: string | undefined): Promise<any>
}

export interface ResearcherSettingsInterface {
  _select(type: string, id: string): Promise<{}>
  _insert(id: string, object: {}, choice?: string): Promise<string>
  _get(id: string): Promise<{}>
}
