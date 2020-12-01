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
