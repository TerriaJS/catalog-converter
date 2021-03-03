import { Message } from "./Message";

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
