/**
 * Tests for the composition-root factory functions.
 *
 * Covers ``createContainer`` (container wiring from a ``RedditApi``) and
 * ``createReviewLinkHandler`` (pre-wired handler delegation).
 */

import { describe, it, expect, vi } from "vitest";
import { IncomingMessage, ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import {
  createContainer,
  createReviewLinkHandler,
} from "#server/presentation/composition-root";
import type { RedditApi, RedditPost } from "#server/infrastructure/link-source-adapter";
import type { DetectCrossSubredditSpamPort } from "#server/application/ports/inbound/detect-cross-subreddit-spam-port";
import type { ReviewLinkRequest } from "#server/application/dtos/requests/review-link-request";
import type { ReviewLinkResponse } from "#server/application/dtos/responses/review-link-response";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/** Minimal ``RedditApi`` double. */
function makeRedditApi(overrides: Partial<RedditApi> = {}): RedditApi {
  return {
    getPost: async (_postId: string): Promise<RedditPost | null> => null,
    getPosts: async (_options: {
      subredditName: string;
      limit: number;
    }): Promise<RedditPost[]> => [],
    getUserPosts: async (_options: {
      userId: string;
      limit: number;
    }): Promise<RedditPost[]> => [],
    ...overrides,
  };
}

/** A writable ``ServerResponse`` that captures status, headers and body. */
class TestResponse extends EventEmitter {
  statusCode = 0;
  headers: Record<string, string | number | undefined> = {};
  private _body = "";

  writeHead(
    statusCode: number,
    headers?: Record<string, string | number>,
  ): this {
    this.statusCode = statusCode;
    if (headers) {
      this.headers = headers;
    }
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

// ---------------------------------------------------------------------------
// createContainer
// ---------------------------------------------------------------------------

describe("createContainer", () => {
  it("returns a Container when given a RedditApi", () => {
    const api = makeRedditApi();
    const container = createContainer(api);

    expect(container).toBeDefined();
  });

  it("the returned container exposes a working detectCrossSubredditSpamService", () => {
    const api = makeRedditApi();
    const container = createContainer(api);

    const service = container.detectCrossSubredditSpamService;

    // The service should have the execute method from the port.
    expect(typeof service.execute).toBe("function");
  });

  it("passes similarityThreshold config through to the container", () => {
    const api = makeRedditApi();
    const container = createContainer(api, { similarityThreshold: 0.85 });

    const service = container.detectCrossSubredditSpamService as {
      similarityThreshold: number;
    };
    expect(service.similarityThreshold).toBe(0.85);
  });

  it("defaults similarityThreshold to 0.7 when no config is given", () => {
    const api = makeRedditApi();
    const container = createContainer(api);

    const service = container.detectCrossSubredditSpamService as {
      similarityThreshold: number;
    };
    expect(service.similarityThreshold).toBe(0.7);
  });

  it("wires the full dependency graph inside the container", () => {
    const api = makeRedditApi();
    const container = createContainer(api);

    // Force materialisation of the full graph.
    expect(() => container.detectCrossSubredditSpamService).not.toThrow();
    expect(container.linkSourceAdapter).toBeDefined();
    expect(container.candidateFetcher).toBeDefined();
    expect(container.similarity).toBeDefined();
    expect(container.linkSnapshotMapper).toBeDefined();
  });

  it("creates independent containers for different callers", () => {
    const api1 = makeRedditApi();
    const api2 = makeRedditApi();

    const c1 = createContainer(api1);
    const c2 = createContainer(api2);

    expect(c1).not.toBe(c2);
    expect(c1.linkSourceAdapter).not.toBe(c2.linkSourceAdapter);
  });
});

// ---------------------------------------------------------------------------
// createReviewLinkHandler
// ---------------------------------------------------------------------------

describe("createReviewLinkHandler", () => {
  it("returns a function", () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);

    expect(typeof handler).toBe("function");
  });

  it("delegates to handleReviewLink with the bound service", async () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "scala", id36: "abc123" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    // The stub service's execute should have been called.
    expect(service.execute).toHaveBeenCalledTimes(1);
    expect(service.execute).toHaveBeenCalledWith({
      subreddit: "scala",
      id36: "abc123",
    });
  });

  it("returns a 200 status on successful delegation", async () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "scala", id36: "abc123" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.statusCode).toBe(200);
  });

  it("returns a 400 status on invalid input (missing id36)", async () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "scala" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.statusCode).toBe(400);
    // The service should not have been called since validation fails.
    expect(service.execute).not.toHaveBeenCalled();
  });

  it("returns a 400 status on empty subreddit", async () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "", id36: "abc" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.statusCode).toBe(400);
    expect(service.execute).not.toHaveBeenCalled();
  });

  it("returns a 404 when the service throws a not-found error", async () => {
    const service = makeStubService(
      new Error('Link not found: subreddit="missing", id36="nope"'),
    );
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "missing", id36: "nope" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.statusCode).toBe(404);
  });

  it("returns a 500 when the service throws an unexpected error", async () => {
    const service = makeStubService(new Error("Something went wrong"));
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "scala", id36: "abc" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.statusCode).toBe(500);
  });

  it("returns correct Content-Type header on success", async () => {
    const service = makeStubService();
    const handler = createReviewLinkHandler(service);
    const req = makeRequest({ subreddit: "scala", id36: "abc" });
    const rsp = new TestResponse();

    await handler(req, rsp as unknown as ServerResponse);

    expect(rsp.headers["Content-Type"]).toBe("application/json");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A stub service whose ``execute`` returns a success response or throws. */
function makeStubService(
  responseOrError?: ReviewLinkResponse | Error,
): DetectCrossSubredditSpamPort {
  return {
    execute: vi
      .fn<DetectCrossSubredditSpamPort["execute"]>()
      .mockImplementation(async (_req: ReviewLinkRequest) => {
        if (responseOrError instanceof Error) {
          throw responseOrError;
        }
        return (
          responseOrError ??
          ({
            originalLink: {
              id36: "abc123",
              title: "Test",
              text: "Body",
              accountId: "u1",
            },
            matches: [],
          } as ReviewLinkResponse)
        );
      }),
  };
}

/** A readable ``IncomingMessage`` stub that emits the given JSON body. */
function makeRequest(body: unknown): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  const json = JSON.stringify(body);
  const buf = Buffer.from(json);

  Object.defineProperty(req, "on", {
    value: (
      event: string,
      listener: (...args: unknown[]) => void,
    ): IncomingMessage => {
      if (event === "data") {
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
