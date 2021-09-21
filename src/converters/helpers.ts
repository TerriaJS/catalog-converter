import is from "@sindresorhus/is";
import { ConversionOptions } from "../ConversionOptions";
import { Converter } from "../convert";
import { Message, ModelType, unknownProp } from "../Message";
import {
  CatalogMember,
  MemberResult,
  MembersResult,
  PlainObject,
} from "../types";
import generateRandomId from "./generateRandomId";
import mergeRecursive from "./mergeRecursive";

export function isNotNull<T>(arg: T | null): arg is T {
  return arg !== null;
}

export function flatMap<X, Y>(l: X[], f: (t: X) => Y[]): Y[] {
  return ([] as Y[]).concat(...l.map(f));
}

export function nullResult(...messages: Message[]): MemberResult {
  return {
    member: null,
    messages,
  };
}

export function isCatalogMember(m: any, partial = false): m is CatalogMember {
  return is.string(m?.type) && (is.string(m?.name) || partial);
}

export const catalogMemberProps: CopyProps[] = [
  "id",
  "shareKeys",
  "description",
  "info",
  "infoSectionOrder",
  "initialMessage",
  "shortReport",
  {
    v7: "shortReportSections",
    v8: "shortReportSections",
    translationFn: (srs: any[]) =>
      srs.length > 0
        ? srs.map((shortReport) => {
            return {
              name: shortReport.name,
              content: shortReport.content,
              show: shortReport.isOpen,
            };
          })
        : undefined,
  },
  { v7: "isShown", v8: "show" },
  "splitDirection",
  "url",
  "forceProxy",
  "cacheDuration",
  {
    v7: "opacity",
    v8: "opacity",
    translationFn: (opacity: any) =>
      is.nan(parseFloat(opacity)) ? undefined : parseFloat(opacity),
  },
  "chartDisclaimer",
  {
    v7: "rectangle",
    v8: "rectangle",
    translationFn: (rectangle: any[]) => {
      return {
        west: parseFloat(rectangle[0]) || undefined,
        south: parseFloat(rectangle[1]) || undefined,
        east: parseFloat(rectangle[2]) || undefined,
        north: parseFloat(rectangle[3]) || undefined,
      };
    },
  },
  "currentTime",
  {
    v7: "dateFormat",
    v8: "dateFormat",
    translationFn: (dateFormat: any) =>
      dateFormat.timelineTic ?? dateFormat.currentTime,
  },
  "disablePreview",
  "hideSource",
  // Note: if v7 initialTimeSource is not "present", "start", or "end" -> set to v8 currentTime property
  {
    v7: "initialTimeSource",
    v8: "initialTimeSource",
    translationFn: (initialTimeSource: any) =>
      (({
        present: "now",
        start: "start",
        end: "stop",
      } as any)[initialTimeSource]),
  },
  {
    v7: "initialTimeSource",
    v8: "currentTime",
    translationFn: (initialTimeSource: any) =>
      !["now", "start", "end"].includes(initialTimeSource)
        ? initialTimeSource
        : undefined,
  },
  "dataCustodian",
  {
    v7: "isLegendVisible",
    v8: "isOpenInWorkbench",
  },
  "clipToRectangle",
  {
    v7: "metadataUrl",
    v8: "metadataUrls",
    translationFn: (metadataUrl: string) =>
      metadataUrl ? [{ url: metadataUrl }] : undefined,
  },
  {
    v7: "dataUrl",
    v8: "dataUrls",
    translationFn: (dataUrl: string, v7Member) =>
      dataUrl ? [{ url: dataUrl, type: v7Member.dataUrlType }] : undefined,
  },
];

export const catalogGroupProps = [
  ...catalogMemberProps,
  "isOpen",
  {
    v7: "blacklist",
    v8: "blacklist",
    /** v7 blacklist:
   * {
      "CACHE": true,
      "Commuting2016": true,
      "SEIFA2016": true,
      "Utilities": true
    }

   * v8 blacklist:
  * ["CACHE, Commuting2016"...]
   */
    translationFn: (blacklist: any) =>
      Object.entries(blacklist)
        .map(([name, include]) => (include ? name : undefined))
        .filter((name) => typeof name === "string"),
  },
];

export const imageryLayerProps: CopyProps[] = ["keepOnTop"];

export const catalogMemberPropsIgnore = [
  "name",
  "type",
  "parents",
  "isEnabled",
  "dataUrlType", // This is handled by "dataUrl" transformFn
];

export const catalogGroupPropsIgnore = [
  ...catalogMemberPropsIgnore,
  "items",
  "preserveOrder",
];

export function getUnknownProps(o: PlainObject, knownProperties: CopyProps[]) {
  return Object.keys(o).filter(
    (prop) =>
      knownProperties.findIndex((knownProp) =>
        typeof knownProp === "string"
          ? knownProp === prop
          : knownProp.v7 === prop
      ) === -1
  );
}

export function propsToWarnings(
  modelType: ModelType,
  properties: string[],
  label: string
): Message[] {
  return properties.map((prop) => unknownProp(modelType, prop, label));
}

export type CopyProps =
  | string
  | {
      v7: string;
      v8: string;
      /** Take v7 prop value, apply some transformation, and return a value.
       * This will be saved to the v8Member using `v8` key
       */
      translationFn?: (v7PropValue: any, v7Member: any, v8Member: any) => any;
    };

export function copyProps(
  source: PlainObject,
  destination: PlainObject,
  properties: CopyProps[]
) {
  properties.forEach((prop) => {
    const propV7 = is.string(prop) ? prop : prop.v7;
    const propV8 = is.string(prop) ? prop : prop.v8;

    if (Object.prototype.hasOwnProperty.call(source, propV7)) {
      const value =
        !is.string(prop) && typeof prop.translationFn === "function"
          ? prop.translationFn(source[propV7], source, destination)
          : source[propV7];
      if (typeof value !== "undefined") destination[propV8] = value;
    }
  });
  return destination;
}

export const legendProps = ["legendUrl", "legendUrls"];

export function legends(
  modelType: ModelType,
  label: string,
  source: PlainObject
): {
  result: any;
  messages: Message[];
} {
  const legendUrls = new Set<string>();
  if (typeof source.legendUrl === "string") legendUrls.add(source.legendUrl);
  if (Array.isArray(source.legendUrls))
    source.legendUrls
      .filter((legendUrl) => typeof legendUrl === "string")
      .forEach((legendUrl) => legendUrls.add(legendUrl));

  let result = Array.from(legendUrls).map((url) => {
    return { url };
  });
  return {
    result: result.length > 0 ? result : undefined,
    messages: [],
  };
}

export function featureInfoTemplate(
  modelType: ModelType,
  label: string,
  template: string | PlainObject
): {
  result: Readonly<PlainObject>; // This one isn't `| null` because there are not yet any conditions where this has a fatal error
  messages: Message[];
} {
  if (is.string(template)) {
    return {
      result: {
        template,
      },
      messages: [],
    };
  } else {
    const result: PlainObject = {};
    const propsToCopy = ["name", "template", "partials", "formats"];
    const unknownProps = getUnknownProps(template, propsToCopy);
    const extraPropsMessages = propsToWarnings(
      modelType,
      unknownProps.map((prop) => "featureInfoTemplate." + prop),
      label
    );
    copyProps(template, result, propsToCopy);
    return {
      result,
      messages: extraPropsMessages,
    };
  }
}

// Inject dependency to remove circular dependency
// Pull code shared between group and top-level catalog into a function
export function convertMembersArrayWithConvertMember(
  convertMember: (member: unknown, options?: ConversionOptions) => MemberResult
) {
  return function convertMembersArray(
    members: unknown[],
    label: string,
    options: ConversionOptions
  ): MembersResult {
    const v7Merged: unknown[] = mergeRecursive(members);
    const results = v7Merged.map((m) => {
      const res = convertMember(m, options);
      // Push the member to `enabledItemsAccumulator` if it is enabled.
      if (options.enabledItemsAccumulator && res.member && (m as any).isEnabled)
        options.enabledItemsAccumulator.push(res.member);
      return res;
    });
    const convertedMembers = results
      .map(({ member }) =>
        member && options.generateIds && !member.id
          ? { ...member, id: generateRandomId(options.idLength) }
          : member
      )
      .filter(isNotNull);
    return {
      members: convertedMembers,
      messages: flatMap(results, ({ messages }) => messages).map((message) => ({
        ...message,
        path: [label, ...message.path],
      })),
    };
  };
}

export function itemProperties(
  item: CatalogMember,
  converter: Converter,
  options: ConversionOptions
): {
  result: any;
  messages: Message[];
} {
  // Modify name property to make messages sensible
  const itemPropertiesResult = converter(
    { ...(item.itemProperties as any), name: `${item.name}.itemProperties` },
    Object.assign({}, options, {
      partial: true,
      generateIds: false,
    })
  );
  const itemProperties: Partial<CatalogMember> | null =
    itemPropertiesResult.member;
  if (itemProperties) {
    delete itemProperties.name;
    delete itemProperties.type;
  }
  const itemPropertiesMessages = itemPropertiesResult.messages.map((m) => {
    return { ...m, path: [item.name, ...m.path] };
  });

  return { messages: itemPropertiesMessages, result: itemProperties };
}

// Stolen from https://stackoverflow.com/a/42736367

export function clearEmpties(o: any) {
  for (let k in o) {
    if (!o[k] || typeof o[k] !== "object") {
      continue; // If null or not an object, skip to the next iteration
    }

    // The property is an object
    clearEmpties(o[k]); // <-- Make a recursive call on the nested object
    if (Object.keys(o[k]).length === 0) {
      delete o[k]; // The object had no properties, so delete that property
    }
  }
}
