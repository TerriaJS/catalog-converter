// Import here Polyfills if needed. Recommended core-js (npm i -D core-js)
// import "core-js/fn/array.find"
// ...

// Write a function to turn an old catalog into a new catalog

// Unfortunately types in `is` require @types/node to be pinned to v12
// See https://github.com/sindresorhus/is/issues/108
import is from "@sindresorhus/is";
import { merge } from "lodash";
import { csvCatalogItem } from "./converters/CsvItem";
import generateRandomId from "./converters/generateRandomId";
import {
  convertMembersArrayWithConvertMember,
  copyProps,
  getUnknownProps,
  isCatalogMember,
  nullResult,
} from "./converters/helpers";
import {
  cartoMapCatalogItem,
  esriFeatureServerCatalogItem,
  esriMapServerCatalogGroup,
  esriMapServerCatalogItem,
  geoJsonCatalogItem,
  groupFromConvertMembersArray,
  mapboxVectorTileCatalogItem,
  sosCatalogItem,
  wpsCatalogItem,
  wpsResultItem,
  kmlCatalogItem,
  esriCatalogGroup,
} from "./converters/other";
import { wmsCatalogGroup } from "./converters/WmsCatalogGroup";
import { wmsCatalogItem } from "./converters/WmsCatalogItem";
import {
  inputNotPlainObject,
  Message,
  missingRequiredProp,
  ModelType,
  unknownType,
} from "./Message";
import { CatalogMember, ConversionOptions, MemberResult } from "./types";
import { ckanCatalogGroup, ckanCatalogItem } from "./converters/Ckan";

// Use dependency injection to break circular dependencies created by
//  group -> convertMembersArray -> convertMember -> group  recursion
const convertMembersArray = convertMembersArrayWithConvertMember(convertMember);
const group = groupFromConvertMembersArray(convertMembersArray);

export type Converter = (
  item: CatalogMember,
  options: ConversionOptions
) => MemberResult;
// All catalog member properties, except type and name which are assigned individually

export const converters: Map<string, Converter> = new Map([
  ["group", group],
  ["wms", wmsCatalogItem],
  ["wms-getCapabilities", wmsCatalogGroup],
  ["csv", csvCatalogItem],
  ["sos", sosCatalogItem],
  ["esri-mapServer", esriMapServerCatalogItem],
  ["esri-group", esriCatalogGroup],
  ["esri-mapServer-group", esriMapServerCatalogGroup],
  ["esri-featureServer", esriFeatureServerCatalogItem],
  ["ckan", ckanCatalogGroup],
  ["ckan-resource", ckanCatalogItem],
  ["geojson", geoJsonCatalogItem],
  ["wps", wpsCatalogItem],
  ["wps-result", wpsResultItem],
  ["carto", cartoMapCatalogItem],
  ["mvt", mapboxVectorTileCatalogItem],

  ["kml", kmlCatalogItem],
]);

// For more default options see `src\cli.ts` arguments defaults
function defaultOptions(options: ConversionOptions | undefined) {
  return Object.assign(
    {
      copyUnknownProperties: false,
      partial: false,
      addv7autoIdShareKeys: true,
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
    workbench?: string[];
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
  let workbench: string[] | undefined;
  if (is.array(json.catalog)) {
    const enabledItemsAccumulator: CatalogMember[] = [];
    const res = convertMembersArray(json.catalog, "catalog", {
      ...options,
      enabledItemsAccumulator,
    });
    catalog = res.members;
    messages.push(...res.messages);

    // Collect ids of enabled items, genearting a random id if required.
    workbench = enabledItemsAccumulator
      .map((item) => {
        if (!item.id) item.id = generateRandomId(options?.idLength);
        return item.id;
      })
      .filter((id) => id !== undefined) as string[];
  }

  if (options.addv7autoIdShareKeys) {
    // Add v7 autoIDs to shareLinks
    // v7 autoID has format Root Group/$someContainerId/$someLowerContainerId/$catalogName
    const addv7autoIdShareKey = (
      member: CatalogMember,
      shareKey = "Root Group"
    ) => {
      const currentShareKey = `${shareKey}/${member.name}`;
      Array.isArray(member.shareKeys)
        ? member.shareKeys.push(currentShareKey)
        : (member.shareKeys = [currentShareKey]);
      if ("members" in member && Array.isArray(member.members)) {
        member.members.forEach((groupMember) =>
          addv7autoIdShareKey(groupMember, currentShareKey)
        );
      }
    };

    catalog?.forEach((member) => addv7autoIdShareKey(member));
  }

  const result = {
    result: {
      workbench,
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

    return merge(sources, current);
  }, {});

  const v8InitSource: any = { stratum: "user" };

  const workbenchIds: { id: string; index: number | undefined }[] = [];

  const convertMembers = (members: any, convertUserAdded = false) =>
    Object.entries(members).reduce<any>(
      (convertedMembers, [v7id, v7Member]) => {
        if (is.plainObject(v7Member)) {
          // Get `knownContainerUniqueIds` from v7 `parents` property
          let knownContainerUniqueIds = ["/"];
          if (Array.isArray(v7Member.parents) && v7Member.parents.length > 0) {
            knownContainerUniqueIds = v7Member.parents
              .map((parent: string) => {
                // Convert v7 user added data group id
                if (parent === "Root Group/User-Added Data") {
                  return "__User-Added_Data__";
                }
                // Convert v7 root group id
                if (parent === "Root Group") {
                  return "/";
                }

                // Replace v7 autoID
                return parent;
              })
              .filter((parent) => typeof parent !== "undefined") as string[];
          }

          // Use model id if it is defined, otherwise use key from members object
          let newId =
            typeof v7Member.id === "string" && v7Member.id !== ""
              ? v7Member.id
              : v7id;

          // Replace User Added Data group id
          if (v7id === "Root Group/User-Added Data") {
            newId = "__User-Added_Data__";
          }

          // For some reason user added data doesn't have "__User-Added_Data__" in v8 autoIDs, whereas v7 autoIDs start with `Root Group/User-Added Data`,
          // so remove all mentions of Root Group/User-Added Data from v7 autoIDs
          newId = newId.replace("Root Group/User-Added Data", "");

          // Only add to workbenchIds if NOT converting User Added Data
          if (v7Member.isEnabled && !convertUserAdded) {
            workbenchIds.push({
              id: newId,
              index:
                typeof v7Member.nowViewingIndex === "number"
                  ? v7Member.nowViewingIndex
                  : undefined,
            });
          }

          // Only convert user added data if convertUserAdded
          if (
            convertUserAdded ||
            (v7id !== "Root Group/User-Added Data" &&
              !knownContainerUniqueIds.includes("__User-Added_Data__"))
          ) {
            const result = convertMember(v7Member, { partial: true });
            messages.push(...result.messages);
            convertedMembers[newId] = {
              ...result.member,
              knownContainerUniqueIds,
            };
          }
          return convertedMembers;
        }
      },
      {}
    );

  // Shared catalog members
  if ("sharedCatalogMembers" in v7InitSource) {
    v8InitSource.models = convertMembers(v7InitSource.sharedCatalogMembers);
  } else {
    v8InitSource.models = {};
  }

  // User added data
  if ("catalog" in v7InitSource && Array.isArray(v7InitSource.catalog)) {
    // Only add "Root Group/User-Added Data" Catalog Group
    const userAddedData = v7InitSource.catalog.find(
      (item: any) => item.id === "Root Group/User-Added Data"
    );

    if (
      typeof userAddedData !== "undefined" &&
      Array.isArray(userAddedData.items) &&
      userAddedData.items.length > 0
    ) {
      // Delete all ids
      delete userAddedData.id;
      const deleteIds = (items: any[]) =>
        items.forEach((item) => {
          if (typeof item.id === "string") delete item.id;
          if (Array.isArray(item.items)) deleteIds(item.items);
        });

      deleteIds(userAddedData.items);

      const userAddedDataV8 = convertMembers(
        {
          "Root Group/User-Added Data": userAddedData,
        },
        true
      );

      // Add IDs to user added models - so they show up in the workbenck (from sharedCatalogMembers)
      userAddedDataV8?.["__User-Added_Data__"]?.members.forEach(
        (member: any) =>
          member !== null && (member.id = member.id ?? `/${member.name}`)
      );
      v8InitSource.models = { ...userAddedDataV8, ...v8InitSource.models };
    }
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

  v8InitSource.workbench = workbenchIds
    .sort((a, b) =>
      typeof a.index !== "undefined" ? a.index - (b.index ?? a.index + 1) : 1
    )
    .map((item) => item.id);

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
    //"timeline" - v7 timeline is different from v8
    //"locationMarker" - not in v8
    //"sharedFromExplorerPanel" - not in v8
    //"pickedFeatures" - not in v8 share links
  ].forEach((prop) => (v8InitSource[prop] = v7InitSource[prop]));

  const v8json: { version: string; initSources: any[] } = {
    version: "8.0.0",
    initSources: [...initializationUrls, v8InitSource],
  };

  return { result: v8json, messages, converted: true };
}
