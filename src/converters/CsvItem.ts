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
  catalogMemberPropsIgnore,
} from "./helpers";

function tableStyle(tableStyle: PlainObject) {
  const extraProps: {
    columns?: PlainObject[];
    defaultStyle?: PlainObject;
  } = {};
  if (is.plainObject(tableStyle.columns)) {
    const columns = tableStyle.columns;
    const chartLines: PlainObject[] = [];
    extraProps.columns = Object.keys(columns)
      .map((col) => ({ col, defn: columns[col] }))
      .map(({ col, defn }) => {
        const newDefn: PlainObject = { name: col };
        if (is.plainObject(defn)) {
          if (defn.type === "HIDDEN") {
            newDefn.type = "hidden";
          }
          if (is.string(defn.units)) {
            newDefn.units = defn.units;
          }
          if (is.string(defn.title)) {
            newDefn.title = defn.title;
          }
          if (is.plainObject(defn.format)) {
            newDefn.format = defn.format;
          }
          if (is.array(defn.replaceWithZeroValues)) {
            newDefn.replaceWithZeroValues = defn.replaceWithZeroValues;
          }
          if (is.array(defn.replaceWithNullValues)) {
            newDefn.replaceWithNullValues = defn.replaceWithNullValues;
          }
          tryAddChartLineForColumn(col, defn, chartLines);
        }
        return newDefn;
      });

    if (!is.emptyArray(chartLines)) {
      extraProps.defaultStyle = { chart: { lines: chartLines } };
    }
  }
  // if (is.string(tableStyle.colorMap)) {
  // }
  return extraProps;
}

function tryAddChartLineForColumn(
  columName: string,
  col: PlainObject,
  chartLines: PlainObject[]
) {
  // Read chart line style from column defnition and append to chartStyle.lines
  const line: PlainObject = {};
  const { chartLineColor, yAxisMin, yAxisMax, active } = col;
  if (is.string(chartLineColor)) line.color = chartLineColor;
  if (is.number(yAxisMin)) line.yAxisMinimum = yAxisMin;
  if (is.number(yAxisMax)) line.yAxisMaximum = yAxisMax;
  if (is.boolean(active)) line.isSelectedInWorkbench = active;
  if (!is.emptyObject(line)) {
    line.yAxisColumn = columName;
    chartLines.push(line);
  }
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
    ...catalogMemberProps,
    ...catalogMemberPropsIgnore,
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
