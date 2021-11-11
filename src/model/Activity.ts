import { Identifier, Timestamp } from "./Type"
import { DurationIntervalLegacy } from "./Document"
type Tab = 'learn' | 'assess' | 'manage' | 'prevent'
export class Activity {
  public id?: Identifier
  public spec?: Identifier
  public name?: string
  public schedule?: DurationIntervalLegacy
  public settings?: any
  public category?: Tab[] | null
}
