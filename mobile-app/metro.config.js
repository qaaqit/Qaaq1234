const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for vector icons
config.resolver.alias = {
  '@': './src',
};

module.exports = config;