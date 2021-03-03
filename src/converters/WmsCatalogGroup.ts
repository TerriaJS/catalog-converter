import is from "@sindresorhus/is/dist";
import { missingRequiredProp, ModelType } from "../Message";
import { CatalogMember, ConversionOptions, MemberResult } from "../types";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  CopyProps,
  getUnknownProps,
  propsToWarnings,
  itemProperties,
} from "./helpers";
import { wmsCatalogItem } from "./WmsCatalogItem";
import { isPlainObject } from "lodash";

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

  const propsToCopy: CopyProps[] = ["isOpen"];

  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
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
  copyProps(item, member, [...catalogMemberProps, ...propsToCopy]);

  if (isPlainObject(item.itemProperties)) {
    const itemPropertiesResult = itemProperties(item, wmsCatalogItem);
    if (itemPropertiesResult.result)
      member.itemProperties = itemPropertiesResult.result;
    messages.push(...itemPropertiesResult.messages);
  }

  return { member, messages };
}
