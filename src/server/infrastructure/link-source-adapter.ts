/**
 * Infrastructure adapter for ``LinkSourcePort`` backed by the Devvit/Reddit API.
 */

import type { LinkSourcePort } from "../application/ports/outbound/link-source-port.ts";
import { Link } from "../domain/link.ts";

/**
 * Minimal interface for the Reddit API surface needed by this adapter.
 * Allows both the real Devvit ``reddit`` object and test doubles.
 */
export interface RedditApi {
  getPost(postId: string): Promise<RedditPost | null>;
  getPosts(options: {
    subredditName: string;
    limit: number;
  }): Promise<RedditPost[]>;
  getUserPosts(options: {
    userId: string;
    limit: number;
  }): Promise<RedditPost[]>;
}

/** Shape of a post returned by the Reddit API. */
export interface RedditPost {
  readonly id: string;
  readonly title: string;
  readonly selftext: string;
  readonly authorId: string;
  readonly subredditName: string;
  readonly linkFlairText: string | null;
  readonly url: string | null;
}

/**
 * Convert a Reddit API post to a domain ``Link``.
 * Exported for testing.
 */
export function redditPostToLink(post: RedditPost): Link {
  return new Link({
    id36: post.id,
    title: post.title,
    text: post.selftext,
    accountId: post.authorId,
    subreddit: post.subredditName,
    flairs: post.linkFlairText !== null ? [post.linkFlairText] : [],
    url: post.url ?? null,
    images: null,
  });
}

/**
 * Adapter that fetches Links from Reddit via the Devvit SDK.
 *
 * Implements ``LinkSourcePort`` by wrapping a ``RedditApi`` instance
 * (the real ``reddit`` plugin from ``@devvit/web/server`` or a test double).
 */
export class LinkSourceAdapter implements LinkSourcePort {
  private readonly _reddit: RedditApi;

  constructor(reddit: RedditApi) {
    this._reddit = reddit;
  }

  async fetchLink(subreddit: string, id36: string): Promise<Link | null> {
    // Build the fullname: t3_<id36>
    const fullname = `t3_${id36}`;
    const post = await this._reddit.getPost(fullname);
    if (post === null) {
      return null;
    }
    // Verify subreddit matches (belt-and-suspenders)
    if (post.subredditName.toLowerCase() !== subreddit.toLowerCase()) {
      return null;
    }
    return redditPostToLink(post);
  }

  async fetchAccountLinks(accountId: string): Promise<Link[]> {
    const posts = await this._reddit.getUserPosts({
      userId: accountId,
      limit: 100,
    });
    return posts.map(redditPostToLink);
  }

  async listSubredditLinks(
    subreddit: string,
    limit: number = 25,
  ): Promise<Link[]> {
    const posts = await this._reddit.getPosts({
      subredditName: subreddit,
      limit,
    });
    return posts.map(redditPostToLink);
  }
}
