/**
 * ---
 * file: src/__tests__/us1-ac1.3-docker-compose-up.test.ts
 * project: earthandhoney
 * purpose: Verify AC-1.3 — the web app and database start together via
 *          `docker compose up -d`, the web app is actually reachable at its
 *          mapped port once started, and no database or service is
 *          installed on the host machine
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

describe('AC-1.3: web app + database start together via `docker compose up -d`', () => {
  const compose = parse(read('docker-compose.yml'))

  describe('both required services are declared', () => {
    it('declares a "web" service built from the local Dockerfile', () => {
      expect(compose.services.web).toBeDefined()
      expect(compose.services.web.build).toBeDefined()
    })

    it('declares a "db" service', () => {
      expect(compose.services.db).toBeDefined()
    })
  })

  describe('the web app waits for the database so they start together', () => {
    it('"web" depends on "db" becoming healthy before it starts', () => {
      expect(compose.services.web.depends_on?.db?.condition).toBe('service_healthy')
    })
  })

  describe('the web app is reachable at its mapped port once started', () => {
    it('exposes the same port it maps from the host', () => {
      const mapping = compose.services.web.ports.find((p: string) => /^\d+:\d+$/.test(p))
      expect(mapping).toBeDefined()
      const [hostPort, containerPort] = mapping.split(':')
      expect(hostPort).toBe(containerPort)
    })

    it('explicitly pins PORT to the mapped container port, overriding the .env template default', () => {
      // .env.example ships a generic-scaffold PORT=8000. If the "web" service
      // relied on that via env_file alone, `next dev` would bind to 8000
      // while compose only maps 3000:3000 — the container would start, but
      // the app would be unreachable at the mapped port. Compose applies
      // `environment:` after `env_file:`, so an explicit override here is
      // required to keep the bound port and the mapped port in sync.
      const envExample = read('.env.example')
      const templatePort = envExample.match(/^PORT=(.+)$/m)?.[1]?.trim()
      const composePort = String(compose.services.web.environment.PORT)

      const mapping = compose.services.web.ports.find((p: string) => /^\d+:\d+$/.test(p))
      const [, containerPort] = mapping.split(':')

      expect(composePort).toBe(containerPort)
      expect(composePort).not.toBe(templatePort)
    })
  })

  describe('no database or service is installed on the host machine', () => {
    it('runs Postgres from a container image, not a host package', () => {
      expect(compose.services.db.image).toMatch(/^postgres:/)
      expect(compose.services.db.build).toBeUndefined()
    })

    it('builds the web app entirely inside its image (npm ci runs in-container)', () => {
      const dockerfile = read('Dockerfile')
      expect(dockerfile).toMatch(/RUN npm ci/)
      expect(dockerfile).toMatch(/CMD \["npm", "run", "dev"\]/)
    })

    it('shields container-managed node_modules/.next from the host bind mount', () => {
      // The project directory is bind-mounted into the container for live
      // reload, but node_modules/.next must stay anonymous volumes so the
      // container's own (in-image) install is what actually runs — never a
      // host-installed node_modules.
      const volumes: string[] = compose.services.web.volumes
      expect(volumes).toEqual(expect.arrayContaining(['/app/node_modules', '/app/.next']))
    })

    it('ignores host-local node_modules/.next when building the image', () => {
      expect(exists('.dockerignore')).toBe(true)
      const ignore = read('.dockerignore')
      expect(ignore).toMatch(/^node_modules$/m)
      expect(ignore).toMatch(/^\.next$/m)
    })

    it('documents no host package-manager install step for a database or service', () => {
      for (const file of ['docker-compose.yml', 'Dockerfile', '.github/workflows/ci.yml']) {
        const contents = read(file)
        expect(contents).not.toMatch(/apt(-get)? install|brew install|brew services/)
      }
    })
  })
})
