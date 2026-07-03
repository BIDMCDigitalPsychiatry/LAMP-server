import { NextFunction, Request, RequestHandler, Response } from "express";
import { z, ZodError, ZodType } from "zod";

//-----------------------------------------------------------------------------
// Request-shape validation middleware (via Zod)
//-----------------------------------------------------------------------------
//
// Validate incoming request data at the router boundary so that controllers
// receive data that is already parsed and typed ("parse, don't validate").
// Each provided schema parses its section of the request and the result is
// written to `req.validated.*` (see the Express.Request augmentation in
// types.d.ts). On failure a 400 is returned with Zod's flattened error.

export interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.validated = {
        body: schemas.body ? schemas.body.parse(req.body) : undefined,
        query: schemas.query ? schemas.query.parse(req.query) : undefined,
        params: schemas.params ? schemas.params.parse(req.params) : undefined,
      };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        // { formErrors: string[], fieldErrors: Record<string, string[]> }
        res.status(400).json({ error: "ValidationError", issues: z.flattenError(err) });
        return;
      }
      next(err);
    }
  };
}
