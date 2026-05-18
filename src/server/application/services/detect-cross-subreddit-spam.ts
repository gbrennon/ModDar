import {
  createLinkMatch,
  createReviewLinkResponse,
  type LinkMatch,
  type ReviewLinkResponse,
} from "../dtos/responses/review-link-response.ts";
import type { ReviewLinkRequest } from "../dtos/requests/review-link-request.ts";
import type { FetchCandidateLinksPort } from "../ports/outbound/fetch-candidate-links-port.ts";
import type { LinkSourcePort } from "../ports/outbound/link-source-port.ts";
import type { SimilarityPort } from "../ports/outbound/similarity-port.ts";
import type { DetectCrossSubredditSpamPort } from "../ports/inbound/detect-cross-subreddit-spam-port.ts";
import { Link } from "../../domain/link.ts";
import type { LinkSnapshotMapper } from "../mappers/link-snapshot-mapper.ts";

export class DetectCrossSubredditSpamService
  implements DetectCrossSubredditSpamPort
{
  private readonly _linkSource: LinkSourcePort;
  private readonly _candidateFetcher: FetchCandidateLinksPort;
  private readonly _similarity: SimilarityPort;
  private readonly _mapper: LinkSnapshotMapper;
  readonly similarityThreshold: number;

  constructor(
    linkSource: LinkSourcePort,
    candidateFetcher: FetchCandidateLinksPort,
    similarity: SimilarityPort,
    mapper: LinkSnapshotMapper,
    similarityThreshold: number = 0.7,
  ) {
    this._linkSource = linkSource;
    this._candidateFetcher = candidateFetcher;
    this._similarity = similarity;
    this._mapper = mapper;
    this.similarityThreshold = similarityThreshold;
  }

  async execute(request: ReviewLinkRequest): Promise<ReviewLinkResponse> {
    const source = await this._linkSource.fetchLink(
      request.subreddit,
      request.id36,
    );
    if (source === null) {
      throw new Error(
        `Link not found: subreddit=${JSON.stringify(request.subreddit)}, ` +
          `id36=${JSON.stringify(request.id36)}`,
      );
    }

    const candidates = await this._candidateFetcher.fetchCandidates(source);

    const matches: LinkMatch[] = [];
    for (const candidate of candidates) {
      const score = computeSimilarity(this._similarity, source, candidate);
      if (score >= this.similarityThreshold) {
        matches.push(
          createLinkMatch({
            link: this._mapper.map(candidate),
            similarityScore: score,
            matchedSubreddit: candidate.subreddit ?? "",
            matchedAccountId: candidate.accountId,
          }),
        );
      }
    }

    return createReviewLinkResponse({
      originalLink: this._mapper.map(source),
      matches,
    });
  }
}

/**
 * Compute the textual similarity between two Links, taking the max of
 * title and body text ratios.
 */
export function computeSimilarity(
  similarity: SimilarityPort,
  source: Link,
  candidate: Link,
): number {
  const titleScore = similarity.ratio(source.title, candidate.title);
  const textScore = similarity.ratio(source.text, candidate.text);
  return Math.max(titleScore, textScore);
}
