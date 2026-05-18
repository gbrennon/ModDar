import {
  createLinkSnapshot,
  type LinkSnapshot,
} from "../dtos/responses/review-link-response.ts";
import type { Link } from "../../domain/link.ts";

/** Maps a domain ``Link`` to a primitive-only ``LinkSnapshot`` DTO. */
export class LinkSnapshotMapper {
  map(link: Link): LinkSnapshot {
    return createLinkSnapshot({
      id36: link.id36,
      title: link.title,
      text: link.text,
      accountId: link.accountId,
      subreddit: link.subreddit,
      flairs: link.flairs,
      url: link.url,
      images: link.images,
    });
  }
}
