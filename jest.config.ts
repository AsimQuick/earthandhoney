/**
 * ---
 * file: jest.config.ts
 * project: earthandhoney
 * purpose: Jest configuration — wires Next.js's SWC-based test transform, jsdom environment, and the '@/*' module alias
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.5
 * ---
 */
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Test discovery is scoped to this project's own source root. The vendored
  // PicPeak fork (US-15 AC-15.6) under vendor/ is upstream's code held
  // verbatim at the pinned commit; its ~100 test suites belong to upstream's
  // tooling, never to ours. This is a positive scope rather than a path
  // blacklist, so no suite of ours can be excluded through it (AC-7.3).
  roots: ['<rootDir>/src'],
  // Keeps jest's module map off the vendored tree (it carries its own
  // package.json files) and keeps upstream source out of our coverage numbers.
  modulePathIgnorePatterns: ['<rootDir>/vendor/'],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/vendor/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
