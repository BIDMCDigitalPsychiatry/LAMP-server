const { validationResult } = require("express-validator")
import { Request, Response, NextFunction } from "express"

const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }))
    return res.status(400).json({
      status: "error",
      errors: extractedErrors,
    })
  }
  next()
}

module.exports = {
  validateRequest,
}
