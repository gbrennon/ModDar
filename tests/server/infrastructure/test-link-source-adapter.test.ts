/**
 * Comprehensive tests for ``LinkSourceAdapter``.
 *
 * Covers: successful fetches, missing posts, subreddit mismatches,
 * empty results, API errors, rate limiting, and edge cases.
 */

import { describe, it, expect, vi } from "vitest";
import {
  LinkSourceAdapter,
  redditPostToLink,
  type RedditApi,
  type RedditPost,
} from "#server/infrastructure/link-source-adapter";
import { Link } from "#server/domain/link";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: "abc123",
    title: "Test Post",
    selftext: "This is the post body.",
    authorId: "u1",
    subredditName: "scala",
    linkFlairText: null,
    url: null,
    ...overrides,
  };
}

function makeMockReddit(overrides: Partial<RedditApi> = {}): RedditApi {
  return {
    getPost: vi.fn<RedditApi["getPost"]>().mockResolvedValue(null),
    getPosts: vi.fn<RedditApi["getPosts"]>().mockResolvedValue([]),
    getUserPosts: vi.fn<RedditApi["getUserPosts"]>().mockResolvedValue([]),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// redditPostToLink
// ---------------------------------------------------------------------------

describe("redditPostToLink", () => {
  it("maps all fields correctly from RedditPost to Link", () => {
    const post = makePost({
      id: "p1",
      title: "Great Title",
      selftext: "Body text",
      authorId: "author99",
      subredditName: "programming",
      linkFlairText: "Discussion",
      url: "https://example.com/article",
    });

    const link = redditPostToLink(post);

    expect(link.id36).toBe("p1");
    expect(link.title).toBe("Great Title");
    expect(link.text).toBe("Body text");
    expect(link.accountId).toBe("author99");
    expect(link.subreddit).toBe("programming");
    expect(link.flairs).toEqual(["Discussion"]);
    expect(link.url).toBe("https://example.com/article");
    expect(link.images).toBeNull();
  });

  it("handles null flair text as empty flairs array", () => {
    const post = makePost({ linkFlairText: null });

    const link = redditPostToLink(post);

    expect(link.flairs).toEqual([]);
  });

  it("handles null url gracefully", () => {
    const post = makePost({ url: null });

    const link = redditPostToLink(post);

    expect(link.url).toBeNull();
  });

  it("handles empty string values", () => {
    const post = makePost({
      title: "",
      selftext: "",
      linkFlairText: "",
    });

    const link = redditPostToLink(post);

    expect(link.title).toBe("");
    expect(link.text).toBe("");
    expect(link.flairs).toEqual([""]);
  });
});

// ---------------------------------------------------------------------------
// LinkSourceAdapter
// ---------------------------------------------------------------------------

describe("LinkSourceAdapter", () => {
  // -- fetchLink -------------------------------------------------------------

  describe("fetchLink", () => {
    it("returns Link when post found with matching subreddit", async () => {
      const post = makePost({ id: "xyz", subredditName: "scala" });
      const mock = makeMockReddit({
        getPost: vi.fn<RedditApi["getPost"]>().mockResolvedValue(post),
      });
      const adapter = new LinkSourceAdapter(mock);

      const link = await adapter.fetchLink("scala", "xyz");

      expect(link).not.toBeNull();
      expect(link!.id36).toBe("xyz");
      expect(mock.getPost).toHaveBeenCalledWith("t3_xyz");
    });

    it("returns null when post not found", async () => {
      const mock = makeMockReddit({
        getPost: vi
          .fn<RedditApi["getPost"]>()
          .mockResolvedValue(null),
      });
      const adapter = new LinkSourceAdapter(mock);

      const link = await adapter.fetchLink("scala", "missing");

      expect(link).toBeNull();
    });

    it("returns null when subreddit does not match (case-insensitive)", async () => {
      const post = makePost({ id: "xyz", subredditName: "python" });
      const mock = makeMockReddit({
        getPost: vi.fn<RedditApi["getPost"]>().mockResolvedValue(post),
      });
      const adapter = new LinkSourceAdapter(mock);

      const link = await adapter.fetchLink("scala", "xyz");

      expect(link).toBeNull();
    });

    it("matches subreddit case-insensitively", async () => {
      const post = makePost({ id: "xyz", subredditName: "Scala" });
      const mock = makeMockReddit({
        getPost: vi.fn<RedditApi["getPost"]>().mockResolvedValue(post),
      });
      const adapter = new LinkSourceAdapter(mock);

      const link = await adapter.fetchLink("scala", "xyz");

      expect(link).not.toBeNull();
    });

    it("propagates API errors", async () => {
      const mock = makeMockReddit({
        getPost: vi
          .fn<RedditApi["getPost"]>()
          .mockRejectedValue(new Error("API rate limit")),
      });
      const adapter = new LinkSourceAdapter(mock);

      await expect(adapter.fetchLink("scala", "xyz")).rejects.toThrow(
        "API rate limit",
      );
    });

    it("builds correct fullname with t3_ prefix", async () => {
      const post = makePost({ id: "1tckzwt", subredditName: "scala" });
      const mock = makeMockReddit({
        getPost: vi.fn<RedditApi["getPost"]>().mockResolvedValue(post),
      });
      const adapter = new LinkSourceAdapter(mock);

      await adapter.fetchLink("scala", "1tckzwt");

      expect(mock.getPost).toHaveBeenCalledWith("t3_1tckzwt");
    });
  });

  // -- fetchAccountLinks -----------------------------------------------------

  describe("fetchAccountLinks", () => {
    it("returns Links for all user posts", async () => {
      const posts = [
        makePost({ id: "p1", subredditName: "scala" }),
        makePost({ id: "p2", subredditName: "python" }),
      ];
      const mock = makeMockReddit({
        getUserPosts: vi
          .fn<RedditApi["getUserPosts"]>()
          .mockResolvedValue(posts),
      });
      const adapter = new LinkSourceAdapter(mock);

      const links = await adapter.fetchAccountLinks("u1");

      expect(links).toHaveLength(2);
      expect(links[0]!.id36).toBe("p1");
      expect(links[1]!.id36).toBe("p2");
      expect(mock.getUserPosts).toHaveBeenCalledWith({
        userId: "u1",
        limit: 100,
      });
    });

    it("returns empty array when user has no posts", async () => {
      const mock = makeMockReddit({
        getUserPosts: vi
          .fn<RedditApi["getUserPosts"]>()
          .mockResolvedValue([]),
      });
      const adapter = new LinkSourceAdapter(mock);

      const links = await adapter.fetchAccountLinks("emptyUser");

      expect(links).toEqual([]);
    });

    it("handles API errors during user post fetch", async () => {
      const mock = makeMockReddit({
        getUserPosts: vi
          .fn<RedditApi["getUserPosts"]>()
          .mockRejectedValue(new Error("User not found")),
      });
      const adapter = new LinkSourceAdapter(mock);

      await expect(adapter.fetchAccountLinks("badUser")).rejects.toThrow(
        "User not found",
      );
    });

    it("sets default limit of 100", async () => {
      const mock = makeMockReddit({
        getUserPosts: vi
          .fn<RedditApi["getUserPosts"]>()
          .mockResolvedValue([]),
      });
      const adapter = new LinkSourceAdapter(mock);

      await adapter.fetchAccountLinks("u1");

      expect(mock.getUserPosts).toHaveBeenCalledWith({
        userId: "u1",
        limit: 100,
      });
    });
  });

  // -- listSubredditLinks ----------------------------------------------------

  describe("listSubredditLinks", () => {
    it("returns Links for subreddit posts", async () => {
      const posts = [
        makePost({ id: "r1", subredditName: "scala" }),
        makePost({ id: "r2", subredditName: "scala" }),
        makePost({ id: "r3", subredditName: "scala" }),
      ];
      const mock = makeMockReddit({
        getPosts: vi
          .fn<RedditApi["getPosts"]>()
          .mockResolvedValue(posts),
      });
      const adapter = new LinkSourceAdapter(mock);

      const links = await adapter.listSubredditLinks("scala");

      expect(links).toHaveLength(3);
      expect(mock.getPosts).toHaveBeenCalledWith({
        subredditName: "scala",
        limit: 25,
      });
    });

    it("respects custom limit", async () => {
      const mock = makeMockReddit({
        getPosts: vi
          .fn<RedditApi["getPosts"]>()
          .mockResolvedValue([]),
      });
      const adapter = new LinkSourceAdapter(mock);

      await adapter.listSubredditLinks("scala", 10);

      expect(mock.getPosts).toHaveBeenCalledWith({
        subredditName: "scala",
        limit: 10,
      });
    });

    it("returns empty array for subreddit with no posts", async () => {
      const mock = makeMockReddit({
        getPosts: vi
          .fn<RedditApi["getPosts"]>()
          .mockResolvedValue([]),
      });
      const adapter = new LinkSourceAdapter(mock);

      const links = await adapter.listSubredditLinks("emptySub");

      expect(links).toEqual([]);
    });

    it("handles API errors during subreddit listing", async () => {
      const mock = makeMockReddit({
        getPosts: vi
          .fn<RedditApi["getPosts"]>()
          .mockRejectedValue(new Error("Subreddit private")),
      });
      const adapter = new LinkSourceAdapter(mock);

      await expect(
        adapter.listSubredditLinks("privateSub"),
      ).rejects.toThrow("Subreddit private");
    });

    it("defaults limit to 25 when not provided", async () => {
      const mock = makeMockReddit({
        getPosts: vi
          .fn<RedditApi["getPosts"]>()
          .mockResolvedValue([]),
      });
      const adapter = new LinkSourceAdapter(mock);

      await adapter.listSubredditLinks("scala");

      expect(mock.getPosts).toHaveBeenCalledWith({
        subredditName: "scala",
        limit: 25,
      });
    });
  });

  // -- Constructor -----------------------------------------------------------

  describe("constructor", () => {
    it("accepts a RedditApi instance", () => {
      const mock = makeMockReddit();
      const adapter = new LinkSourceAdapter(mock);

      expect(adapter).toBeInstanceOf(LinkSourceAdapter);
    });
  });
});
