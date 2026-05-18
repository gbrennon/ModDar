/**
 * Comprehensive tests for ``FetchCandidateLinksAdapter``.
 *
 * Covers: same-subreddit exclusion, self-exclusion, limit enforcement,
 * empty results, partial matches, and edge cases.
 */

import { describe, it, expect, vi } from "vitest";
import { FetchCandidateLinksAdapter } from "../../../src/server/infrastructure/fetch-candidate-links-adapter.ts";
import type { LinkSourcePort } from "../../../src/server/application/ports/outbound/link-source-port.ts";
import { Link } from "../../../src/server/domain/link.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLink(overrides: Partial<ConstructorParameters<typeof Link>[0]> = {}): Link {
  return new Link({
    id36: "abc123",
    title: "Test",
    text: "Body",
    accountId: "u1",
    subreddit: "scala",
    ...overrides,
  });
}

function makeMockLinkSource(
  accountLinks: Link[] = [],
): LinkSourcePort {
  return {
    fetchLink: vi.fn<LinkSourcePort["fetchLink"]>().mockResolvedValue(null),
    fetchAccountLinks: vi
      .fn<LinkSourcePort["fetchAccountLinks"]>()
      .mockResolvedValue(accountLinks),
    listSubredditLinks: vi
      .fn<LinkSourcePort["listSubredditLinks"]>()
      .mockResolvedValue([]),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FetchCandidateLinksAdapter", () => {
  describe("fetchCandidates", () => {
    it("returns only links from different subreddits", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = [
        makeLink({ id36: "p1", subreddit: "scala" }), // same sub — excluded
        makeLink({ id36: "p2", subreddit: "python" }), // different sub — included
        makeLink({ id36: "p3", subreddit: "kotlin" }), // different sub — included
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toHaveLength(2);
      expect(candidates[0]!.id36).toBe("p2");
      expect(candidates[1]!.id36).toBe("p3");
    });

    it("excludes the source link itself even in a different subreddit", async () => {
      const source = makeLink({ id36: "same", subreddit: "scala" });
      const links = [
        makeLink({ id36: "same", subreddit: "python" }), // same id, diff sub — excluded
        makeLink({ id36: "other", subreddit: "python" }),
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.id36).toBe("other");
    });

    it("returns empty when account has no posts", async () => {
      const source = makeLink();
      const mockLinkSource = makeMockLinkSource([]);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toEqual([]);
    });

    it("returns empty when all posts are in the same subreddit", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = [
        makeLink({ id36: "p1", subreddit: "scala" }),
        makeLink({ id36: "p2", subreddit: "Scala" }), // case-insensitive
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toEqual([]);
    });

    it("handles case-insensitive subreddit matching", async () => {
      const source = makeLink({ id36: "s1", subreddit: "Scala" });
      const links = [
        makeLink({ id36: "p1", subreddit: "scala" }), // excluded (same sub)
        makeLink({ id36: "p2", subreddit: "Python" }), // included
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.id36).toBe("p2");
    });

    it("includes links from accounts with null subreddit", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = [
        makeLink({ id36: "p1", subreddit: null }), // null sub — different from scala
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toHaveLength(1);
      expect(candidates[0]!.id36).toBe("p1");
    });

    it("when source has null subreddit, all candidates are included", async () => {
      const source = makeLink({ id36: "s1", subreddit: null });
      const links = [
        makeLink({ id36: "p1", subreddit: "scala" }),
        makeLink({ id36: "p2", subreddit: "python" }),
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      // None excluded by subreddit (null source can't match anything)
      expect(candidates).toHaveLength(2);
    });

    it("respects the limit parameter", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = Array.from({ length: 10 }, (_, i) =>
        makeLink({ id36: `p${i}`, subreddit: "python" }),
      );
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source, 3);

      expect(candidates).toHaveLength(3);
    });

    it("defaults limit to 100", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = Array.from({ length: 150 }, (_, i) =>
        makeLink({ id36: `p${i}`, subreddit: "python" }),
      );
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates.length).toBeLessThanOrEqual(100);
    });

    it("handles mixed null and non-null subreddits in candidates", async () => {
      const source = makeLink({ id36: "s1", subreddit: "scala" });
      const links = [
        makeLink({ id36: "p1", subreddit: null }),
        makeLink({ id36: "p2", subreddit: "scala" }), // excluded
        makeLink({ id36: "p3", subreddit: null }),
      ];
      const mockLinkSource = makeMockLinkSource(links);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      const candidates = await adapter.fetchCandidates(source);

      expect(candidates).toHaveLength(2);
      const ids = candidates.map((c) => c.id36);
      expect(ids).toContain("p1");
      expect(ids).toContain("p3");
    });

    it("passes correct accountId to link source", async () => {
      const source = makeLink({ accountId: "targetUser" });
      const mockLinkSource = makeMockLinkSource([]);
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      await adapter.fetchCandidates(source);

      expect(mockLinkSource.fetchAccountLinks).toHaveBeenCalledWith(
        "targetUser",
      );
    });

    it("propagates errors from the link source", async () => {
      const source = makeLink();
      const mockLinkSource: LinkSourcePort = {
        fetchLink: vi.fn<LinkSourcePort["fetchLink"]>().mockResolvedValue(null),
        fetchAccountLinks: vi
          .fn<LinkSourcePort["fetchAccountLinks"]>()
          .mockRejectedValue(new Error("Network error")),
        listSubredditLinks: vi
          .fn<LinkSourcePort["listSubredditLinks"]>()
          .mockResolvedValue([]),
      };
      const adapter = new FetchCandidateLinksAdapter(mockLinkSource);

      await expect(adapter.fetchCandidates(source)).rejects.toThrow(
        "Network error",
      );
    });
  });

  // -- Constructor -----------------------------------------------------------

  describe("constructor", () => {
    it("accepts a LinkSourcePort instance", () => {
      const mock = makeMockLinkSource();
      const adapter = new FetchCandidateLinksAdapter(mock);

      expect(adapter).toBeInstanceOf(FetchCandidateLinksAdapter);
    });
  });
});
