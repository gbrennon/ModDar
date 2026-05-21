/**
 * Composition root — the single entry-point where the full object graph is
 * assembled from infrastructure through to presentation.
 *
 * By keeping all wiring in one place we respect the Dependency Rule:
 * low-level details never leak into the domain or application layers.
 *
 * Each factory function is exported separately so tests can supply stubs
 * and verify wiring without pulling in the real Devvit runtime.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { reddit } from "@devvit/web/server";
import type { RedditApi } from "#server/infrastructure/link-source-adapter";
import { RedditApiAdapter } from "#server/infrastructure/reddit-api-adapter";
import { Container, type ContainerConfig } from "#server/infrastructure/container";
import type { DetectCrossSubredditSpamPort } from "#server/application/ports/inbound/detect-cross-subreddit-spam-port";
import { handleReviewLink } from "./review-link-handler.ts";

// ---------------------------------------------------------------------------
// Factory functions (testable)
// ---------------------------------------------------------------------------

/**
 * Create the DI container wired to a given ``RedditApi``.
 *
 * Exported for testing so callers can supply a test double for the Reddit
 * API and verify the container is created correctly.
 */
export function createContainer(
  redditApi: RedditApi,
  config?: ContainerConfig,
): Container {
  return new Container(redditApi, config);
}

/**
 * Create a pre-wired ``reviewLinkHandler`` bound to an application service.
 *
 * The returned handler has the same signature as the original ``handleReviewLink``
 * but the service is already injected — callers don't need to know about the
 * container or port interfaces.
 *
 * @param service - A fully-wired ``DetectCrossSubredditSpamPort`` implementation.
 */
export function createReviewLinkHandler(
  service: DetectCrossSubredditSpamPort,
): (req: IncomingMessage, rsp: ServerResponse) => Promise<void> {
  return (req: IncomingMessage, rsp: ServerResponse): Promise<void> =>
    handleReviewLink(req, rsp, service);
}

// ---------------------------------------------------------------------------
// Production wiring (not under coverage — depends on Devvit runtime)
// ---------------------------------------------------------------------------

/**
 * Production singleton — wraps the real Devvit ``reddit`` plugin.
 *
 * Configuration can be driven by environment variables when needed.
 */
const productionContainer = createContainer(new RedditApiAdapter(reddit), {
  similarityThreshold: 0.7,
});

/**
 * Handle a review-link HTTP request using the production-wired service.
 *
 * @param req - Incoming HTTP request.
 * @param rsp - Outgoing HTTP response.
 */
export const reviewLinkHandler: (req: IncomingMessage, rsp: ServerResponse) => Promise<void> = createReviewLinkHandler(
  productionContainer.detectCrossSubredditSpamService,
);
