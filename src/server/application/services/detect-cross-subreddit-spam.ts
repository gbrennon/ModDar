import {
  createLinkMatch,
  createReviewLinkResponse,
  type LinkMatch,
  type ReviewLinkResponse,
} from "#server/application/dtos/responses/review-link-response";
import type { ReviewLinkRequest } from "#server/application/dtos/requests/review-link-request";
import type { FetchCandidateLinksPort } from "#server/application/ports/outbound/fetch-candidate-links-port";
import type { LinkSourcePort } from "#server/application/ports/outbound/link-source-port";
import type { SimilarityPort } from "#server/application/ports/outbound/similarity-port";
import type { DetectCrossSubredditSpamPort } from "#server/application/ports/inbound/detect-cross-subreddit-spam-port";
import { Link } from "#server/domain/link";
import type { LinkSnapshotMapper } from "#server/application/mappers/link-snapshot-mapper";

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
