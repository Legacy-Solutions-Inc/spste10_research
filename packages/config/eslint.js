/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: [
    "**/.eslintrc.js",
    "**/dist",
    "**/build",
    "**/.next",
    "**/node_modules",
    "**/.expo",
  ],
  rules: {
    "no-unused-vars": "off", // TypeScript handles this
  },
};

