import is from "@sindresorhus/is/dist";
import { ConversionOptions } from "../ConversionOptions";
import { missingRequiredProp, ModelType } from "../Message";
import { CatalogMember, MemberResult } from "../types";
import {
  catalogMemberProps,
  catalogMemberPropsIgnore,
  copyProps,
  getUnknownProps,
  nullResult,
  propsToWarnings,
} from "./helpers";

export function cswCatalogGroup(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url)) {
    return nullResult(
      missingRequiredProp(ModelType.CswCatalogGroup, "url", "string", item.name)
    );
  }

  const propsToCopy = ["url", "domainSpecification"];
  const unknownProps = getUnknownProps(item, [
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
    ...propsToCopy,
  ]);
  const member: MemberResult["member"] = {
    type: "csw-group",
    name: item.name,
  };
  const messages = propsToWarnings(
    ModelType.CswCatalogGroup,
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
