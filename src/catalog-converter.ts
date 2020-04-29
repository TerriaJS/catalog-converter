// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

// Write a function to turn an old catalog into a new catalog

import is from "@sindresorhus/is";

export enum Severity {
  Error, // Failed to convert an item or property
  Warning, // Had extra unknown/unsupported properties
}

export interface Message {
  path: string[];
  message: string;
  severity: Severity;
}

// // Commented out this monadic type stuff because it's not really useful because
// //  I don't want an error to immediately cause containing items to error

// export class SuccessResult<T, W = string> {
//   constructor(readonly value: T, readonly warnings: W[] = []) {}
// }

// export class ErrorResult<E = string, W = string> {
//   constructor(readonly error: E, readonly warnings: W[] = []) {}
// }

// export type Result<T, E = string, W = string> =
//   | SuccessResult<T, W>
//   | ErrorResult<E, W>;

// export type MemberResult = Result<CatalogMember, MemberMessage, MemberMessage>;

// function isSuccess<T, E, W>(res: Result<T, E, W>): res is SuccessResult<T, W> {
//   return "value" in res;
// }

// function identity<T>(val: T): T {
//   return val;
// }

// function mapResult<T, E, W, T2>(
//   result: Result<T, E, W>,
//   tValue: (t: T) => T2,
//   tError: (e: E) => E = identity,
//   tWarnings: (w: W[]) => W[] = identity
// ): Result<T2, E, W> {
//   if (isSuccess(result)) {
//     return new SuccessResult(tValue(result.value), tWarnings(result.warnings));
//   } else {
//     return new ErrorResult(tError(result.error), tWarnings(result.warnings));
//   }
// }

export interface MemberResult {
  member: CatalogMember | null;
  messages: Message[];
}

// export type MemberResult = [CatalogMember | null, MemberMessage[]];

function flatMap<X, Y>(l: X[], f: (t: X) => Y[]): Y[] {
  return ([] as Y[]).concat(...l.map(f));
}

function isNotNull<T>(arg: T | null): arg is T {
  return arg !== null;
}

// interface Result<T, E = string, W = string> {
//   readonly value?: T;
//   readonly error?: E;
//   readonly warnings: W[];
// }

interface PlainObject {
  [k: string]: unknown;
}

export interface CatalogMember extends PlainObject {
  type: string;
  name: string;
}

function isCatalogMember(m: any): m is CatalogMember {
  return is.string(m?.type) && is.string(m?.name);
}

function copyProps(
  source: PlainObject,
  destination: PlainObject,
  properties: string[]
) {
  properties.forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(source, prop)) {
      destination[prop] = source[prop];
    }
  });
  return destination;
}

function getUnknownProps(o: PlainObject, knownProperties: string[]) {
  return Object.keys(o).filter((prop) => knownProperties.indexOf(prop) === -1);
}

function propsToWarnings(properties: string[], label: string): Message[] {
  return properties.map((prop) => ({
    message: `Unknown property "${prop}" was ignored`,
    path: [label],
    severity: Severity.Warning,
  }));
}

// Pull code shared between group and top-level catalog into a function
function convertMembersArray(
  members: unknown[],
  label: string,
  options: ConversionOptions
): { members: CatalogMember[]; messages: Message[] } {
  const results = members.map((m, i) =>
    isCatalogMember(m)
      ? convertMember(m, options)
      : {
          member: null,
          messages: [
            {
              path: [`[${i}]`],
              message: "Member doesn't have type and name",
              severity: Severity.Error,
            },
          ],
        }
  );
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
}

const converters = {
  group(group: CatalogMember, options: ConversionOptions): MemberResult {
    if (!is.array(group.items)) {
      return {
        member: null,
        messages: [
          {
            path: [group.name],
            message: "Group has no array of items",
            severity: Severity.Error,
          },
        ],
      };
    }
    const convertedMembers = convertMembersArray(
      group.items,
      group.name,
      options
    );
    const unknownProps = getUnknownProps(group, ["name", "type", "items"]);
    const extraPropsMessages = propsToWarnings(unknownProps, group.name);
    const result = {
      member: {
        type: "group",
        name: group.name,
        members: convertedMembers.members,
      },
      messages: [...convertedMembers.messages, ...extraPropsMessages],
    };
    if (options.copyUnknownProperties) {
      copyProps(group, result.member, unknownProps);
    }
    return result;
  },
  wmsCatalogItem(
    item: CatalogMember,
    options: ConversionOptions
  ): MemberResult {
    if (!is.string(item.url)) {
      return {
        member: null,
        messages: [
          {
            path: [item.name],
            message: "WmsCatalogItem missing url",
            severity: Severity.Error,
          },
        ],
      };
    }
    if (!is.string(item.layers)) {
      return {
        member: null,
        messages: [
          {
            path: [item.name],
            message: "WmsCatalogItem missing layers",
            severity: Severity.Error,
          },
        ],
      };
    }
    const unknownProps = getUnknownProps(item, [
      "name",
      "type",
      "url",
      "layers",
    ]);
    const extraPropsMessages = propsToWarnings(unknownProps, item.name);
    const result = {
      member: {
        type: "wms",
        name: item.name,
      },
      messages: extraPropsMessages,
    };
    copyProps(item, result.member, ["url", "layers"]);
    if (options.copyUnknownProperties) {
      copyProps(item, result.member, unknownProps);
    }
    return result;
  },
  csvCatalogItem(
    item: CatalogMember,
    options: ConversionOptions
  ): MemberResult {
    if (!is.string(item.url) && !is.string(item.data)) {
      return {
        member: null,
        messages: [
          {
            path: [item.name],
            message: "CsvCatalogItem missing url and data",
            severity: Severity.Error,
          },
        ],
      };
    }
    const unknownProps = getUnknownProps(item, ["name", "type", "url", "data"]);
    const extraPropsMessages = propsToWarnings(unknownProps, item.name);
    const result = {
      member: {
        type: "csv",
        name: item.name,
      },
      messages: extraPropsMessages,
    };
    copyProps(item, result.member, ["url", "data"]);
    if (options.copyUnknownProperties) {
      copyProps(item, result.member, unknownProps);
    }
    return result;
  },
  anyMember(member: CatalogMember, options: ConversionOptions): MemberResult {
    if (member.type === "group") {
      return this.group(member, options);
    } else if (member.type === "wms") {
      return this.wmsCatalogItem(member, options);
    } else if (member.type === "csv") {
      return this.csvCatalogItem(member, options);
    } else {
      return {
        member: null,
        messages: [
          {
            path: [member.name],
            message: `Unknown or unsupported type "${member.type}"`,
            severity: Severity.Error,
          },
        ],
      };
    }
  },
};

export interface ConversionOptions {
  readonly copyUnknownProperties?: boolean;
}

function defaultOptions(options: ConversionOptions | undefined) {
  return Object.assign(
    {
      copyUnknownProperties: false,
    },
    options || {}
  );
}

export function convertMember(
  member: unknown,
  options?: ConversionOptions
): MemberResult {
  options = defaultOptions(options);
  if (isCatalogMember(member)) {
    return converters.anyMember(member, options);
  } else {
    return {
      member: null,
      messages: [
        {
          path: ["?"],
          message: "Member doesn't have type and name",
          severity: Severity.Error,
        },
      ],
    };
  }
}

export interface CatalogResult {
  result: {
    catalog?: CatalogMember[];
  } | null;
  messages: Message[];
}

// interface CatalogFile {
//   catalog: CatalogMember[];
// }

export function convertCatalog(
  json: unknown,
  options?: ConversionOptions
): CatalogResult {
  options = defaultOptions(options);
  if (!is.plainObject(json)) {
    return {
      result: null,
      messages: [
        {
          path: [],
          message: "Catalog to convert must be a plain object",
          severity: Severity.Error,
        },
      ],
    };
  }
  const messages: Message[] = [];
  let catalog: CatalogMember[] | undefined;
  if (is.array(json.catalog)) {
    const res = convertMembersArray(json.catalog, "catalog", options);
    catalog = res.members;
    messages.push(...res.messages);
  }
  const result = {
    result: {
      catalog,
    },
    messages,
  };
  if (options.copyUnknownProperties) {
    const unknownProps = getUnknownProps(json, ["catalog"]);
    copyProps(json, result.result, unknownProps);
  }
  return result;
}
