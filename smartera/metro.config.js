const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Exclude test files from Metro bundler
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.blacklistRE = /(.*\/__tests__\/.*|.*\.(test|spec)\.(ts|tsx|js|jsx))$/;

module.exports = config;
