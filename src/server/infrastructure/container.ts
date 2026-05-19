/**
 * Dependency-injection container for the infrastructure layer.
 *
 * Creates and wires together infrastructure adapters and application
 * services.  The container is the *single* place where concrete
 * implementations are selected for every outbound port — everything
 * else depends only on interfaces.
 *
 * Lazy-initialisation keeps start-up cheap and makes the container
 * testable: callers can access individual adapters without forcing
 * the full graph to materialise.
 */

import type { RedditApi } from "./link-source-adapter.ts";
import { LinkSourceAdapter } from "./link-source-adapter.ts";
import { FetchCandidateLinksAdapter } from "./fetch-candidate-links-adapter.ts";
import { LevenshteinSimilarity } from "./levenshtein-similarity.ts";
import { LinkSnapshotMapper } from "../application/mappers/link-snapshot-mapper.ts";
import { DetectCrossSubredditSpamService } from "../application/services/detect-cross-subreddit-spam.ts";
import type { DetectCrossSubredditSpamPort } from "../application/ports/inbound/detect-cross-subreddit-spam-port.ts";

/** Configuration knobs accepted by the container. */
export interface ContainerConfig {
  /** Similarity threshold for the spam-detection service (0.0 – 1.0).
   *  Defaults to 0.7 when omitted. */
  readonly similarityThreshold?: number;
}

/**
 * Infrastructure DI container.
 *
 * Usage (presentation / composition-root):
 *
 * ```ts
 * import { reddit } from "@devvit/web/server";
 * import { Container } from "#server/infrastructure/container";
 *
 * const container = new Container(reddit, { similarityThreshold: 0.75 });
 * const service = container.detectCrossSubredditSpamService;
 * ```
 */
export class Container {
  private readonly _reddit: RedditApi;
  private readonly _similarityThreshold: number;

  // Lazily-initialised singletons — one instance per container.
  private _linkSourceAdapter: LinkSourceAdapter | undefined;
  private _candidateFetcher: FetchCandidateLinksAdapter | undefined;
  private _similarity: LevenshteinSimilarity | undefined;
  private _mapper: LinkSnapshotMapper | undefined;
  private _service: DetectCrossSubredditSpamService | undefined;

  constructor(reddit: RedditApi, config: ContainerConfig = {}) {
    this._reddit = reddit;
    this._similarityThreshold = config.similarityThreshold ?? 0.7;
  }

  // ---------------------------------------------------------------------
  // Infrastructure adapters
  // ---------------------------------------------------------------------

  /** ``LinkSourcePort`` backed by the Reddit API. */
  get linkSourceAdapter(): LinkSourceAdapter {
    // eslint-disable-next-line no-return-assign
    return (
      this._linkSourceAdapter ??= new LinkSourceAdapter(this._reddit)
    );
  }

  /** ``FetchCandidateLinksPort`` that finds cross-subreddit near-duplicates. */
  get candidateFetcher(): FetchCandidateLinksAdapter {
    return (
      this._candidateFetcher ??= new FetchCandidateLinksAdapter(
        this.linkSourceAdapter,
      )
    );
  }

  /** ``SimilarityPort`` backed by Levenshtein distance. */
  get similarity(): LevenshteinSimilarity {
    // eslint-disable-next-line no-return-assign
    return (this._similarity ??= new LevenshteinSimilarity());
  }

  // ---------------------------------------------------------------------
  // Application-layer dependencies (mappers)
  // ---------------------------------------------------------------------

  /** Domain ``Link`` → ``LinkSnapshot`` DTO mapper. */
  get linkSnapshotMapper(): LinkSnapshotMapper {
    // eslint-disable-next-line no-return-assign
    return (this._mapper ??= new LinkSnapshotMapper());
  }

  // ---------------------------------------------------------------------
  // Application services (the inbound port)
  // ---------------------------------------------------------------------

  /** Fully-wired cross-subreddit spam-detection service. */
  get detectCrossSubredditSpamService(): DetectCrossSubredditSpamPort {
    return (
      this._service ??= new DetectCrossSubredditSpamService(
        this.linkSourceAdapter,
        this.candidateFetcher,
        this.similarity,
        this.linkSnapshotMapper,
        this._similarityThreshold,
      )
    );
  }
}
