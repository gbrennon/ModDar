"""Inbound port for cross-subreddit spam detection."""

from __future__ import annotations

from typing import Protocol

from moddar.application.dtos.requests.review_post_request import ReviewLinkRequest
from moddar.application.dtos.responses.review_post_response import ReviewLinkResponse


class DetectCrossSubredditSpamPort(Protocol):
    """Detect AI karma-farming spam by reviewing a Link against other subreddits.

    Implementations accept a ``ReviewLinkRequest`` and return a
    ``ReviewLinkResponse`` containing the original Link together with any
    similar Links discovered across (potentially distinct) communities.
    """

    async def execute(self, request: ReviewLinkRequest) -> ReviewLinkResponse:
        """Run the spam-detection review for the given Link.

        Args:
            request: The input parameters that identify the Link to review
                and optionally scope the search or tune the sensitivity.

        Returns:
            A ``ReviewLinkResponse`` with the original Link and any
            matching Links that exceed the similarity threshold.
        """
        ...
