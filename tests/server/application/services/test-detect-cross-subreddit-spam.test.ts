import { describe, it, expect } from "vitest";
import { Link } from "../../../../src/server/domain/link.ts";
import {
  DetectCrossSubredditSpamService,
  computeSimilarity,
} from "../../../../src/server/application/services/detect-cross-subreddit-spam.ts";
import type { LinkSourcePort } from "../../../../src/server/application/ports/outbound/link-source-port.ts";
import type { FetchCandidateLinksPort } from "../../../../src/server/application/ports/outbound/fetch-candidate-links-port.ts";
import type { SimilarityPort } from "../../../../src/server/application/ports/outbound/similarity-port.ts";
import { LinkSnapshotMapper } from "../../../../src/server/application/mappers/link-snapshot-mapper.ts";
import {
  createReviewLinkRequest,
  type ReviewLinkRequest,
} from "../../../../src/server/application/dtos/requests/review-link-request.ts";

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

class StubLinkSource implements LinkSourcePort {
  private _link: Link | null = null;
  readonly fetchLinkCalls: Array<[string, string]> = [];

  setLink(link: Link | null): void {
    this._link = link;
  }

  async fetchLink(subreddit: string, id36: string): Promise<Link | null> {
    this.fetchLinkCalls.push([subreddit, id36]);
    return this._link;
  }

  async fetchAccountLinks(_accountId: string): Promise<Link[]> {
    return [];
  }

  async listSubredditLinks(
    _subreddit: string,
    _limit?: number,
  ): Promise<Link[]> {
    return [];
  }
}

class StubCandidateFetcher implements FetchCandidateLinksPort {
  private _candidates: Link[] = [];
  readonly fetchCalls: Array<[Link, number]> = [];

  setCandidates(candidates: readonly Link[]): void {
    this._candidates = [...candidates];
  }

  async fetchCandidates(source: Link, limit: number = 100): Promise<Link[]> {
    this.fetchCalls.push([source, limit]);
    return [...this._candidates];
  }
}

class RealSimilarity implements SimilarityPort {
  ratio(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    const m = a.length;
    const n = b.length;
    if (m > n) return this.ratio(b, a);
    let prevRow: number[] = Array.from({ length: m + 1 }, (_, i) => i);
    let currRow = new Array<number>(m + 1);
    for (let j = 1; j <= n; j++) {
      currRow[0] = j;
      for (let i = 1; i <= m; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        currRow[i] = Math.min(
          currRow[i - 1]! + 1,
          prevRow[i]! + 1,
          prevRow[i - 1]! + cost,
        );
      }
      [prevRow, currRow] = [currRow, prevRow];
    }
    return 1.0 - prevRow[m]! / maxLen;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLink(overrides: Partial<ConstructorParameters<typeof Link>[0]> = {}): Link {
  const defaults: ConstructorParameters<typeof Link>[0] = {
    id36: "abc123",
    title: "A great post",
    text: "This is the body of a great post.",
    accountId: "u1",
    subreddit: "scala",
  };
  return new Link({ ...defaults, ...overrides });
}

function makeRequest(
  overrides: Partial<ReviewLinkRequest> = {},
): ReviewLinkRequest {
  return createReviewLinkRequest({
    subreddit: "scala",
    id36: "abc123",
    ...overrides,
  });
}

function makeService({
  linkSource,
  candidateFetcher,
  similarity,
  mapper,
  similarityThreshold = 0.7,
}: {
  linkSource?: StubLinkSource;
  candidateFetcher?: StubCandidateFetcher;
  similarity?: SimilarityPort;
  mapper?: LinkSnapshotMapper;
  similarityThreshold?: number;
} = {}): DetectCrossSubredditSpamService {
  const ls = linkSource ?? new StubLinkSource();
  const cf = candidateFetcher ?? new StubCandidateFetcher();
  const sim = similarity ?? new RealSimilarity();
  const map = mapper ?? new LinkSnapshotMapper();
  return new DetectCrossSubredditSpamService(ls, cf, sim, map, similarityThreshold);
}

// ---------------------------------------------------------------------------
// TestExecute
// ---------------------------------------------------------------------------

describe("DetectCrossSubredditSpamService", () => {
  describe("execute", () => {
    it("when link not found then throws error", async () => {
      const linkSource = new StubLinkSource();
      linkSource.setLink(null);
      const service = makeService({ linkSource });

      await expect(service.execute(makeRequest())).rejects.toThrow(
        "Link not found",
      );
    });

    it("when no candidates then returns empty matches", async () => {
      const source = makeLink();
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.originalLink.id36).toBe(source.id36);
      expect(response.matches).toEqual([]);
    });

    it("when candidates all below threshold then returns empty", async () => {
      const source = makeLink({
        title: "Completely different title",
        text: "Totally unique body text that is not similar.",
      });
      const candidate = makeLink({
        id36: "diff1",
        title: "Not even close title",
        text: "Something else entirely different from the source.",
        accountId: "u2",
        subreddit: "python",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toEqual([]);
    });

    it("when one similar candidate then returns one match", async () => {
      const source = makeLink({
        title: "How to learn Scala quickly",
        text: "I found some great resources for learning Scala fast.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "How to learn Scala quickly",
        text: "I found some great resources for learning Scala fast.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      const match = response.matches[0]!;
      expect(match.similarityScore).toBe(1.0);
      expect(match.matchedSubreddit).toBe("programming");
      expect(match.matchedAccountId).toBe("u1");
      expect(match.link.id36).toBe("dup1");
    });

    it("when multiple similar candidates then returns all", async () => {
      const source = makeLink({
        title: "Best Scala tips",
        text: "Here are the best tips for writing Scala code.",
      });
      const candidateA = makeLink({
        id36: "dup1",
        title: "Best Scala tips",
        text: "Here are the best tips for making Scala source code.",
        accountId: "u1",
        subreddit: "programming",
      });
      const candidateB = makeLink({
        id36: "dup2",
        title: "Best Scala tips",
        text: "Here are the best tips for writing Scala and Java code.",
        accountId: "u1",
        subreddit: "coding",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidateA, candidateB]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(2);
      const matchedIds = new Set(response.matches.map((m) => m.link.id36));
      expect(matchedIds).toEqual(new Set(["dup1", "dup2"]));
      for (const m of response.matches) {
        expect(m.similarityScore).toBeGreaterThanOrEqual(0.7);
      }
    });

    it("when candidate has similar title but different text then matches", async () => {
      const source = makeLink({
        title: "Scala tips and tricks",
        text: "A completely different body that should not matter.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Scala tips and tricks",
        text: "Some unrelated text here that is totally different.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      expect(response.matches[0]!.similarityScore).toBe(1.0);
    });

    it("when candidate has similar text but different title then matches", async () => {
      const source = makeLink({
        title: "A different title here",
        text: "This is the same body text repeated across subreddits.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Some other title entirely",
        text: "This is the same body text repeated across subreddits.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      expect(response.matches[0]!.similarityScore).toBe(1.0);
    });

    it("when custom threshold is lower then catches more", async () => {
      const source = makeLink({
        title: "Scala is great",
        text: "I think Scala is a great programming language.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Kotlin is great",
        text: "Python is a great programming language.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({
        linkSource,
        candidateFetcher: fetcher,
        similarityThreshold: 0.5,
      });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
    });

    it("when custom threshold is higher then excludes more", async () => {
      const source = makeLink({
        title: "Scala is great",
        text: "I think Scala is a great programming language.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Scala is great",
        text: "I think Scala is a great programming language.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({
        linkSource,
        candidateFetcher: fetcher,
        similarityThreshold: 1.1,
      });

      const response = await service.execute(makeRequest());

      expect(response.matches).toEqual([]);
    });

    it("when candidate has no subreddit then matched is empty", async () => {
      const source = makeLink({
        title: "Scala tips",
        text: "Best Scala tips for beginners.",
        subreddit: null,
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Scala tips",
        text: "Best Scala tips for beginners.",
        accountId: "u1",
        subreddit: null,
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      expect(response.matches[0]!.matchedSubreddit).toBe("");
    });

    it("when candidate is same link as source then 100 percent", async () => {
      const link = makeLink({ title: "Same", text: "Same body text." });
      const linkSource = new StubLinkSource();
      linkSource.setLink(link);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([link]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      expect(response.matches[0]!.similarityScore).toBe(1.0);
    });

    it("when request different subreddit then correct params", async () => {
      const source = makeLink({ subreddit: "python" });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      await service.execute(
        makeRequest({ subreddit: "python", id36: "xyz789" }),
      );

      expect(linkSource.fetchLinkCalls).toEqual([["python", "xyz789"]]);
    });

    it("when candidates mixed then only similar returned", async () => {
      const source = makeLink({
        title: "How to write good Scala code",
        text: "Writing good Scala code requires practice and understanding.",
      });
      const similar = makeLink({
        id36: "dup1",
        title: "How to write good Scala code",
        text: "Writing good Scala code requires practice and understanding.",
        accountId: "u1",
        subreddit: "programming",
      });
      const dissimilar = makeLink({
        id36: "diff1",
        title: "Python vs Java: which is better?",
        text: "A long discussion about Python and Java differences.",
        accountId: "u2",
        subreddit: "python",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([dissimilar, similar]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
      expect(response.matches[0]!.link.id36).toBe("dup1");
    });
  });

  // ---------------------------------------------------------------------------
  // TestComputeSimilarity
  // ---------------------------------------------------------------------------

  describe("computeSimilarity", () => {
    const similarity = new RealSimilarity();

    it("when identical links then returns 1.0", () => {
      const linkA = makeLink({ title: "Hello", text: "World" });
      const linkB = makeLink({ title: "Hello", text: "World" });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(1.0);
    });

    it("when completely different then returns low score", () => {
      const linkA = makeLink({
        title: "AAAAAAAAAAAAAAAAAAAA",
        text: "BBBBBBBBBBBBBBBBBBBB",
      });
      const linkB = makeLink({
        title: "ZZZZZZZZZZZZZZZZZZZZ",
        text: "YYYYYYYYYYYYYYYYYYYY",
      });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(0.0);
    });

    it("when title is more similar than text then uses title", () => {
      const linkA = makeLink({
        title: "Scala tips and tricks for beginners",
        text: "AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH IIII JJJJ",
      });
      const linkB = makeLink({
        title: "Scala tips and tricks for beginners",
        text: "ZZZZ YYYY XXXX WWWW VVVV UUUU TTTT SSSS RRRR QQQQ",
      });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(1.0);
    });

    it("when text is more similar than title then uses text", () => {
      const linkA = makeLink({
        title: "AAAA BBBB CCCC DDDD EEEE FFFF",
        text: "This is the exact same body text in both posts.",
      });
      const linkB = makeLink({
        title: "ZZZZ YYYY XXXX WWWW VVVV UUUU",
        text: "This is the exact same body text in both posts.",
      });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(1.0);
    });

    it("when empty strings then returns 1.0", () => {
      const linkA = makeLink({ title: "", text: "" });
      const linkB = makeLink({ title: "", text: "" });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(1.0);
    });

    it("when one empty and one non-empty then low score", () => {
      const linkA = makeLink({ title: "", text: "" });
      const linkB = makeLink({
        title: "A real title",
        text: "A real body with actual content here.",
      });

      const score = computeSimilarity(similarity, linkA, linkB);

      expect(score).toBe(0.0);
    });
  });

  // ---------------------------------------------------------------------------
  // TestConstructor
  // ---------------------------------------------------------------------------

  describe("constructor", () => {
    it("when default threshold then uses 0.7", async () => {
      const source = makeLink({
        title: "Scala is awesome",
        text: "I love Scala.",
      });
      const candidate = makeLink({
        id36: "dup1",
        title: "Scala is awesome",
        text: "I love Scala.",
        accountId: "u1",
        subreddit: "programming",
      });
      const linkSource = new StubLinkSource();
      linkSource.setLink(source);
      const fetcher = new StubCandidateFetcher();
      fetcher.setCandidates([candidate]);
      const service = makeService({ linkSource, candidateFetcher: fetcher });

      const response = await service.execute(makeRequest());

      expect(response.matches).toHaveLength(1);
    });

    it("when threshold is zero then accepts it", () => {
      const service = makeService({ similarityThreshold: 0.0 });

      expect(service.similarityThreshold).toBe(0.0);
    });

    it("when threshold is one then accepts it", () => {
      const service = makeService({ similarityThreshold: 1.0 });

      expect(service.similarityThreshold).toBe(1.0);
    });
  });
});
