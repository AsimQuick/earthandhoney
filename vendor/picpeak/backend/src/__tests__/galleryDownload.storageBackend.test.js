/**
 * Pinning tests for US-17 AC-17.5.2 and AC-17.5.3 — GET
 * /:slug/download/:photoId in routes/gallery.js.
 *
 * Pins the vendor-defect fix: the single-photo download route now resolves
 * managed photos through resolvePhotoStorageKey + getStorage() (the pattern
 * protectedImages.js already used) instead of assuming a local filesystem
 * path, Content-Length comes from the storage stat(), resolvePhotoFilePath
 * is exercised only for external/reference photos, watermarking materializes
 * a local copy via withLocalCopy for storage-backed photos, and every
 * failure path answers instead of hanging (the upstream res.sendFile bug) —
 * all AC-17.5.2. AC-17.5.3 adds the ordering claim on top: the
 * `download_count` increment and the `access_logs` insert fire only on a
 * confirmed delivery (the response's `finish` event, or res.sendFile's
 * success branch for the external-photo path) and never on any of the
 * failure paths this file already pins.
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

// recordConfirmedDownload's writes are fired from the response 'finish'
// listener (or the sendFile success callback) without being awaited by the
// route itself. supertest's promise resolves once the client has read the
// full response body, which in a real HTTP round trip happens after the
// server side has already emitted 'finish' — but flushing one extra tick
// here removes any doubt before asserting on the (synchronous, fire-and-
// forget) db calls those handlers make.
const flushMicrotasks = () => new Promise((resolve) => setImmediate(resolve));

// db(table) builds a fresh chain object per call, so `increment`/`insert`
// can't be asserted on directly (each call gets its own jest.fn()). Route
// them through these two spies, shared across every chain instance, so the
// AC-17.5.3 ordering tests can assert on "was the write made at all" and
// "with what payload" regardless of which chain instance made it.
const downloadWriteSpies = {
  increment: jest.fn(async () => undefined),
  insert: jest.fn(async () => undefined),
};

function chainFor(table, state) {
  const chain = {};
  chain.where = jest.fn(() => chain);
  chain.first = jest.fn(async () => (table === 'photos' ? state.photo : undefined));
  chain.increment = jest.fn((...args) => downloadWriteSpies.increment(table, ...args));
  chain.insert = jest.fn((...args) => downloadWriteSpies.insert(table, ...args));
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
    downloadWriteSpies.increment.mockClear();
    downloadWriteSpies.insert.mockClear();

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

    // AC-17.5.3: a confirmed delivery records exactly one download_count
    // increment and one access_logs row, via the response 'finish' event.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.increment).toHaveBeenCalledWith('photos', 'download_count', 1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledWith(
      'access_logs',
      expect.objectContaining({ action: 'download', photo_id: '10' })
    );
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

    // AC-17.5.3: the external-photo path is delivered via res.sendFile, so
    // the write is recorded from its success callback, not 'finish'.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledWith(
      'access_logs',
      expect.objectContaining({ action: 'download', photo_id: '10' })
    );
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

    // AC-17.5.3: a 404 must leave both writes untouched.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
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

    // AC-17.5.3: a 404 must leave both writes untouched.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
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

    // AC-17.5.3: a 404 must leave both writes untouched.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
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

    // AC-17.5.3: this is the exact scenario the ordering fix targets — a
    // stream that fails before delivery completes must not be recorded as
    // a successful download. The stream's 'error' event (not 'end') fired,
    // so the response 'finish' listener was never even attached.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
  }, 8000);

  it('res.sendFile failing on a missing external file answers 404 instead of only logging (the upstream hang)', async () => {
    state.photo.source_origin = 'external';
    mockResolvePhotoStorageKey.mockReturnValue(null);
    mockResolvePhotoFilePath.mockReturnValue(path.join(tmpDir, 'does-not-exist.jpg'));

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);

    // AC-17.5.3: res.sendFile's failure branch must not call the
    // confirmed-delivery helper — only its success (no-error) branch does.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
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

    // AC-17.5.3: the watermark branch delivers via res.send(), recorded
    // from the response 'finish' event exactly like the plain-stream branch.
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledWith(
      'access_logs',
      expect.objectContaining({ action: 'download', photo_id: '10' })
    );
  }, 8000);
});

describe('GET /:slug/download/:photoId — download recorded only on confirmed delivery (US-17 AC-17.5.3)', () => {
  let app;
  const state = {};

  beforeEach(() => {
    app = buildApp();

    mockDb.mockReset();
    mockDb.mockImplementation((table) => chainFor(table, state));
    downloadWriteSpies.increment.mockClear();
    downloadWriteSpies.insert.mockClear();

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
      mime_type: 'text/plain',
      visibility: 'visible',
      path: 'individual/photo.jpg',
      source_origin: 'managed',
    };
  });

  it('the two writes appear nowhere in the route before the file is resolved — a storage.stat() 404 never touches them', async () => {
    // Mirrors PICPEAK_UPSTREAM_DEFECTS.md UD-1 part (3)'s reproduction: the
    // pre-fix route wrote download_count/access_logs before this exact
    // 404 branch could even be reached.
    mockResolvePhotoStorageKey.mockReturnValue('events/active/test-event/individual/missing.jpg');
    mockStorageStat.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(404);
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
  }, 8000);

  it('a confirmed managed-photo delivery records the pair exactly once, with the requested photo id', async () => {
    const storageKey = 'events/active/test-event/individual/photo.jpg';
    mockResolvePhotoStorageKey.mockReturnValue(storageKey);
    mockStorageStat.mockResolvedValue({ size: 5, mtime: new Date() });
    mockStorageGet.mockResolvedValue(Readable.from(Buffer.from('hello')));

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(200);
    await flushMicrotasks();

    expect(downloadWriteSpies.increment).toHaveBeenCalledTimes(1);
    expect(downloadWriteSpies.insert).toHaveBeenCalledTimes(1);
    const [, insertedRow] = downloadWriteSpies.insert.mock.calls[0];
    expect(insertedRow).toEqual(
      expect.objectContaining({
        event_id: 1,
        action: 'download',
        photo_id: '10',
      })
    );
  }, 8000);

  it('a stream that fails after bytes are already on the wire records nothing', async () => {
    // The partial-delivery case: headers and some bytes are out, then the
    // storage read dies. Upstream had already committed both writes long
    // before this point; the patched route attaches its 'finish' listener
    // only from the stream's own 'end' event, which never fires here.
    mockResolvePhotoStorageKey.mockReturnValue('events/active/test-event/individual/photo.jpg');
    mockStorageStat.mockResolvedValue({ size: 5, mtime: new Date() });

    const stream = new PassThrough();
    mockStorageGet.mockImplementation(async () => {
      setImmediate(() => {
        stream.write('he');
        setImmediate(() => stream.emit('error', new Error('storage read died mid-transfer')));
      });
      return stream;
    });

    await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS)
      .catch((err) => err); // an aborted partial response is the expected outcome

    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
  }, 8000);

  it('the downloads-disabled 403 short-circuit records nothing', async () => {
    mockRouteState.event = { ...mockRouteState.event, allow_downloads: false };

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(403);
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
  }, 8000);

  it('the hidden-photo 403 short-circuit records nothing', async () => {
    state.photo.visibility = 'hidden';
    mockRouteState.accessLevel = 'guest';

    const res = await request(app)
      .get('/api/gallery/test-event/download/10')
      .timeout(REQUEST_TIMEOUT_MS);

    expect(res.status).toBe(403);
    await flushMicrotasks();
    expect(downloadWriteSpies.increment).not.toHaveBeenCalled();
    expect(downloadWriteSpies.insert).not.toHaveBeenCalled();
  }, 8000);

  it('the pair is written by one guarded helper — the two writes appear nowhere else in the route', () => {
    // A source-level pin, not a behavioural one: the AC requires that the
    // increment and the insert exist exactly once each inside this route,
    // so a future edit cannot quietly reintroduce a second, unguarded write
    // on some other branch while every behavioural test above still passes.
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'gallery.js'), 'utf8');
    const routeStart = source.indexOf("router.get('/:slug/download/:photoId'");
    const routeEnd = source.indexOf("router.get('/:slug/download-all'");
    expect(routeStart).toBeGreaterThan(-1);
    expect(routeEnd).toBeGreaterThan(routeStart);

    const routeBody = source.slice(routeStart, routeEnd);
    expect(routeBody.match(/increment\('download_count'/g)).toHaveLength(1);
    expect(routeBody.match(/db\('access_logs'\)\.insert\(/g)).toHaveLength(1);
    // Both live inside the single guarded helper, which is the only thing
    // any delivery-confirmation callback calls.
    expect(routeBody).toContain('const recordConfirmedDownload = () => {');
    expect(routeBody).toContain("res.once('finish', recordConfirmedDownload)");
  });
});
