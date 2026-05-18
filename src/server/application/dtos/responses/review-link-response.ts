/**
 * DTOs returned by the cross-subreddit spam-detection use-case.
 */

/** Primitive-only snapshot of a Reddit Link, safe to cross the application
 * boundary without exposing domain internals to external callers. */
export interface LinkSnapshot {
  readonly id36: string;
  readonly title: string;
  readonly text: string;
  readonly accountId: string;
  readonly subreddit: string | null;
  readonly flairs: readonly string[];
  readonly url: string | null;
  readonly images: readonly string[] | null;
}

/** Create a LinkSnapshot with defaults for optional fields. */
export function createLinkSnapshot(fields: {
  id36: string;
  title: string;
  text: string;
  accountId: string;
  subreddit?: string | null;
  flairs?: readonly string[] | null;
  url?: string | null;
  images?: readonly string[] | null;
}): LinkSnapshot {
  return {
    id36: fields.id36,
    title: fields.title,
    text: fields.text,
    accountId: fields.accountId,
    subreddit: fields.subreddit ?? null,
    flairs: fields.flairs ?? [],
    url: fields.url ?? null,
    images: fields.images ?? null,
  };
}

/**
 * A single similar-Link match found during a review.
 *
 * Embodies the evidence that two Links across (potentially distinct)
 * subreddits share enough textual similarity to warrant a moderator's
 * attention.
 */
export interface LinkMatch {
  readonly link: LinkSnapshot;
  readonly similarityScore: number;
  readonly matchedSubreddit: string;
  readonly matchedAccountId: string;
}

/** Create a LinkMatch. */
export function createLinkMatch(fields: {
  link: LinkSnapshot;
  similarityScore: number;
  matchedSubreddit: string;
  matchedAccountId: string;
}): LinkMatch {
  return {
    link: fields.link,
    similarityScore: fields.similarityScore,
    matchedSubreddit: fields.matchedSubreddit,
    matchedAccountId: fields.matchedAccountId,
  };
}

/**
 * Outcome of a spam-detection review for a single Link.
 *
 * Wraps the original Link together with any similar Links discovered
 * across other subreddits.
 */
export interface ReviewLinkResponse {
  readonly originalLink: LinkSnapshot;
  readonly matches: readonly LinkMatch[];
}

/** Create a ReviewLinkResponse with default empty matches. */
export function createReviewLinkResponse(fields: {
  originalLink: LinkSnapshot;
  matches?: readonly LinkMatch[];
}): ReviewLinkResponse {
  return {
    originalLink: fields.originalLink,
    matches: fields.matches ?? [],
  };
}
