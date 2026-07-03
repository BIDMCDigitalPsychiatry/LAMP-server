import type { Response } from "express";
import { z, ZodType } from "zod";

/**
 * Send `payload` as a 200 JSON response after checking it against the
 * endpoint's response schema.
 *
 * The controller's `Response<T>` signatures already type-check the response
 * shape at compile time; this closes the runtime gaps TypeScript cannot see —
 * notably values assembled in intermediate variables (e.g. the lodash-merged
 * `parts` in `initiate`), where excess-property checking does not apply.
 *
 * A failure here means OUR code produced a response that violates its own
 * contract: a server bug, not a client error. There is no global async-error
 * handler in this app, so throwing would hang the request on Express 4 —
 * instead we log the violation and return 500 rather than leak a malformed body.
 */
export function sendValidatedJson<T>(res: Response<T>, schema: ZodType<T>, payload: NoInfer<T>): void {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.error("Response contract violation:", z.flattenError(result.error));
    res.sendStatus(500);
    return;
  }
  res.json(result.data);
}
