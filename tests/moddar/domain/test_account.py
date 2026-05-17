from moddar.domain.link import Link
from moddar.domain.account import Account


class TestAccount:
    """Tests for the Account domain entity."""

    @staticmethod
    def _make_link(**overrides: object) -> Link:
        kwargs: dict[str, object] = {
            "id36": "p1",
            "title": "T",
            "text": "B",
            "account_id": "u1",
        }
        kwargs.update(overrides)
        return Link(**kwargs)  # type: ignore[arg-type]

    def test_init_when_all_arguments_passed_then_stores_correctly(self) -> None:
        link1 = self._make_link(id36="p1")
        link2 = self._make_link(id36="p2")

        account = Account(id="u1", username="testuser", links=[link1, link2])

        assert account.id == "u1"
        assert account.username == "testuser"
        assert account.links == [link1, link2]

    def test_init_when_links_omitted_then_defaults_to_empty_list(self) -> None:
        account = Account(id="u2", username="defaultuser")

        assert account.id == "u2"
        assert account.username == "defaultuser"
        assert account.links == []

    def test_init_when_links_is_none_then_defaults_to_empty_list(self) -> None:
        account = Account(id="u3", username="noneuser", links=None)

        assert account.links == []

    def test_add_link_when_called_multiple_times_then_appends_sequentially(self) -> None:
        account = Account(id="u4", username="poster")
        link1 = self._make_link(id36="link1")
        link2 = self._make_link(id36="link2")

        account.add_link(link1)
        account.add_link(link2)

        assert account.links == [link1, link2]

    def test_eq_when_same_id_then_returns_true(self) -> None:
        link = self._make_link(id36="p1")
        account_a = Account(id="u1", username="alice", links=[link])
        account_b = Account(id="u1", username="alice", links=[link])

        assert account_a == account_b

    def test_eq_when_different_id_then_returns_false(self) -> None:
        account_a = Account(id="u1", username="alice")
        account_b = Account(id="u2", username="alice")

        assert account_a != account_b

    def test_eq_when_same_id_different_username_then_returns_true(self) -> None:
        account_a = Account(id="u1", username="alice")
        account_b = Account(id="u1", username="bob")

        assert account_a == account_b

    def test_eq_when_same_id_different_links_then_returns_true(self) -> None:
        link1 = self._make_link(id36="p1")
        link2 = self._make_link(id36="p2")
        account_a = Account(id="u1", username="alice", links=[link1])
        account_b = Account(id="u1", username="alice", links=[link2])

        assert account_a == account_b

    def test_eq_when_non_account_object_then_not_equal(self) -> None:
        account = Account(id="u1", username="alice")

        assert account != "not-an-account"

    def test_repr_when_all_fields_set_then_includes_all_values(self) -> None:
        link1 = self._make_link(id36="p1", title="T1", text="B1")
        link2 = self._make_link(id36="p2", title="T2", text="B2")
        account = Account(id="u1", username="alice", links=[link1, link2])

        representation = repr(account)

        assert "Account(" in representation
        assert "'u1'" in representation
        assert "'alice'" in representation
        assert "'p1'" in representation
        assert "'p2'" in representation

    def test_repr_when_links_empty_then_shows_empty_list(self) -> None:
        account = Account(id="u2", username="bob")

        representation = repr(account)

        assert "Account(" in representation
        assert "[]" in representation
