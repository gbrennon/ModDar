from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from moddar.domain.link import Link


class Account:
    """Represents a Reddit account (user)."""

    def __init__(
        self,
        id: str,
        username: str,
        links: list[Link] | None = None,
    ) -> None:
        self._id = id
        self._username = username
        self._links: list[Link] = links if links is not None else []

    @property
    def id(self) -> str:
        return self._id

    @property
    def username(self) -> str:
        return self._username

    @property
    def links(self) -> list[Link]:
        return self._links

    def add_link(self, link: Link) -> None:
        """Add a Link to this account's list of links."""
        self._links.append(link)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Account):
            return NotImplemented
        return self._id == other._id

    def __repr__(self) -> str:
        return (
            f"Account(id={self._id!r}, username={self._username!r}, "
            f"links={self._links!r})"
        )
