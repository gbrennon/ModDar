"""DTOs returned by the cross-subreddit spam-detection use-case."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class LinkSnapshot:
    """Primitive-only snapshot of a Reddit Link, safe to cross the application
    boundary without exposing domain internals to external callers.
    """

    id36: str
    title: str
    text: str
    account_id: str
    flairs: list[str] = field(default_factory=list)
    url: str | None = None
    images: list[str] | None = None


@dataclass(frozen=True)
class LinkMatch:
    """A single similar-Link match found during a review.

    Embodies the evidence that two Links across (potentially distinct)
    subreddits share enough textual similarity to warrant a moderator's
    attention.
    """

    link: LinkSnapshot
    similarity_score: float
    matched_subreddit: str
    matched_account_id: str


@dataclass(frozen=True)
class ReviewLinkResponse:
    """Outcome of a spam-detection review for a single Link.

    Wraps the original Link together with any similar Links discovered
    across other subreddits.
    """

    original_link: LinkSnapshot
    matches: list[LinkMatch] = field(default_factory=list)
