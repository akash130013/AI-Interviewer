const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// React Native 0.76+ uses private class fields (#field) in its own source.
// Metro must transpile these packages, not skip them.
const packagesToTranspile = [
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  '@expo',
  'react-native-gesture-handler',
  '@react-navigation',
  'react-native-screens',
  'react-native-safe-area-context',
];

config.resolver.sourceExts = [
  ...new Set([...config.resolver.sourceExts, 'mjs', 'cjs']),
];

config.transformer.transformIgnorePatterns = [
  `node_modules/(?!(${packagesToTranspile.join('|')})/)`,
];

module.exports = config;
