import { Participant } from "./Participant"
import { Study } from "./Study"
import { Researcher } from "./Researcher"
import { Activity } from "./Activity"
import mongoose from "mongoose"
const { Schema } = mongoose

export type Identifier = string
export type Timestamp = number
export class DynamicAttachment {
  public key?: string
  public from?: Identifier
  public to?: string
  public triggers?: string[]
  public language?: string
  public contents?: string
  public requirements?: string[]
  public input_schema?: string
  public output_schema?: string
}

//Mongo Db Model for tags collection
export const TagsModel = mongoose.model(
  "tag",
  new Schema(
    {
      _parent: { type: String, required: true },
      key: { type: String, required: true },
      value: { type: String, required: true },
      type: { type: String, required: true },
      _deleted: { type: Boolean, default: false }
    },
    { collection: "tag", versionKey: false }
  ).index([{ _parent: 1, type: 1, key: 1 }])
)
