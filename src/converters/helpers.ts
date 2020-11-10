import is from "@sindresorhus/is";
import { Message, ModelType, unknownProp } from "../Message";
import {
  CatalogMember,
  ConversionOptions,
  MemberResult,
  PlainObject,
  MembersResult,
} from "../types";

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
  "description",
  "info",
  "infoSectionOrder",
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
      is.string(opacity)
        ? parseFloat(opacity)
        : is.number(opacity)
        ? opacity
        : undefined,
  },
  "chartDisclaimer",
  {
    v7: "rectangle",
    v8: "rectangle",
    translationFn: (rectangle: any[]) => {
      return {
        west: rectangle[0],
        south: rectangle[1],
        east: rectangle[2],
        north: rectangle[3],
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
    v8: "hideLegendInWorkbench",
    translationFn: (isLegendVisible: boolean) => !isLegendVisible,
  },
];

export const imageryLayerProps: CopyProps[] = ["keepOnTop"];

export const catalogMemberPropsIgnore = [
  "name",
  "type",
  "isEnabled",
  "parents",
  "legendUrl", // Handled by legend function
  "legendUrls", // ^^
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
  | { v7: string; v8: string; translationFn?: (x: any) => any };

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
          ? prop.translationFn(source[propV7])
          : source[propV7];
      if (typeof value !== "undefined") destination[propV8] = value;
    }
  });
  return destination;
}

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
      .forEach(legendUrls.add);

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
    const results = members.map((m) => convertMember(m, options));
    const convertedMembers = results
      .map(({ member }) => member)
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
