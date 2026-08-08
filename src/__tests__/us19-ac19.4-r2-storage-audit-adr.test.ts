/**
 * ---
 * file: src/__tests__/us19-ac19.4-r2-storage-audit-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-19.4 — R2_STORAGE_AND_DELIVERY_ADR.md exists and records
 *          the audit of the existing R2 setup (bucket in use, least-privilege
 *          permissions, browser upload restriction, lifecycle rules, and
 *          public-vs-private paths). Cross-checks every citation the ADR
 *          makes against the actual vendored PicPeak source and project
 *          config so the claims are evidence, not assertion.
 * created-by: dev-team
 * related-story: US-19
 * related-ac: 19.4
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'R2_STORAGE_AND_DELIVERY_ADR.md'

describe('AC-19.4: R2_STORAGE_AND_DELIVERY_ADR.md documents the audit of the existing R2 setup', () => {
  it('R2_STORAGE_AND_DELIVERY_ADR.md exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header required for every code/doc file', () => {
    expect(doc).toMatch(/file:\s*R2_STORAGE_AND_DELIVERY_ADR\.md/)
    expect(doc).toMatch(/related-story:\s*US-19/)
    expect(doc).toMatch(/related-ac:\s*19\.4/)
  })

  it('grounds the audit in evidence from a live read-only run against the actual bucket, not just static code reading', () => {
    expect(doc).toMatch(/aws s3api/)
    expect(doc).toMatch(/read-only/i)
  })

  describe('1. which bucket is in use', () => {
    it('states the answer: a single bucket, earthandhoney', () => {
      expect(doc).toMatch(/single bucket,?\s*`earthandhoney`/i)
    })

    it('cites payload.config.ts for reading the bucket name from an env var, never hardcoded (historical: that Payload-side adapter was retired by AC-28.1.2)', () => {
      expect(doc).toMatch(/payload\.config\.ts:63/)
    })

    it('cites docker-compose.yml for Backstage reusing the same bucket via a prefix, not a second bucket', () => {
      expect(doc).toMatch(/docker-compose\.yml:102,107/)
      const compose = read('docker-compose.yml')
      expect(compose).toMatch(/STORAGE_S3_BUCKET:\s*\$\{R2_BUCKET\}/)
      expect(compose).toMatch(/STORAGE_S3_PREFIX:\s*backstage/)
    })

    it('records that live evidence shows objects exist only under the backstage/ prefix, confirming Payload\'s parallel config is unused in practice', () => {
      expect(doc).toMatch(/backstage\/events\//)
      expect(doc).toMatch(/backstage\/thumbnails\//)
      expect(doc).toMatch(/[Zz]ero objects exist outside that prefix/)
    })
  })

  describe('2. least-privilege permissions', () => {
    it('cites the storage command surface the code actually needs (object read/write/delete/list/copy/multipart)', () => {
      const s3StorageSrc = read('vendor/picpeak/backend/src/services/storage/s3Storage.js')
      expect(s3StorageSrc).toMatch(/GetObjectCommand/)
      expect(s3StorageSrc).toMatch(/PutObjectCommand/)
      expect(s3StorageSrc).toMatch(/DeleteObjectCommand/)
      expect(s3StorageSrc).toMatch(/ListObjectsV2Command/)
    })

    it('cites archiveService.js delete calls as evidence delete is genuinely exercised', () => {
      expect(doc).toMatch(/archiveService\.js:166,178,181,186,190/)
      const src = read('vendor/picpeak/backend/src/services/archiveService.js')
      expect(src).toMatch(/storage\.delete\(entry\.key\)/)
    })

    it('states no bucket-admin operation is ever called anywhere in the codebase', () => {
      for (const rel of [
        'vendor/picpeak/backend/src/services/storage/s3Storage.js',
        'vendor/picpeak/backend/src/services/storage/S3StorageBackend.js',
      ]) {
        const src = read(rel)
        expect(src).not.toMatch(/CreateBucketCommand|DeleteBucketCommand|PutBucketPolicyCommand|PutBucketCorsCommand/)
      }
    })

    it('records the live ListBuckets finding used as least-privilege evidence', () => {
      expect(doc).toMatch(/list-buckets/)
      expect(doc).toMatch(/bucket[- ]scoped/i)
    })

    it('flags the permission-tier question as an open item needing human/dashboard confirmation, since R2 does not implement GetBucketPolicy', () => {
      expect(doc).toMatch(/GetBucketPolicy not implemented/)
      expect(doc).toMatch(/Open item \(needs human confirmation\)/)
    })
  })

  describe('3. browser upload access restriction', () => {
    it('cites the authenticated, server-mediated PicPeak upload route', () => {
      expect(doc).toMatch(/adminPhotos\.js:131/)
      const src = read('vendor/picpeak/backend/src/routes/adminPhotos.js')
      expect(src).toMatch(
        /router\.post\('\/:eventId\/upload', adminAuth, requirePermission\('photos\.upload'\), requireEventOwnership/,
      )
    })

    it('states Payload\'s s3Storage plugin has no clientUploads option set (no direct-to-bucket browser upload enabled)', () => {
      const src = read('src/payload.config.ts')
      expect(src).not.toMatch(/clientUploads/)
      expect(doc).toMatch(/no `?clientUploads`? option/)
    })

    it('cites the one putObject-presigning call site as an unused example file, not a wired route', () => {
      expect(doc).toMatch(/s3Storage\.example\.js:100/)
      const example = read('vendor/picpeak/backend/src/services/storage/s3Storage.example.js')
      expect(example).toMatch(/getSignedUrl\('putObject'/)
    })

    it('cites S3StorageBackend.signedUrl as always requesting getObject, never putObject', () => {
      expect(doc).toMatch(/S3StorageBackend\.js:146/)
      const src = read('vendor/picpeak/backend/src/services/storage/S3StorageBackend.js')
      expect(src).toMatch(/getSignedUrl\('getObject', this\._key\(relPath\)/)
    })

    it('records the live finding that the bucket has no CORS configuration (defense in depth)', () => {
      expect(doc).toMatch(/NoSuchCORSConfiguration/)
    })

    it('states the explicit conclusion that browser upload access is correctly restricted', () => {
      expect(doc).toMatch(/browser upload access is correctly restricted/i)
    })
  })

  describe('4. lifecycle rules', () => {
    it('records the live lifecycle-configuration finding: only the default multipart-abort rule exists', () => {
      expect(doc).toMatch(/Default Multipart Abort Rule/)
      expect(doc).toMatch(/AbortIncompleteMultipartUpload/)
    })

    it('states no lifecycle rule expires or deletes objects by age', () => {
      expect(doc).toMatch(/[Nn]o lifecycle rule expires or deletes objects by age/)
    })

    it('cites the hourly expiration cron as the actual (app-level, not bucket-level) enforcement mechanism', () => {
      expect(doc).toMatch(/expirationChecker\.js:11/)
      const src = read('vendor/picpeak/backend/src/services/expirationChecker.js')
      expect(src).toMatch(/cron\.schedule\('0 \* \* \* \*'/)
    })

    it('flags the single-point-of-failure risk of relying on the cron process with no storage-level backstop', () => {
      expect(doc).toMatch(/no bucket-level lifecycle rule enforces\s*\nexpiry independently/)
    })
  })

  describe('5. public versus private paths', () => {
    it('states no object is ever written with a public-read ACL', () => {
      expect(doc).toMatch(/is ever written with a public-read ACL/)
      for (const rel of [
        'vendor/picpeak/backend/src/services/storage/s3Storage.js',
        'vendor/picpeak/backend/src/services/storage/S3StorageBackend.js',
        'vendor/picpeak/backend/src/services/storage/LocalFsStorage.js',
      ]) {
        const src = read(rel)
        expect(src).not.toMatch(/ACL:\s*'public-read'|Acl:\s*'public-read'/)
      }
    })

    it('states no public bucket URL, r2.dev domain, or CDN/custom domain is configured anywhere in the project', () => {
      const example = read('.env.example')
      expect(example).not.toMatch(/R2_PUBLIC_URL|PUBLIC_URL|CDN_URL|CUSTOM_DOMAIN/)
      expect(doc).toMatch(/[Nn]o public bucket URL/)
    })

    it('cites protectedImages.js as issuing an app-level signed token rather than a raw bucket URL', () => {
      expect(doc).toMatch(/protectedImages\.js:236-237/)
      expect(doc).toMatch(/protectedImages\.js:253/)
      const src = read('vendor/picpeak/backend/src/routes/protectedImages.js')
      expect(src).toMatch(/const signedUrl = `\/api\/images\/\$\{req\.params\.slug\}\/photo\/\$\{photoId\}\/signed\/\$\{token\}`/)
      expect(src).toMatch(/router\.get\('\/:slug\/photo\/:photoId\/signed\/:token'/)
    })

    it('cites every short-TTL presigned-GET call site with its real TTL', () => {
      expect(doc).toMatch(/gallery\.js:908/)
      const gallerySrc = read('vendor/picpeak/backend/src/routes/gallery.js')
      expect(gallerySrc).toMatch(/storage\.signedUrl\(zipInfo\.key, 300\)/)

      expect(doc).toMatch(/adminBackup\.js:743/)
      const backupSrc = read('vendor/picpeak/backend/src/routes/adminBackup.js')
      expect(backupSrc).toMatch(/s3Adapter\.getSignedUrl\('getObject', file\.key, \{ expiresIn: 3600 \}\)/)
    })

    it('flags the bucket-level public-access toggle as an open item, since R2 does not implement GetPublicAccessBlock', () => {
      expect(doc).toMatch(/GetPublicAccessBlock/)
    })
  })

  it('closes with an explicit open-items list for anything not verifiable from code/API alone', () => {
    expect(doc).toMatch(/Open items requiring human\/dashboard confirmation/)
    expect(doc.match(/Open item \(needs human confirmation\)/g)?.length).toBeGreaterThanOrEqual(2)
  })
})
