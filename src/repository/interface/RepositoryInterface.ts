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
}

//Interface for Activity Repository
export interface ActivityInterface {
  _select(id: string | null, parent?: boolean, ignore_binary?: boolean): Promise<Activity[]>
  _insert(study_id: string, object: {}): Promise<string>
  _update(activity_id: string, object: {}): Promise<{}>
  _delete(activity_id: string): Promise<{}>
  _lookup(id: string | null, parent?: boolean): Promise<Activity[]>
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
    activity_id_or_spec?: string,
    from_date?: number,
    to_date?: number,
    limit?: number
  ): Promise<ActivityEvent[]>
  _insert(participant_id: string, objects: ActivityEvent[]): Promise<{}>
}

//Interface for SensorEvent Repository
export interface SensorEventInterface {
  _select(
    id?: string,
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
  _select(id?: string): Promise<ActivitySpec[]>
  _insert(object: {}): Promise<string>
  _update(id: string, object: {}): Promise<{}>
  _delete(id: string): Promise<{}>
}

//Interface for SensorSpec Repository
export interface SensorSpecInterface {
  _select(id?: string): Promise<SensorSpec[]>
  _insert(object: SensorSpec): Promise<string>
  _update(id: string, object: SensorSpec): Promise<string>
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
}

//Interface for Credential Repository
export interface CredentialInterface {
  _find(access_key: string, secret_key?: string): Promise<string>
  _select(type_id: string | null): Promise<any[]>
  _insert(type_id: string | null, credential: any): Promise<{}>
  _update(type_id: string | null, access_key: string, credential: any): Promise<{}>
  _delete(type_id: string | null, access_key: string): Promise<{}>
}