class Post:
    """Represents a Reddit post made by a user."""

    def __init__(
        self,
        slug: str,
        title: str,
        body: str,
        user_id: str,
        flairs: list[str] | None = None,
        link: str | None = None,
        images: list[str] | None = None,
    ) -> None:
        self._slug = slug
        self._title = title
        self._body = body
        self._user_id = user_id
        self._flairs: list[str] = flairs if flairs is not None else []
        self._link: str | None = link
        self._images: list[str] | None = images

    @property
    def slug(self) -> str:
        return self._slug

    @property
    def title(self) -> str:
        return self._title

    @property
    def body(self) -> str:
        return self._body

    @property
    def user_id(self) -> str:
        return self._user_id

    @property
    def flairs(self) -> list[str]:
        return self._flairs

    @property
    def link(self) -> str | None:
        return self._link

    @property
    def images(self) -> list[str] | None:
        return self._images

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Post):
            return NotImplemented
        return (
            self._slug == other._slug
            and self._title == other._title
            and self._body == other._body
            and self._user_id == other._user_id
            and self._flairs == other._flairs
            and self._link == other._link
            and self._images == other._images
        )

    def __repr__(self) -> str:
        return (
            f"Post(slug={self._slug!r}, title={self._title!r}, "
            f"body={self._body!r}, user_id={self._user_id!r}, "
            f"flairs={self._flairs!r}, link={self._link!r}, "
            f"images={self._images!r})"
        )
