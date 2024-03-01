import { Identifier } from "./Type"

export class Study {
  public id?: Identifier
  public name?: string
  public activities?: Identifier[]
  public participants?: Identifier[]
}
