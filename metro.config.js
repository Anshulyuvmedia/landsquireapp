const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

const config = getDefaultConfig(__dirname);

// Add support for NativeWind
const nativeWindConfig = withNativeWind(config, { input: "./app/globals.css" });

// Add support for Reanimated
module.exports = wrapWithReanimatedMetroConfig(nativeWindConfig);