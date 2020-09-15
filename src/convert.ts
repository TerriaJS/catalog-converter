// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

// Write a function to turn an old catalog into a new catalog

// Unfortunately types in `is` require @types/node to be pinned to v12
// See https://github.com/sindresorhus/is/issues/108
import is from "@sindresorhus/is";
import { csvCatalogItem } from "./converters/CsvItem";
import {
  convertMembersArrayWithConvertMember,
  copyProps,
  getUnknownProps,
  isCatalogMember,
  nullResult,
} from "./converters/helpers";
import {
  ckanCatalogGroup,
  esriFeatureServerCatalogItem,
  geoJsonCatalogItem,
  groupFromConvertMembersArray,
  sosCatalogItem,
  wmsCatalogItem,
} from "./converters/other";
import {
  inputNotPlainObject,
  Message,
  missingRequiredProp,
  ModelType,
  unknownType,
} from "./Message";
import { CatalogMember, ConversionOptions, MemberResult } from "./types";

// Use dependency injection to break circular dependencies created by
//  group -> convertMembersArray -> convertMember -> group  recursion
const convertMembersArray = convertMembersArrayWithConvertMember(convertMember);
const group = groupFromConvertMembersArray(convertMembersArray);

// All catalog member properties, except type and name which are assigned individually

const converters = new Map([
  ["group", group],
  ["wms", wmsCatalogItem],
  ["csv", csvCatalogItem],
  ["sos", sosCatalogItem],
  ["esri-featureServer", esriFeatureServerCatalogItem],
  ["ckan", ckanCatalogGroup],
  ["geojson", geoJsonCatalogItem],
]);

function defaultOptions(options: ConversionOptions | undefined) {
  return Object.assign(
    {
      copyUnknownProperties: false,
      partial: false,
    },
    options || {}
  );
}

export function convertMember(
  member: unknown,
  options?: ConversionOptions
): MemberResult {
  options = defaultOptions(options);
  if (isCatalogMember(member, options.partial)) {
    const converterForType = converters.get(member.type);
    if (!converterForType) {
      return {
        member: null,
        messages: [unknownType(member.type, member.name)],
      };
    }
    return converterForType(member, options);
  } else {
    let property, label;
    const m = member as any;
    if (is.string(m.type)) {
      property = "name";
      label = `<Invalid CatalogMember type = "${m.type}">`;
    } else {
      property = "type";
      label = is.string(m.name) ? m.name : "<Invalid CatalogMember>";
    }
    return nullResult(
      missingRequiredProp(ModelType.Member, property, "string", label)
    );
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
      messages: [inputNotPlainObject()],
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
  copyProps(json, result.result, ["corsDomains", "homeCamera"]);
  if (options.copyUnknownProperties) {
    const unknownProps = getUnknownProps(json, [
      "catalog",
      "corsDomains",
      "homeCamera",
    ]);
    copyProps(json, result.result, unknownProps);
  }
  return result;
}

export type Share = { version: string; initSources: any[] };
export type ShareResult = {
  result: Share | null;
  messages?: Message[];
  converted?: boolean;
};
export type Story = {
  title: string;
  text: string;
  id: string;
  shareData: Share;
};
export function convertShare(json: unknown): ShareResult {
  if (!is.plainObject(json)) {
    return {
      result: null,
      messages: [inputNotPlainObject()],
    };
  }

  // If version 8 return
  if (
    "version" in json &&
    typeof json.version === "string" &&
    json.version.startsWith("8")
  ) {
    return { result: json as Share, converted: false };
  }

  if (!Array.isArray(json.initSources)) {
    return {
      result: null,
      messages: [
        missingRequiredProp(
          ModelType.Share,
          "initSources",
          undefined,
          "Init sources"
        ),
      ],
    };
  }

  const messages: Message[] = [];

  const initializationUrls: string[] = [];

  // Crunch v7 initSources together + extract initializationUrls
  const v7InitSource = json.initSources.reduce<any>((sources, current) => {
    if (typeof current === "string") {
      initializationUrls.push(current);
      return sources;
    }
    return Object.assign(sources, current);
  }, {});

  const v8InitSource: any = { stratum: "user" };

  const workbenchIds: Set<string> = new Set();

  const converMembers = (members: any) =>
    Object.entries(members).reduce<any>((convertedMembers, [id, v7Member]) => {
      if ((v7Member as any).isEnabled) {
        workbenchIds.add(id);
      }
      const result = convertMember(v7Member, { partial: true });
      messages.push(...result.messages);
      convertedMembers[id] = result.member;
      return convertedMembers;
    }, {});

  // Shared catalog members
  if ("sharedCatalogMembers" in v7InitSource) {
    v8InitSource.models = converMembers(v7InitSource.sharedCatalogMembers);
  } else {
    v8InitSource.models = {};
  }

  // User added data
  if ("catalog" in v7InitSource) {
    // v8InitSource.models["__User-Added_Data__"] = converMembers(
    //   v7InitSource.catalog
    // );
  }

  if ("stories" in v7InitSource && Array.isArray(v7InitSource.stories)) {
    v8InitSource.stories = v7InitSource.stories.map((story: Story) => {
      const result = convertShare(story.shareData);
      // Add story details to message paths
      messages.push(
        ...(result.messages?.map((message) => {
          return { ...message, path: ["Story", story.title, ...message.path] };
        }) || [])
      );
      return { ...story, shareData: result.result };
    });
  }

  v8InitSource.workbench = Array.from(workbenchIds);

  // Copy over common properties
  [
    "initialCamera",
    "homeCamera",
    "baseMapName",
    "viewerMode",
    "currentTime",
    "showSplitter",
    "splitPosition",
    "previewedItemId",
    // Not currently used:
    //"timeline"
    //"locationMarker"
    //"sharedFromExplorerPanel"
    //"pickedFeatures"
  ].forEach((prop) => (v8InitSource[prop] = v7InitSource[prop]));

  const v8json: { version: string; initSources: any[] } = {
    version: "8.0.0",
    initSources: [...initializationUrls, v8InitSource],
  };

  return { result: v8json, messages, converted: true };
}
