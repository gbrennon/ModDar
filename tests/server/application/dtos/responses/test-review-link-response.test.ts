import { describe, it, expect } from "vitest";
import {
  createLinkSnapshot,
  createLinkMatch,
  createReviewLinkResponse,
} from "../../../../../src/server/application/dtos/responses/review-link-response.ts";

describe("createReviewLinkResponse", () => {
  const snapshot = createLinkSnapshot({
    id36: "abc",
    title: "T",
    text: "B",
    accountId: "u1",
  });

  it("when matches omitted then defaults to empty array", () => {
    const response = createReviewLinkResponse({ originalLink: snapshot });
    expect(response.matches).toEqual([]);
  });

  it("when matches is explicitly null then defaults to empty array", () => {
    const response = createReviewLinkResponse({
      originalLink: snapshot,
      matches: null as unknown as undefined,
    });
    expect(response.matches).toEqual([]);
  });

  it("when matches is explicitly undefined then defaults to empty array", () => {
    const response = createReviewLinkResponse({
      originalLink: snapshot,
      matches: undefined,
    });
    expect(response.matches).toEqual([]);
  });

  it("when matches provided then preserves them", () => {
    const match = createLinkMatch({
      link: snapshot,
      similarityScore: 0.9,
      matchedSubreddit: "python",
      matchedAccountId: "u2",
    });
    const response = createReviewLinkResponse({
      originalLink: snapshot,
      matches: [match],
    });
    expect(response.matches).toEqual([match]);
  });
});
