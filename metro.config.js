const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for web
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

// Support for shared code between web and native
config.resolver.alias = {
  '@': './client/src',
  '@assets': './attached_assets',
  '@components': './client/src/components',
  '@pages': './client/src/pages',
  '@lib': './client/src/lib',
  '@hooks': './client/src/hooks',
};

module.exports = config;