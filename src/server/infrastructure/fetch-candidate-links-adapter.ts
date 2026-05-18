/**
 * Infrastructure adapter for ``FetchCandidateLinksPort``.
 *
 * Fetches candidate Links by looking at the same Account's posts
 * in different subreddits — the most common cross-subreddit spam pattern.
 */

import type { FetchCandidateLinksPort } from "../application/ports/outbound/fetch-candidate-links-port.ts";
import type { LinkSourcePort } from "../application/ports/outbound/link-source-port.ts";
import type { Link } from "../domain/link.ts";

/**
 * Adapter that fetches candidate Links for similarity comparison.
 *
 * Strategy: fetch all Links from the same Account, then filter to only
 * those posted in subreddits *different* from the source Link's subreddit.
 * This catches the classic spam pattern where a user posts slightly
 * tweaked text to multiple communities.
 */
export class FetchCandidateLinksAdapter implements FetchCandidateLinksPort {
  private readonly _linkSource: LinkSourcePort;

  constructor(linkSource: LinkSourcePort) {
    this._linkSource = linkSource;
  }

  async fetchCandidates(source: Link, limit: number = 100): Promise<Link[]> {
    const accountLinks = await this._linkSource.fetchAccountLinks(
      source.accountId,
    );

    // Filter to different subreddits and respect the limit.
    const candidates: Link[] = [];
    for (const link of accountLinks) {
      if (candidates.length >= limit) {
        break;
      }
      // Exclude links in the same subreddit as the source.
      if (
        source.subreddit !== null &&
        link.subreddit?.toLowerCase() === source.subreddit.toLowerCase()
      ) {
        continue;
      }
      // Exclude the source link itself (same id36).
      if (link.id36 === source.id36) {
        continue;
      }
      candidates.push(link);
    }

    return candidates;
  }
}
