import { Identifier, Timestamp } from "./Type"
export class AccessCitation {
  public in = ""
  public at = ""
  public on: Timestamp = 0
  public by = ""
}
export class Metadata {
  public access: AccessCitation = new AccessCitation()
}
export class Document<T> {
  public meta: Metadata = new Metadata()
  public data: T[] = []
}
type CronDefinition = string
export class DurationInterval {
  public start?: Timestamp
  public interval?: CronDefinition[]
  public repeat_count?: number
  public end?: Timestamp
}
enum RepeatTypeLegacy {
  hourly = "hourly", // 0 * * * * *
  every3h = "every3h", // 0 */3 * * * *
  every6h = "every6h", // 0 */6 * * * *
  every12h = "every12h", // 0 */12 * * * *
  daily = "daily", // 0 0 * * * *
  weekly = "weekly", // 0 0 * * 0 *
  biweekly = "biweekly", // 0 0 1,15 * * *
  monthly = "monthly", // 0 0 1 * * *
  bimonthly = "bimonthly", // 0 0 1 */2 * *
  custom = "custom", // 1 2 3 4 5 6
  none = "none", // 0 0 0 0 0 0
}
export class DurationIntervalLegacy {
  public repeat_type?: RepeatTypeLegacy
  public date?: Timestamp
  public custom_times?: Timestamp[]
}
