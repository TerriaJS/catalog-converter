import fs from "fs";
import json5 from "json5";
import _ from "lodash";
import yargs from "yargs";
import { convertCatalog } from "./convert";
import { DEFAULT_ID_LENGTH } from "./converters/generateRandomId";
import {
  foldMessage,
  getUnknownPropDetails,
  getUnknownTypeDetails,
  InputNotPlainObject,
  Message,
  MissingRequiredProp,
  Severity,
  UnknownProp,
  UnknownType,
} from "./Message";
// import "core-js/features/object";

const argv = yargs
  .usage("Usage: $0 source [destination] [options]")
  .demandCommand(1)
  .option("u", {
    alias: "copyUnknownProperties",
    type: "boolean",
    default: false,
    description: "Copy unknown properties",
  })
  .option("a", {
    alias: "aggregate-stats",
    type: "boolean",
    default: false,
    description: "Aggregate error and warning statistics",
  })
  .option("p", {
    alias: "noprint-all", // yargs doesn't parse properly when this has 2 dashes in the alias name
    type: "boolean",
    default: false,
    description: "Disable printing every error and warning",
  })
  .option("g", {
    alias: "generate-random-ids",
    type: "boolean",
    default: true,
    description:
      "Generate random IDs for each item in the catalog. If the item already has an ID then it is retained.",
  })
  .option("l", {
    alias: "id-length",
    type: "number",
    default: DEFAULT_ID_LENGTH,
    description: "Length of the generated random IDs",
  })
  .help().argv;

const json = json5.parse(fs.readFileSync(argv._[0], { encoding: "utf-8" }));
const res = convertCatalog(json, {
  copyUnknownProperties: argv.u,
  generateIds: argv.g,
  idLength: argv.l,
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

if (!argv.p) {
  errors.forEach(({ message, path }) => {
    console.error(
      `Error: ${message}\n  in ${path.reverse().join("\n     ")}\n`
    );
  });
  warnings.forEach(({ message, path }) => {
    console.warn(
      `Warning: ${message}\n  in ${path.reverse().join("\n     ")}\n`
    );
  });
}

function partitionMessages(
  messsages: Message[]
): {
  unknownProps: UnknownProp[];
  missingRequiredProps: MissingRequiredProp[];
  unknownTypes: UnknownType[];
  inputNotPlainObjects: InputNotPlainObject[];
} {
  const result: ReturnType<typeof partitionMessages> = {
    unknownProps: [],
    missingRequiredProps: [],
    unknownTypes: [],
    inputNotPlainObjects: [],
  };
  messsages.forEach(
    foldMessage({
      isUnknownProp: (m) => result.unknownProps.push(m),
      isMissingRequiredProp: (m) => result.missingRequiredProps.push(m),
      isUnknownType: (m) => result.unknownTypes.push(m),
      isInputNotPlainObject: (m) => result.inputNotPlainObjects.push(m),
    })
  );
  return result;
}

function countMessages(
  messages: Message[]
): {
  unknownProps: number;
  missingRequiredProps: number;
  unknownTypes: number;
  inputNotPlainObjects: number;
} {
  const result: ReturnType<typeof countMessages> = {
    unknownProps: 0,
    missingRequiredProps: 0,
    unknownTypes: 0,
    inputNotPlainObjects: 0,
  };
  messages.forEach(
    foldMessage({
      isUnknownProp: () => result.unknownProps++,
      isMissingRequiredProp: () => result.missingRequiredProps++,
      isUnknownType: () => result.unknownTypes++,
      isInputNotPlainObject: () => result.inputNotPlainObjects++,
    })
  );
  return result;
}

if (argv.a) {
  console.error(
    "Error stats:\n" + JSON.stringify(countMessages(errors), null, 2)
  );
  console.warn(
    "Warning stats:\n" + JSON.stringify(countMessages(warnings), null, 2)
  );
  const partitionedErrors = partitionMessages(errors);
  const partitionedWarnings = partitionMessages(warnings);

  console.error(
    "Unknown types: " +
      JSON.stringify(
        _.countBy(
          partitionedErrors.unknownTypes,
          (m) => getUnknownTypeDetails(m).type
        ),
        null,
        2
      )
  );
  let unknownPropsByTypeObject: { [k: string]: { [k2: string]: number } } = {};
  partitionedWarnings.unknownProps
    .map((m) => getUnknownPropDetails(m))
    .reduce((o, { modelType, property }) => {
      const byModel = o[modelType] || {};
      return Object.assign(o, {
        [modelType]: Object.assign(byModel, {
          [property]: (byModel[property] || 0) + 1,
        }),
      });
    }, unknownPropsByTypeObject);

  console.error(
    "Unknown properties: " + JSON.stringify(unknownPropsByTypeObject, null, 2)
  );
}
