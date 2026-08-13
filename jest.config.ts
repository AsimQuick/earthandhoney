/**
 * ---
 * file: jest.config.ts
 * project: earthandhoney
 * purpose: Jest configuration — wires Next.js's SWC-based test transform, jsdom
 *          environment, the '@/*' module alias, and (US-30 AC-30.2) the
 *          `unit`/`live` project split decided in AC-30.1. Lane membership is
 *          read from the single committed manifest, TEST_LANE_INVENTORY.json,
 *          never hard-coded here — the `unit` project runs everything except
 *          the manifest's LIVE suites at Jest's default parallelism; the
 *          `live` project matches only those suites, for AC-30.3 to run
 *          `--runInBand`.
 * created-by: dev-team
 * related-story: US-1, US-30
 * related-ac: 1.5, 30.2
 * ---
 */
import type { Config } from 'jest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

interface LaneInventory {
  suites: Array<{ path: string; lane: 'UNIT' | 'LIVE' }>
}

const inventory: LaneInventory = JSON.parse(
  readFileSync(path.join(__dirname, 'TEST_LANE_INVENTORY.json'), 'utf-8'),
)

const liveSuitePaths = inventory.suites
  .filter((suite) => suite.lane === 'LIVE')
  .map((suite) => `<rootDir>/${suite.path}`)

const sharedProjectConfig: Config = {
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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

const unitProjectConfig: Config = {
  ...sharedProjectConfig,
  displayName: 'unit',
  // No worker-count or band-mode override here: this is the point of
  // AC-30.2 — the unit project runs at Jest's default parallelism.
  testPathIgnorePatterns: liveSuitePaths,
}

const liveProjectConfig: Config = {
  ...sharedProjectConfig,
  displayName: 'live',
  testMatch: liveSuitePaths,
}

const resolveConfig = async (): Promise<Config> => ({
  coverageProvider: 'v8',
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/vendor/'],
  projects: [await createJestConfig(unitProjectConfig)(), await createJestConfig(liveProjectConfig)()],
})

export default resolveConfig
