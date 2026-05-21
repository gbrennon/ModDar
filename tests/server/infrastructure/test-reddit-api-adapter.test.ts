/**
 * Tests for ``RedditApiAdapter`` — the Devvit ``RedditClient`` → ``RedditApi`` bridge.
 *
 * Verifies method name mapping, ``Listing.all()`` materialisation, and
 * ``Post`` → ``RedditPost`` conversion.
 */

import { describe, it, expect, vi } from "vitest";
import {
  RedditApiAdapter,
  devvitPostToRedditPost,
} from "#server/infrastructure/reddit-api-adapter";
import type { RedditClient, Post } from "@devvit/web/server";

// ---------------------------------------------------------------------------
// Minimal stubs matching the Devvit shapes we depend on
// ---------------------------------------------------------------------------

type PostStubOverrides = {
  id?: string;
  title?: string;
  body?: string | undefined;
  authorId?: string | undefined;
  subredditName?: string;
  flairText?: string | null;
  url?: string;
};

/** A minimal ``Post`` stub for testing conversion. */
function makePost(overrides: PostStubOverrides = {}): Post {
  return {
    id: "id" in overrides ? overrides.id! : "t3_abc123",
    title: overrides.title ?? "Test Post",
    body: "body" in overrides ? overrides.body! : "Body text",
    authorId: "authorId" in overrides ? overrides.authorId! : "t2_u1",
    subredditName: overrides.subredditName ?? "scala",
    flair: overrides.flairText !== undefined
      ? (overrides.flairText === null ? undefined : { text: overrides.flairText } as unknown as Post["flair"])
      : ({ text: "Discussion" } as unknown as Post["flair"]),
    url: overrides.url ?? "https://example.com",
    getDuplicates: vi.fn(),
    comments: { all: vi.fn().mockResolvedValue([]) },
  } as unknown as Post;
}

/** A minimal ``RedditClient`` stub for testing the adapter. */
function makeRedditClient(overrides: Partial<{
  getPostById: ReturnType<typeof vi.fn>;
  getNewPosts: ReturnType<typeof vi.fn>;
  getPostsByUser: ReturnType<typeof vi.fn>;
}> = {}): RedditClient {
  return {
    getPostById: vi.fn().mockResolvedValue(undefined),
    getNewPosts: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    }),
    getPostsByUser: vi.fn().mockReturnValue({
      all: vi.fn().mockResolvedValue([]),
    }),
    ...overrides,
  } as unknown as RedditClient;
}

// ---------------------------------------------------------------------------
// devvitPostToRedditPost
// ---------------------------------------------------------------------------

describe("devvitPostToRedditPost", () => {
  it("strips the t3_ prefix from id", () => {
    const post = makePost({ id: "t3_abc123" });
    const result = devvitPostToRedditPost(post);
    expect(result.id).toBe("abc123");
  });

  it("strips the t2_ prefix from authorId", () => {
    const post = makePost({ authorId: "t2_user99" });
    const result = devvitPostToRedditPost(post);
    expect(result.authorId).toBe("user99");
  });

  it("maps title correctly", () => {
    const post = makePost({ title: "A Great Title" });
    const result = devvitPostToRedditPost(post);
    expect(result.title).toBe("A Great Title");
  });

  it("maps body as selftext", () => {
    const post = makePost({ body: "Self text here" });
    const result = devvitPostToRedditPost(post);
    expect(result.selftext).toBe("Self text here");
  });

  it("defaults selftext to empty string when body is undefined", () => {
    const post = makePost({ body: undefined });
    const result = devvitPostToRedditPost(post);
    expect(result.selftext).toBe("");
  });

  it("maps subredditName correctly", () => {
    const post = makePost({ subredditName: "programming" });
    const result = devvitPostToRedditPost(post);
    expect(result.subredditName).toBe("programming");
  });

  it("maps flair text when present", () => {
    const post = makePost({ flairText: "Help" });
    const result = devvitPostToRedditPost(post);
    expect(result.linkFlairText).toBe("Help");
  });

  it("maps null flair when flair is undefined", () => {
    const post = makePost({ flairText: null });
    const result = devvitPostToRedditPost(post);
    expect(result.linkFlairText).toBeNull();
  });

  it("maps url correctly", () => {
    const post = makePost({ url: "https://reddit.com/r/scala" });
    const result = devvitPostToRedditPost(post);
    expect(result.url).toBe("https://reddit.com/r/scala");
  });

  it("handles id without t3_ prefix gracefully", () => {
    const post = makePost({ id: "abc123" });
    const result = devvitPostToRedditPost(post);
    expect(result.id).toBe("abc123");
  });

  it("handles undefined authorId gracefully", () => {
    const post = makePost({ authorId: undefined });
    const result = devvitPostToRedditPost(post);
    expect(result.authorId).toBe("");
  });
});

// ---------------------------------------------------------------------------
// RedditApiAdapter
// ---------------------------------------------------------------------------

describe("RedditApiAdapter", () => {
  describe("getPost", () => {
    it("builds t3_ fullname and delegates to getPostById", async () => {
      const getPostById = vi.fn().mockResolvedValue(undefined);
      const client = makeRedditClient({ getPostById });
      const adapter = new RedditApiAdapter(client);

      await adapter.getPost("abc123");

      expect(getPostById).toHaveBeenCalledWith("t3_abc123");
    });

    it("returns null when post is undefined", async () => {
      const client = makeRedditClient({
        getPostById: vi.fn().mockResolvedValue(undefined),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getPost("abc");

      expect(result).toBeNull();
    });

    it("returns RedditPost when post is found", async () => {
      const devvitPost = makePost({
        id: "t3_xyz",
        title: "Found",
        subredditName: "test",
      });
      const client = makeRedditClient({
        getPostById: vi.fn().mockResolvedValue(devvitPost),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getPost("xyz");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("xyz");
      expect(result!.title).toBe("Found");
    });
  });

  describe("getPosts", () => {
    it("calls getNewPosts and materialises the listing", async () => {
      const post = makePost({ id: "t3_p1", title: "P1" });
      const listing = { all: vi.fn().mockResolvedValue([post]) };
      const client = makeRedditClient({
        getNewPosts: vi.fn().mockReturnValue(listing),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getPosts({
        subredditName: "scala",
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("p1");
    });

    it("returns empty array for empty listing", async () => {
      const listing = { all: vi.fn().mockResolvedValue([]) };
      const client = makeRedditClient({
        getNewPosts: vi.fn().mockReturnValue(listing),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getPosts({
        subredditName: "scala",
        limit: 5,
      });

      expect(result).toEqual([]);
    });
  });

  describe("getUserPosts", () => {
    it("calls getPostsByUser and materialises the listing", async () => {
      const post = makePost({ id: "t3_up1", title: "User Post" });
      const listing = { all: vi.fn().mockResolvedValue([post]) };
      const client = makeRedditClient({
        getPostsByUser: vi.fn().mockReturnValue(listing),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getUserPosts({
        userId: "user1",
        limit: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("up1");
    });

    it("returns empty array for user with no posts", async () => {
      const listing = { all: vi.fn().mockResolvedValue([]) };
      const client = makeRedditClient({
        getPostsByUser: vi.fn().mockReturnValue(listing),
      });
      const adapter = new RedditApiAdapter(client);

      const result = await adapter.getUserPosts({
        userId: "nobody",
        limit: 50,
      });

      expect(result).toEqual([]);
    });
  });
});
