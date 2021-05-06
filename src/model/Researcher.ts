import { Identifier, Timestamp } from "./Type"

export class Researcher {
  public id?: Identifier
  public name?: string
  public email?: string
  public address?: string
  public studies?: Identifier[]
}
