import { CatalogMember, MemberResult } from "../types";
import { ConversionOptions } from "../ConversionOptions";
import is from "@sindresorhus/is/dist";
import {
  nullResult,
  getUnknownProps,
  catalogMemberProps,
  catalogMemberPropsIgnore,
  propsToWarnings,
  copyProps,
  CopyProps,
  itemProperties,
} from "./helpers";
import { missingRequiredProp, ModelType } from "../Message";
import { isPlainObject } from "lodash";

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

export function wpsCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  let error;
  if (!is.string(item.url)) {
    error = missingRequiredProp(ModelType.WpsGroup, "url", "string", item.name);
  }

  if (!options.partial && error) {
    return {
      member: null,
      messages: [error],
    };
  }

  const propsToCopy: CopyProps[] = ["isOpen"];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
    "itemProperties",
  ]);
  const member: MemberResult["member"] = {
    type: "wps-getCapabilities",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.WpsGroup, unknownProps, item.name);

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);

  if (isPlainObject(item.itemProperties)) {
    const itemPropertiesResult = itemProperties(item, wpsCatalogItem, options);
    if (itemPropertiesResult.result)
      member.itemProperties = itemPropertiesResult.result;
    messages.push(...itemPropertiesResult.messages);
  }

  return { member, messages };
}
