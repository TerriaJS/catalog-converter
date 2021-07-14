import is from "@sindresorhus/is/dist";
import { isPlainObject } from "lodash";
import { ConversionOptions } from "../ConversionOptions";
import { missingRequiredProp, ModelType } from "../Message";
import { CatalogMember, MemberResult } from "../types";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  CopyProps,
  getUnknownProps,
  itemProperties,
  propsToWarnings,
  catalogGroupPropsIgnore,
  catalogGroupProps,
} from "./helpers";
import { wmsCatalogItem } from "./WmsCatalogItem";

export function wmsCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  let error;
  if (!is.string(item.url)) {
    error = missingRequiredProp(ModelType.WmsGroup, "url", "string", item.name);
  }

  if (!options.partial && error) {
    return {
      member: null,
      messages: [error],
    };
  }

  const unknownProps = getUnknownProps(item, [
    ...catalogGroupProps,
    ...catalogGroupPropsIgnore,
    "itemProperties",
  ]);
  const member: MemberResult["member"] = {
    type: "wms-group",
    name: item.name,
  };
  const messages = propsToWarnings(ModelType.WmsGroup, unknownProps, item.name);

  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, catalogGroupProps);

  if (isPlainObject(item.itemProperties)) {
    const itemPropertiesResult = itemProperties(item, wmsCatalogItem, options);
    if (itemPropertiesResult.result)
      member.itemProperties = itemPropertiesResult.result;
    messages.push(...itemPropertiesResult.messages);
  }

  return { member, messages };
}
