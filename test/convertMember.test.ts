import { convertMember } from "../src/convert";
import {
  getMissingRequiredPropDetails,
  getUnknownPropDetails,
  getUnknownTypeDetails,
  isMissingRequiredProp,
  isUnknownProp,
  isUnknownType,
  ModelType,
  Severity,
} from "../src/Message";
// Short tests
describe("Test that convertMember", () => {
  it("turns empty items into empty members", () => {
    const res = convertMember({
      type: "group",
      name: "Test group",
      items: [],
    });
    expect(res.member).toMatchObject({
      type: "group",
      name: "Test group",
      members: [],
    });
    expect(res.messages).toHaveLength(0);
  });

  it("returns an error when a catalog member is missing a name or type", () => {
    const type = "group";
    const name = "Test no type";
    const res1 = convertMember({
      type,
    });
    const res2 = convertMember({
      name,
    });
    [res1, res2].forEach((res) => {
      expect(res.member).toBeNull();
      expect(res.messages).toHaveLength(1);
      expect(res.messages[0].severity).toBe(Severity.Error);
      expect(isMissingRequiredProp(res.messages[0])).toBe(true);
    });
    expect(res1.messages[0].path).toMatchObject([
      `<Invalid CatalogMember type = "${type}">`,
    ]);
    expect(res2.messages[0].path).toMatchObject([name]);
    if (isMissingRequiredProp(res1.messages[0])) {
      expect(getMissingRequiredPropDetails(res1.messages[0])).toMatchObject({
        modelType: ModelType.Member,
        property: "name",
        requiredType: "string",
      });
    }
    if (isMissingRequiredProp(res2.messages[0])) {
      expect(getMissingRequiredPropDetails(res2.messages[0])).toMatchObject({
        modelType: ModelType.Member,
        property: "type",
        requiredType: "string",
      });
    }
  });

  it("returns an error when the type is not recognised", () => {
    const type = "FAKE";
    const name = "Test unrecognised type";
    const res = convertMember({
      type,
      name,
    });
    expect(res.member).toBeNull();
    expect(res.messages).toMatchObject([
      {
        message: `Unknown or unsupported type "${type}"`,
        path: [name],
        severity: Severity.Error,
      },
    ]);
    expect(res.messages).toHaveLength(1);
    expect(isUnknownType(res.messages[0])).toBe(true);

    if (isUnknownType(res.messages[0])) {
      expect(getUnknownTypeDetails(res.messages[0]).type).toBe(type);
    }
  });

  it("converts other members inside a group with an invalid member", () => {
    const type = "FAKE";
    const name = "Test unrecognised type";
    const groupName = "Test error in group";
    const res = convertMember({
      type: "group",
      name: groupName,
      items: [
        { type, name },
        { type: "group", name: "Other good group", items: [] },
      ],
    });
    expect(res.member).toMatchObject({
      type: "group",
      name: groupName,
      members: [{ type: "group", name: "Other good group", members: [] }],
    });
    expect(res.messages).toMatchObject([
      {
        message: `Unknown or unsupported type "${type}"`,
        path: [groupName, name],
        severity: Severity.Error,
      },
    ]);
  });

  it("returns warnings for unknown props and doesn't copy them", () => {
    const res = convertMember({
      type: "wms",
      name: "Test WMS with unknown property",
      url: "https://example.com/wms",
      layers: "a,b",
      someProperty: 6,
      otherProperty: "z",
    });
    expect(res.member).toMatchObject({
      type: "wms",
      name: "Test WMS with unknown property",
      url: "https://example.com/wms",
      layers: "a,b",
    });
    expect(res.messages).toHaveLength(2);
    res.messages.forEach((m) => {
      expect(m.severity).toBe(Severity.Warning);
      expect(isUnknownProp(m)).toBe(true);
    });
    // Check that both someProperty and otherProperty have warnings
    expect(
      res.messages.filter(isUnknownProp).reduce(
        (o, m) =>
          Object.assign(o, {
            [getUnknownPropDetails(m).property]: true,
          }),
        {}
      )
    ).toMatchObject({
      someProperty: true,
      otherProperty: true,
    });
  });

  it("returns warnings for unknown props and copies them when copyUnknownProperties is true", () => {
    const res = convertMember(
      {
        type: "wms",
        name: "Test WMS with unknown property",
        url: "https://example.com/wms",
        layers: "a,b",
        someProperty: 6,
        otherProperty: "z",
      },
      {
        copyUnknownProperties: true,
      }
    );
    expect(res.member).toMatchObject({
      type: "wms",
      name: "Test WMS with unknown property",
      url: "https://example.com/wms",
      layers: "a,b",
      someProperty: 6,
      otherProperty: "z",
    });
    expect(res.messages).toHaveLength(2);
    res.messages.forEach((m) => {
      expect(m.severity).toBe(Severity.Warning);
      expect(isUnknownProp(m)).toBe(true);
    });
    // Check that both someProperty and otherProperty have warnings, in no particular order
    expect(
      res.messages.filter(isUnknownProp).reduce(
        (o, m) =>
          Object.assign(o, {
            [getUnknownPropDetails(m).property]: true,
          }),
        {}
      )
    ).toMatchObject({
      someProperty: true,
      otherProperty: true,
    });
  });

  it("converts a SensorObservationServiceCatalogItem", () => {
    const res = convertMember({
      name: "Watercourse Levels",
      url: "http://www.bom.gov.au/waterdata/services",
      type: "sos",
      proceduresName: "Frequency",
      description:
        "Watercourse levels, as defined under category 1a of the Water Regulations 2008 – refer to [Definitions – Subcategories of Water Information](http://www.bom.gov.au/water/regulations/subCategoriesWaterAuxNav.shtml#surfWater). This data is shown as provided to the Bureau of Meteorology by data owner organisations and is subject to their terms and conditions of use. Please refer to Copyright on the [Water Data Online](http://www.bom.gov.au/waterdata/) website, and [Disclaimer](http://www.bom.gov.au/other/disclaimer.shtml) statements relating to the use of Bureau of Meteorology material.",
      featureInfoTemplate:
        "# {{name}}\n\n|||\n|-------|-------|\n|Station Name|{{name}}|\n|SOS2 Feature Type|{{type}}|\n|SOS2 ID|{{id}}|\n|Latitude|{{lat}}|\n|Longitude|{{lon}}|\n\n{{chart}}",
      observablePropertiesName: "Observation type",
      startDate: "1980-01-01T00:00:00+10",
      filterByProcedures: false,
      tryToLoadObservationData: false, // <- delete this
      stationIdWhitelist: [
        "http://bom.gov.au/waterdata/services/stations/410730",
        "http://bom.gov.au/waterdata/services/stations/809310",
      ],
      procedures: [
        {
          identifier:
            "http://bom.gov.au/waterdata/services/tstypes/Pat3_C_B_1_YearlyMean",
          title: "Annual average",
          defaultDuration: "40y",
        },
        {
          identifier:
            "http://bom.gov.au/waterdata/services/tstypes/Pat3_C_B_1_HourlyMean",
          title: "Hourly average",
          defaultDuration: "48h",
        },
      ],
      observableProperties: [
        {
          identifier:
            "http://bom.gov.au/waterdata/services/parameters/Water Course Level",
          title: "Water Course Level",
          units: "metres",
        },
      ],
    });
    expect(res.member).toMatchObject({
      name: "Watercourse Levels",
      url: "http://www.bom.gov.au/waterdata/services",
      type: "sos",
      proceduresName: "Frequency",
      description:
        "Watercourse levels, as defined under category 1a of the Water Regulations 2008 – refer to [Definitions – Subcategories of Water Information](http://www.bom.gov.au/water/regulations/subCategoriesWaterAuxNav.shtml#surfWater). This data is shown as provided to the Bureau of Meteorology by data owner organisations and is subject to their terms and conditions of use. Please refer to Copyright on the [Water Data Online](http://www.bom.gov.au/waterdata/) website, and [Disclaimer](http://www.bom.gov.au/other/disclaimer.shtml) statements relating to the use of Bureau of Meteorology material.",
      featureInfoTemplate: {
        template:
          "# {{name}}\n\n|||\n|-------|-------|\n|Station Name|{{name}}|\n|SOS2 Feature Type|{{type}}|\n|SOS2 ID|{{id}}|\n|Latitude|{{lat}}|\n|Longitude|{{lon}}|\n\n{{chart}}",
      },
      observablePropertiesName: "Observation type",
      startDate: "1980-01-01T00:00:00+10",
      filterByProcedures: false,
      stationIdWhitelist: [
        "http://bom.gov.au/waterdata/services/stations/410730",
        "http://bom.gov.au/waterdata/services/stations/809310",
      ],
      procedures: [
        {
          identifier:
            "http://bom.gov.au/waterdata/services/tstypes/Pat3_C_B_1_YearlyMean",
          title: "Annual average",
          defaultDuration: "40y",
        },
        {
          identifier:
            "http://bom.gov.au/waterdata/services/tstypes/Pat3_C_B_1_HourlyMean",
          title: "Hourly average",
          defaultDuration: "48h",
        },
      ],
      observableProperties: [
        {
          identifier:
            "http://bom.gov.au/waterdata/services/parameters/Water Course Level",
          title: "Water Course Level",
          units: "metres",
        },
      ],
    });
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]);
  });

  it("converts a CSV with hidden columns", () => {
    const res = convertMember({
      name: "Test CSV with hidden column",
      type: "csv",
      data: "lat,lon,val,OTHER\n-35,150,6,M)(*_\n-36,150,4,)N_",
      tableStyle: {
        columns: {
          OTHER: {
            type: "HIDDEN",
          },
        },
      },
    });
    expect(res.member).toMatchObject({
      name: "Test CSV with hidden column",
      type: "csv",
      csvString: "lat,lon,val,OTHER\n-35,150,6,M)(*_\n-36,150,4,)N_",
      columns: [{ name: "OTHER", type: "hidden" }],
    });
    expect(res.messages).toHaveLength(0);
  });

  it("converts a ArcGisMapServerCatalogItem", () => {
    const res = convertMember({
      name: "Catchment Scale Land Use 2018 [18 class]",
      url:
        "http://www.asris.csiro.au/arcgis/rest/services/abares/clum_50m_2018/MapServer/0",
      layers: "0",
      type: "esri-mapServer",
      ignoreUnknownTileErrors: true,
      opacity: 1,
    });
    expect(res.member).toMatchObject({
      name: "Catchment Scale Land Use 2018 [18 class]",
      url:
        "http://www.asris.csiro.au/arcgis/rest/services/abares/clum_50m_2018/MapServer/0",
      layers: "0",
      type: "esri-mapServer",
      opacity: 1,
    });
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]);
  });
});
