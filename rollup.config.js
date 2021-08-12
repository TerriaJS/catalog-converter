import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

// import typescript from "@rollup/plugin-typescript";
// import typescript2 from "rollup-plugin-typescript-2";

import camelCase from "lodash.camelcase";
import sourcemaps from "rollup-plugin-sourcemaps";

import pkg from "./package.json";

const libraryName = "catalog-converter";

export default [
  /**
   * I'd prefer if we built it all without tsc, but I went down a rabbit hole of
   * trying to generate an index type file before simply going with
   * rollup-plugin-dts
   */
  {
    input: "dist/types/convert.d.ts",
    output: [{ file: pkg.typings, format: "es" }],
    plugins: [dts()],
  },
  {
    input: `dist/lib/convert.js`,
    output: [
      {
        file: pkg.main,
        name: camelCase(libraryName),
        format: "umd",
        sourcemap: true,
      },
      { file: pkg.module, format: "es", sourcemap: true },
    ],
    // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
    external: [],
    watch: {
      include: "src/**",
    },
    plugins: [
      // Allow json resolution
      json(),
      // Allow node_modules resolution, so you can use 'external' to control
      // which external modules to include in the bundle
      // https://github.com/rollup/rollup-plugin-node-resolve#usage
      resolve(),
      // Compile TypeScript files
      // typescript(),
      // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
      commonjs(),

      // Resolve source maps to the original source
      sourcemaps(),
    ],
  },
];
