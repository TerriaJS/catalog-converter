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
  "description",
  "info",
  "infoSectionOrder",
  "shortReport",
  {
    v7: "shortReportSection",
    v8: "shortReportSection",
    translationFn: (srs: any[]) =>
      srs.map((shortReport) => {
        return {
          name: shortReport.name,
          content: shortReport.content,
          show: shortReport.isOpen,
        };
      }),
  },
  { v7: "isShown", v8: "show" },
  "splitDirection",
  "url",
  "opacity",
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
  {
    v7: "initialTimeSource",
    v8: "initialTimeSource",
    translationFn: (initialTimeSource: any) =>
      (({
        present: "now",
        start: "start",
        stop: "end",
      } as any)[initialTimeSource]),
  },
  "dataCustodian",
  {
    v7: "isLegendVisible ",
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
          ? prop.translationFn(propV8)
          : propV8;
      destination[propV8] = source[propV7];
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

  return {
    result: Array.from(legendUrls).map((url) => {
      return { url };
    }),
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
    const propsToCopy = ["name", "template", "partials"];
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
