import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import localResolve from "rollup-plugin-local-resolve";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import postcss from "rollup-plugin-postcss";

import pkg from "./package.json";

const rollupConfig = {
  input: "src/index.js",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      exports: "named",
      sourcemap: true,
      strict: false,
    },
    {
      file: pkg.module,
      format: "esm",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    postcss({
      plugins: [],
      minimize: true,
      sourceMap: "inline",
    }),
    localResolve(),
    resolve({
      extensions: [".js", ".jsx"],
    }),
    babel({
      presets: ["react-app"],
      babelHelpers: "runtime",
      exclude: "node_modules/**",
    }),
    commonjs(),
    // pluginSyntaxJSX(),
  ],
};

export default rollupConfig;
