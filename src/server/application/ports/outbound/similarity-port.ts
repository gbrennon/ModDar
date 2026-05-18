/**
 * Outbound port for string-similarity computation.
 *
 * Implementations provide a ratio between 0.0 (completely different)
 * and 1.0 (identical) for any two strings.
 */
export interface SimilarityPort {
  /**
   * Compute a similarity ratio between two strings.
   *
   * @param a - First string
   * @param b - Second string
   * @returns A value between 0.0 and 1.0 inclusive
   */
  ratio(a: string, b: string): number;
}
