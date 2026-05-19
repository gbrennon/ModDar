import { describe, it, expect } from "vitest";
import { Link } from "#server/domain/link";

function makeLink(overrides: Partial<ConstructorParameters<typeof Link>[0]> = {}): Link {
  const defaults = {
    id36: "p1",
    title: "Test Title",
    text: "Test text content.",
    accountId: "u1",
  };
  return new Link({ ...defaults, ...overrides });
}

describe("Link", () => {
  describe("constructor", () => {
    it("when required args passed then stores them", () => {
      const link = new Link({
        id36: "p1",
        title: "Title",
        text: "Text",
        accountId: "u1",
      });

      expect(link.id36).toBe("p1");
      expect(link.title).toBe("Title");
      expect(link.text).toBe("Text");
      expect(link.accountId).toBe("u1");
    });

    it("when all arguments passed then stores optional fields", () => {
      const link = new Link({
        id36: "p2",
        title: "Full Title",
        text: "Full text.",
        accountId: "u2",
        flairs: ["flair1", "flair2"],
        url: "https://example.com",
        images: ["img1.png", "img2.jpg"],
      });

      expect(link.flairs).toEqual(["flair1", "flair2"]);
      expect(link.url).toBe("https://example.com");
      expect(link.images).toEqual(["img1.png", "img2.jpg"]);
    });

    it("when flairs omitted then defaults to empty list", () => {
      const link = makeLink();
      expect(link.flairs).toEqual([]);
    });

    it("when flairs is null then defaults to empty list", () => {
      const link = makeLink({ flairs: null });
      expect(link.flairs).toEqual([]);
    });

    it("when url omitted then defaults to null", () => {
      const link = makeLink();
      expect(link.url).toBeNull();
    });

    it("when url is null then stays null", () => {
      const link = makeLink({ url: null });
      expect(link.url).toBeNull();
    });

    it("when images omitted then defaults to null", () => {
      const link = makeLink();
      expect(link.images).toBeNull();
    });

    it("when images is null then stays null", () => {
      const link = makeLink({ images: null });
      expect(link.images).toBeNull();
    });

    it("when images list passed then preserves it", () => {
      const link = makeLink({ images: ["a.png"] });
      expect(link.images).toEqual(["a.png"]);
    });
  });

  describe("equals", () => {
    it("when same values then returns true", () => {
      const linkA = new Link({
        id36: "p1",
        title: "T",
        text: "B",
        accountId: "u1",
        flairs: ["f1"],
        url: "http://x.com",
        images: ["i.png"],
      });
      const linkB = new Link({
        id36: "p1",
        title: "T",
        text: "B",
        accountId: "u1",
        flairs: ["f1"],
        url: "http://x.com",
        images: ["i.png"],
      });
      expect(linkA.equals(linkB)).toBe(true);
    });

    it("when different id36 then returns false", () => {
      expect(makeLink({ id36: "p1" }).equals(makeLink({ id36: "p2" }))).toBe(false);
    });

    it("when different title then returns false", () => {
      expect(makeLink({ title: "T1" }).equals(makeLink({ title: "T2" }))).toBe(false);
    });

    it("when different text then returns false", () => {
      expect(makeLink({ text: "B1" }).equals(makeLink({ text: "B2" }))).toBe(false);
    });

    it("when different accountId then returns false", () => {
      expect(makeLink({ accountId: "u1" }).equals(makeLink({ accountId: "u2" }))).toBe(false);
    });

    it("when different flairs then returns false", () => {
      expect(makeLink({ flairs: ["a"] }).equals(makeLink({ flairs: ["b"] }))).toBe(false);
    });

    it("when different url then returns false", () => {
      expect(makeLink({ url: "http://a.com" }).equals(makeLink({ url: "http://b.com" }))).toBe(false);
    });

    it("when different images then returns false", () => {
      expect(makeLink({ images: ["a.jpg"] }).equals(makeLink({ images: ["b.jpg"] }))).toBe(false);
    });

    it("when source images is null and other images is non-null then returns false", () => {
      const linkA = makeLink({ images: null });
      const linkB = makeLink({ images: ["a.jpg"] });
      expect(linkA.equals(linkB)).toBe(false);
    });

    it("when source images is non-null and other images is null then returns false", () => {
      const linkA = makeLink({ images: ["a.jpg"] });
      const linkB = makeLink({ images: null });
      expect(linkA.equals(linkB)).toBe(false);
    });

    it("when non-Link object then not equal", () => {
      expect(makeLink().equals("not-a-link")).toBe(false);
    });
  });

  describe("toString", () => {
    it("when all fields set then includes all values", () => {
      const link = new Link({
        id36: "p99",
        title: "Repr",
        text: "Text here",
        accountId: "u99",
        flairs: ["tag"],
        url: "http://l.com",
        images: ["im.png"],
      });
      const representation = link.toString();
      expect(representation).toContain("Link(");
      expect(representation).toContain('"p99"');
      expect(representation).toContain('"Repr"');
      expect(representation).toContain('"Text here"');
      expect(representation).toContain('"tag"');
      expect(representation).toContain('"http://l.com"');
      expect(representation).toContain('"im.png"');
    });

    it("when defaults and nulls then shows null and empty", () => {
      const representation = makeLink().toString();
      expect(representation).toContain("Link(");
      expect(representation).toContain("flairs=[]");
      expect(representation).toContain("url=null");
      expect(representation).toContain("images=null");
    });
  });
});
