import { describe, it, expect } from "vitest";
import { Link } from "../../../../src/server/domain/link.ts";
import { LinkSnapshotMapper } from "../../../../src/server/application/mappers/link-snapshot-mapper.ts";
import {
  createLinkSnapshot,
  type LinkSnapshot,
} from "../../../../src/server/application/dtos/responses/review-link-response.ts";

function makeLink(overrides: Partial<ConstructorParameters<typeof Link>[0]> = {}): Link {
  const defaults: ConstructorParameters<typeof Link>[0] = {
    id36: "abc123",
    title: "A great post",
    text: "This is the body of a great post.",
    accountId: "u1",
    subreddit: "scala",
  };
  return new Link({ ...defaults, ...overrides });
}

describe("LinkSnapshotMapper", () => {
  const mapper = new LinkSnapshotMapper();

  describe("map", () => {
    it("when link has all fields then copies everything", () => {
      const link = makeLink({
        id36: "abc",
        title: "Title",
        text: "Body",
        accountId: "u99",
        subreddit: "scala",
        flairs: ["flair1", "flair2"],
        url: "https://example.com",
        images: ["img1.png"],
      });

      const snapshot = mapper.map(link);

      const expected: LinkSnapshot = createLinkSnapshot({
        id36: "abc",
        title: "Title",
        text: "Body",
        accountId: "u99",
        subreddit: "scala",
        flairs: ["flair1", "flair2"],
        url: "https://example.com",
        images: ["img1.png"],
      });
      expect(snapshot).toEqual(expected);
    });

    it("when link has no optional fields then snapshot has defaults", () => {
      const link = makeLink({
        subreddit: null,
        flairs: null,
        url: null,
        images: null,
      });

      const snapshot = mapper.map(link);

      expect(snapshot.subreddit).toBeNull();
      expect(snapshot.flairs).toEqual([]);
      expect(snapshot.url).toBeNull();
      expect(snapshot.images).toBeNull();
    });

    it("when link has no flairs then snapshot flairs is empty", () => {
      const link = makeLink({ flairs: null });

      const snapshot = mapper.map(link);

      expect(snapshot.flairs).toEqual([]);
    });
  });
});
