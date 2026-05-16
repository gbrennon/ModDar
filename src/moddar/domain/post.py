from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from moddar.domain.user import User


class Post:
    """Represents a Reddit post made by a user."""

    def __init__(
        self,
        id: str,
        title: str,
        body: str,
        user: User,
        flairs: list[str] | None = None,
        link: str | None = None,
        images: list[str] | None = None,
    ) -> None:
        self._id = id
        self._title = title
        self._body = body
        self._user = user
        self._flairs: list[str] = flairs if flairs is not None else []
        self._link: str | None = link
        self._images: list[str] | None = images

    @property
    def id(self) -> str:
        return self._id

    @property
    def title(self) -> str:
        return self._title

    @property
    def body(self) -> str:
        return self._body

    @property
    def user(self) -> User:
        return self._user

    @property
    def flairs(self) -> list[str]:
        return self._flairs

    @property
    def link(self) -> str | None:
        return self._link

    @property
    def images(self) -> list[str] | None:
        return self._images

    def add_flair(self, flair: str) -> None:
        """Add a flair/tag to this post."""
        self._flairs.append(flair)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Post):
            return NotImplemented
        return (
            self._id == other._id
            and self._title == other._title
            and self._body == other._body
            and self._user == other._user
            and self._flairs == other._flairs
            and self._link == other._link
            and self._images == other._images
        )

    def __repr__(self) -> str:
        return (
            f"Post(id={self._id!r}, title={self._title!r}, "
            f"body={self._body!r}, user={self._user!r}, "
            f"flairs={self._flairs!r}, link={self._link!r}, "
            f"images={self._images!r})"
        )
