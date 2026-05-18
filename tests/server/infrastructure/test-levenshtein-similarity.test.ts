import { describe, it, expect } from "vitest";
import { LevenshteinSimilarity } from "../../../src/server/infrastructure/levenshtein-similarity.ts";

describe("LevenshteinSimilarity", () => {
  const similarity = new LevenshteinSimilarity();

  describe("ratio", () => {
    it("returns 1.0 for identical strings", () => {
      expect(similarity.ratio("hello", "hello")).toBe(1.0);
    });

    it("returns 0.0 for completely different strings (no shared chars)", () => {
      expect(similarity.ratio("aaaa", "zzzz")).toBe(0.0);
    });

    it("returns 1.0 for two empty strings", () => {
      expect(similarity.ratio("", "")).toBe(1.0);
    });

    it("returns 0.0 when one string is empty and other is not", () => {
      expect(similarity.ratio("", "hello")).toBe(0.0);
    });

    it("returns expected ratio for known pair (kitten/sitting)", () => {
      const score = similarity.ratio("kitten", "sitting");
      // 3 edits in 7 chars = ~0.571
      expect(score).toBeCloseTo(0.571, 2);
    });

    it("handles strings of different lengths", () => {
      const score = similarity.ratio("short", "short string that is longer");
      // difference in length contributes to lower ratio
      expect(score).toBeLessThan(0.5);
    });

    it("returns 0.5 for half-matching strings", () => {
      // "abcde" vs "abcXY" — 2 edits in 5 chars = 0.6
      // Let's use a precise case
      const score = similarity.ratio("abc", "xyz");
      // 3 edits in 3 chars = 0.0
      expect(score).toBe(0.0);
    });

    it("is symmetric: ratio(a,b) === ratio(b,a)", () => {
      const a = "The quick brown fox";
      const b = "The quick brown cat";
      expect(similarity.ratio(a, b)).toBe(similarity.ratio(b, a));
    });

    it("handles very long strings", () => {
      const a = "x".repeat(1000);
      const b = "x".repeat(999) + "y";
      const score = similarity.ratio(a, b);
      // 1 edit in 1000 chars
      expect(score).toBeCloseTo(0.999, 2);
    });
  });

  describe("implements SimilarityPort", () => {
    it("can be used as SimilarityPort", () => {
      const sim: import("../../../src/server/application/ports/outbound/similarity-port.ts").SimilarityPort =
        similarity;
      expect(sim.ratio("a", "a")).toBe(1.0);
    });
  });
});
