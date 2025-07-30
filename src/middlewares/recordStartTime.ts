import { Request, Response, NextFunction } from "express"

export function recordStartTime(req: Request, res: Response, next: NextFunction) {
  ;(req as any).startTime = Date.now()
  next()
}
