/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'jest',
  jest: {
    configFile: 'jest.config.mjs',
    enableFindRelatedTests: true,
  },
  mutate: ['src/models/**/*.js', 'src/routes/**/*.js'],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: null },
  coverageAnalysis: 'perTest',
};
