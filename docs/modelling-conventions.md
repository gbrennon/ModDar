# ModDar — Modelling Conventions

## Directory layout

```
src/moddar/
├── domain/                          # Core domain entities
│   ├── link.py
│   └── account.py
├── application/
│   ├── dtos/
│   │   ├── requests/                # Inbound command DTOs (primitives only)
│   │   └── responses/               # Outbound result DTOs (primitives only)
│   ├── ports/
│   │   └── inbound/                 # Use-case Protocol definitions
│   └── services/                    # Use-case implementations
├── infrastructure/                  # Adapters (PRAW, persistence, …)
└── presentation/                    # CLI / API entrypoints
```

---

## Domain modelling

Domain entities live under `src/moddar/domain/`.  They represent core
concepts of the problem space and follow these conventions.

### Style: immutable-by-convention value objects

Domain entities use **private attributes + `@property`** for read access.
Constructors accept `*` (keyword-only) after mandatory positional args to
prevent accidental positional misuse.

```python
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

    # … remaining @property definitions
```

### Mutable default handling

`list` and other mutable defaults must never appear in the constructor
signature directly.  Use `None` as the default and normalise inside
`__init__`:

```python
# ❌  flairs: list[str] = []        # shared across all instances
# ✅
flairs: list[str] | None = None
# …
self._flairs: list[str] = flairs if flairs is not None else []
```

### `__eq__`

- Guard with `isinstance(other, ThisClass)`, return `NotImplemented` for
  foreign types.
- Compare private attributes, not public properties, for consistency.
- `Account.__eq__` compares by **identity** (`_id` only) rather than by
  value, because two `Account` objects with the same `id` represent the
  same Reddit account regardless of snapshot differences in `links`.

```python
def __eq__(self, other: object) -> bool:
    if not isinstance(other, Link):
        return NotImplemented
    return (
        self._id36 == other._id36
        and self._title == other._title
        # …
    )
```

### `__repr__`

Show the class name and every field value using `!r` (repr-style
formatting) so the output is copy-pasteable for debugging:

```python
def __repr__(self) -> str:
    return (
        f"Link(id36={self._id36!r}, title={self._title!r}, "
        f"text={self._text!r}, account_id={self._account_id!r}, "
        f"flairs={self._flairs!r}, url={self._url!r}, "
        f"images={self._images!r})"
    )
```

### Forward references

Use `from __future__ import annotations` at the top when cross-domain
imports are needed (see `Account` → `Link` typed with `TYPE_CHECKING`).

---

## DTO modelling (request / response)

DTOs are the **only data structures that cross the application
boundary**.  They live under `src/moddar/application/dtos/requests/` and
`…/responses/` and must never expose domain types to external callers.

### Style: frozen dataclasses

Every DTO is a `@dataclass(frozen=True)`.  No hand-written `__init__`,
`__eq__`, or `__repr__` — the decorator generates them.

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ReviewLinkRequest:
    """Carries the identifiers needed to locate and review a Link."""

    subreddit: str
    id36: str
```

### Primitives only

DTO fields may only be:

| Category   | Allowed types                                 |
|-----------|-----------------------------------------------|
| Scalars    | `str`, `float`, `int`, `bool`, `None`         |
| Containers | `list[str]`, `list[float]`, …                 |
| Nested     | *other primitive-only DTOs* (`LinkSnapshot`, `LinkMatch`, …) |

**Not allowed:** domain entities (`Link`, `Account`), repository
interfaces, service objects, or any infrastructure type.

When a response needs to carry information about a domain entity (e.g. a
`Link`), define a **primitive snapshot** DTO in the response layer:

```python
@dataclass(frozen=True)
class LinkSnapshot:
    """Primitive-only snapshot of a Reddit Link."""

    id36: str
    title: str
    text: str
    account_id: str
    flairs: list[str] = field(default_factory=list)
    url: str | None = None
    images: list[str] | None = None
```

### Mutable default handling

Use `field(default_factory=list)` instead of `= []` to avoid shared
mutable defaults across dataclass instances.

```python
@dataclass(frozen=True)
class ReviewLinkResponse:
    original_link: LinkSnapshot
    matches: list[LinkMatch] = field(default_factory=list)
```

### Reddit API vocabulary (source of truth for naming)

All code identifiers should use Reddit's own terminology.  Below is the
canonical vocabulary extracted from the [Reddit API
documentation](https://www.reddit.com/dev/api/).

#### Core domain terms

| Reddit term    | Type prefix | What it is                                      |
|---------------|------------|-------------------------------------------------|
| **Link**       | `t3_`      | A post / submission                              |
| **Comment**    | `t1_`      | A comment on a Link or another Comment           |
| **Account**    | `t2_`      | A Reddit user                                    |
| **Message**    | `t4_`      | A private message                                |
| **Subreddit**  | `t5_`      | A community (`sr` or `sr_name` in API params)    |
| **Award**       | `t6_`      | An award given to a Link or Comment              |

#### Identifier terms

| Reddit term   | Meaning                                                        | API example                                   |
|--------------|----------------------------------------------------------------|-----------------------------------------------|
| **thing**     | Generic term for *any* Reddit object                           | `fullname of a thing`                          |
| **fullname**  | Globally-unique ID: type prefix + base-36 ID                   | `t3_15bfi0`                                    |
| **id36**      | The base-36 portion of a fullname (the unique ID *without* prefix) | `ID36 of a link`, `comment ID36s`              |
| **article**   | Synonym for the id36 of a Link                                 | `/comments/{article}` — `ID36 of a link`       |
| **name**      | Ambiguous: sometimes a username, sometimes a fullname           | `name a user by name` vs `names … link fullnames` |

#### Submission-related terms

| Reddit term      | Meaning                                               | API param                                        |
|-----------------|-------------------------------------------------------|--------------------------------------------------|
| **kind**         | Submission type                                        | `one of (link, self, image, video, videogif)`     |
| **self** / **self-post** | A text-only post (no external URL)           | `kind=self`                                       |
| **title**        | Post title (≤ 300 chars)                               | `title of the submission`                         |
| **text**         | Body in raw markdown                                   | `text raw markdown text`                          |
| **url**          | External URL for link posts                            | `url a valid URL`                                 |
| **nsfw**         | Not-safe-for-work flag                                 | `nsfw boolean value`                              |
| **spoiler**      | Spoiler flag                                           | `spoiler boolean value`                           |
| **flair**        | Tag / label on a Link or Account                       | `LINK_FLAIR`, `USER_FLAIR`; API uses singular     |
| **sticky**       | Pinned post in a subreddit                             | `set_subreddit_sticky`                            |
| **crosspost**    | Re-sharing a Link to another subreddit                 | `crossposts_only`                                 |
| **duplicate**    | Same URL submitted elsewhere                           | `/duplicates/{article}`                           |

#### Collection terms

| Reddit term   | Meaning                                                     |
|--------------|-------------------------------------------------------------|
| **Listing**   | A paginated collection of things (no page numbers)           |
| **after**     | Fullname anchor for the next slice of a Listing              |
| **before**    | Fullname anchor for the previous slice                       |
| **limit**     | Max items to return in a Listing slice                       |

#### Naming suggestions for this codebase

Based on the vocabulary above, prefer these names:

| Concept                             | Suggested name                | Avoid                          |
|-------------------------------------|-------------------------------|--------------------------------|
| A Reddit post/submission            | `Link`                        | `Post`, `Submission`           |
| A Reddit user                       | `Account`                     | `User`                         |
| Base-36 ID of a Link                | `id36`                        | `slug`, `post_id`, `article`   |
| Fullname of a Link                  | `link_fullname`               | `fullname`, `id` (ambiguous)   |
| Single `execute` use-case request   | `…Request`                    | `…Command`, `…Input`           |
| Single `execute` use-case response  | `…Response`                   | `…Result`, `…Output`           |
| Inbound port (Protocol)             | `…Port`                       | `…UseCase`, `…Service`, `…Interactor` |
| Subreddit name                      | `subreddit`                   | `sr` (too terse), `community`  |
| Post tag/label                      | `flairs` (list)               | `tags`, `labels`               |
| External URL on a Link post         | `url`                         | `link` (ambiguous with `Link`) |
| Text body of a self-post            | `text`                        | `body`, `content`              |

---

## Port modelling (inbound)

Inbound ports define the **contract between the external world and the
application**.  They live under `src/moddar/application/ports/inbound/`.

### Style: `typing.Protocol`

Ports are defined as `Protocol` classes — structural subtyping means
implementations don't need to inherit; any class with a matching
`execute` method satisfies the contract.

### Naming

The port name **screams the use-case intention**: what does the
application do, *not* how.

✅ `DetectCrossSubredditSpamPort`
❌ `ReviewPostPort`, `PostService`

### Single `execute` method

Every inbound port exposes exactly one async method named `execute`:

```python
from typing import Protocol

from moddar.application.dtos.requests.review_post_request import ReviewLinkRequest
from moddar.application.dtos.responses.review_post_response import ReviewLinkResponse


class DetectCrossSubredditSpamPort(Protocol):
    """Detect AI karma-farming spam by reviewing a Link against other subreddits."""

    async def execute(self, request: ReviewLinkRequest) -> ReviewLinkResponse:
        """Run the spam-detection review for the given Link."""
        ...
```

### Async

Ports are asynchronous because real implementations perform network I/O
(Reddit API via PRAW) and possibly fuzzy-matching computation
(rapidfuzz).  The project is configured with `pytest-asyncio`
(`asyncio_mode = "strict"`) so async tests are supported out of the box.
