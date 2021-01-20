import is from "@sindresorhus/is";
import { isPlainObject } from "lodash";
import { missingRequiredProp, ModelType } from "../Message";
import {
  CatalogMember,
  ConversionOptions,
  MemberResult,
  MembersResult,
} from "../types";
import generateRandomId from "./generateRandomId";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  featureInfoTemplate,
  getUnknownProps,
  imageryLayerProps,
  itemProperties,
  legendProps,
  legends,
  nullResult,
  propsToWarnings,
} from "./helpers";
import { tileErrorHandlingOptions } from "./WmsCatalogItem";

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
    "itemProperties",
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

  if (isPlainObject(item.itemProperties)) {
    // Treat itemProperties as esriMapServerCatalogGroup (it can also be esriFeatureServerCatalogGroup - but this isn't implemented in catalog-converter).

    const itemPropertiesResult = itemProperties(
      item,
      esriMapServerCatalogGroup
    );
    if (itemPropertiesResult.result)
      member.itemProperties = itemPropertiesResult.result;
    messages.push(...itemPropertiesResult.messages);
  }

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
        ModelType.EsriMapServerItem,
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
  ]);

  const member: MemberResult["member"] = {
    type: "esri-mapServer-group",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.EsriFeatureServerItem,
    unknownProps,
    item.name
  );

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  return { member, messages };
}

export function ckanCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  // See details of what's been ported https://github.com/TerriaJS/terriajs/pull/4160
  if (!options.partial && !is.string(item.url)) {
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
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
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

export function ckanCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.CkanCatalogItem, "url", "string", item.name)
    );
  }
  const propsToCopy = ["url", "datasetId", "resourceId"];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    "allowAnyResourceIfResourceIdNotFound",
  ]);
  const member: MemberResult["member"] = {
    type: "ckan-item",
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
  if (is.string(item.esriFeatureServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS FeatureServer",
      formatRegex: item.esriFeatureServerResourceFormat,
      definition: {
        type: "esri-featureServer",
      },
    });
  } else if (is.string(item.wmsResourceFormat)) {
    supportedResourceFormats.push({
      id: "WMS",
      formatRegex: item.wmsResourceFormat,
      definition: {
        type: "wms",
      },
    });
  } else if (is.string(item.wfsResourceFormat)) {
    supportedResourceFormats.push({
      id: "WFS",
      formatRegex: item.wfsResourceFormat,
      definition: {
        type: "wfs",
      },
    });
  } else if (is.string(item.kmlResourceFormat)) {
    supportedResourceFormats.push({
      id: "Kml",
      formatRegex: item.kmlResourceFormat,
      definition: {
        type: "kml",
      },
    });
  } else if (is.string(item.csvResourceFormat)) {
    supportedResourceFormats.push({
      id: "CSV",
      formatRegex: item.csvResourceFormat,
      definition: {
        type: "csv",
      },
    });
  } else if (is.string(item.esriMapServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS MapServer",
      formatRegex: item.esriMapServerResourceFormat,
      definition: {
        type: "esri-mapServer",
      },
    });
  } else if (is.string(item.esriFeatureServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS FeatureServer",
      formatRegex: item.esriFeatureServerResourceFormat,
      definition: {
        type: "esri-featureServer",
      },
    });
  } else if (is.string(item.geoJsonResourceFormat)) {
    supportedResourceFormats.push({
      id: "GeoJson",
      formatRegex: item.geoJsonResourceFormat,
      definition: {
        type: "geojson",
      },
    });
  } else if (is.string(item.czmlResourceFormat)) {
    supportedResourceFormats.push({
      id: "Czml",
      formatRegex: item.czmlResourceFormat,
      definition: {
        type: "czml",
      },
    });
  }

  member.supportedResourceFormats = supportedResourceFormats;
  return {
    member,
    messages,
  };
}

export function wpsCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.WpsItem, "url", "string", item.name)
    );
  }

  const propsToCopy = [
    "url",
    "identifier",
    "description",
    "executeWithHttpGet",
  ];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "wps",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.WpsItem, unknownProps, item.name);

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  return {
    member,
    messages,
  };
}

export function wpsResultItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  const propsToCopy = ["wpsResponseUrl", "wpsResponse", "parameters"];

  // do something for parameterValues

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    "featureInfoTemplate",
  ]);
  const member: MemberResult["member"] = {
    type: "wps-result",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.WpsResultItem,
    unknownProps,
    item.name
  );

  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

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
