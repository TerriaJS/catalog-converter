const { readFileSync } = require("fs");
const path = require("path");

import { convertCatalog } from "../src/convert";
import { Severity } from "../src/Message";

describe("Test convertCatalog", () => {
  // Test samples
  const fullJsonTests = ["empty-catalog"];
  // it.each(fullJsonTests)(
  //   "Test convertCatalog on successful sample files",
  //   (file) => {

  it("with an empty catalog", () => {
    const file = "empty-catalog";
    const [v7, v8] = ["v7", "v8"].map((folder) =>
      require(`./samples/${folder}/${file}.json`)
    );
    const res = convertCatalog(v7);
    expect(res.result).toMatchObject(v8);
    expect(res.messages).toHaveLength(0);
  });

  const fullJsonWithUnknownPropsTests = ["spc-csvs", "terria-cube"];

  // it.each(fullJsonWithUnknownPropsTests)(
  //   "Test convertCatalog with unknown properties",
  //   (file) => {
  it("with csvs from PacificMap", () => {
    const file = "spc-csvs";
    const [v7, v8] = ["v7", "v8"].map((folder) =>
      require(`./samples/${folder}/${file}.json`)
    );
    const res = convertCatalog(v7, { copyUnknownProperties: true });
    expect(res.result).toMatchObject(v8);
    expect(
      res.messages.filter(({ severity }) => severity === Severity.Error)
    ).toHaveLength(0);
  });

  it("generates random ids with the specified length for items that do not have an id", function () {
    const res = convertCatalog(
      {
        catalog: [
          {
            name: "1",
            type: "group",
            items: [
              {
                name: "2",
                type: "group",
                id: "some-existing-id",
                items: [
                  { type: "csv", name: "csv item", data: "a,b,c\n1,2,3" },
                ],
              },
            ],
          },
        ],
      },
      { generateIds: true, idLength: 10 }
    );
    const catalog: any = res.result?.catalog;
    expect(catalog).toHaveLength(1);
    expect(catalog[0].id).toHaveLength(10);
    expect(catalog[0].members[0].id).toBe("some-existing-id");
    expect(catalog[0].members[0].members[0].id).toHaveLength(10);
    expect(res.messages).toHaveLength(0);
  });

  it("with csvs from GeoRapp WPS service", () => {
    const file = "geo-rapp-wps-csvs";
    const [v7, v8] = ["v7", "v8"].map((folder) =>
      require(`./samples/${folder}/${file}.json`)
    );
    const res = convertCatalog(v7, { copyUnknownProperties: true });
    expect(res.result).toMatchObject(v8);
    expect(
      res.messages.filter(({ severity }) => severity === Severity.Error)
    ).toHaveLength(0);
  });

  it("wms-group", () => {
    const file = "wms-group";
    const [v7, v8] = ["v7", "v8"].map((folder) =>
      require(`./samples/${folder}/${file}.json`)
    );
    const res = convertCatalog(v7, { copyUnknownProperties: true });
    expect(res.result).toMatchObject(v8);
    expect(
      res.messages.filter(({ severity }) => severity === Severity.Error)
    ).toHaveLength(0);
  });

  it("converts the renewable energy csv", function () {
    const v7 = require("./samples/v7/power-generation.json");
    const v8 = require("./samples/v8/power-generation.json");
    const res = convertCatalog(v7);
    expect(res.result).toMatchObject(v8);
    expect(res.messages).toHaveLength(0);
  });
});
