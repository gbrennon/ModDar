/**
 * Presentation-layer handler for the cross-subreddit spam review endpoint.
 *
 * Parses incoming HTTP requests, delegates to the application service,
 * and returns serialised JSON responses.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { once } from "node:events";
import type { DetectCrossSubredditSpamPort } from "../application/ports/inbound/detect-cross-subreddit-spam-port.ts";
import {
  createReviewLinkRequest,
  type ReviewLinkRequest,
} from "../application/dtos/requests/review-link-request.ts";
import type { ReviewLinkResponse } from "../application/dtos/responses/review-link-response.ts";

/** Shape of the JSON body expected from a review-link request. */
export interface ReviewLinkRequestBody {
  subreddit: string;
  id36: string;
}

/** Shape of a successful JSON response. */
export interface ReviewLinkSuccessResponse {
  readonly status: "ok";
  readonly data: ReviewLinkResponse;
}

/** Shape of an error JSON response. */
export interface ReviewLinkErrorResponse {
  readonly status: "error";
  readonly message: string;
}

export type ReviewLinkApiResponse =
  | ReviewLinkSuccessResponse
  | ReviewLinkErrorResponse;

/**
 * Handle an HTTP request for the review-link endpoint.
 *
 * @param req - Incoming HTTP request.
 * @param rsp - Outgoing HTTP response.
 * @param service - The application service to delegate to.
 */
export async function handleReviewLink(
  req: IncomingMessage,
  rsp: ServerResponse,
  service: DetectCrossSubredditSpamPort,
): Promise<void> {
  try {
    const body = await readJSON<ReviewLinkRequestBody>(req);

    // Validate input
    if (!body || typeof body.subreddit !== "string" || typeof body.id36 !== "string") {
      writeJSON<ReviewLinkErrorResponse>(
        400,
        { status: "error", message: "Invalid request: subreddit and id36 are required strings" },
        rsp,
      );
      return;
    }

    if (body.subreddit.length === 0 || body.id36.length === 0) {
      writeJSON<ReviewLinkErrorResponse>(
        400,
        { status: "error", message: "Invalid request: subreddit and id36 must not be empty" },
        rsp,
      );
      return;
    }

    const request: ReviewLinkRequest = createReviewLinkRequest({
      subreddit: body.subreddit,
      id36: body.id36,
    });

    const result = await service.execute(request);

    writeJSON<ReviewLinkSuccessResponse>(
      200,
      { status: "ok", data: result },
      rsp,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";

    // Determine if it's a "not found" error
    const status = message.includes("Link not found") ? 404 : 500;

    writeJSON<ReviewLinkErrorResponse>(
      status,
      { status: "error", message },
      rsp,
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers (same pattern as existing server.ts)
// ---------------------------------------------------------------------------

function writeJSON<T>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json);
  const len = Buffer.byteLength(body);
  rsp.writeHead(status, {
    "Content-Length": len,
    "Content-Type": "application/json",
  });
  rsp.end(body);
}

async function readJSON<T>(req: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];
  req.on("data", (chunk) => chunks.push(chunk));
  await once(req, "end");
  return JSON.parse(`${Buffer.concat(chunks)}`);
}
