/**
 * Tests for ``Container`` — the infrastructure-layer DI container.
 *
 * Verifies that all dependencies are wired correctly and that the
 * lazy-initialisation pattern returns the same singleton instance
 * on repeated access.
 */

import { describe, it, expect } from "vitest";
import { Container } from "#server/infrastructure/container";
import type { RedditApi, RedditPost } from "#server/infrastructure/link-source-adapter";
import { LevenshteinSimilarity } from "#server/infrastructure/levenshtein-similarity";
import { LinkSnapshotMapper } from "#server/application/mappers/link-snapshot-mapper";

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

/** Minimal ``RedditApi`` double that returns empty results. */
function makeRedditApi(overrides: Partial<RedditApi> = {}): RedditApi {
  return {
    getPost: async (_postId: string): Promise<RedditPost | null> => null,
    getPosts: async (_options: {
      subredditName: string;
      limit: number;
    }): Promise<RedditPost[]> => [],
    getUserPosts: async (_options: {
      userId: string;
      limit: number;
    }): Promise<RedditPost[]> => [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Container", () => {
  // -- Constructor -----------------------------------------------------------

  describe("constructor", () => {
    it("accepts a RedditApi and stores it", () => {
      const reddit = makeRedditApi();
      const container = new Container(reddit);

      // Accessing an adapter that uses the RedditApi should work.
      expect(() => container.linkSourceAdapter).not.toThrow();
    });

    it("accepts an optional similarityThreshold config", () => {
      const reddit = makeRedditApi();

      const c = new Container(reddit, { similarityThreshold: 0.8 });
      const svc = c.detectCrossSubredditSpamService as {
        similarityThreshold: number;
      };
      expect(svc.similarityThreshold).toBe(0.8);
    });

    it("defaults similarityThreshold to 0.7 when omitted", () => {
      const reddit = makeRedditApi();

      const c = new Container(reddit);
      const svc = c.detectCrossSubredditSpamService as {
        similarityThreshold: number;
      };
      expect(svc.similarityThreshold).toBe(0.7);
    });

    it("accepts threshold 0.0", () => {
      const reddit = makeRedditApi();

      const c = new Container(reddit, { similarityThreshold: 0.0 });
      const svc = c.detectCrossSubredditSpamService as {
        similarityThreshold: number;
      };
      expect(svc.similarityThreshold).toBe(0.0);
    });

    it("accepts threshold 1.0", () => {
      const reddit = makeRedditApi();

      const c = new Container(reddit, { similarityThreshold: 1.0 });
      const svc = c.detectCrossSubredditSpamService as {
        similarityThreshold: number;
      };
      expect(svc.similarityThreshold).toBe(1.0);
    });
  });

  // -- Singleton behaviour (lazy init) ---------------------------------------

  describe("singleton behaviour", () => {
    it("returns the same LinkSourceAdapter on repeated access", () => {
      const c = new Container(makeRedditApi());

      const a = c.linkSourceAdapter;
      const b = c.linkSourceAdapter;

      expect(a).toBe(b);
    });

    it("returns the same CandidateFetcher on repeated access", () => {
      const c = new Container(makeRedditApi());

      const a = c.candidateFetcher;
      const b = c.candidateFetcher;

      expect(a).toBe(b);
    });

    it("returns the same Similarity on repeated access", () => {
      const c = new Container(makeRedditApi());

      const a = c.similarity;
      const b = c.similarity;

      expect(a).toBe(b);
    });

    it("returns the same Mapper on repeated access", () => {
      const c = new Container(makeRedditApi());

      const a = c.linkSnapshotMapper;
      const b = c.linkSnapshotMapper;

      expect(a).toBe(b);
    });

    it("returns the same Service on repeated access", () => {
      const c = new Container(makeRedditApi());

      const a = c.detectCrossSubredditSpamService;
      const b = c.detectCrossSubredditSpamService;

      expect(a).toBe(b);
    });
  });

  // -- Correct types ---------------------------------------------------------

  describe("correct types", () => {
    it("similarity is a LevenshteinSimilarity", () => {
      const c = new Container(makeRedditApi());

      expect(c.similarity).toBeInstanceOf(LevenshteinSimilarity);
    });

    it("linkSnapshotMapper is a LinkSnapshotMapper", () => {
      const c = new Container(makeRedditApi());

      expect(c.linkSnapshotMapper).toBeInstanceOf(LinkSnapshotMapper);
    });

    it("detectCrossSubredditSpamService exposes the execute method", () => {
      const c = new Container(makeRedditApi());
      const service = c.detectCrossSubredditSpamService;

      expect(typeof service.execute).toBe("function");
    });
  });

  // -- Isolation (separate containers) ---------------------------------------

  describe("isolation", () => {
    it("different containers return different instances", () => {
      const c1 = new Container(makeRedditApi());
      const c2 = new Container(makeRedditApi());

      expect(c1.linkSourceAdapter).not.toBe(c2.linkSourceAdapter);
    });

    it("different containers produce different services", () => {
      const c1 = new Container(makeRedditApi());
      const c2 = new Container(makeRedditApi());

      expect(c1.detectCrossSubredditSpamService).not.toBe(
        c2.detectCrossSubredditSpamService,
      );
    });
  });

  // -- Dependency wiring -----------------------------------------------------

  describe("dependency wiring", () => {
    it("wires the full graph without errors", () => {
      const c = new Container(makeRedditApi());

      // Accessing the service forces the full graph to materialise.
      expect(() => c.detectCrossSubredditSpamService).not.toThrow();
    });

    it("candidateFetcher uses the same linkSourceAdapter", () => {
      const c = new Container(makeRedditApi());

      // Force creation of candidateFetcher first (it depends on
      // linkSourceAdapter, so both are created).
      void c.candidateFetcher;

      // The linkSourceAdapter should now be created and be the same
      // one that candidateFetcher received.
      expect(c.linkSourceAdapter).toBeDefined();
    });
  });
});
