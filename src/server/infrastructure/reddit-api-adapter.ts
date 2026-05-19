/**
 * Adapter that wraps the real Devvit ``RedditClient`` and implements
 * ``RedditApi`` — the minimal port used by infrastructure adapters.
 *
 * This is the *single* place where the concrete Devvit types cross into
 * the application's port definitions.  All other code depends only on
 * ``RedditApi`` and is therefore fully testable without Devvit.
 */

import type { RedditClient, Post } from "@devvit/web/server";
import type { RedditApi, RedditPost } from "./link-source-adapter.ts";

/**
 * Convert a Devvit ``Post`` to the portable ``RedditPost`` shape.
 * Exported for testing.
 */
export function devvitPostToRedditPost(post: Post): RedditPost {
  return {
    id: stripT3Prefix(post.id),
    title: post.title,
    selftext: post.body ?? "",
    authorId: stripT2Prefix(post.authorId ?? ""),
    subredditName: post.subredditName,
    linkFlairText: post.flair?.text ?? null,
    url: post.url,
  };
}

/** Strip the ``t3_`` / ``t2_`` prefix from a fullname. */
function stripT3Prefix(fullname: string): string {
  return fullname.startsWith("t3_") ? fullname.slice(3) : fullname;
}

/** Strip the ``t2_`` prefix from a fullname. */
function stripT2Prefix(fullname: string): string {
  return fullname.startsWith("t2_") ? fullname.slice(3) : fullname;
}

/**
 * Adapts the real Devvit ``RedditClient`` to the ``RedditApi`` port.
 *
 * The Devvit client uses ``Listing<T>`` (paginated results), whereas
 * ``RedditApi`` returns plain arrays.  This adapter materialises the
 * listing with ``.all()`` and converts ``Post`` instances to plain
 * ``RedditPost`` objects.
 */
export class RedditApiAdapter implements RedditApi {
  private readonly _client: RedditClient;

  constructor(client: RedditClient) {
    this._client = client;
  }

  async getPost(postId: string): Promise<RedditPost | null> {
    const fullname: `t3_${string}` = `t3_${postId}`;
    const post = await this._client.getPostById(fullname);
    if (post === null || post === undefined) {
      return null;
    }
    return devvitPostToRedditPost(post);
  }

  async getPosts(options: {
    subredditName: string;
    limit: number;
  }): Promise<RedditPost[]> {
    const listing = this._client.getNewPosts({
      subredditName: options.subredditName,
      limit: options.limit,
      pageSize: options.limit,
    });
    const posts = await listing.all();
    return posts.map(devvitPostToRedditPost);
  }

  async getUserPosts(options: {
    userId: string;
    limit: number;
  }): Promise<RedditPost[]> {
    const listing = this._client.getPostsByUser({
      username: options.userId,
      limit: options.limit,
      pageSize: options.limit,
      sort: "new",
    });
    const posts = await listing.all();
    return posts.map(devvitPostToRedditPost);
  }
}
