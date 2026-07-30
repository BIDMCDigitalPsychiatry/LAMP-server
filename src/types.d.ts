
import { ApplicationContext } from "./context"

declare global {
  namespace Express {
    interface Request {
      context: ApplicationContext
      // Populated by the `validate` middleware. Only present on routes that
      // mount it; cast each section to its schema's inferred type in handlers.
      validated: {
        body?: unknown
        query?: unknown
        params?: unknown
      }
    }
  }
}