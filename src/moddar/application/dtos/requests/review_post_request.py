"""Command DTO to trigger a cross-subreddit spam review for a given Link."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ReviewLinkRequest:
    """Carries the identifiers needed to locate and review a Link.

    Both fields together pinpoint a single Reddit Link — e.g. the URL
    ``reddit.com/r/scala/comments/1tckzwt/...`` maps to
    ``subreddit="scala"`` and ``id36="1tckzwt"``.

    ``id36`` is the Link's base-36 unique identifier.  Combined with the
    ``t3_`` type prefix it forms the Link's *fullname* (``t3_1tckzwt``)
    — the globally-unique identifier used across the Reddit API.
    """

    subreddit: str
    id36: str
