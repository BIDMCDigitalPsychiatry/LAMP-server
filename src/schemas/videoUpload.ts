import { z } from "zod";

//-----------------------------------------------------------------------------
// Request schemas for the video upload endpoints
//-----------------------------------------------------------------------------
//
// Single source of truth for both runtime validation (passed to the `validate`
// middleware in the router) and the TypeScript types consumed by the controller.

export const participantParamsSchema = z.object({
  participantId: z.string().min(5).max(100),
});

export const abortBodySchema = z.object({
  id: z.string(),
});

export const completeBodySchema = z.object({
  id: z.string(),
  parts: z.array(
    z.object({
      etag: z.string().startsWith('"').endsWith('"'),
      partNumber: z.number().int(),
    })
  ),
});

export const initiateBodySchema = z.object({
  metadata: z.object({
    // 7 GB upper bound — placeholder carried over from the original code; confirm w/ product.
    size: z.number().gt(0).lt(7 * 1_000_000_000),
  }),
});

export const refreshUrlsBodySchema = z.object({
  id: z.string(),
  partNumbers: z.array(z.number().int()),
});

export type ParticipantParams = z.infer<typeof participantParamsSchema>;
export type AbortBody = z.infer<typeof abortBodySchema>;
export type CompleteBody = z.infer<typeof completeBodySchema>;
export type InitiateBody = z.infer<typeof initiateBodySchema>;
export type RefreshUrlsBody = z.infer<typeof refreshUrlsBodySchema>;

//-----------------------------------------------------------------------------
// Response schemas
//-----------------------------------------------------------------------------
//
// Exact "contract" schemas for each endpoint's JSON body. Built with
// `strictObject` so unexpected/renamed fields are rejected — that strictness is
// the whole point of validating responses: it catches our own contract drift
// (e.g. a refactor accidentally adding or dropping a field). Used to assert
// response shape in the integration tests. NOTE: `abort` returns 204 with no
// body, so it has no response schema.

const byteRangeSchema = z.strictObject({
  start: z.number().int(),
  end: z.number().int(),
});

// A presigned URL for a single part, with its expiry (refresh-urls response item).
const presignedUrlPartSchema = z.strictObject({
  partNumber: z.number().int(),
  method: z.enum(["POST", "PUT"]),
  presignedUrl: z.string(),
  presignedUrlExpiration: z.number().int(),
});

// initiate merges the byte-range part with its presigned URL info.
const initiatePartSchema = z.strictObject({
  partNumber: z.number().int(),
  byteRange: byteRangeSchema,
  method: z.enum(["POST", "PUT"]),
  presignedUrl: z.string(),
  presignedUrlExpiration: z.number().int(),
});

export const completeResponseSchema = z.strictObject({}); // 202, body is `{}`

export const initiateResponseSchema = z.strictObject({
  id: z.string(),
  parts: z.array(initiatePartSchema),
});

export const refreshUrlsResponseSchema = z.strictObject({
  id: z.string(),
  parts: z.array(presignedUrlPartSchema),
});

export type CompleteResponse = z.infer<typeof completeResponseSchema>;
export type InitiateResponse = z.infer<typeof initiateResponseSchema>;
export type RefreshUrlsResponse = z.infer<typeof refreshUrlsResponseSchema>;
