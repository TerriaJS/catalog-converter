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
