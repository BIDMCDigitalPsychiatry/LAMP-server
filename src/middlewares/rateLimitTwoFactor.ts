import { Request, Response } from "express"
import { rateLimit } from "express-rate-limit"

// Counts per logged-in user (runs after authenticateSession), so people sharing a network aren't limited together
const perUser = (req: Request, res: Response) => res.locals.actingUserContext.user.id

const fifteenMinutes = 15 * 60 * 1000

// Each send emails a new code, so cap sends (setup and resend share this count)
export const twoFactorSendLimit = rateLimit({
  windowMs: fifteenMinutes,
  limit: 10,
  keyGenerator: perUser,
  message: { error: "429.too-many-requests" },
  validate: { xForwardedForHeader: false },
})

// Only wrong codes count, so a 6-digit code can't be guessed
export const twoFactorVerifyLimit = rateLimit({
  windowMs: fifteenMinutes,
  limit: 10,
  keyGenerator: perUser,
  skipSuccessfulRequests: true,
  message: { error: "429.too-many-requests" },
  validate: { xForwardedForHeader: false },
})
