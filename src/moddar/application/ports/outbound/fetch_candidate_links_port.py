"""Outbound port for fetching candidate Links to compare against a source.

This port defines the contract for retrieving Links from Reddit that are
potential near-duplicates of a given source Link — the data-fetching step
that feeds the similarity engine in the cross-subreddit spam-detection
use-case.
"""

from __future__ import annotations

from typing import Protocol

from moddar.domain.link import Link


class FetchCandidateLinksPort(Protocol):
    """Fetch Links that are candidates for similarity comparison.

    Given a source Link (the post a moderator wants to review), this port
    retrieves other Links from Reddit that *might* contain similar
    content.  Implementations decide the retrieval strategy — e.g.:

    * Fetch all Links from the same Account posted in **different**
      subreddits (the most common spam pattern: same user, slightly
      tweaked text, cross-posted to related communities).
    * Search recent Links in subreddits related to the source's
      subreddit.
    * Query Reddit's search API for posts with similar titles.

    The returned candidates are then passed to a similarity engine
    (``rapidfuzz``) that computes actual similarity scores and filters
    below a threshold.  This port is purely about **data retrieval**,
    not the comparison itself.
    """

    async def fetch_candidates(
        self,
        source: Link,
        *,
        limit: int = 100,
    ) -> list[Link]:
        """Fetch candidate Links that may contain content similar to the source.

        Args:
            source: The Link under review.  Implementations use its
                ``account_id`` and subreddit metadata to scope the
                candidate search.
            limit: Maximum number of candidate Links to return.  Defaults
                to 100.

        Returns:
            A list of candidate ``Link`` entities, or an empty list when
            no plausible candidates are found (e.g. the Account has only
            posted in a single subreddit).
        """
        ...

