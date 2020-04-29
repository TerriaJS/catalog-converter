import yargs from "yargs";
import fs from "fs";
import { convertCatalog, Severity } from "./catalog-converter";

const argv = yargs
  .usage("Usage: $0 source [destination] [options]")
  .demandCommand(1)
  .boolean("copyUnknownProperties")
  .alias("u", "copyUnknownProperties")
  .default("copyUnknownProperties", false)
  .help().argv;

const json = JSON.parse(fs.readFileSync(argv._[0], { encoding: "utf-8" }));
const res = convertCatalog(json, {
  copyUnknownProperties: argv.copyUnknownProperties,
});
const errors = res.messages.filter((mes) => mes.severity === Severity.Error);
const warnings = res.messages.filter(
  (mes) => mes.severity === Severity.Warning
);
const success = res.result !== null;
console.log(
  `${success ? "Succeeded" : "Failed"} with ${errors.length} errors and ${
    warnings.length
  } warnings`
);
if (success) {
  const output = JSON.stringify(res.result, null, 2);
  if (argv._[1]) {
    fs.writeFileSync(argv._[1], output);
  } else {
    console.log(output);
  }
}
errors.forEach(({ message, path }) => {
  console.error(`${message}\n    @ ${path.join("\n      ")}\n`);
});
warnings.forEach(({ message, path }) => {
  console.warn(`${message}\n    @ ${path.join("\n      ")}\n`);
});
