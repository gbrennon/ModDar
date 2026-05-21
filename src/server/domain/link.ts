/** Represents a Reddit Link (post / submission). */
export class Link {
  private readonly _id36: string;
  private readonly _title: string;
  private readonly _text: string;
  private readonly _accountId: string;
  private readonly _subreddit: string | null;
  private readonly _flairs: readonly string[];
  private readonly _url: string | null;
  private readonly _images: readonly string[] | null;

  constructor({
    id36,
    title,
    text,
    accountId,
    subreddit = null,
    flairs = null,
    url = null,
    images = null,
  }: {
    id36: string;
    title: string;
    text: string;
    accountId: string;
    subreddit?: string | null;
    flairs?: readonly string[] | null;
    url?: string | null;
    images?: readonly string[] | null;
  }) {
    this._id36 = id36;
    this._title = title;
    this._text = text;
    this._accountId = accountId;
    this._subreddit = subreddit;
    this._flairs = flairs ?? [];
    this._url = url;
    this._images = images;
  }

  get id36(): string {
    return this._id36;
  }

  get title(): string {
    return this._title;
  }

  get text(): string {
    return this._text;
  }

  get accountId(): string {
    return this._accountId;
  }

  get subreddit(): string | null {
    return this._subreddit;
  }

  get flairs(): readonly string[] {
    return this._flairs;
  }

  get url(): string | null {
    return this._url;
  }

  get images(): readonly string[] | null {
    return this._images;
  }

  /** Value-based equality: compares all fields. */
  equals(other: unknown): boolean {
    if (!(other instanceof Link)) {
      return false;
    }
    return (
      this._id36 === other._id36 &&
      this._title === other._title &&
      this._text === other._text &&
      this._accountId === other._accountId &&
      this._subreddit === other._subreddit &&
      this._flairs.length === other._flairs.length &&
      this._flairs.every((f, i) => f === other._flairs[i]) &&
      this._url === other._url &&
      (this._images === null
        ? other._images === null
        : other._images !== null &&
          this._images.length === other._images.length &&
          this._images.every((img, i) => img === other._images![i]))
    );
  }

  toString(): string {
    return (
      `Link(id36=${JSON.stringify(this._id36)}, ` +
      `title=${JSON.stringify(this._title)}, ` +
      `text=${JSON.stringify(this._text)}, ` +
      `accountId=${JSON.stringify(this._accountId)}, ` +
      `subreddit=${JSON.stringify(this._subreddit)}, ` +
      `flairs=${JSON.stringify(this._flairs)}, ` +
      `url=${JSON.stringify(this._url)}, ` +
      `images=${JSON.stringify(this._images)})`
    );
  }
}
