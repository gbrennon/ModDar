"""Outbound ports for fetching Reddit Link data.

These ports define the contract between the application layer and
infrastructure adapters (e.g. PRAW) that provide access to Reddit's API.
"""

from __future__ import annotations

from typing import Protocol

from moddar.domain.link import Link


class LinkSourcePort(Protocol):
    """Fetch Links from a Reddit data source.

    Implementations wrap a Reddit API client (e.g. PRAW) to retrieve
    ``Link`` entities from Reddit.  The port exposes three queries that
    together enable the ``DetectCrossSubredditSpamPort`` use-case:

    * `fetch_link` – Retrieve the Link under review.
    * `fetch_account_links` – Find other Links posted by the same Account
      (potentially across different subreddits) for similarity comparison.
    * `list_subreddit_links` – Browse recent Links from a subreddit to
      discover near-duplicate posts.

    Each method is ``async`` because real implementations perform
    network-bound Reddit API calls.
    """

    async def fetch_link(self, subreddit: str, id36: str) -> Link | None:
        """Fetch a single Link by its subreddit and base-36 identifier.

        Args:
            subreddit: The subreddit name (e.g. ``"scala"``) where the
                Link was posted.
            id36: The base-36 portion of the Link's fullname — the unique
                identifier from the Reddit API (e.g. ``"1tckzwt"``).

        Returns:
            The matching ``Link`` if found, or ``None`` when the Link
            does not exist or is inaccessible (e.g. deleted or private).
        """
        ...

    async def fetch_account_links(self, account_id: str) -> list[Link]:
        """Fetch all Links posted by a given Reddit Account.

        Args:
            account_id: The account's unique identifier (e.g. ``"u1"``).

        Returns:
            A list of ``Link`` entities belonging to the Account.  An
            empty list means the Account has no visible Links or does
            not exist.
        """
        ...

    async def list_subreddit_links(
        self, subreddit: str, *, limit: int = 25
    ) -> list[Link]:
        """List recent Links from a subreddit, newest first.

        Args:
            subreddit: The subreddit name whose Links to list.
            limit: Maximum number of Links to return (capped by the
                underlying API; defaults to 25).

        Returns:
            A list of the most recent ``Link`` entities from the
            subreddit, or an empty list if the subreddit has no posts or
            does not exist.
        """
        ...
