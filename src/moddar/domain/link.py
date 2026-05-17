class Link:
    """Represents a Reddit Link (post / submission)."""

    def __init__(
        self,
        id36: str,
        title: str,
        text: str,
        account_id: str,
        flairs: list[str] | None = None,
        url: str | None = None,
        images: list[str] | None = None,
    ) -> None:
        self._id36 = id36
        self._title = title
        self._text = text
        self._account_id = account_id
        self._flairs: list[str] = flairs if flairs is not None else []
        self._url: str | None = url
        self._images: list[str] | None = images

    @property
    def id36(self) -> str:
        return self._id36

    @property
    def title(self) -> str:
        return self._title

    @property
    def text(self) -> str:
        return self._text

    @property
    def account_id(self) -> str:
        return self._account_id

    @property
    def flairs(self) -> list[str]:
        return self._flairs

    @property
    def url(self) -> str | None:
        return self._url

    @property
    def images(self) -> list[str] | None:
        return self._images

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Link):
            return NotImplemented
        return (
            self._id36 == other._id36
            and self._title == other._title
            and self._text == other._text
            and self._account_id == other._account_id
            and self._flairs == other._flairs
            and self._url == other._url
            and self._images == other._images
        )

    def __repr__(self) -> str:
        return (
            f"Link(id36={self._id36!r}, title={self._title!r}, "
            f"text={self._text!r}, account_id={self._account_id!r}, "
            f"flairs={self._flairs!r}, url={self._url!r}, "
            f"images={self._images!r})"
        )
