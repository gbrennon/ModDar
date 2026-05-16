from moddar.domain.post import Post
from moddar.domain.user import User


class TestUser:
    """Tests for the User domain entity."""

    @staticmethod
    def _make_post(**overrides: object) -> Post:
        kwargs: dict[str, object] = {
            "slug": "p1",
            "title": "T",
            "body": "B",
            "user_id": "u1",
        }
        kwargs.update(overrides)
        return Post(**kwargs)  # type: ignore[arg-type]

    def test_init_when_all_arguments_passed_then_stores_correctly(self) -> None:
        post1 = self._make_post(slug="p1")
        post2 = self._make_post(slug="p2")

        user = User(id="u1", username="testuser", posts=[post1, post2])

        assert user.id == "u1"
        assert user.username == "testuser"
        assert user.posts == [post1, post2]

    def test_init_when_posts_omitted_then_defaults_to_empty_list(self) -> None:
        user = User(id="u2", username="defaultuser")

        assert user.id == "u2"
        assert user.username == "defaultuser"
        assert user.posts == []

    def test_init_when_posts_is_none_then_defaults_to_empty_list(self) -> None:
        user = User(id="u3", username="noneuser", posts=None)

        assert user.posts == []

    def test_add_post_when_called_multiple_times_then_appends_sequentially(self) -> None:
        user = User(id="u4", username="poster")
        post1 = self._make_post(slug="post1")
        post2 = self._make_post(slug="post2")

        user.add_post(post1)
        user.add_post(post2)

        assert user.posts == [post1, post2]

    def test_eq_when_same_id_then_returns_true(self) -> None:
        post = self._make_post(slug="p1")
        user_a = User(id="u1", username="alice", posts=[post])
        user_b = User(id="u1", username="alice", posts=[post])

        assert user_a == user_b

    def test_eq_when_different_id_then_returns_false(self) -> None:
        user_a = User(id="u1", username="alice")
        user_b = User(id="u2", username="alice")

        assert user_a != user_b

    def test_eq_when_same_id_different_username_then_returns_true(self) -> None:
        user_a = User(id="u1", username="alice")
        user_b = User(id="u1", username="bob")

        assert user_a == user_b

    def test_eq_when_same_id_different_posts_then_returns_true(self) -> None:
        post1 = self._make_post(slug="p1")
        post2 = self._make_post(slug="p2")
        user_a = User(id="u1", username="alice", posts=[post1])
        user_b = User(id="u1", username="alice", posts=[post2])

        assert user_a == user_b

    def test_eq_when_non_user_object_then_not_equal(self) -> None:
        user = User(id="u1", username="alice")

        assert user != "not-a-user"

    def test_repr_when_all_fields_set_then_includes_all_values(self) -> None:
        post1 = self._make_post(slug="p1", title="T1", body="B1")
        post2 = self._make_post(slug="p2", title="T2", body="B2")
        user = User(id="u1", username="alice", posts=[post1, post2])

        representation = repr(user)

        assert "User(" in representation
        assert "'u1'" in representation
        assert "'alice'" in representation
        assert "'p1'" in representation
        assert "'p2'" in representation

    def test_repr_when_posts_empty_then_shows_empty_list(self) -> None:
        user = User(id="u2", username="bob")

        representation = repr(user)

        assert "User(" in representation
        assert "[]" in representation
