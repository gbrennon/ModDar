import type { Link } from "./link.ts";

/** Represents a Reddit account (user). */
export class Account {
  private readonly _id: string;
  private readonly _username: string;
  private readonly _links: Link[];

  constructor({
    id,
    username,
    links = null,
  }: {
    id: string;
    username: string;
    links?: readonly Link[] | null;
  }) {
    this._id = id;
    this._username = username;
    this._links = links ? [...links] : [];
  }

  get id(): string {
    return this._id;
  }

  get username(): string {
    return this._username;
  }

  get links(): readonly Link[] {
    return this._links;
  }

  /** Add a Link to this account's list of links. */
  addLink(link: Link): void {
    this._links.push(link);
  }

  /** Identity-based equality: compares by id only. */
  equals(other: unknown): boolean {
    if (!(other instanceof Account)) {
      return false;
    }
    return this._id === other._id;
  }

  toString(): string {
    return (
      `Account(id=${JSON.stringify(this._id)}, ` +
      `username=${JSON.stringify(this._username)}, ` +
      `links=[${this._links.map((l) => l.toString()).join(", ")}])`
    );
  }
}
