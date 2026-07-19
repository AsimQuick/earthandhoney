/**
 * ---
 * file: src/__tests__/us1-ac1.1-payload-admin.test.ts
 * project: earthandhoney
 * purpose: Verify AC-1.1 — Payload CMS is integrated into the Next.js App Router
 *          and its admin panel is reachable at /admin when the stack is running
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import fs from 'fs'
import path from 'path'

import { Users } from '@/collections/Users'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const ADMIN_ROUTE = 'src/app/(payload)/admin/[[...segments]]/page.tsx'
const PAYLOAD_LAYOUT = 'src/app/(payload)/layout.tsx'
const PAYLOAD_CONFIG = 'src/payload.config.ts'
const NEXT_CONFIG = 'next.config.ts'

describe('AC-1.1: Payload CMS integrated into Next.js App Router', () => {
  describe('Next.js is wired to Payload', () => {
    it('wraps the Next.js config with withPayload', () => {
      const src = read(NEXT_CONFIG)
      expect(src).toMatch(/from ["']@payloadcms\/next\/withPayload["']/)
      expect(src).toMatch(/withPayload\(/)
      expect(src).toMatch(/export default withPayload/)
    })

    it('exposes the @payload-config path alias in tsconfig', () => {
      const tsconfig = JSON.parse(read('tsconfig.json'))
      expect(tsconfig.compilerOptions.paths['@payload-config']).toEqual([
        './src/payload.config.ts',
      ])
    })
  })

  describe('Payload config exists and wires the admin panel', () => {
    it('has a payload.config.ts at the aliased location', () => {
      expect(exists(PAYLOAD_CONFIG)).toBe(true)
    })

    it('builds the config via buildConfig', () => {
      const src = read(PAYLOAD_CONFIG)
      expect(src).toMatch(/from ["']payload["']/)
      expect(src).toMatch(/buildConfig\(/)
    })

    it('wires the admin panel to the users auth collection', () => {
      const src = read(PAYLOAD_CONFIG)
      expect(src).toMatch(/admin:\s*{/)
      expect(src).toMatch(/user:\s*Users\.slug/)
    })

    it('registers the Users collection and a database adapter', () => {
      const src = read(PAYLOAD_CONFIG)
      expect(src).toMatch(/collections:\s*\[[^\]]*Users/)
      expect(src).toMatch(/postgresAdapter\(/)
    })

    it('reads the Payload secret from an environment variable', () => {
      const src = read(PAYLOAD_CONFIG)
      expect(src).toMatch(/process\.env\.PAYLOAD_SECRET/)
    })
  })

  describe('Users auth collection backs /admin login', () => {
    it('is an auth-enabled collection with slug "users"', () => {
      expect(Users.slug).toBe('users')
      expect(Users.auth).toBe(true)
    })
  })

  describe('Admin panel is reachable at /admin', () => {
    it('provides a catch-all admin route under the (payload) group', () => {
      expect(exists(ADMIN_ROUTE)).toBe(true)
    })

    it('renders the Payload admin UI via RootPage from @payloadcms/next/views', () => {
      const src = read(ADMIN_ROUTE)
      expect(src).toMatch(/from ["']@payloadcms\/next\/views["']/)
      expect(src).toMatch(/RootPage/)
      expect(src).toMatch(/config/)
    })

    it('mounts Payload’s RootLayout for the admin route group', () => {
      const src = read(PAYLOAD_LAYOUT)
      expect(src).toMatch(/from ["']@payloadcms\/next\/layouts["']/)
      expect(src).toMatch(/RootLayout/)
      expect(src).toMatch(/@payload-config/)
    })
  })

  describe('Payload API routes are mounted for the admin panel', () => {
    it('exposes the REST API catch-all route', () => {
      const rest = 'src/app/(payload)/api/[...slug]/route.ts'
      expect(exists(rest)).toBe(true)
      expect(read(rest)).toMatch(/from ["']@payloadcms\/next\/routes["']/)
    })

    it('exposes the GraphQL API route', () => {
      expect(exists('src/app/(payload)/api/graphql/route.ts')).toBe(true)
    })
  })

  describe('Public and admin route groups are kept separate', () => {
    it('keeps a (frontend) group distinct from the (payload) admin group', () => {
      expect(exists('src/app/(frontend)/layout.tsx')).toBe(true)
      expect(exists(PAYLOAD_LAYOUT)).toBe(true)
    })
  })
})
