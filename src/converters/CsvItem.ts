import is from "@sindresorhus/is";
import { missingRequiredProp, ModelType } from "../Message";
import {
  CatalogMember,
  ConversionOptions,
  MemberResult,
  PlainObject,
} from "../types";
import {
  catalogMemberProps,
  copyProps,
  getUnknownProps,
  nullResult,
  propsToWarnings,
  catalogMemberPropsRemove,
} from "./helpers";

function tableStyle(tableStyle: PlainObject) {
  const extraProps: { columns?: PlainObject[] } = {};
  if (is.plainObject(tableStyle.columns)) {
    const columns = tableStyle.columns;
    extraProps.columns = Object.keys(columns)
      .map((col) => ({ col, defn: columns[col] }))
      .map(({ col, defn }) => {
        const newDefn: PlainObject = { name: col };
        if (is.plainObject(defn)) {
          if (defn.type === "HIDDEN") {
            newDefn.type = "hidden";
          }
        }
        return newDefn;
      });
  }
  // if (is.string(tableStyle.colorMap)) {
  // }
  return extraProps;
}

export function csvCatalogItem(
  item: CatalogMember,
  options: ConversionOptions
): MemberResult {
  if (!options.partial && !is.string(item.url) && !is.string(item.data)) {
    return nullResult(
      missingRequiredProp(
        ModelType.CsvItem,
        ["url", "data"],
        undefined,
        item.name
      )
    );
  }
  const unknownProps = getUnknownProps(item, [
    "name",
    "type",
    ...catalogMemberProps,
    ...catalogMemberPropsRemove,
    "url",
    "data",
    "opacity",
    "tableStyle",
  ]);
  const extraPropsMessages = propsToWarnings(
    ModelType.CsvItem,
    unknownProps,
    item.name
  );
  const member: MemberResult["member"] = {
    type: "csv",
    name: item.name,
  };
  if (options.copyUnknownProperties) {
    copyProps(item, member, unknownProps);
  }
  copyProps(item, member, [
    ...catalogMemberProps,
    "url",
    "opacity",
    { v7: "data", v8: "csvString" },
  ]);
  if (is.plainObject(item.tableStyle)) {
    Object.assign(member, tableStyle(item.tableStyle));
  }
  return { member, messages: extraPropsMessages };
}
