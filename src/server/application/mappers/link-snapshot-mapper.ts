import {
  createLinkSnapshot,
  type LinkSnapshot,
} from "#server/application/dtos/responses/review-link-response";
import type { Link } from "#server/domain/link";
import type { Mapper } from "#shared/ports/mapper";

/** Maps a domain ``Link`` to a primitive-only ``LinkSnapshot`` DTO. */
export class LinkSnapshotMapper implements Mapper<Link, LinkSnapshot> {
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
