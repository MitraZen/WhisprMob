module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'node_modules/**',
    'android/**',
    'ios/**',
    'builds/**',
    'coverage/**',
    '*.config.js',
    '*.config.ts',
  ],
  rules: {
    // Disable TypeScript-specific rules for JavaScript files
    '@typescript-eslint/no-unused-vars': 'off',
  },
  overrides: [
    {
      // Disable linting for Flow-typed files in node_modules
      files: ['node_modules/**/*.js'],
      rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
  ],
};
