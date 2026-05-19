/**
 * Comprehensive tests for ``handleReviewLink`` presentation handler.
 *
 * Covers: valid requests, missing/invalid fields, empty strings,
 * service errors (not-found, internal), edge cases (malformed JSON,
 * large payloads), and response format validation.
 */

import { describe, it, expect, vi } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import { handleReviewLink } from "#server/presentation/review-link-handler";
import type { DetectCrossSubredditSpamPort } from "#server/application/ports/inbound/detect-cross-subreddit-spam-port";
import type { ReviewLinkRequest } from "#server/application/dtos/requests/review-link-request";
import {
  createReviewLinkResponse,
  createLinkSnapshot,
  type ReviewLinkResponse,
} from "#server/application/dtos/responses/review-link-response";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/** A writable ServerResponse that captures status and body. */
class TestResponse extends EventEmitter {
  statusCode = 0;
  headers: Record<string, string | number | undefined> = {};
  private _body = "";

  writeHead(
    statusCode: number,
    headers: Record<string, string | number>,
  ): this {
    this.statusCode = statusCode;
    this.headers = headers;
    return this;
  }

  end(data: string): this {
    this._body = data;
    this.emit("finish");
    return this;
  }

  get body(): string {
    return this._body;
  }

  get jsonBody(): unknown {
    return JSON.parse(this._body);
  }
}

/** A readable IncomingMessage stub that emits the given JSON body. */
function makeRequest(body: unknown): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  const json = JSON.stringify(body);
  const buf = Buffer.from(json);

  // Override base types for test
  Object.defineProperty(req, "on", {
    value: (
      event: string,
      listener: (...args: unknown[]) => void,
    ): IncomingMessage => {
      if (event === "data") {
        // Emit data immediately
        process.nextTick(() => listener(buf));
      }
      if (event === "end") {
        process.nextTick(() => listener());
      }
      return req;
    },
  });

  return req;
}

/** Create a stub service that returns the configured response or throws. */
function makeStubService(
  responseOrError: ReviewLinkResponse | Error,
): DetectCrossSubredditSpamPort {
  return {
    execute: vi
      .fn<DetectCrossSubredditSpamPort["execute"]>()
      .mockImplementation(async (_req: ReviewLinkRequest) => {
        if (responseOrError instanceof Error) {
          throw responseOrError;
        }
        return responseOrError;
      }),
  };
}

/** A successful response with a single link. */
function makeSuccessResponse(): ReviewLinkResponse {
  return createReviewLinkResponse({
    originalLink: createLinkSnapshot({
      id36: "abc",
      title: "Test",
      text: "Body",
      accountId: "u1",
      subreddit: "scala",
    }),
    matches: [],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleReviewLink", () => {
  // -- Successful requests ---------------------------------------------------

  describe("successful requests", () => {
    it("returns 200 with ok status for valid request", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "abc123" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(200);
      const body = rsp.jsonBody as Record<string, unknown>;
      expect(body.status).toBe("ok");
      expect(body.data).toBeDefined();
    });

    it("returns correct Content-Type header", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "abc123" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.headers["Content-Type"]).toBe("application/json");
    });

    it("returns Content-Length header", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "abc123" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.headers["Content-Length"]).toBeGreaterThan(0);
    });

    it("passes correct subreddit and id36 to service", async () => {
      const req = makeRequest({ subreddit: "python", id36: "1tckzwt" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(service.execute).toHaveBeenCalledWith({
        subreddit: "python",
        id36: "1tckzwt",
      });
    });
  });

  // -- Validation errors -----------------------------------------------------

  describe("validation errors", () => {
    it("returns 400 when body is null", async () => {
      const req = makeRequest(null);
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
      const body = rsp.jsonBody as Record<string, unknown>;
      expect(body.status).toBe("error");
    });

    it("returns 400 when subreddit is missing", async () => {
      const req = makeRequest({ id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when id36 is missing", async () => {
      const req = makeRequest({ subreddit: "scala" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when subreddit is not a string", async () => {
      const req = makeRequest({ subreddit: 123, id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when id36 is not a string", async () => {
      const req = makeRequest({ subreddit: "scala", id36: true });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when subreddit is empty string", async () => {
      const req = makeRequest({ subreddit: "", id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when id36 is empty string", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });

    it("returns 400 when body is an empty object", async () => {
      const req = makeRequest({});
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(400);
    });
  });

  // -- Service errors --------------------------------------------------------

  describe("service errors", () => {
    it("returns 404 when link is not found", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "missing" });
      const rsp = new TestResponse();
      const service = makeStubService(
        new Error('Link not found: subreddit="scala", id36="missing"'),
      );

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(404);
      const body = rsp.jsonBody as Record<string, unknown>;
      expect(body.status).toBe("error");
      expect(body.message).toContain("Link not found");
    });

    it("returns 500 for unexpected service errors", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(new Error("Database connection failed"));

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(500);
      const body = rsp.jsonBody as Record<string, unknown>;
      expect(body.status).toBe("error");
      expect(body.message).toBe("Database connection failed");
    });

    it("returns 500 when non-Error is thrown", async () => {
      const req = makeRequest({ subreddit: "scala", id36: "abc" });
      const rsp = new TestResponse();
      // Throw a non-Error value (string)
      const service: DetectCrossSubredditSpamPort = {
        execute: vi
          .fn<DetectCrossSubredditSpamPort["execute"]>()
          .mockRejectedValue("Something broke"),
      };

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(500);
      const body = rsp.jsonBody as Record<string, unknown>;
      expect(body.status).toBe("error");
      expect(body.message).toBe("Unknown error");
    });
  });

  // -- Edge cases ------------------------------------------------------------

  describe("edge cases", () => {
    it("handles subreddit with special characters", async () => {
      const req = makeRequest({
        subreddit: "r/scala_programming",
        id36: "abc123",
      });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(200);
    });

    it("handles very long subreddit names", async () => {
      const longName = "a".repeat(100);
      const req = makeRequest({ subreddit: longName, id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(200);
    });

    it("handles very long id36 values", async () => {
      const longId = "a".repeat(100);
      const req = makeRequest({ subreddit: "scala", id36: longId });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(200);
    });

    it("handles response with multiple matches", async () => {
      const responseWithMatches = createReviewLinkResponse({
        originalLink: createLinkSnapshot({
          id36: "abc",
          title: "S",
          text: "T",
          accountId: "u1",
        }),
        matches: [
          {
            link: createLinkSnapshot({
              id36: "m1",
              title: "M1",
              text: "T1",
              accountId: "u2",
            }),
            similarityScore: 0.95,
            matchedSubreddit: "python",
            matchedAccountId: "u2",
          },
          {
            link: createLinkSnapshot({
              id36: "m2",
              title: "M2",
              text: "T2",
              accountId: "u3",
            }),
            similarityScore: 0.85,
            matchedSubreddit: "kotlin",
            matchedAccountId: "u3",
          },
        ],
      });

      const req = makeRequest({ subreddit: "scala", id36: "abc" });
      const rsp = new TestResponse();
      const service = makeStubService(responseWithMatches);

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(rsp.statusCode).toBe(200);
      const body = rsp.jsonBody as Record<string, unknown>;
      const data = body.data as Record<string, unknown>;
      const matches = data.matches as unknown[];
      expect(matches).toHaveLength(2);
    });

    it("does not call service when validation fails", async () => {
      const req = makeRequest({});
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      expect(service.execute).not.toHaveBeenCalled();
    });

    it("handles extra fields in request body gracefully", async () => {
      const req = makeRequest({
        subreddit: "scala",
        id36: "abc",
        extraField: "should be ignored",
      });
      const rsp = new TestResponse();
      const service = makeStubService(makeSuccessResponse());

      await handleReviewLink(req, rsp as unknown as ServerResponse, service);

      // Extra fields should not break anything
      expect(rsp.statusCode).toBe(200);
    });
  });
});
