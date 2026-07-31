/**
 * ---
 * file: src/__tests__/us16-ac16.1-backstage-docker-services.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.1 — the forked Backstage (vendor/picpeak), its
 *          database, and any worker/cache component it requires all run as
 *          services defined in docker-compose.yml, nothing is installed on
 *          the host machine, and services address each other by Docker
 *          network hostname rather than localhost
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.1
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-16.1: Backstage runs entirely as docker-compose services', () => {
  const compose = parse(read('docker-compose.yml'))

  describe('Backstage and its database are declared as services', () => {
    it('declares a "backstage-backend" service built from the vendored fork, not a pulled upstream image', () => {
      expect(compose.services['backstage-backend']).toBeDefined()
      expect(compose.services['backstage-backend'].build?.context).toBe('./vendor/picpeak/backend')
      expect(compose.services['backstage-backend'].image).toBeUndefined()
    })

    it('declares a "backstage-frontend" service built from the vendored fork', () => {
      expect(compose.services['backstage-frontend']).toBeDefined()
      expect(compose.services['backstage-frontend'].build?.context).toBe('./vendor/picpeak/frontend')
      expect(compose.services['backstage-frontend'].image).toBeUndefined()
    })

    it('declares a dedicated "backstage-db" service, kept separate from the app\'s own "db"', () => {
      expect(compose.services['backstage-db']).toBeDefined()
      expect(compose.services['db']).toBeDefined()
      expect(compose.services['backstage-db']).not.toBe(compose.services['db'])
    })
  })

  describe('no worker or cache component the backend actually requires is left undeclared', () => {
    // The vendored backend has no redis/ioredis/bull dependency — Redis only
    // appears in code comments ("in production, consider Redis") and its
    // background jobs run via node-cron in-process. Asserting the absence of
    // a redis dependency here is what justifies not declaring a redis
    // service: if this ever changes upstream, this test starts failing and
    // flags that a cache/worker service is now required but missing.
    it('confirms the vendored backend has no redis/queue client dependency', () => {
      const pkg = JSON.parse(read('vendor/picpeak/backend/package.json'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      expect(Object.keys(deps).some((d) => /redis|ioredis|bull/i.test(d))).toBe(false)
    })

    it('confirms background scheduling runs in-process (node-cron), not as a separate worker service', () => {
      const pkg = JSON.parse(read('vendor/picpeak/backend/package.json'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      expect(deps['node-cron']).toBeDefined()
    })
  })

  describe('Backstage waits for its database so they start together', () => {
    it('"backstage-backend" depends on "backstage-db" becoming healthy before it starts', () => {
      expect(compose.services['backstage-backend'].depends_on?.['backstage-db']?.condition).toBe(
        'service_healthy',
      )
    })

    it('"backstage-frontend" depends on "backstage-backend" becoming healthy before it starts', () => {
      expect(compose.services['backstage-frontend'].depends_on?.['backstage-backend']?.condition).toBe(
        'service_healthy',
      )
    })

    it('"backstage-db" declares a healthcheck so the depends_on condition can resolve', () => {
      expect(compose.services['backstage-db'].healthcheck?.test).toBeDefined()
    })
  })

  describe('services address each other by Docker network hostname, not localhost', () => {
    it('the backend connects to its database via the "backstage-db" service hostname', () => {
      expect(compose.services['backstage-backend'].environment.DB_HOST).toBe('backstage-db')
    })

    it('exposes the backend under the "backend" alias the vendored nginx.conf proxies to', () => {
      // vendor/picpeak/frontend/nginx.conf hardcodes `proxy_pass
      // http://backend:3000` and resolves it through Docker DNS at request
      // time. Our service is named "backstage-backend", so the alias is what
      // makes frontend → backend resolution work by network hostname without
      // editing the vendored config.
      const nginxConf = read('vendor/picpeak/frontend/nginx.conf')
      expect(nginxConf).toMatch(/set \$backend_upstream backend;/)
      expect(compose.services['backstage-backend'].networks?.default?.aliases).toEqual(
        expect.arrayContaining(['backend']),
      )
    })

    it('no service-to-service environment value routes through localhost or 127.0.0.1', () => {
      for (const name of ['backstage-backend', 'backstage-frontend', 'backstage-db']) {
        const env = compose.services[name].environment ?? {}
        for (const value of Object.values(env)) {
          expect(String(value)).not.toMatch(/localhost|127\.0\.0\.1/)
        }
      }
    })
  })

  describe('no database or service is installed on the host machine', () => {
    it('runs the Backstage database from a container image, not a host package', () => {
      expect(compose.services['backstage-db'].image).toMatch(/^postgres:/)
      expect(compose.services['backstage-db'].build).toBeUndefined()
    })

    it('builds the Backstage backend and frontend entirely inside their own vendored Dockerfiles', () => {
      expect(fs.existsSync(path.join(root, 'vendor/picpeak/backend/Dockerfile'))).toBe(true)
      expect(fs.existsSync(path.join(root, 'vendor/picpeak/frontend/Dockerfile'))).toBe(true)
    })

    it('documents no host package-manager install step for Backstage or its database', () => {
      const contents = read('docker-compose.yml')
      expect(contents).not.toMatch(/apt(-get)? install|brew install|brew services/)
    })
  })

  describe('a named volume persists the Backstage database independently of the app database', () => {
    it('declares "backstage_pgdata" as its own top-level volume', () => {
      expect(compose.volumes).toHaveProperty('backstage_pgdata')
      expect(compose.services['backstage-db'].volumes).toEqual(
        expect.arrayContaining(['backstage_pgdata:/var/lib/postgresql/data']),
      )
    })
  })
})
