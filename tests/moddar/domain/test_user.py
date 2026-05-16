from moddar.domain.user import User


class TestUser:
    """Tests for the User domain entity."""

    def test_init_when_all_arguments_passed_then_stores_correctly(self) -> None:
        user = User(id="u1", username="testuser", posts=["p1", "p2"])

        assert user.id == "u1"
        assert user.username == "testuser"
        assert user.posts == ["p1", "p2"]

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

        user.add_post("post1")
        user.add_post("post2")

        assert user.posts == ["post1", "post2"]

    def test_eq_when_same_values_then_returns_true(self) -> None:
        user_a = User(id="u1", username="alice", posts=["p1"])
        user_b = User(id="u1", username="alice", posts=["p1"])

        assert user_a == user_b

    def test_eq_when_different_id_then_returns_false(self) -> None:
        user_a = User(id="u1", username="alice")
        user_b = User(id="u2", username="alice")

        assert user_a != user_b

    def test_eq_when_different_username_then_returns_false(self) -> None:
        user_a = User(id="u1", username="alice")
        user_b = User(id="u1", username="bob")

        assert user_a != user_b

    def test_eq_when_different_posts_then_returns_false(self) -> None:
        user_a = User(id="u1", username="alice", posts=["p1"])
        user_b = User(id="u1", username="alice", posts=["p2"])

        assert user_a != user_b

    def test_eq_when_non_user_object_then_not_equal(self) -> None:
        user = User(id="u1", username="alice")

        assert user != "not-a-user"

    def test_repr_when_all_fields_set_then_includes_all_values(self) -> None:
        user = User(id="u1", username="alice", posts=["p1", "p2"])

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
