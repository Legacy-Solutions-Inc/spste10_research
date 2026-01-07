const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure proper resolution for monorepo
config.watchFolders = [
  path.resolve(__dirname, '../../node_modules'),
  path.resolve(__dirname, '../..'),
];

config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(__dirname, '../../node_modules'),
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });