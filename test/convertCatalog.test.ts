const { readFileSync } = require("fs");
const path = require("path");

import { convertCatalog, Severity } from "../src/catalog-converter";

describe("Test convertCatalog", () => {
  // Test samples
  const fullJsonTests = ["empty-catalog"];
  it.each(fullJsonTests)(
    "Test convertCatalog on successful sample files",
    (file) => {
      const [v7, v8] = ["v7", "v8"].map((folder) =>
        JSON.parse(
          readFileSync(
            path.join(__dirname, "samples", folder, file + ".json"),
            {
              encoding: "utf-8",
            }
          )
        )
      );
      const res = convertCatalog(v7);
      expect(res.result).toMatchObject(v8);
      expect(res.messages).toHaveLength(0);
    }
  );

  const fullJsonWithUnknownPropsTests = ["spc-csvs"];

  it.each(fullJsonWithUnknownPropsTests)(
    "Test convertCatalog with unknown properties",
    (file) => {
      const [v7, v8] = ["v7", "v8"].map((folder) =>
        JSON.parse(
          readFileSync(
            path.join(__dirname, "samples", folder, file + ".json"),
            {
              encoding: "utf-8",
            }
          )
        )
      );
      const res = convertCatalog(v7, { copyUnknownProperties: true });
      expect(res.result).toMatchObject(v8);
      expect(
        res.messages.filter(({ severity }) => severity === Severity.Error)
      ).toHaveLength(0);
    }
  );
});
