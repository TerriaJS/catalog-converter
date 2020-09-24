import is from "@sindresorhus/is";
import { missingRequiredProp, ModelType, Message } from "../Message";
import { CatalogMember, ConversionOptions, MemberResult } from "../types";
import {
  catalogMemberProps,
  copyProps,
  featureInfoTemplate,
  getUnknownProps,
  nullResult,
  propsToWarnings,
} from "./helpers";

// Dependency injection to break circular dependency
export function groupFromConvertMembersArray(
  convertMembersArray: (
    members: unknown[],
    label: string,
    options: ConversionOptions
  ) => {
    members: CatalogMember[];
    messages: Message[];
  }
) {
  return function group(
    group: CatalogMember,
    options: ConversionOptions
  ): MemberResult {
    if (!is.array(group.items)) {
      return nullResult(
        missingRequiredProp(ModelType.Group, "items", "array", group.name)
      );
    }
    const convertedMembers = convertMembersArray(
      group.items,
      group.name,
      options
    );
    const unknownProps = getUnknownProps(group, [
      "name",
      "type",
      ...catalogMemberProps,
      "items",
    ]);
    const extraPropsMessages = propsToWarnings(
      ModelType.Group,
      unknownProps,
      group.name
    );
    const result = {
      member: {
        type: "group",
        name: group.name,
        members: convertedMembers.members,
      },
      messages: [...convertedMembers.messages, ...extraPropsMessages],
    };
    copyProps(group, result.member, catalogMemberProps);
    if (options.copyUnknownProperties) {
      copyProps(group, result.member, unknownProps);
    }
    return result;
  };
}

export function wmsCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  let error;
  if (!is.string(item.url)) {
    error = missingRequiredProp(ModelType.WmsItem, "url", "string", item.name);
  } else if (!is.string(item.layers)) {
    error = missingRequiredProp(
      ModelType.WmsItem,
      "layers",
      "string",
      item.name
    );
  }
  if (error) {
    return {
      member: null,
      messages: [error],
    };
  }

  const propsToCopy = [
    "url",
    "layers",
    "opacity",
    "linkedWcsUrl",
    "linkedWcsCoverage",
    "chartColor",
    "leafletUpdateInterval",
  ];

  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...propsToCopy,
    "featureTimesProperty",
    "chartType",
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "wms",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.WmsItem, unknownProps, item.name);

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [
    ...catalogMemberProps,
    ...propsToCopy,
    { v7: "featureTimesProperty", v8: "timeFilterPropertyName" },
  ]);
  if (item.chartType === "momentPoints") {
    member.chartType = "momentPoints";
  } else if (item.chartType === "moment") {
    member.chartType = "momentLines";
  } else if (item.chartType !== undefined) {
    throw `Chart type ${member.chartType} not supported`;
  }
  if (
    is.string(item.featureInfoTemplate) ||
    is.plainObject(item.featureInfoTemplate)
  ) {
    const result = featureInfoTemplate(
      ModelType.WmsItem,
      item.name,
      item.featureInfoTemplate
    );
    member.featureInfoTemplate = result.result;
    messages.push(...result.messages);
  }
  return { member, messages };
}

export function sosCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.SosItem, "url", "string", item.name)
    );
  }

  const propsToCopy = [
    "url",
    "proceduresName",
    "observablePropertiesName",
    "startDate",
    "filterByProcedures",
    "stationIdWhitelist",
    "procedures",
    "observableProperties",
  ];
  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...propsToCopy,
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "sos",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.SosItem, unknownProps, item.name);
  if (
    is.string(item.featureInfoTemplate) ||
    is.plainObject(item.featureInfoTemplate)
  ) {
    const result = featureInfoTemplate(
      ModelType.SosItem,
      item.name,
      item.featureInfoTemplate
    );
    member.featureInfoTemplate = result.result;
    messages.push(...result.messages);
  }
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  return {
    member,
    messages,
  };
}

export function esriFeatureServerCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!is.string(item.url)) {
    return nullResult(
      missingRequiredProp(
        ModelType.EsriFeatureServerItem,
        "url",
        "string",
        item.name
      )
    );
  }

  const propsToCopy = ["url", "useStyleInformationFromService"];
  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...propsToCopy,
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "esri-featureServer",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.EsriFeatureServerItem,
    unknownProps,
    item.name
  );
  if (
    is.string(item.featureInfoTemplate) ||
    is.plainObject(item.featureInfoTemplate)
  ) {
    const result = featureInfoTemplate(
      ModelType.EsriFeatureServerItem,
      item.name,
      item.featureInfoTemplate
    );
    member.featureInfoTemplate = result.result;
    messages.push(...result.messages);
  }
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  return {
    member,
    messages,
  };
}

export function ckanCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  // See details of what's been ported https://github.com/TerriaJS/terriajs/pull/4160
  if (!is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.CkanGroup, "url", "string", item.name)
    );
  }
  const propsToCopy = [
    "url",
    "filterQuery",
    "groupBy",
    "useCombinationNameWhereMultipleResources",
  ];
  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...propsToCopy,
    "esriMapServerResourceFormat",
    "wmsParameters",
  ]);
  const member: MemberResult["member"] = {
    type: "ckan-group",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.CkanGroup,
    unknownProps,
    item.name
  );
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  // Convert various configurations now condensed into supported resource formats
  const supportedResourceFormats = [];
  if (is.string(item.esriMapServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS FeatureServer",
      formatRegex: item.esriMapServerResourceFormat,
      // definition: {
      //   type: "esri-featureServer",
      // },
    });
  }
  if (is.plainObject(item.wmsParameters)) {
    supportedResourceFormats.push({
      id: "WMS",
      definition: {
        type: "wms",
        parameters: item.wmsParameters,
      },
    });
  }
  member.supportedResourceFormats = supportedResourceFormats;
  return {
    member,
    messages,
  };
}

// Write properly
export function geoJsonCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (
    !is.plainObject(item.data) &&
    !is.string(item.data) &&
    !is.string(item.url)
  ) {
    return {
      member: null,
      messages: [
        missingRequiredProp(
          ModelType.GeoJsonItem,
          ["url", "data"],
          undefined,
          item.name
        ),
      ],
    };
  }

  const propsToCopy = ["url", "opacity"];
  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...propsToCopy,
    "data",
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "geojson",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.GeoJsonItem,
    unknownProps,
    item.name
  );
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (
    is.string(item.featureInfoTemplate) ||
    is.plainObject(item.featureInfoTemplate)
  ) {
    const result = featureInfoTemplate(
      ModelType.GeoJsonItem,
      item.name,
      item.featureInfoTemplate
    );
    member.featureInfoTemplate = result.result;
    messages.push(...result.messages);
  }
  if (is.plainObject(item.data)) {
    member.geoJsonData = item.data;
  } else if (is.string(item.data)) {
    member.geoJsonString = item.data;
  }
  return { member, messages };
}
