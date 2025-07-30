import { Request, Response, NextFunction } from "express"
import { MongoClientDB } from "../repository/Bootstrap"

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1]

  if (!token) return res.sendStatus(401)

  const blackListToken = await MongoClientDB.collection("tokens").findOne({ token: token })

  if (blackListToken !== null) {
    return res.status(401).json({ message: "Token is invalid (blacklisted)" })
  }
  next()
}
