import { MongoClient } from "mongodb";

export const mongoClientInstance = new MongoClient(`${process.env.DB}`)
