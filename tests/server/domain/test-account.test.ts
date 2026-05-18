import { describe, it, expect } from "vitest";
import { Account } from "../../../src/server/domain/account.ts";
import { Link } from "../../../src/server/domain/link.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLink(overrides: Partial<ConstructorParameters<typeof Link>[0]> = {}): Link {
  const defaults = {
    id36: "p1",
    title: "T",
    text: "B",
    accountId: "u1",
  };
  return new Link({ ...defaults, ...overrides });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Account", () => {
  describe("constructor", () => {
    it("when all arguments passed then stores correctly", () => {
      const link1 = makeLink({ id36: "p1" });
      const link2 = makeLink({ id36: "p2" });

      const account = new Account({
        id: "u1",
        username: "testuser",
        links: [link1, link2],
      });

      expect(account.id).toBe("u1");
      expect(account.username).toBe("testuser");
      expect(account.links).toEqual([link1, link2]);
    });

    it("when links omitted then defaults to empty list", () => {
      const account = new Account({ id: "u2", username: "defaultuser" });

      expect(account.id).toBe("u2");
      expect(account.username).toBe("defaultuser");
      expect(account.links).toEqual([]);
    });

    it("when links is null then defaults to empty list", () => {
      const account = new Account({
        id: "u3",
        username: "noneuser",
        links: null,
      });

      expect(account.links).toEqual([]);
    });
  });

  describe("addLink", () => {
    it("when called multiple times then appends sequentially", () => {
      const account = new Account({ id: "u4", username: "poster" });
      const link1 = makeLink({ id36: "link1" });
      const link2 = makeLink({ id36: "link2" });

      account.addLink(link1);
      account.addLink(link2);

      expect(account.links).toEqual([link1, link2]);
    });
  });

  describe("equals", () => {
    it("when same id then returns true", () => {
      const link = makeLink({ id36: "p1" });
      const accountA = new Account({
        id: "u1",
        username: "alice",
        links: [link],
      });
      const accountB = new Account({
        id: "u1",
        username: "alice",
        links: [link],
      });

      expect(accountA.equals(accountB)).toBe(true);
    });

    it("when different id then returns false", () => {
      const accountA = new Account({ id: "u1", username: "alice" });
      const accountB = new Account({ id: "u2", username: "alice" });

      expect(accountA.equals(accountB)).toBe(false);
    });

    it("when same id different username then returns true", () => {
      const accountA = new Account({ id: "u1", username: "alice" });
      const accountB = new Account({ id: "u1", username: "bob" });

      expect(accountA.equals(accountB)).toBe(true);
    });

    it("when same id different links then returns true", () => {
      const link1 = makeLink({ id36: "p1" });
      const link2 = makeLink({ id36: "p2" });
      const accountA = new Account({
        id: "u1",
        username: "alice",
        links: [link1],
      });
      const accountB = new Account({
        id: "u1",
        username: "alice",
        links: [link2],
      });

      expect(accountA.equals(accountB)).toBe(true);
    });

    it("when non-Account object then not equal", () => {
      const account = new Account({ id: "u1", username: "alice" });

      expect(account.equals("not-an-account")).toBe(false);
    });
  });

  describe("toString", () => {
    it("when all fields set then includes all values", () => {
      const link1 = makeLink({ id36: "p1", title: "T1", text: "B1" });
      const link2 = makeLink({ id36: "p2", title: "T2", text: "B2" });
      const account = new Account({
        id: "u1",
        username: "alice",
        links: [link1, link2],
      });

      const representation = account.toString();

      expect(representation).toContain("Account(");
      expect(representation).toContain('"u1"');
      expect(representation).toContain('"alice"');
      expect(representation).toContain('"p1"');
      expect(representation).toContain('"p2"');
    });

    it("when links empty then shows empty list", () => {
      const account = new Account({ id: "u2", username: "bob" });

      const representation = account.toString();

      expect(representation).toContain("Account(");
      expect(representation).toContain("[]");
    });
  });
});
