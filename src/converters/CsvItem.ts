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
  featureInfoTemplate,
} from "./helpers";

interface TableTraits {
  columns?: Column[];
}

interface TableStyle {
  columns?: Column[];
  defaultColumn?: Omit<Column, "name">;
  defaultStyle?: Style;
  activeStyle?: string;
}

interface Style {
  chart?: ChartStyle;
  time?: TimeStyle;
  color?: ColorStyle;
}

interface Column {
  name: string;
  title?: string;
  units?: string;
  type?: string;
  format?: PlainObject;
  replaceWithZeroValues?: string[];
  replaceWithNullValues?: string[];
}

interface ChartStyle {
  lines: ChartLineStyle[];
}

interface ChartLineStyle {
  color?: string;
  yAxisMinimum?: number;
  yAxisMaximum?: number;
  isSelectedInWorkbench?: boolean;
  yAxisColumn?: string;
}

interface TimeStyle {
  timeColumn?: string | null;
  endTimeColumn?: string;
}

interface ColorStyle {
  nullColor?: string;
  nullLabel?: string;
  numberOfBins?: number;
  binColors?: string[];
}

function tableStyle(
  item: PlainObject & { tableStyle: PlainObject }
): TableTraits {
  const tableStyle = item.tableStyle;
  const extraProps: TableStyle = {};
  if (is.plainObject(tableStyle.columns)) {
    const columns = tableStyle.columns;
    extraProps.columns = Object.entries(columns).map(([name, defn]) => ({
      name,
      ...getColumnTraits(defn),
    }));

    const chartLines = getChartLines(tableStyle.columns);
    if (chartLines) {
      extraProps.defaultStyle = { chart: { lines: chartLines } };
    }
  }

  if (is.string(tableStyle.dataVariable)) {
    extraProps.activeStyle = tableStyle.dataVariable;
  }

  const defaultColumn = getColumnTraits(tableStyle);
  if (!is.emptyObject(defaultColumn)) {
    extraProps.defaultColumn = defaultColumn;
  }

  const timeTraits = getTimeTraits(tableStyle) ?? {};

  const extraTimeTraits = ["idColumns", "timeColumn", "isSampled"].reduce<
    PlainObject
  >((acc, prop) => {
    if (item[prop]) {
      acc[prop] = item[prop];
    }
    return acc;
  }, {});

  if (timeTraits !== {} || extraTimeTraits !== {}) {
    extraProps.defaultStyle = {
      ...extraProps.defaultStyle,
      time: { ...timeTraits, ...extraTimeTraits },
    };
  }

  const colorTraits = getColorTraits(tableStyle);
  if (colorTraits) {
    extraProps.defaultStyle = {
      ...extraProps.defaultStyle,
      color: colorTraits,
    };
  }

  return extraProps;
}

function getColumnTraits(defn: any): Omit<Column, "name"> {
  const newDefn: Omit<Column, "name"> = {};
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
  }
  return newDefn;
}

function getTimeTraits(tableStyle: PlainObject): TimeStyle | undefined {
  const timeTraits: { timeColumn?: string | null; endTimeColumn?: string } = {};
  if (is.string(tableStyle.timeColumn))
    timeTraits.timeColumn = tableStyle.timeColumn;
  else if (is.array(tableStyle.timeColumn)) {
    const [startTimeColumn, endTimeColumn] = tableStyle.timeColumn;
    if (is.string(startTimeColumn) && is.string(endTimeColumn)) {
      timeTraits.timeColumn = startTimeColumn;
      timeTraits.endTimeColumn = endTimeColumn;
    }
  } else if (is.null_(tableStyle.timeColumn)) {
    timeTraits.timeColumn = null;
  }
  return is.emptyObject(timeTraits) ? undefined : timeTraits;
}

function getChartLines(columns: PlainObject): ChartLineStyle[] | undefined {
  const lines: ChartLineStyle[] = [];
  Object.entries(columns).forEach(([columnName, col]: [string, any]) => {
    const line: ChartLineStyle = {};
    const { chartLineColor, yAxisMin, yAxisMax, active } = col;
    if (is.string(chartLineColor)) line.color = chartLineColor;
    if (is.number(yAxisMin)) line.yAxisMinimum = yAxisMin;
    if (is.number(yAxisMax)) line.yAxisMaximum = yAxisMax;
    if (is.boolean(active)) line.isSelectedInWorkbench = active;
    if (!is.emptyObject(line)) line.yAxisColumn = columnName;
    if (!is.emptyObject(line)) lines.push(line);
  });
  return is.emptyArray(lines) ? undefined : lines;
}

function getColorTraits(tableStyle: PlainObject): ColorStyle | undefined {
  const color: ColorStyle = {};
  if (is.string(tableStyle.nullColor)) color.nullColor = tableStyle.nullColor;
  if (is.string(tableStyle.nullLabel)) color.nullLabel = tableStyle.nullLabel;
  if (is.number(tableStyle.colorBins))
    color.numberOfBins = tableStyle.colorBins;
  if (is.string(tableStyle.colorMap))
    color.binColors = tableStyle.colorMap.split("-");
  if (is.array(tableStyle.colorMap)) color.binColors = tableStyle.colorMap;
  return is.emptyObject(color) ? undefined : color;
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
    "featureInfoTemplate",
    "polling",
    "idColumns",
    "timeColumn",
    "isSampled",
  ]);
  const messages = propsToWarnings(ModelType.CsvItem, unknownProps, item.name);
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
    { v7: "showWarnings", v8: "showUnmatchedRegionsWarning" },
    {
      v7: "polling",
      v8: "polling",
      translationFn: translatePolling,
    },
  ]);
  if (is.plainObject(item.tableStyle)) {
    Object.assign(member, tableStyle(item as any));
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
  return { member, messages };
}

function translatePolling(polling: any) {
  const result: {
    url?: string;
    seconds?: number;
    shouldReplaceData?: boolean;
  } = {};
  const { url, seconds, replace } = polling;
  if (is.string(url)) result.url = url;
  if (is.number(seconds)) result.seconds = seconds;
  if (is.boolean(replace)) result.shouldReplaceData = replace;
  return result;
}
