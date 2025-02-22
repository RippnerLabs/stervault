export default {
  displayName: 'anchor',
  preset: '../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest'],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  testEnvironment: '',
  coverageDirectory: '../coverage/anchor',
};