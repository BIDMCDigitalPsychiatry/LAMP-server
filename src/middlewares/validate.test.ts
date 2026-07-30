import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Request, Response } from "express";
import { validate } from "./validate";

function mockReqRes(reqProps: Partial<Request>) {
  const req = { body: {}, query: {}, params: {}, ...reqProps } as Request;
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  const next = vi.fn();
  return { req, res, next };
}

describe("validate middleware", () => {
  it("parses valid sections into req.validated and calls next()", () => {
    const { req, res, next } = mockReqRes({
      body: { id: "abc" },
      params: { participantId: "part123" },
    });

    validate({
      body: z.object({ id: z.string() }),
      params: z.object({ participantId: z.string() }),
    })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // no error argument
    expect(req.validated.body).toEqual({ id: "abc" });
    expect(req.validated.params).toEqual({ participantId: "part123" });
    expect(req.validated.query).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("applies coercion/transforms (parse, don't validate)", () => {
    const { req, res, next } = mockReqRes({ query: { page: "42" } });

    validate({ query: z.object({ page: z.coerce.number() }) })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validated.query).toEqual({ page: 42 }); // string coerced to number
  });

  it("returns 400 with the zod-flattened error and does not call next() on invalid input", () => {
    const { req, res, next } = mockReqRes({ body: {} });

    validate({ body: z.object({ id: z.string() }) })(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "ValidationError",
      issues: expect.objectContaining({
        fieldErrors: expect.objectContaining({ id: expect.any(Array) }),
      }),
    });
    expect(next).not.toHaveBeenCalled();
    expect(req.validated).toBeUndefined();
  });

  it("forwards non-Zod errors to next(err)", () => {
    const { req, res, next } = mockReqRes({ body: {} });
    const boom = new Error("boom");
    const throwingSchema = { parse: () => { throw boom; } } as unknown as z.ZodType;

    validate({ body: throwingSchema })(req, res, next);

    expect(next).toHaveBeenCalledWith(boom);
    expect(res.status).not.toHaveBeenCalled();
  });
});
