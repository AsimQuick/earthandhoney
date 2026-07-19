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
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default createJestConfig(config)
