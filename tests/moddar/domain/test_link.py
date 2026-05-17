from moddar.domain.link import Link


class TestLink:
    """Tests for the Link domain entity."""

    @staticmethod
    def _make_link(**overrides: object) -> Link:
        """Create a Link with sensible defaults, overridden by kwargs."""
        kwargs: dict[str, object] = {
            "id36": "p1",
            "title": "Test Title",
            "text": "Test text content.",
            "account_id": "u1",
        }
        kwargs.update(overrides)
        return Link(**kwargs)  # type: ignore[arg-type]

    def test_init_when_required_args_passed_then_stores_them(self) -> None:
        link = Link(id36="p1", title="Title", text="Text", account_id="u1")

        assert link.id36 == "p1"
        assert link.title == "Title"
        assert link.text == "Text"
        assert link.account_id == "u1"

    def test_init_when_all_arguments_passed_then_stores_optional_fields(self) -> None:
        link = Link(
            id36="p2",
            title="Full Title",
            text="Full text.",
            account_id="u2",
            flairs=["flair1", "flair2"],
            url="https://example.com",
            images=["img1.png", "img2.jpg"],
        )

        assert link.flairs == ["flair1", "flair2"]
        assert link.url == "https://example.com"
        assert link.images == ["img1.png", "img2.jpg"]

    def test_init_when_flairs_omitted_then_defaults_to_empty_list(self) -> None:
        link = self._make_link()

        assert link.flairs == []

    def test_init_when_flairs_is_none_then_defaults_to_empty_list(self) -> None:
        link = self._make_link(flairs=None)

        assert link.flairs == []

    def test_init_when_url_omitted_then_defaults_to_none(self) -> None:
        link = self._make_link()

        assert link.url is None

    def test_init_when_url_is_none_then_stays_none(self) -> None:
        link = self._make_link(url=None)

        assert link.url is None

    def test_init_when_images_omitted_then_defaults_to_none(self) -> None:
        link = self._make_link()

        assert link.images is None

    def test_init_when_images_is_none_then_stays_none(self) -> None:
        link = self._make_link(images=None)

        assert link.images is None

    def test_init_when_images_list_passed_then_preserves_it(self) -> None:
        link = self._make_link(images=["a.png"])

        assert link.images == ["a.png"]

    def test_eq_when_same_values_then_returns_true(self) -> None:
        link_a = Link(
            id36="p1", title="T", text="B", account_id="u1",
            flairs=["f1"], url="http://x.com", images=["i.png"],
        )
        link_b = Link(
            id36="p1", title="T", text="B", account_id="u1",
            flairs=["f1"], url="http://x.com", images=["i.png"],
        )

        assert link_a == link_b

    def test_eq_when_different_id36_then_returns_false(self) -> None:
        link_a = self._make_link(id36="p1")
        link_b = self._make_link(id36="p2")

        assert link_a != link_b

    def test_eq_when_different_title_then_returns_false(self) -> None:
        link_a = self._make_link(title="T1")
        link_b = self._make_link(title="T2")

        assert link_a != link_b

    def test_eq_when_different_text_then_returns_false(self) -> None:
        link_a = self._make_link(text="B1")
        link_b = self._make_link(text="B2")

        assert link_a != link_b

    def test_eq_when_different_account_id_then_returns_false(self) -> None:
        link_a = self._make_link(account_id="u1")
        link_b = self._make_link(account_id="u2")

        assert link_a != link_b

    def test_eq_when_different_flairs_then_returns_false(self) -> None:
        link_a = self._make_link(flairs=["a"])
        link_b = self._make_link(flairs=["b"])

        assert link_a != link_b

    def test_eq_when_different_url_then_returns_false(self) -> None:
        link_a = self._make_link(url="http://a.com")
        link_b = self._make_link(url="http://b.com")

        assert link_a != link_b

    def test_eq_when_different_images_then_returns_false(self) -> None:
        link_a = self._make_link(images=["a.jpg"])
        link_b = self._make_link(images=["b.jpg"])

        assert link_a != link_b

    def test_eq_when_non_link_object_then_not_equal(self) -> None:
        link = self._make_link()

        assert link != "not-a-link"

    def test_repr_when_all_fields_set_then_includes_all_values(self) -> None:
        link = Link(
            id36="p99", title="Repr", text="Text here", account_id="u99",
            flairs=["tag"], url="http://l.com", images=["im.png"],
        )

        representation = repr(link)

        assert "Link(" in representation
        assert "'p99'" in representation
        assert "'Repr'" in representation
        assert "'Text here'" in representation
        assert "'tag'" in representation
        assert "'http://l.com'" in representation
        assert "'im.png'" in representation

    def test_repr_when_defaults_and_nulls_then_shows_none_and_empty(self) -> None:
        link = self._make_link()

        representation = repr(link)

        assert "Link(" in representation
        assert "flairs=[]" in representation
        assert "url=None" in representation
        assert "images=None" in representation
