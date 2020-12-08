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
} from "./helpers";

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

  return { member, messages };
}
