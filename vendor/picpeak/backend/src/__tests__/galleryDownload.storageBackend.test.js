/**
 * Pinning tests for US-17 AC-17.5.2 — GET /:slug/download/:photoId in
 * routes/gallery.js.
 *
 * Pins the vendor-defect fix: the single-photo download route now resolves
 * managed photos through resolvePhotoStorageKey + getStorage() (the pattern
 * protectedImages.js already used) instead of assuming a local filesystem
 * path, Content-Length comes from the storage stat(), resolvePhotoFilePath
 * is exercised only for external/reference photos, watermarking materializes
 * a local copy via withLocalCopy for storage-backed photos, and every
 * failure path answers instead of hanging (the upstream res.sendFile bug).
 *
 * Every collaborator is mocked so this stays a fast unit test — no real
 * Postgres/S3, no real watermark processing. Every request below carries an
 * explicit client-side timeout and every `it` an explicit test timeout so a
 * regression that reintroduces the hang fails fast instead of consuming the
 * whole run.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough, Readable } = require('stream');

jest.setTimeout(10000);
const REQUEST_TIMEOUT_MS = 4000;

// ---- mocked collaborators ------------------------------------------------

let mockRouteState = { event: null, accessLevel: 'guest' };
jest.mock('../middleware/gallery', () => ({
  verifyGalleryAccess: (req, res, next) => {
    req.event = mockRouteState.event;
    req.accessLevel = mockRouteState.accessLevel;
    next();
  },
  isAdminPreview: () => false,
}));

const mockDb = jest.fn();
jest.mock('../database/db', () => ({
  db: (...args) => mockDb(...args),
  withRetry: (fn) => fn(),
}));

const mockResolvePhotoStorageKey = jest.fn();
const mockResolvePhotoFilePath = jest.fn();
jest.mock('../services/photoResolver', () => ({
  resolvePhotoStorageKey: (...args) => mockResolvePhotoStorageKey(...args),
  resolvePhotoFilePath: (...args) => mockResolvePhotoFilePath(...args),
}));

const mockStorageStat = jest.fn();
const mockStorageGet = jest.fn();
jest.mock('../services/storage', () => ({
  getStorage: () => ({
    kind: () => 'local',
    stat: (...args) => mockStorageStat(...args),
    get: (...args) => mockStorageGet(...args),
  }),
}));

const mockGetWatermarkSettings = jest.fn();
const mockApplyWatermark = jest.fn();
jest.mock('../services/watermarkService', () => ({
  getWatermarkSettings: (...args) => mockGetWatermarkSettings(...args),
  applyWatermark: (...args) => mockApplyWatermark(...args),
}));

const mockWithLocalCopy = jest.fn();
jest.mock('../services/imageProcessor', () => ({
  ensureThumbnail: jest.fn(),
  ensureHeroImage: jest.fn(),
  ensurePreviewImage: jest.fn(),
  withLocalCopy: (...args) => mockWithLocalCopy(...args),
}));

const mockGetUseOriginalFilenames = jest.fn();
jest.mock('../services/downloadFilenameService', () => ({
  getUseOriginalFilenames: (...args) => mockGetUseOriginalFilenames(...args),
  pickRawDownloadName: (photo) => photo.filename,
  getZipEntryNames: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ---- test app -------------------------------------------------------------

const galleryRouter = require('../routes/gallery');

function buildApp() {
  const app = express();
  app.use('/api/gallery', galleryRouter);
  return app;
}

function chainFor(table, state) {
  const chain = {};
  chain.where = jest.fn(() => chain);
  chain.first = jest.fn(async () => (table === 'photos' ? state.photo : undefined));
  chain.increment = jest.fn(async () => undefined);
  chain.insert = jest.fn(async () => undefined);
  return chain;
}

describe('GET /:slug/download/:photoId — storage backend + failure-path pinning (US-17 AC-17.5.2)', () => {
  let app;
  let tmpDir;
  const state = {};

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ac1752-download-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    app = buildApp();

    mockDb.mockReset();
    mockDb.mockImplementation((table) => chainFor(table, state));

    mockResolvePhotoStorageKey.mockReset();
    mockResolvePhotoFilePath.mockReset();
    mockStorageStat.mockReset();
    mockStorageGet.mockReset();
    mockGetWatermarkSettings.mockReset().mockResolvedValue({ enabled: false });
    mockApplyWatermark.mockReset();
    mockWithLocalCopy.mockReset();
    mockGetUseOriginalFilenames.mockReset().mockResolvedValue(false);

    mockRouteState = {
      event: { id: 1, slug: 'test-event', allow_downloads: true, watermark_downloads: false, watermark_text: null },
      accessLevel: 'guest',
    };

    state.photo = {
      id: 10,
      event_id: 1,
      filename: 'photo.jpg',
      // text/plain lets supertest's built-in text parser expose exact body
      // bytes via res.text — the route only ever echoes photo.mime_type
      // into Content-Type, so this doesn't touch the code under test.
      mime_type: 'text/plain',
      visibility: 'visible',
      path: 'individual/photo.jpg',
      source_origin: 'managed',
    };
  });

  it('managed photo: streams via the storage backend with Content-Length from storage stat()', async () => {
    const storageKey = 'events/active/test-event/individual/photo.jpg';
    mockResolvePhotoStorageKey.mockReturnValue(storageKey);
    mockStorageStat.mockResolvedValue({ size: 5, mtime: new Date() });
    mockStorageGet.mockResolvedValue(Readable.from(Buffer.from('hello')));

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(200);
    expect(res.headers['content-length']).toBe('5');
    expect(res.headers['content-disposition']).toEqual(expect.stringContaining('photo.jpg'));
    expect(res.text).toBe('hello');
    expect(mockStorageGet).toHaveBeenCalledWith(storageKey);
    // resolvePhotoFilePath must not be touched for a photo with a storage key.
    expect(mockResolvePhotoFilePath).not.toHaveBeenCalled();
  }, 8000);

  it('external/reference photo (no storage key): falls back to resolvePhotoFilePath and streams the file', async () => {
    const filePath = path.join(tmpDir, 'external-photo.jpg');
    fs.writeFileSync(filePath, 'external-bytes');

    state.photo.source_origin = 'external';
    mockResolvePhotoStorageKey.mockReturnValue(null);
    mockResolvePhotoFilePath.mockReturnValue(filePath);

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(200);
    expect(res.text).toBe('external-bytes');
    expect(mockStorageGet).not.toHaveBeenCalled();
  }, 8000);

  it('absent storage object: storage.stat() returning null answers 404 with a body', async () => {
    mockResolvePhotoStorageKey.mockReturnValue('events/active/test-event/individual/missing.jpg');
    mockStorageStat.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(mockStorageGet).not.toHaveBeenCalled();
  }, 8000);

  it('photo row whose storage key cannot be resolved answers 404', async () => {
    mockResolvePhotoStorageKey.mockImplementation(() => {
      throw new Error('resolvePhotoStorageKey: photo.path is empty for photo 10');
    });

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  }, 8000);

  it('external photo whose local file path cannot be resolved answers 404', async () => {
    state.photo.source_origin = 'external';
    mockResolvePhotoStorageKey.mockReturnValue(null);
    mockResolvePhotoFilePath.mockImplementation(() => {
      throw new Error('Missing external_relpath for external photo');
    });

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(expect.objectContaining({ error: expect.any(String) }));
  }, 8000);

  it('a storage stream error before any bytes are sent answers 500 instead of hanging', async () => {
    mockResolvePhotoStorageKey.mockReturnValue('events/active/test-event/individual/photo.jpg');
    mockStorageStat.mockResolvedValue({ size: 5, mtime: new Date() });

    const stream = new PassThrough();
    // Fire the error only once the route has actually called storage.get()
    // and (synchronously, right after the await) attached its 'error'
    // listener — scheduling this relative to the whole HTTP round-trip
    // instead raced the listener attachment and produced a flaky/unhandled
    // 'error' event rather than exercising the route's handler.
    mockStorageGet.mockImplementation(async () => {
      setImmediate(() => stream.emit('error', new Error('simulated storage read failure')));
      return stream;
    });

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(500);
  }, 8000);

  it('res.sendFile failing on a missing external file answers 404 instead of only logging (the upstream hang)', async () => {
    state.photo.source_origin = 'external';
    mockResolvePhotoStorageKey.mockReturnValue(null);
    mockResolvePhotoFilePath.mockReturnValue(path.join(tmpDir, 'does-not-exist.jpg'));

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);
  }, 8000);

  it('watermark branch materializes a local copy via withLocalCopy and calls applyWatermark with a path, not a buffer', async () => {
    const storageKey = 'events/active/test-event/individual/photo.jpg';
    mockResolvePhotoStorageKey.mockReturnValue(storageKey);
    mockStorageStat.mockResolvedValue({ size: 5, mtime: new Date() });
    mockGetWatermarkSettings.mockResolvedValue({ enabled: true, opacity: 0.5, position: 'br', size: 'm', text: 'Protected' });

    const localPath = '/tmp/mock-local-copy.jpg';
    mockWithLocalCopy.mockImplementation(async (key, fn) => fn(localPath));
    mockApplyWatermark.mockResolvedValue(Buffer.from('watermarked'));

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(200);
    expect(res.text).toBe('watermarked');
    expect(res.headers['content-length']).toBe(String(Buffer.byteLength('watermarked')));
    expect(mockWithLocalCopy).toHaveBeenCalledWith(storageKey, expect.any(Function));
    expect(mockApplyWatermark).toHaveBeenCalledWith(localPath, expect.objectContaining({ enabled: true }));
    // Watermarking a storage-backed photo must never hand a raw storage
    // key/buffer to applyWatermark — it only accepts a local fs path.
    expect(mockApplyWatermark).not.toHaveBeenCalledWith(storageKey, expect.anything());
    expect(mockStorageGet).not.toHaveBeenCalled();
  }, 8000);
});
