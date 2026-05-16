from moddar.domain.post import Post
from moddar.domain.user import User


class TestPost:
    """Tests for the Post domain entity."""

    @staticmethod
    def _make_user() -> User:
        return User(id="u1", username="testuser")

    @staticmethod
    def _make_post(**overrides: object) -> Post:
        """Create a Post with sensible defaults, overridden by kwargs."""
        kwargs: dict[str, object] = {
            "id": "p1",
            "title": "Test Title",
            "body": "Test body content.",
            "user": TestPost._make_user(),
        }
        kwargs.update(overrides)
        return Post(**kwargs)  # type: ignore[arg-type]

    def test_init_when_required_args_passed_then_stores_them(self) -> None:
        user = self._make_user()

        post = Post(id="p1", title="Title", body="Body", user=user)

        assert post.id == "p1"
        assert post.title == "Title"
        assert post.body == "Body"
        assert post.user == user

    def test_init_when_all_arguments_passed_then_stores_optional_fields(self) -> None:
        user = self._make_user()

        post = Post(
            id="p2",
            title="Full Title",
            body="Full body.",
            user=user,
            flairs=["flair1", "flair2"],
            link="https://example.com",
            images=["img1.png", "img2.jpg"],
        )

        assert post.flairs == ["flair1", "flair2"]
        assert post.link == "https://example.com"
        assert post.images == ["img1.png", "img2.jpg"]

    def test_init_when_flairs_omitted_then_defaults_to_empty_list(self) -> None:
        post = self._make_post()

        assert post.flairs == []

    def test_init_when_flairs_is_none_then_defaults_to_empty_list(self) -> None:
        post = self._make_post(flairs=None)

        assert post.flairs == []

    def test_init_when_link_omitted_then_defaults_to_none(self) -> None:
        post = self._make_post()

        assert post.link is None

    def test_init_when_link_is_none_then_stays_none(self) -> None:
        post = self._make_post(link=None)

        assert post.link is None

    def test_init_when_images_omitted_then_defaults_to_none(self) -> None:
        post = self._make_post()

        assert post.images is None

    def test_init_when_images_is_none_then_stays_none(self) -> None:
        post = self._make_post(images=None)

        assert post.images is None

    def test_init_when_images_list_passed_then_preserves_it(self) -> None:
        post = self._make_post(images=["a.png"])

        assert post.images == ["a.png"]

    def test_add_flair_when_called_multiple_times_then_appends_sequentially(self) -> None:
        post = self._make_post()

        post.add_flair("discussion")
        post.add_flair("meta")

        assert post.flairs == ["discussion", "meta"]

    def test_add_flair_when_default_flairs_empty_then_adds_successfully(self) -> None:
        post = self._make_post()

        post.add_flair("first")

        assert post.flairs == ["first"]

    def test_eq_when_same_values_then_returns_true(self) -> None:
        user = self._make_user()
        post_a = Post(
            id="p1", title="T", body="B", user=user,
            flairs=["f1"], link="http://x.com", images=["i.png"],
        )
        post_b = Post(
            id="p1", title="T", body="B", user=user,
            flairs=["f1"], link="http://x.com", images=["i.png"],
        )

        assert post_a == post_b

    def test_eq_when_different_id_then_returns_false(self) -> None:
        post_a = self._make_post(id="p1")
        post_b = self._make_post(id="p2")

        assert post_a != post_b

    def test_eq_when_different_title_then_returns_false(self) -> None:
        post_a = self._make_post(title="T1")
        post_b = self._make_post(title="T2")

        assert post_a != post_b

    def test_eq_when_different_body_then_returns_false(self) -> None:
        post_a = self._make_post(body="B1")
        post_b = self._make_post(body="B2")

        assert post_a != post_b

    def test_eq_when_different_user_then_returns_false(self) -> None:
        user_a = User(id="u1", username="alice")
        user_b = User(id="u2", username="bob")
        post_a = self._make_post(user=user_a)
        post_b = self._make_post(user=user_b)

        assert post_a != post_b

    def test_eq_when_different_flairs_then_returns_false(self) -> None:
        post_a = self._make_post(flairs=["a"])
        post_b = self._make_post(flairs=["b"])

        assert post_a != post_b

    def test_eq_when_different_link_then_returns_false(self) -> None:
        post_a = self._make_post(link="http://a.com")
        post_b = self._make_post(link="http://b.com")

        assert post_a != post_b

    def test_eq_when_different_images_then_returns_false(self) -> None:
        post_a = self._make_post(images=["a.jpg"])
        post_b = self._make_post(images=["b.jpg"])

        assert post_a != post_b

    def test_eq_when_non_post_object_then_not_equal(self) -> None:
        post = self._make_post()

        assert post != "not-a-post"

    def test_repr_when_all_fields_set_then_includes_all_values(self) -> None:
        user = self._make_user()
        post = Post(
            id="p99", title="Repr", body="Body here", user=user,
            flairs=["tag"], link="http://l.com", images=["im.png"],
        )

        representation = repr(post)

        assert "Post(" in representation
        assert "'p99'" in representation
        assert "'Repr'" in representation
        assert "'Body here'" in representation
        assert "'tag'" in representation
        assert "'http://l.com'" in representation
        assert "'im.png'" in representation

    def test_repr_when_defaults_and_nulls_then_shows_none_and_empty(self) -> None:
        post = self._make_post()

        representation = repr(post)

        assert "Post(" in representation
        assert "flairs=[]" in representation
        assert "link=None" in representation
        assert "images=None" in representation
