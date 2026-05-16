class User:
    """Represents a Reddit user who creates posts."""

    def __init__(
        self,
        id: str,
        username: str,
        posts: list[str] | None = None,
    ) -> None:
        self._id = id
        self._username = username
        self._posts: list[str] = posts if posts is not None else []

    @property
    def id(self) -> str:
        return self._id

    @property
    def username(self) -> str:
        return self._username

    @property
    def posts(self) -> list[str]:
        return self._posts

    def add_post(self, post_id: str) -> None:
        """Add a post ID to this user's list of posts."""
        self._posts.append(post_id)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return NotImplemented
        return (
            self._id == other._id
            and self._username == other._username
            and self._posts == other._posts
        )

    def __repr__(self) -> str:
        return (
            f"User(id={self._id!r}, username={self._username!r}, "
            f"posts={self._posts!r})"
        )
