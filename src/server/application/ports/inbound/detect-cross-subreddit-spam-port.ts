/** Inbound port for cross-subreddit spam detection. */

import type { ReviewLinkRequest } from "../../dtos/requests/review-link-request.ts";
import type { ReviewLinkResponse } from "../../dtos/responses/review-link-response.ts";

/**
 * Detect AI karma-farming spam by reviewing a Link against other subreddits.
 *
 * Implementations accept a ``ReviewLinkRequest`` and return a
 * ``ReviewLinkResponse`` containing the original Link together with any
 * similar Links discovered across (potentially distinct) communities.
 */
export interface DetectCrossSubredditSpamPort {
  /**
   * Run the spam-detection review for the given Link.
   *
   * @param request - The input parameters that identify the Link to review
   *   and optionally scope the search or tune the sensitivity.
   * @returns A ``ReviewLinkResponse`` with the original Link and any
   *   matching Links that exceed the similarity threshold.
   */
  execute(request: ReviewLinkRequest): Promise<ReviewLinkResponse>;
}
