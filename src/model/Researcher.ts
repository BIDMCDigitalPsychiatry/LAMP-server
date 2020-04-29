import { Identifier, Timestamp } from "./Type"
import { Participant } from "./Participant"
import { Study } from "./Study"
export class Researcher {
  public id?: Identifier
  public name?: string
  public email?: string
  public address?: string
  public studies?: Identifier[]
}
