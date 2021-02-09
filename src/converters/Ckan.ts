import is from "@sindresorhus/is/dist";
import { isPlainObject } from "lodash";
import { Converter } from "../convert";
import {
  missingRequiredProp,
  ModelType,
  Severity,
  unknownPropOpaque,
} from "../Message";
import { CatalogMember, ConversionOptions, MemberResult } from "../types";
import { csvCatalogItem } from "./CsvItem";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  CopyProps,
  copyProps,
  getUnknownProps,
  itemProperties,
  nullResult,
  propsToWarnings,
} from "./helpers";
import {
  esriFeatureServerCatalogItem,
  esriMapServerCatalogItem,
  geoJsonCatalogItem,
  kmlCatalogItem,
} from "./other";
import { wmsCatalogItem } from "./WmsCatalogItem";

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
  const propsToCopy: CopyProps[] = [
    "url",
    "filterQuery",
    "groupBy",
    "useCombinationNameWhereMultipleResources",
    {
      v7: "ungroupedTitle",
      v8: "ungroupedTitle",
      // Get rid of null values
      translationFn: (v) => (v === "" || v === null ? undefined : v),
    },
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

  // Note, this doesn't use catalogMemberProps (it uses CatalogMemberReferenceTraits intead of CatalogMemberTraits)
  const propsToCopy: CopyProps[] = [
    "id",
    "name",
    "url",
    "forceProxy",
    "cacheDuration",
    "dataCustodian",
    {
      v7: "rectangle",
      v8: "rectangle",
      translationFn: (rectangle: any[]) => {
        return {
          west: parseFloat(rectangle[0]) || undefined,
          south: parseFloat(rectangle[1]) || undefined,
          east: parseFloat(rectangle[2]) || undefined,
          north: parseFloat(rectangle[3]) || undefined,
        };
      },
    },
    "disablePreview",
    "datasetId",
    "resourceId",
  ];

  const v7CkanProps = [
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    "allowAnyResourceIfResourceIdNotFound",
    "esriFeatureServerResourceFormat",
    "wmsResourceFormat",
    "wfsResourceFormat",
    "kmlResourceFormat",
    "csvResourceFormat",
    "esriMapServerResourceFormat",
    "esriFeatureServerResourceFormat",
    "geoJsonResourceFormat",
    "czmlResourceFormat",
    "itemProperties",
  ];

  const unknownProps = getUnknownProps(item, [
    ...v7CkanProps,
    ...catalogMemberProps,
  ]);
  const member: MemberResult["member"] = {
    type: "ckan-item",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.CkanCatalogItem,
    unknownProps,
    item.name
  );
  copyProps(item, member, [...propsToCopy]);
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }

  const itemPropertiesHelper = (converter: Converter) => {
    if (isPlainObject(item.itemProperties)) {
      const itemPropertiesResult = itemProperties(item, converter);
      if (itemPropertiesResult.result)
        member.itemProperties = itemPropertiesResult.result;
      messages.push(...itemPropertiesResult.messages);
    }
  };

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
    itemPropertiesHelper(esriFeatureServerCatalogItem);
  } else if (is.string(item.wmsResourceFormat)) {
    supportedResourceFormats.push({
      id: "WMS",
      formatRegex: item.wmsResourceFormat,
      definition: {
        type: "wms",
      },
    });
    itemPropertiesHelper(wmsCatalogItem);
  } else if (is.string(item.wfsResourceFormat)) {
    supportedResourceFormats.push({
      id: "WFS",
      formatRegex: item.wfsResourceFormat,
      definition: {
        type: "wfs",
      },
    });
    if (isPlainObject(item.itemProperties)) {
      messages.push({
        message: `WFS itemProperties is not supported`,
        path: [item.name, "itemProperties (WFS)"],
        severity: Severity.Warning,
        details: unknownPropOpaque.toOpaque({
          modelType: ModelType.CkanCatalogItem,
          property: "itemProperties (WFS)",
        }),
      });
    }
  } else if (is.string(item.kmlResourceFormat)) {
    supportedResourceFormats.push({
      id: "Kml",
      formatRegex: item.kmlResourceFormat,
      definition: {
        type: "kml",
      },
    });
    itemPropertiesHelper(kmlCatalogItem);
  } else if (is.string(item.csvResourceFormat)) {
    supportedResourceFormats.push({
      id: "CSV",
      formatRegex: item.csvResourceFormat,
      definition: {
        type: "csv",
      },
    });
    itemPropertiesHelper(csvCatalogItem);
  } else if (is.string(item.esriMapServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS MapServer",
      formatRegex: item.esriMapServerResourceFormat,
      definition: {
        type: "esri-mapServer",
      },
    });
    itemPropertiesHelper(esriMapServerCatalogItem);
  } else if (is.string(item.esriFeatureServerResourceFormat)) {
    supportedResourceFormats.push({
      id: "ArcGIS FeatureServer",
      formatRegex: item.esriFeatureServerResourceFormat,
      definition: {
        type: "esri-featureServer",
      },
    });
    itemPropertiesHelper(esriFeatureServerCatalogItem);
  } else if (is.string(item.geoJsonResourceFormat)) {
    supportedResourceFormats.push({
      id: "GeoJson",
      formatRegex: item.geoJsonResourceFormat,
      definition: {
        type: "geojson",
      },
    });
    itemPropertiesHelper(geoJsonCatalogItem);
  } else if (is.string(item.czmlResourceFormat)) {
    supportedResourceFormats.push({
      id: "Czml",
      formatRegex: item.czmlResourceFormat,
      definition: {
        type: "czml",
      },
    });
    if (isPlainObject(item.itemProperties)) {
      messages.push({
        message: `Czml itemProperties is not supported`,
        path: [item.name, "itemProperties (Czml)"],
        severity: Severity.Warning,
        details: unknownPropOpaque.toOpaque({
          modelType: ModelType.CkanCatalogItem,
          property: "itemProperties (Czml)",
        }),
      });
    }
  }

  if (isPlainObject(item.itemProperties)) {
    // Copy over left over catalogMemberProps (for example "description") to itemProperties
    const extraItemProperties = {};

    // Copy catalogMemberProps which are NOT v7CkanPropKeys
    const v7CkanPropKeys = v7CkanProps.map((catalogProp) =>
      is.string(catalogProp) ? catalogProp : catalogProp.v7
    );
    copyProps(
      item.itemProperties as any,
      extraItemProperties,
      catalogMemberProps.filter(
        (catalogProp) =>
          !v7CkanPropKeys.includes(
            is.string(catalogProp) ? catalogProp : catalogProp.v7
          )
      )
    );

    // Assign extra props to itemProperties
    if (extraItemProperties !== {}) {
      member.itemProperties = Object.assign(
        isPlainObject(member.itemProperties)
          ? (member.itemProperties as any)
          : {},
        extraItemProperties
      );
    }
  }

  member.supportedResourceFormats = supportedResourceFormats;
  return {
    member,
    messages,
  };
}
