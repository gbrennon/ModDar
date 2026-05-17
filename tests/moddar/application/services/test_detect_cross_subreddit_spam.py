"""Tests for ``DetectCrossSubredditSpamService``."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import pytest

from moddar.application.dtos.requests.review_post_request import ReviewLinkRequest
from moddar.application.dtos.responses.review_post_response import (
    LinkSnapshot,
    ReviewLinkResponse,
)
from moddar.application.services.detect_cross_subreddit_spam import (
    DetectCrossSubredditSpamService,
)
from moddar.domain.link import Link


# ---------------------------------------------------------------------------
# Fake / stub implementations of the outbound ports
# ---------------------------------------------------------------------------

class _StubLinkSource:
    """Controllable stub for ``LinkSourcePort``."""

    def __init__(self) -> None:
        self._link: Link | None = None
        self._fetch_link_calls: list[tuple[str, str]] = []

    def set_link(self, link: Link | None) -> None:
        self._link = link

    async def fetch_link(self, subreddit: str, id36: str) -> Link | None:
        self._fetch_link_calls.append((subreddit, id36))
        return self._link


class _StubCandidateFetcher:
    """Controllable stub for ``FetchCandidateLinksPort``."""

    def __init__(self) -> None:
        self._candidates: list[Link] = []
        self._fetch_calls: list[tuple[Link, int]] = []

    def set_candidates(self, candidates: Sequence[Link]) -> None:
        self._candidates = list(candidates)

    async def fetch_candidates(
        self, source: Link, *, limit: int = 100
    ) -> list[Link]:
        self._fetch_calls.append((source, limit))
        return list(self._candidates)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_link(**overrides: Any) -> Link:
    """Create a Link with sensible defaults, overridden by keyword args."""
    kwargs: dict[str, Any] = {
        "id36": "abc123",
        "title": "A great post",
        "text": "This is the body of a great post.",
        "account_id": "u1",
        "subreddit": "scala",
    }
    kwargs.update(overrides)
    return Link(**kwargs)


def _make_request(**overrides: Any) -> ReviewLinkRequest:
    kwargs: dict[str, Any] = {"subreddit": "scala", "id36": "abc123"}
    kwargs.update(overrides)
    return ReviewLinkRequest(**kwargs)


def _make_service(
    link_source: _StubLinkSource | None = None,
    candidate_fetcher: _StubCandidateFetcher | None = None,
    *,
    similarity_threshold: float = 0.7,
) -> DetectCrossSubredditSpamService:
    ls: _StubLinkSource = link_source or _StubLinkSource()
    cf: _StubCandidateFetcher = candidate_fetcher or _StubCandidateFetcher()
    return DetectCrossSubredditSpamService(
        ls, cf, similarity_threshold=similarity_threshold
    )


# ---------------------------------------------------------------------------
# TestExecute
# ---------------------------------------------------------------------------


class TestExecute:
    """Tests for the ``execute`` entry-point."""

    @pytest.mark.asyncio
    async def test_when_link_not_found_then_raises_value_error(self) -> None:
        link_source = _StubLinkSource()
        link_source.set_link(None)
        service = _make_service(link_source=link_source)

        with pytest.raises(ValueError, match="Link not found"):
            await service.execute(_make_request())

    @pytest.mark.asyncio
    async def test_when_no_candidates_then_returns_empty_matches(
        self,
    ) -> None:
        source = _make_link()
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert isinstance(response, ReviewLinkResponse)
        assert response.original_link.id36 == source.id36
        assert response.matches == []

    @pytest.mark.asyncio
    async def test_when_candidates_all_below_threshold_then_returns_empty(
        self,
    ) -> None:
        source = _make_link(
            title="Completely different title",
            text="Totally unique body text that is not similar.",
        )
        candidate = _make_link(
            id36="diff1",
            title="Not even close title",
            text="Something else entirely different from the source.",
            account_id="u2",
            subreddit="python",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert response.matches == []

    @pytest.mark.asyncio
    async def test_when_one_similar_candidate_then_returns_one_match(
        self,
    ) -> None:
        source = _make_link(
            title="How to learn Scala quickly",
            text="I found some great resources for learning Scala fast.",
        )
        candidate = _make_link(
            id36="dup1",
            title="How to learn Scala quickly",
            text="I found some great resources for learning Scala fast.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        match = response.matches[0]
        assert match.similarity_score == 1.0
        assert match.matched_subreddit == "programming"
        assert match.matched_account_id == "u1"
        assert match.link.id36 == "dup1"

    @pytest.mark.asyncio
    async def test_when_multiple_similar_candidates_then_returns_all(
        self,
    ) -> None:
        source = _make_link(
            title="Best Scala tips",
            text="Here are the best tips for writing Scala code.",
        )
        candidate_a = _make_link(
            id36="dup1",
            title="Best Scala tips",
            text="Here are the best tips for making Scala source code.",
            account_id="u1",
            subreddit="programming",
        )
        candidate_b = _make_link(
            id36="dup2",
            title="Best Scala tips",
            text="Here are the best tips for writing Scala and Java code.",
            account_id="u1",
            subreddit="coding",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate_a, candidate_b])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 2
        matched_ids = {m.link.id36 for m in response.matches}
        assert matched_ids == {"dup1", "dup2"}
        for m in response.matches:
            assert m.similarity_score >= 0.7

    @pytest.mark.asyncio
    async def test_when_candidate_has_similar_title_but_different_text_then_matches(
        self,
    ) -> None:
        source = _make_link(
            title="Scala tips and tricks",
            text="A completely different body that should not matter.",
        )
        candidate = _make_link(
            id36="dup1",
            title="Scala tips and tricks",
            text="Some unrelated text here that is totally different.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        assert response.matches[0].similarity_score == 1.0

    @pytest.mark.asyncio
    async def test_when_candidate_has_similar_text_but_different_title_then_matches(
        self,
    ) -> None:
        source = _make_link(
            title="A different title here",
            text="This is the same body text repeated across subreddits.",
        )
        candidate = _make_link(
            id36="dup1",
            title="Some other title entirely",
            text="This is the same body text repeated across subreddits.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        assert response.matches[0].similarity_score == 1.0

    @pytest.mark.asyncio
    async def test_when_custom_threshold_is_lower_then_catches_more(
        self,
    ) -> None:
        source = _make_link(
            title="Scala is great",
            text="I think Scala is a great programming language.",
        )
        candidate = _make_link(
            id36="dup1",
            title="Kotlin is great",
            text="Python is a great programming language.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source,
            candidate_fetcher=fetcher,
            similarity_threshold=0.5,
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1

    @pytest.mark.asyncio
    async def test_when_custom_threshold_is_higher_then_excludes_more(
        self,
    ) -> None:
        source = _make_link(
            title="Scala is great",
            text="I think Scala is a great programming language.",
        )
        candidate = _make_link(
            id36="dup1",
            title="Scala is great",
            text="I think Scala is a great programming language.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source,
            candidate_fetcher=fetcher,
            similarity_threshold=1.1,
        )

        response = await service.execute(_make_request())

        assert response.matches == []

    @pytest.mark.asyncio
    async def test_when_candidate_has_no_subreddit_then_matched_is_empty(
        self,
    ) -> None:
        source = _make_link(
            title="Scala tips",
            text="Best Scala tips for beginners.",
            subreddit=None,
        )
        candidate = _make_link(
            id36="dup1",
            title="Scala tips",
            text="Best Scala tips for beginners.",
            account_id="u1",
            subreddit=None,
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        assert response.matches[0].matched_subreddit == ""

    @pytest.mark.asyncio
    async def test_when_candidate_is_same_link_as_source_then_100_percent(
        self,
    ) -> None:
        link = _make_link(title="Same", text="Same body text.")
        link_source = _StubLinkSource()
        link_source.set_link(link)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([link])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        assert response.matches[0].similarity_score == 1.0

    @pytest.mark.asyncio
    async def test_when_request_different_subreddit_then_correct_params(
        self,
    ) -> None:
        source = _make_link(subreddit="python")
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        await service.execute(
            _make_request(subreddit="python", id36="xyz789")
        )

        assert link_source._fetch_link_calls == [("python", "xyz789")]

    @pytest.mark.asyncio
    async def test_when_candidates_mixed_then_only_similar_returned(
        self,
    ) -> None:
        source = _make_link(
            title="How to write good Scala code",
            text="Writing good Scala code requires practice and understanding.",
        )
        similar = _make_link(
            id36="dup1",
            title="How to write good Scala code",
            text="Writing good Scala code requires practice and understanding.",
            account_id="u1",
            subreddit="programming",
        )
        dissimilar = _make_link(
            id36="diff1",
            title="Python vs Java: which is better?",
            text="A long discussion about Python and Java differences.",
            account_id="u2",
            subreddit="python",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([dissimilar, similar])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1
        assert response.matches[0].link.id36 == "dup1"


# ---------------------------------------------------------------------------
# TestComputeSimilarity
# ---------------------------------------------------------------------------


class TestComputeSimilarity:
    """Tests for the ``_compute_similarity`` static method."""

    def test_when_identical_links_then_returns_1_0(self) -> None:
        link_a = _make_link(title="Hello", text="World")
        link_b = _make_link(title="Hello", text="World")

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 1.0

    def test_when_completely_different_then_returns_low_score(self) -> None:
        link_a = _make_link(
            title="AAAAAAAAAAAAAAAAAAAA",
            text="BBBBBBBBBBBBBBBBBBBB",
        )
        link_b = _make_link(
            title="ZZZZZZZZZZZZZZZZZZZZ",
            text="YYYYYYYYYYYYYYYYYYYY",
        )

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 0.0

    def test_when_title_is_more_similar_than_text_then_uses_title(
        self,
    ) -> None:
        link_a = _make_link(
            title="Scala tips and tricks for beginners",
            text="AAAA BBBB CCCC DDDD EEEE FFFF GGGG HHHH IIII JJJJ",
        )
        link_b = _make_link(
            title="Scala tips and tricks for beginners",
            text="ZZZZ YYYY XXXX WWWW VVVV UUUU TTTT SSSS RRRR QQQQ",
        )

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 1.0

    def test_when_text_is_more_similar_than_title_then_uses_text(
        self,
    ) -> None:
        link_a = _make_link(
            title="AAAA BBBB CCCC DDDD EEEE FFFF",
            text="This is the exact same body text in both posts.",
        )
        link_b = _make_link(
            title="ZZZZ YYYY XXXX WWWW VVVV UUUU",
            text="This is the exact same body text in both posts.",
        )

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 1.0

    def test_when_empty_strings_then_returns_1_0(self) -> None:
        link_a = _make_link(title="", text="")
        link_b = _make_link(title="", text="")

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 1.0

    def test_when_one_empty_and_one_non_empty_then_low_score(self) -> None:
        link_a = _make_link(title="", text="")
        link_b = _make_link(
            title="A real title",
            text="A real body with actual content here.",
        )

        score = DetectCrossSubredditSpamService._compute_similarity(
            link_a, link_b
        )

        assert score == 0.0


# ---------------------------------------------------------------------------
# TestToSnapshot
# ---------------------------------------------------------------------------


class TestToSnapshot:
    """Tests for the ``_to_snapshot`` static method."""

    def test_when_link_has_all_fields_then_copies_everything(self) -> None:
        link = _make_link(
            id36="abc",
            title="Title",
            text="Body",
            account_id="u99",
            subreddit="scala",
            flairs=["flair1", "flair2"],
            url="https://example.com",
            images=["img1.png"],
        )

        snapshot = DetectCrossSubredditSpamService._to_snapshot(link)

        assert snapshot == LinkSnapshot(
            id36="abc",
            title="Title",
            text="Body",
            account_id="u99",
            subreddit="scala",
            flairs=["flair1", "flair2"],
            url="https://example.com",
            images=["img1.png"],
        )

    def test_when_link_has_no_optional_fields_then_snapshot_has_defaults(
        self,
    ) -> None:
        link = _make_link(
            subreddit=None,
            flairs=None,
            url=None,
            images=None,
        )

        snapshot = DetectCrossSubredditSpamService._to_snapshot(link)

        assert snapshot.subreddit is None
        assert snapshot.flairs == []
        assert snapshot.url is None
        assert snapshot.images is None

    def test_when_link_has_no_flairs_then_snapshot_flairs_is_empty(
        self,
    ) -> None:
        link = _make_link(flairs=None)

        snapshot = DetectCrossSubredditSpamService._to_snapshot(link)

        assert snapshot.flairs == []


# ---------------------------------------------------------------------------
# TestConstructor
# ---------------------------------------------------------------------------


class TestConstructor:
    """Tests for the service constructor and configuration."""

    @pytest.mark.asyncio
    async def test_when_default_threshold_then_uses_0_7(self) -> None:
        source = _make_link(
            title="Scala is awesome",
            text="I love Scala.",
        )
        candidate = _make_link(
            id36="dup1",
            title="Scala is awesome",
            text="I love Scala.",
            account_id="u1",
            subreddit="programming",
        )
        link_source = _StubLinkSource()
        link_source.set_link(source)
        fetcher = _StubCandidateFetcher()
        fetcher.set_candidates([candidate])
        service = _make_service(
            link_source=link_source, candidate_fetcher=fetcher
        )

        response = await service.execute(_make_request())

        assert len(response.matches) == 1

    def test_when_threshold_is_zero_then_accepts_it(self) -> None:
        service = _make_service(similarity_threshold=0.0)
        assert service._similarity_threshold == 0.0

    def test_when_threshold_is_one_then_accepts_it(self) -> None:
        service = _make_service(similarity_threshold=1.0)
        assert service._similarity_threshold == 1.0
