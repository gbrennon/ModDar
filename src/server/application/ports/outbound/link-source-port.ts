/**
 * Outbound ports for fetching Reddit Link data.
 *
 * These ports define the contract between the application layer and
 * infrastructure adapters (e.g. PRAW) that provide access to Reddit's API.
 */

import type { Link } from "../../../domain/link.ts";

/**
 * Fetch Links from a Reddit data source.
 *
 * Implementations wrap a Reddit API client (e.g. PRAW) to retrieve
 * ``Link`` entities from Reddit. The port exposes three queries that
 * together enable the ``DetectCrossSubredditSpamPort`` use-case:
 *
 * - `fetchLink` – Retrieve the Link under review.
 * - `fetchAccountLinks` – Find other Links posted by the same Account
 *   (potentially across different subreddits) for similarity comparison.
 * - `listSubredditLinks` – Browse recent Links from a subreddit to
 *   discover near-duplicate posts.
 *
 * Each method is ``async`` because real implementations perform
 * network-bound Reddit API calls.
 */
export interface LinkSourcePort {
  /**
   * Fetch a single Link by its subreddit and base-36 identifier.
   *
   * @param subreddit - The subreddit name (e.g. ``"scala"``) where the
   *   Link was posted.
   * @param id36 - The base-36 portion of the Link's fullname — the unique
   *   identifier from the Reddit API (e.g. ``"1tckzwt"``).
   * @returns The matching ``Link`` if found, or ``null`` when the Link
   *   does not exist or is inaccessible (e.g. deleted or private).
   */
  fetchLink(subreddit: string, id36: string): Promise<Link | null>;

  /**
   * Fetch all Links posted by a given Reddit Account.
   *
   * @param accountId - The account's unique identifier (e.g. ``"u1"``).
   * @returns A list of ``Link`` entities belonging to the Account. An
   *   empty list means the Account has no visible Links or does
   *   not exist.
   */
  fetchAccountLinks(accountId: string): Promise<Link[]>;

  /**
   * List recent Links from a subreddit, newest first.
   *
   * @param subreddit - The subreddit name whose Links to list.
   * @param limit - Maximum number of Links to return (capped by the
   *   underlying API; defaults to 25).
   * @returns A list of the most recent ``Link`` entities from the
   *   subreddit, or an empty list if the subreddit has no posts or
   *   does not exist.
   */
  listSubredditLinks(subreddit: string, limit?: number): Promise<Link[]>;
}
