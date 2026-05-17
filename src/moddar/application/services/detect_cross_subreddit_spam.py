"""Service implementation of the cross-subreddit spam-detection use-case."""

from __future__ import annotations

from rapidfuzz import fuzz

from moddar.application.dtos.requests.review_post_request import ReviewLinkRequest
from moddar.application.dtos.responses.review_post_response import (
    LinkMatch,
    LinkSnapshot,
    ReviewLinkResponse,
)
from moddar.application.ports.outbound.fetch_candidate_links_port import (
    FetchCandidateLinksPort,
)
from moddar.application.ports.outbound.link_source_port import LinkSourcePort
from moddar.domain.link import Link


class DetectCrossSubredditSpamService:
    """Detect AI karma-farming spam by reviewing a Link against other subreddits.

    Fetches the source Link via ``LinkSourcePort``, retrieves candidate
    Links from other subreddits via ``FetchCandidateLinksPort``, and compares
    each candidate's textual content against the source using ``rapidfuzz``.
    Candidates whose similarity exceeds *similarity_threshold* are returned
    as ``LinkMatch`` entries in the response.
    """

    def __init__(
        self,
        link_source: LinkSourcePort,
        candidate_fetcher: FetchCandidateLinksPort,
        *,
        similarity_threshold: float = 0.7,
    ) -> None:
        self._link_source = link_source
        self._candidate_fetcher = candidate_fetcher
        self._similarity_threshold = similarity_threshold

    async def execute(self, request: ReviewLinkRequest) -> ReviewLinkResponse:
        """Run the spam-detection review for the given Link."""
        source = await self._link_source.fetch_link(
            request.subreddit, request.id36
        )
        if source is None:
            raise ValueError(
                f"Link not found: subreddit={request.subreddit!r}, "
                f"id36={request.id36!r}"
            )

        candidates = await self._candidate_fetcher.fetch_candidates(source)

        matches: list[LinkMatch] = []
        for candidate in candidates:
            score = self._compute_similarity(source, candidate)
            if score >= self._similarity_threshold:
                matches.append(
                    LinkMatch(
                        link=self._to_snapshot(candidate),
                        similarity_score=score,
                        matched_subreddit=candidate.subreddit or "",
                        matched_account_id=candidate.account_id,
                    )
                )

        return ReviewLinkResponse(
            original_link=self._to_snapshot(source),
            matches=matches,
        )

    @staticmethod
    def _compute_similarity(source: Link, candidate: Link) -> float:
        """Compute the textual similarity between two Links.

        Compares both title and body text using ``rapidfuzz.fuzz.ratio``
        and returns the highest score.  This catches both title-only spam
        (same title, different body) and body-only spam (same body,
        slightly different title).
        """
        title_score = fuzz.ratio(source.title, candidate.title) / 100.0
        text_score = fuzz.ratio(source.text, candidate.text) / 100.0
        return max(title_score, text_score)

    @staticmethod
    def _to_snapshot(link: Link) -> LinkSnapshot:
        """Convert a domain ``Link`` into a primitive-only ``LinkSnapshot``."""
        return LinkSnapshot(
            id36=link.id36,
            title=link.title,
            text=link.text,
            account_id=link.account_id,
            subreddit=link.subreddit,
            flairs=list(link.flairs),
            url=link.url,
            images=link.images,
        )
