const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/screens': path.resolve(__dirname, 'src/screens'),
      '@/services': path.resolve(__dirname, 'src/services'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/types': path.resolve(__dirname, 'src/types'),
      '@/store': path.resolve(__dirname, 'src/store'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/navigation': path.resolve(__dirname, 'src/navigation'),
    },
    blockList: [
      /node_modules\/.*\/node_modules\/react-native\/.*/,
      /android\/.*\/build\/.*/,
      /android\/app\/build\/.*/,
      /android\/build\/.*/,
      /\.cxx\/.*/,
    ],
  },
  transformer: {
    hermesParser: true,
    unstable_allowRequireContext: true,
  },
  resetCache: true,
  watchFolders: [
    path.resolve(__dirname, 'src'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);