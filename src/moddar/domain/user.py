from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from moddar.domain.post import Post


class User:
    """Represents a Reddit user who creates posts."""

    def __init__(
        self,
        id: str,
        username: str,
        posts: list[Post] | None = None,
    ) -> None:
        self._id = id
        self._username = username
        self._posts: list[Post] = posts if posts is not None else []

    @property
    def id(self) -> str:
        return self._id

    @property
    def username(self) -> str:
        return self._username

    @property
    def posts(self) -> list[Post]:
        return self._posts

    def add_post(self, post: Post) -> None:
        """Add a post to this user's list of posts."""
        self._posts.append(post)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        return self._id == other._id

    def __repr__(self) -> str:
        return (
            f"User(id={self._id!r}, username={self._username!r}, "
            f"posts={self._posts!r})"
        )
