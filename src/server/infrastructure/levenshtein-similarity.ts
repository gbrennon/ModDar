/**
 * Infrastructure adapter for ``SimilarityPort`` backed by fastest-levenshtein.
 *
 * Computes a normalized similarity ratio: ``1 - distance / maxLen``,
 * yielding 0.0 for completely different strings and 1.0 for identical ones.
 * Both-empty strings return 1.0.
 */

import { distance as levenshteinDistance } from "fastest-levenshtein";
import type { SimilarityPort } from "../application/ports/outbound/similarity-port.ts";

export class LevenshteinSimilarity implements SimilarityPort {
  ratio(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
      return 1.0;
    }
    return 1.0 - levenshteinDistance(a, b) / maxLen;
  }
}
