import { createOpaqueAPI } from "@iadvize-oss/opaque-type";
import { createFoldObject } from "@iadvize-oss/foldable-helpers";

export enum Severity {
  Error, // Failed to convert an item or property
  Warning, // Had extra unknown/unsupported properties
}

export enum ModelType {
  Member = "CatalogMember",
  Group = "CatalogGroup",
  WmsItem = "WebMapServiceCatalogItem",
  CsvItem = "CsvCatalogItem",
  SosItem = "SensorObservationServiceCatalogItem",
}

interface MessageBase {
  readonly message: string;
  readonly path: string[];
  readonly severity: Severity;
}

export interface UnknownPropDetails {
  readonly modelType: ModelType;
  readonly property: string;
}

export interface MissingRequiredPropDetails {
  readonly modelType: ModelType;
  readonly property: string | string[];
  readonly requiredType?: string;
}

export interface UnknownTypeDetails {
  readonly type: string;
}

export interface InputNotPlainObjectDetails {}

// interface $MissingRequiredMemberProp {}
// interface $GroupMissingItems {}

// interface $MissingRequiredWmsProp {
//   readonly property: string;
// }

// export enum MessageType {
//   UnknownProp,
//   MissingRequiredMemberProp,
// }

// export interface UnknownProp {
//   __typename: UnknownProp;
//   readonly property: string;
// }
// export interface MissingRequiredMemberProp {
//   __typename: MissingRequiredMemberProp;
// }

const unknownPropOpaque = createOpaqueAPI<"UnknownProp", UnknownPropDetails>(
  "UnknownProp"
);
export interface UnknownProp extends MessageBase {
  details: ReturnType<typeof unknownPropOpaque.toOpaque>;
}
export function isUnknownProp(m: Message): m is UnknownProp {
  return unknownPropOpaque.isOpaque(m.details);
}

const missingRequiredPropOpaque = createOpaqueAPI<
  "MissingRequiredProp",
  MissingRequiredPropDetails
>("MissingRequiredProp");
export interface MissingRequiredProp extends MessageBase {
  details: ReturnType<typeof missingRequiredPropOpaque.toOpaque>;
}
export function isMissingRequiredProp(m: Message): m is MissingRequiredProp {
  return missingRequiredPropOpaque.isOpaque(m.details);
}

const unknownTypeOpaque = createOpaqueAPI<"UnknownType", UnknownTypeDetails>(
  "UnknownType"
);
export interface UnknownType extends MessageBase {
  details: ReturnType<typeof unknownTypeOpaque.toOpaque>;
}
export function isUnknownType(m: Message): m is UnknownType {
  return unknownTypeOpaque.isOpaque(m.details);
}

const inputNotPlainObjectOpaque = createOpaqueAPI<
  "InputNotPlainObject",
  InputNotPlainObjectDetails
>("InputNotPlainObject");
export interface InputNotPlainObject extends MessageBase {
  details: ReturnType<typeof inputNotPlainObjectOpaque.toOpaque>;
}
export function isInputNotPlainObject(m: Message): m is InputNotPlainObject {
  return inputNotPlainObjectOpaque.isOpaque(m);

  // const missingRequiredMemberPropOpaque = createOpaqueAPI<
  //   "MissingRequiredMemberProp",
  //   $MissingRequiredMemberProp
  // >("MissingRequiredMemberProp");
  // export interface MissingRequiredMemberProp extends MessageBase {
  //   details: ReturnType<typeof missingRequiredMemberPropOpaque.toOpaque>;
  // }
  // export function isMissingRequiredMemberProp(m: Message): m is MissingRequiredMemberProp {
  //   return missingRequiredMemberPropOpaque.isOpaque(m.details);
  // }

  // const groupMissingItemsOpaque = createOpaqueAPI<
  //   "GroupMissingItems",
  //   $GroupMissingItems
  // >("GroupMissingItems");
  // export interface GroupMissingItems extends MessageBase {
  //   details: ReturnType<typeof groupMissingItemsOpaque.toOpaque>;
  // }
  // export function isGroupMissingItems(m: Message): m is GroupMissingItems {
  //   return groupMissingItemsOpaque.isOpaque(m.details);
  // }

  // const missingRequiredWmsPropOpaque = createOpaqueAPI<
  //   "MissingRequiredWmsProp",
  //   $MissingRequiredWmsProp
  // >("MissingRequiredWmsProp");
  // export interface MissingRequiredWmsProp extends MessageBase {
  //   details: ReturnType<typeof missingRequiredWmsPropOpaque.toOpaque>;
  // }
  // export const isMissingRequiredWmsProp = missingRequiredWmsPropOpaque.isOpaque;
}

export type Message =
  | UnknownProp
  // | MissingRequiredMemberProp
  // | GroupMissingItems
  // | MissingRequiredWmsProp;
  | MissingRequiredProp
  | UnknownType
  | InputNotPlainObject;

// export function getMessageParts(message: Message): MessageBase {
//   if (isUnknownProp(message)) {
//     return unknownPropOpaque.fromOpaque(message);
//   } else if (isMissingRequiredMemberProp(message)) {
//     return missingRequiredMemberPropOpaque.fromOpaque(message);
//   } else if (isGroupMissingItems(message)) {
//     return groupMissingItemsOpaque.fromOpaque(message);
//   } else {
//     return missingRequiredWmsPropOpaque.fromOpaque(message);
//   }
// }

// export function transformGeneralMessage(message: Message, f: (m: MessageBase) => MessageBase): Message {
//   if (isUnknownProp(message)) {
//     const mb = unknownPropOpaque.fromOpaque(message)
//     return unknownPropOpaque.toOpaque({
//       ...mb,
//       ...f(mb)
//     })
//   } else if (isMissingRequiredMemberProp(message)) {
//     return missingRequiredMemberPropOpaque.fromOpaque(message);
//   } else if (isGroupMissingItems(message)) {
//     return groupMissingItemsOpaque.fromOpaque(message);
//   } else {
//     return missingRequiredWmsPropOpaque.fromOpaque(message);
//   }
// }

export function unknownProp(
  modelType: ModelType,
  property: string,
  label: string,
  severity = Severity.Warning
): UnknownProp {
  return {
    message: `Unknown property "${property}" was encountered`,
    path: [label],
    severity,
    details: unknownPropOpaque.toOpaque({ modelType, property }),
  };
}

export function missingRequiredProp(
  modelType: ModelType,
  property: string | string[],
  requiredType: string | undefined,
  label: string,
  severity = Severity.Error
): MissingRequiredProp {
  return {
    message: `${modelType} missing "${
      typeof property === "string" ? property : property.join('" or "')
    }"`,
    path: [label],
    severity,
    details: missingRequiredPropOpaque.toOpaque({
      modelType,
      property,
      requiredType,
    }),
  };
}

export function unknownType(
  type: string,
  label: string,
  severity = Severity.Error
): UnknownType {
  return {
    message: `Unknown or unsupported type "${type}"`,
    path: [label],
    severity,
    details: unknownTypeOpaque.toOpaque({ type }),
  };
}

export function inputNotPlainObject(): InputNotPlainObject {
  return {
    message: "Input to conversion functions must be a plain object",
    path: [],
    severity: Severity.Error,
    details: inputNotPlainObjectOpaque.toOpaque({}),
  };
}

// export function missingRequiredMemberProp(
//   label: string,
//   severity = Severity.Error
// ): MissingRequiredMemberProp {
//   return {
//     message: "Member doesn't have type and name",
//     path: [label],
//     severity,
//     details: missingRequiredMemberPropOpaque.toOpaque({}),
//   };
// }

// export function groupMissingItems(
//   label: string,
//   severity = Severity.Error
// ): GroupMissingItems {
//   return {
//     message: "Group has no array of items",
//     path: [label],
//     severity,
//     details: groupMissingItemsOpaque.toOpaque({}),
//   };
// }

// export function missingRequiredWmsProp(
//   property: string,
//   label: string,
//   severity = Severity.Error
// ): MissingRequiredWmsProp {
//   return {
//     message: "WmsCatalogItem missing " + property,
//     path: [label],
//     severity,
//     details: missingRequiredWmsPropOpaque.toOpaque({ property }),
//   };
// }

export function getUnknownPropDetails(m: UnknownProp): UnknownPropDetails {
  return unknownPropOpaque.fromOpaque(m.details);
}

export function getMissingRequiredPropDetails(
  m: MissingRequiredProp
): MissingRequiredPropDetails {
  return missingRequiredPropOpaque.fromOpaque(m.details);
}

export function getUnknownTypeDetails(m: UnknownType): UnknownTypeDetails {
  return unknownTypeOpaque.fromOpaque(m.details);
}

export function getInputNotPlainObjectDetails(
  m: InputNotPlainObject
): InputNotPlainObjectDetails {
  return inputNotPlainObjectOpaque.fromOpaque(m.details);
}

export const foldMessage = createFoldObject({
  isUnknownProp,
  isUnknownType,
  isMissingRequiredProp,
  isInputNotPlainObject,
});
