const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Add support for .cjs files
config.resolver.assetExts.push("cjs");

// Disable package exports resolution
config.resolver.unstable_enablePackageExports = false;

// Apply NativeWind plugin with global.css input
module.exports = withNativeWind(config, {
  input: './global.css',
  projectRoot: __dirname,
});