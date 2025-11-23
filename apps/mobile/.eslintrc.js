const baseConfig = require("@repo/config/eslint.js");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...baseConfig,
  env: {
    ...baseConfig.env,
    "react-native/react-native": true,
  },
};

