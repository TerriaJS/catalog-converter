import is from "@sindresorhus/is";
import { isPlainObject } from "lodash";
import {
  missingRequiredProp,
  ModelType,
  Severity,
  unknownPropOpaque,
} from "../Message";
import { CatalogMember, MemberResult, MembersResult } from "../types";
import { ConversionOptions } from "../ConversionOptions";
import generateRandomId from "./generateRandomId";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  featureInfoTemplate,
  getUnknownProps,
  imageryLayerProps,
  legendProps,
  legends,
  nullResult,
  propsToWarnings,
  itemProperties,
  CopyProps,
} from "./helpers";
import { tileErrorHandlingOptions, wmsCatalogItem } from "./WmsCatalogItem";
import { Converter } from "../convert";
import { csvCatalogItem } from "./CsvItem";

// Dependency injection to break circular dependency
export function groupFromConvertMembersArray(
  convertMembersArray: (
    members: unknown[],
    label: string,
    options: ConversionOptions
  ) => MembersResult
) {
  return function group(
    group: CatalogMember,
    options: ConversionOptions
  ): MemberResult {
    if (!options.partial && !is.array(group.items)) {
      return nullResult(
        missingRequiredProp(ModelType.Group, "items", "array", group.name)
      );
    }
    const convertedMembers: MembersResult | undefined = is.array(group.items)
      ? convertMembersArray(group.items, group.name, options)
      : undefined;

    const propsToCopy = ["isOpen"];

    const unknownProps = getUnknownProps(group, [
      ...propsToCopy,
      ...catalogMemberProps,
      ...catalogMemberPropsIgnore,
      "items",
    ]);
    const extraPropsMessages = propsToWarnings(
      ModelType.Group,
      unknownProps,
      group.name
    );
    const result = {
      member: {
        id: options.generateIds
          ? generateRandomId(options.idLength)
          : undefined,
        type: "group",
        name: group.name,
        members: convertedMembers?.members,
      },
      messages: [...(convertedMembers?.messages || []), ...extraPropsMessages],
    };
    copyProps(group, result.member, [...catalogMemberProps, ...propsToCopy]);
    if (options.copyUnknownProperties) {
      copyProps(group, result.member, unknownProps);
    }
    return result;
  };
}

export function webFeatureServerCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
) {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.WfsGroup, "url", "string", item.name)
    );
  }

  const propsToCopy = ["url"];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
  ]);

  const member: MemberResult["member"] = {
    type: "wfs-group",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.WfsGroup, unknownProps, item.name);

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  return { member, messages };
}

export function sosCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
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
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
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

export function esriCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(
        ModelType.EsriCatalogGroup,
        "url",
        "string",
        item.name
      )
    );
  }

  const propsToCopy = ["url"];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    // "itemProperties",
  ]);
  const member: MemberResult["member"] = {
    type: "esri-group",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.EsriCatalogGroup,
    unknownProps,
    item.name
  );

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  // // itemProperties not supported in v8

  // if (isPlainObject(item.itemProperties)) {
  //   // Treat itemProperties as esriMapServerCatalogGroup (it can also be esriFeatureServerCatalogGroup - but this isn't implemented in catalog-converter).

  //   const itemPropertiesResult = itemProperties(
  //     item,
  //     esriMapServerCatalogGroup
  //   );
  //   if (itemPropertiesResult.result)
  //     member.itemProperties = itemPropertiesResult.result;
  //   messages.push(...itemPropertiesResult.messages);
  // }

  const tileErrorOpts = tileErrorHandlingOptions(item);
  if (tileErrorOpts !== undefined) {
    member.tileErrorHandlingOptions = tileErrorOpts;
  }

  return {
    member,
    messages,
  };
}

export function esriMapServerCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(
        ModelType.EsriMapServerItem,
        "url",
        "string",
        item.name
      )
    );
  }

  const propsToCopy = [
    "url",
    "layers",
    "maximumScale",
    "allowFeaturePicking",
    "parameters",
    "tokenUrl",
    "showTilesAfterMessage",
    "maximumScaleBeforeMessage",
  ];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...imageryLayerProps,
    ...legendProps,
    ...propsToCopy,
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "esri-mapServer",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.EsriMapServerItem,
    unknownProps,
    item.name
  );
  if (
    is.string(item.featureInfoTemplate) ||
    is.plainObject(item.featureInfoTemplate)
  ) {
    const result = featureInfoTemplate(
      ModelType.EsriMapServerItem,
      item.name,
      item.featureInfoTemplate
    );
    member.featureInfoTemplate = result.result;
    messages.push(...result.messages);
  }
  copyProps(item, member, [
    ...catalogMemberProps,
    ...propsToCopy,
    ...imageryLayerProps,
  ]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  const legendResult = legends(ModelType.WmsItem, item.name, item);
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);

  return {
    member,
    messages,
  };
}

export function esriFeatureServerCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
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
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
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

export function esriMapServerCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
) {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(
        ModelType.EsriMapServerGroup,
        "url",
        "string",
        item.name
      )
    );
  }

  const propsToCopy = ["url"];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    // "itemProperties",
  ]);

  const member: MemberResult["member"] = {
    type: "esri-mapServer-group",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.EsriMapServerGroup,
    unknownProps,
    item.name
  );

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  // itemProperties not supported in v8

  // if (isPlainObject(item.itemProperties)) {
  //   const itemPropertiesResult = itemProperties(item, esriMapServerCatalogItem);
  //   if (itemPropertiesResult.result)
  //     member.itemProperties = itemPropertiesResult.result;
  //   messages.push(...itemPropertiesResult.messages);
  // }

  return { member, messages };
}

// Write properly
export function geoJsonCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (
    !options.partial &&
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
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    ...legendProps,
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

  const legendResult = legends(ModelType.WmsItem, item.name, item);
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);

  return { member, messages };
}

export function cartoMapCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  const member: MemberResult["member"] = {
    type: "carto",
    name: item.name,
  };

  const propsToCopy = [
    "config",
    "auth_token",
    "minimumLevel",
    "maximumLevel",
    "attribution",
  ];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...imageryLayerProps,
    ...legendProps,
    ...propsToCopy,
  ]);

  const messages = propsToWarnings(
    ModelType.CartoMapCatalogItem,
    unknownProps,
    item.name
  );

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [
    ...catalogMemberProps,
    ...imageryLayerProps,
    ...propsToCopy,
  ]);
  const legendResult = legends(ModelType.CartoMapCatalogItem, item.name, item);
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);

  return { member, messages };
}

export function mapboxVectorTileCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  const member: MemberResult["member"] = {
    type: "mvt",
    name: item.name,
  };

  const propsToCopy = [
    "lineColor",
    "fillColor",
    "layer",
    "idProperty",
    "nameProperty",
    "maximumNativeZoom",
    "maximumZoom",
    "minimumZoom",
  ];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...imageryLayerProps,
    ...legendProps,
    ...propsToCopy,
  ]);

  const messages = propsToWarnings(
    ModelType.MapboxVectorTileCatalogItem,
    unknownProps,
    item.name
  );

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [
    ...catalogMemberProps,
    ...imageryLayerProps,
    ...propsToCopy,
  ]);
  const legendResult = legends(
    ModelType.MapboxVectorTileCatalogItem,
    item.name,
    item
  );
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);

  return { member, messages };
}

export function kmlCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.KmlCatalogItem, "url", "string", item.name)
    );
  }
  const member: MemberResult["member"] = {
    type: "kml",
    name: item.name,
  };

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...legendProps,
  ]);

  const messages = propsToWarnings(
    ModelType.KmlCatalogItem,
    unknownProps,
    item.name
  );

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, catalogMemberProps);
  const legendResult = legends(ModelType.KmlCatalogItem, item.name, item);
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);

  return { member, messages };
}
