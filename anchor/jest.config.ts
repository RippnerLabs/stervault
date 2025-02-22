/* eslint-disable */
import { readFileSync } from 'node:fs';
import type { JestConfigWithTsJest } from 'ts-jest';
import path from 'node:path';

// Reading the SWC compilation config and remove the "exclude"
// for the test files to be compiled by SWC
const { exclude: _, ...swcJestConfig } = JSON.parse(
  readFileSync(path.join(__dirname, '.swcrc'), 'utf-8')
);

// disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves.
// If we do not disable this, SWC Core will read .swcrc and won't transform our test files due to "exclude"
if (swcJestConfig.swcrc === undefined) {
  swcJestConfig.swcrc = false;
}

// Uncomment if using global setup/teardown files being transformed via swc
// https://nx.dev/packages/jest/documents/overview#global-setup/teardown-with-nx-libraries
// jest needs EsModule Interop to find the default exported setup/teardown functions
// swcJestConfig.module.noInterop = false;

const config: JestConfigWithTsJest = {
  displayName: 'anchor',
  preset: 'ts-jest',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testEnvironment: 'node',
  coverageDirectory: '../coverage/anchor',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;