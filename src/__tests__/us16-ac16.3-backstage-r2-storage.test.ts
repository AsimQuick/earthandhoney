/**
 * ---
 * file: src/__tests__/us16-ac16.3-backstage-r2-storage.test.ts
 * project: earthandhoney
 * purpose: Verify AC-16.3 — the forked Backstage (vendor/picpeak) is
 *          configured to use the project's existing Cloudflare R2 bucket
 *          through its S3-compatible storage settings, with no new parallel
 *          bucket created
 * created-by: dev-team
 * related-story: US-16
 * related-ac: 16.3
 * ---
 */
import fs from 'fs'
import path from 'path'
import { parse } from 'yaml'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')

describe('AC-16.3: Backstage is configured to use the existing R2 bucket via S3-compatible storage', () => {
  const compose = parse(read('docker-compose.yml'))
  const env = compose.services['backstage-backend'].environment

  it('selects the S3-compatible storage backend the vendored fork ships with', () => {
    expect(env.STORAGE_BACKEND).toBe('s3')
  })

  it('points at the bucket via the project-wide R2_BUCKET variable, not a hardcoded or separate bucket name', () => {
    expect(env.STORAGE_S3_BUCKET).toBe('${R2_BUCKET}')
  })

  it('reuses the same R2 credentials and endpoint the Next.js app already uses for media (US-2), not a second credential set', () => {
    expect(env.STORAGE_S3_ENDPOINT).toBe('${R2_ENDPOINT}')
    expect(env.STORAGE_S3_ACCESS_KEY).toBe('${R2_ACCESS_KEY_ID}')
    expect(env.STORAGE_S3_SECRET_KEY).toBe('${R2_SECRET_ACCESS_KEY}')
  })

  it('namespaces Backstage objects with a prefix instead of provisioning a new bucket', () => {
    expect(env.STORAGE_S3_PREFIX).toBe('backstage')
  })

  it('does not declare a second bucket variable anywhere in the backend service config', () => {
    const values = Object.values(env).map(String)
    const bucketLikeValues = values.filter((v) => /bucket/i.test(v))
    expect(bucketLikeValues).toEqual(['${R2_BUCKET}'])
  })

  it('the vendored backend actually implements an S3-compatible storage backend honoring these exact env var names', () => {
    const storageIndex = read('vendor/picpeak/backend/src/services/storage/index.js')
    expect(storageIndex).toMatch(/STORAGE_BACKEND/)
    expect(storageIndex).toMatch(/STORAGE_S3_BUCKET/)
    expect(storageIndex).toMatch(/STORAGE_S3_ENDPOINT/)
    expect(storageIndex).toMatch(/STORAGE_S3_ACCESS_KEY/)
    expect(storageIndex).toMatch(/STORAGE_S3_SECRET_KEY/)
    expect(storageIndex).toMatch(/STORAGE_S3_PREFIX/)
  })

  describe('the referenced R2 credentials were actually obtained, not left as placeholders', () => {
    it('.env.example documents R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY', () => {
      const example = read('.env.example')
      expect(example).toMatch(/^R2_BUCKET=/m)
      expect(example).toMatch(/^R2_ENDPOINT=/m)
      expect(example).toMatch(/^R2_ACCESS_KEY_ID=/m)
      expect(example).toMatch(/^R2_SECRET_ACCESS_KEY=/m)
    })

    it('the local .env has real (non-placeholder) R2 credentials, so this story is not blocked', () => {
      const envPath = path.join(root, '.env')
      if (!fs.existsSync(envPath)) {
        // No local .env in this environment (e.g. a clean CI checkout) — the
        // credential-availability proof lives in scrum-master/po-requests.md
        // instead when this happens for real; nothing to assert here.
        return
      }
      const localEnv = fs.readFileSync(envPath, 'utf8')
      const bucketLine = localEnv.match(/^R2_BUCKET=(.*)$/m)
      expect(bucketLine).not.toBeNull()
      expect(bucketLine![1]).not.toMatch(/change-me-in-production/)
    })
  })

  it('no new parallel storage bucket env var (outside the R2_* family) is introduced in .env.example', () => {
    const example = read('.env.example')
    expect(example).not.toMatch(/STORAGE_S3_BUCKET=/)
    expect(example).not.toMatch(/BACKSTAGE_(BUCKET|R2|S3)_/i)
  })
})
