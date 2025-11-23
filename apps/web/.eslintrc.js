const baseConfig = require("@repo/config/eslint.js");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...baseConfig,
  extends: [...baseConfig.extends, "next/core-web-vitals"],
};

