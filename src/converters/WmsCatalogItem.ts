import is from "@sindresorhus/is/dist";
import { missingRequiredProp, ModelType } from "../Message";
import { CatalogMember, ConversionOptions, MemberResult } from "../types";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  CopyProps,
  featureInfoTemplate,
  getUnknownProps,
  propsToWarnings,
  imageryLayerProps,
  legendProps,
  legends,
} from "./helpers";

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
  if (!options.partial && error) {
    return {
      member: null,
      messages: [error],
    };
  }

  const propsToCopy: CopyProps[] = [
    "layers",
    "styles",
    {
      v7: "availableStyles",
      v8: "availableStyles",
      translationFn: (availableStyles: { [layer: string]: any[] }) =>
        Object.entries(availableStyles).map(([layerName, styles]) => {
          const v8Styles = styles.map((style) => {
            return {
              name: style.Name,
              title: style.Title,
              abstract: style.Abstract,
              legend: { url: style.legendUri },
            };
          });
          return {
            layerName,
            styles: v8Styles,
          };
        }),
    },
    "dimensions",
    {
      v7: "availableDimensions",
      v8: "availableDimensions",
      translationFn: (availableDimensions: { [layer: string]: any[] }) =>
        Object.entries(availableDimensions).map(([layerName, dimensions]) => {
          const v8Dimensions = dimensions.map((dim) => {
            return {
              name: dim.name,
              values: dim.options,
              units: dim.units,
              unitSymbol: dim.unitSymbol,
              default: dim.default,
              multipleValues: dim.multipleValues,
              nearestValue: dim.nearestValue,
            };
          });
          return {
            layerName,
            dimensions: v8Dimensions,
          };
        }),
    },
    "parameters",
    "linkedWcsUrl",
    "linkedWcsCoverage",
    "chartColor",
    "getCapabilitiesUrl",
    { v7: "featureTimesProperty", v8: "timeFilterPropertyName" },
    "isGeoServer",
    "minScaleDenominator",
    "hideLayerAfterMinScaleDenominator",
    "maxRefreshIntervals",
    "leafletUpdateInterval",
  ];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...imageryLayerProps,
    ...legendProps,
    ...propsToCopy,
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
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);

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
  const legendResult = legends(ModelType.WmsItem, item.name, item);
  member.legends = legendResult.result;
  messages.push(...legendResult.messages);
  return { member, messages };
}
