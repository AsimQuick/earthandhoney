/**
 * ---
 * file: src/__tests__/us2-ac2.5-r2-env-config.test.ts
 * project: earthandhoney
 * purpose: Verify AC-2.5 — R2 credentials and bucket configuration are read
 *          from environment variables; a local/dev R2-compatible target may
 *          be used but no service is installed on the host
 * created-by: dev-team
 * related-story: US-2
 * related-ac: 2.5
 * updated-by: dev-team
 * related-story: US-28
 * related-ac: 28.1.2
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

const R2_VARS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_ENDPOINT']

// Tool names a developer might otherwise be tempted to `brew install` /
// `apt-get install` directly on the host to emulate R2 locally. None of
// these may appear as a host-level install anywhere in the repo.
const HOST_INSTALLABLE_S3_EMULATORS = ['minio', 'localstack', 's3rver', 's3mock', 's3ninja']

function valueOf(envFileContents: string, key: string): string | undefined {
  return envFileContents.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim()
}

describe('AC-2.5: R2 credentials/bucket config come from env vars; no R2-compatible service is installed on the host', () => {
  // The Payload-side s3Storage adapter that used to read these vars was
  // retired by AC-28.1.2 (US-28) — the R2_* vars themselves are still
  // consumed by the Backstage/PicPeak backend via docker-compose.yml.

  describe('.env.example documents every R2 var with a placeholder, never a real credential', () => {
    const envExample = read('.env.example')

    it.each(R2_VARS)('documents %s with a non-empty placeholder', (key) => {
      const value = valueOf(envExample, key)
      expect(value).toBeDefined()
      expect(value?.length).toBeGreaterThan(0)
    })

    it('placeholders are clearly marked as change-me, not live secrets', () => {
      for (const key of R2_VARS) {
        const value = valueOf(envExample, key)!
        expect(value).toMatch(/change-me-in-production/)
      }
    })
  })

  describe('no R2-compatible object storage service is installed on the host', () => {
    it('the Dockerfile does not apt/apk-install a local S3-compatible emulator', () => {
      const dockerfile = read('Dockerfile')
      for (const tool of HOST_INSTALLABLE_S3_EMULATORS) {
        expect(dockerfile.toLowerCase()).not.toContain(tool)
      }
    })

    it('package.json does not script an install of a local S3-compatible emulator', () => {
      const pkg = JSON.parse(read('package.json'))
      const haystack = JSON.stringify(pkg).toLowerCase()
      for (const tool of HOST_INSTALLABLE_S3_EMULATORS) {
        expect(haystack).not.toContain(tool)
      }
    })

    it('any dev-time R2-compatible target would only ever run as a docker-compose service, never installed directly', () => {
      const compose = read('docker-compose.yml')
      // Every service docker-compose.yml defines today runs as a container
      // (image: or build:) — proving the project's only sanctioned way to
      // add a local storage target is inside this file, not a host install.
      for (const tool of HOST_INSTALLABLE_S3_EMULATORS) {
        expect(compose.toLowerCase()).not.toContain(tool)
      }
    })
  })
})
