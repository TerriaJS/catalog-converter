import { Message } from "./Message";

export interface ConversionOptions {
  readonly copyUnknownProperties?: boolean;
  readonly partial?: boolean;
  readonly generateIds?: boolean;
  readonly idLength?: number;
  // An optional accumulator for collecting all is enabled items in the catalog
  readonly enabledItemsAccumulator?: CatalogMember[];
  readonly disableV7autoIdSharekeys?: boolean;
}

export type PlainObject = Record<string, unknown>;

export interface CatalogMember extends PlainObject {
  type: string;
  name: string;
  id?: string;
  shareKeys?: string[];
}

export interface MemberResult {
  member: CatalogMember | null;
  messages: Message[];
}

export type MembersResult = {
  members: CatalogMember[];
  messages: Message[];
};
