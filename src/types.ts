import { Message } from "./Message";

export interface ConversionOptions {
  readonly copyUnknownProperties?: boolean;
  readonly partial?: boolean;
}

export type PlainObject = Record<string, unknown>;

export interface CatalogMember extends PlainObject {
  type: string;
  name: string;
}

export interface MemberResult {
  member: CatalogMember | null;
  messages: Message[];
}

export type MembersResult = {
  members: CatalogMember[];
  messages: Message[];
};
