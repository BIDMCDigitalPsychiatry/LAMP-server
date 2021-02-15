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
  "tags",
  new Schema(
    {}, {collection: "tags",strict:false }).index([{ "#parent": 1 , type: 1 ,  key: 1 }])
)


