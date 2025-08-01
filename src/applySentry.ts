import * as Sentry from "@sentry/node";
import { Application } from "express";

export function applySentry(app: Application) {
  if (process.env.SENTRY_DSN != "") {
    Sentry.setupExpressErrorHandler(app);
  
    // Optional fallthrough error handler
    app.use(function onError(err: any, req: any, res: any, next: any) {
      // The error id is attached to `res.sentry` to be returned
      // and optionally displayed to the user for support.
      res.statusCode = 500;
      res.end(res.sentry + "\n");
    });
  }
}