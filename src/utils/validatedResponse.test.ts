import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { Response } from "express";
import { sendValidatedJson } from "./validatedResponse";

function mockRes() {
  const res = {} as Response;
  res.json = vi.fn().mockReturnValue(res);
  res.sendStatus = vi.fn().mockReturnValue(res);
  return res;
}

const schema = z.strictObject({ id: z.string() });

describe("sendValidatedJson", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the parsed payload as JSON when it matches the schema", () => {
    const res = mockRes();

    sendValidatedJson(res, schema, { id: "abc" });

    expect(res.json).toHaveBeenCalledWith({ id: "abc" });
    expect(res.sendStatus).not.toHaveBeenCalled();
  });

  it("returns 500 and logs (does not leak body) when the payload violates the contract", () => {
    const res = mockRes();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    // Extra field => strictObject rejects it: a server-side contract violation.
    sendValidatedJson(res, schema, { id: "abc", bogus: 1 });

    expect(res.sendStatus).toHaveBeenCalledWith(500);
    expect(res.json).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Response contract violation:", expect.anything());
  });
});
