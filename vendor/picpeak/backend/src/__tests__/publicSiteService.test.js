jest.mock('../database/db', () => {
  const mockDb = jest.fn();
  return {
    db: mockDb,
    logActivity: jest.fn(),
  };
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { db } = require('../database/db');
const { getPublicSitePayload, clearPublicSiteCache, handlePublicSiteRequest } = require('../services/publicSiteService');
const { sanitizeCss } = require('../utils/cssSanitizer');

const buildPublicSiteRows = (overrides = {}) => ([
  { setting_key: 'general_public_site_enabled', setting_value: JSON.stringify(overrides.enabled ?? true) },
  { setting_key: 'general_public_site_html', setting_value: JSON.stringify(overrides.html ?? '<h1>{{company_name}}</h1>') },
  { setting_key: 'general_public_site_custom_css', setting_value: JSON.stringify(overrides.css ?? "body { color: red; }") }
]);

const buildBrandingRows = (overrides = {}) => ([
  { setting_key: 'branding_company_name', setting_value: JSON.stringify(overrides.companyName ?? 'Willow & Pine Studio') },
  { setting_key: 'branding_company_tagline', setting_value: JSON.stringify(overrides.companyTagline ?? 'Stories told in colour and light.') },
  { setting_key: 'branding_support_email', setting_value: JSON.stringify(overrides.supportEmail ?? 'hello@example.com') },
  { setting_key: 'branding_logo_url', setting_value: JSON.stringify(overrides.logoUrl ?? '/uploads/logos/logo.png') },
  { setting_key: 'branding_footer_text', setting_value: JSON.stringify(overrides.footerText ?? 'Crafted with care for every celebration.') },
  { setting_key: 'theme_config', setting_value: JSON.stringify(overrides.themeConfig ?? {
    primaryColor: '#2563eb',
    accentColor: '#1d4ed8',
    backgroundColor: '#f8fafc',
    textColor: '#0f172a'
  }) }
]);

describe('publicSiteService', () => {
  beforeEach(() => {
    clearPublicSiteCache();
    jest.clearAllMocks();
  });

  it('sanitizes stored HTML by stripping script tags', async () => {
    const publicSiteRows = buildPublicSiteRows({ html: '<h1>{{company_name}}</h1><script>alert(1)</script>' });
    const brandingRows = buildBrandingRows();

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    expect(payload.enabled).toBe(true);
    expect(payload.html).toContain('<h1>Willow & Pine Studio</h1>');
    expect(payload.html).not.toContain('<script');
    expect(payload.baseCss.length).toBeGreaterThan(0);
    expect(payload.branding.companyName).toBe('Willow & Pine Studio');
  });

  it('sanitizes custom CSS and removes dangerous patterns', async () => {
    const publicSiteRows = buildPublicSiteRows({
      css: "body { color: blue; } @import url('https://malicious.example/style.css'); div { background: url(\"javascript:alert(1)\"); }"
    });
    const brandingRows = buildBrandingRows();

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    expect(payload.css).toContain('body { color: blue; }');
    expect(payload.css).not.toContain('@import');
    expect(payload.css).not.toContain('javascript:');
    // Client-side util should match server sanitization expectations
    const clientSanitized = sanitizeCss(publicSiteRows[2].setting_value ? JSON.parse(publicSiteRows[2].setting_value) : '');
    expect(clientSanitized).not.toContain('@import');
    expect(clientSanitized).not.toContain('javascript:');
  });

  it('injects branding tokens into the rendered payload', async () => {
    const publicSiteRows = buildPublicSiteRows({ html: '<section><h1>{{company_name}}</h1><p>{{company_tagline}}</p><a href="mailto:{{support_email}}">Get in touch</a></section>' });
    const brandingRows = buildBrandingRows({
      companyName: 'Aurora Collective',
      companyTagline: 'Modern photography for timeless celebrations.',
      supportEmail: 'studio@aurora.co',
      logoUrl: '/uploads/logos/aurora.png',
      themeConfig: {
        primaryColor: '#5C8762',
        accentColor: '#1d4ed8',
        backgroundColor: '#fafafa',
        textColor: '#171717'
      }
    });

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    expect(payload.html).toContain('Aurora Collective');
    expect(payload.html).toContain('Modern photography for timeless celebrations.');
    expect(payload.html).toContain('studio@aurora.co');
    expect(payload.branding.logoUrl).toBe('/uploads/logos/aurora.png');
    expect(payload.branding.colors.primary).toBe('#5C8762');
  });

  it('exposes the 8-token CI palette through branding.colors', async () => {
    const publicSiteRows = buildPublicSiteRows({});
    const brandingRows = buildBrandingRows({
      themeConfig: {
        // LBM CI palette (charcoal + teal).
        primaryColor: '#014E4E',
        accentColor: '#017C7C',
        accentDarkColor: '#014E4E',
        backgroundColor: '#0D0D0D',
        surfaceColor: '#111414',
        elevatedColor: '#182222',
        surfaceBorderColor: '#1E2E2E',
        textColor: '#EBEBEB',
        mutedTextColor: '#4A6060'
      }
    });

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    // Legacy 4 colors still mapped.
    expect(payload.branding.colors.primary).toBe('#014E4E');
    expect(payload.branding.colors.accent).toBe('#017C7C');
    expect(payload.branding.colors.background).toBe('#0D0D0D');
    expect(payload.branding.colors.text).toBe('#EBEBEB');
    // 8-token CI palette additions.
    expect(payload.branding.colors.accentDark).toBe('#014E4E');
    expect(payload.branding.colors.surface).toBe('#111414');
    expect(payload.branding.colors.elevated).toBe('#182222');
    expect(payload.branding.colors.border).toBe('#1E2E2E');
    expect(payload.branding.colors.mutedText).toBe('#4A6060');
  });

  it('falls back accentDark to legacy primaryColor when the new key is absent', async () => {
    const publicSiteRows = buildPublicSiteRows({});
    const brandingRows = buildBrandingRows({
      themeConfig: {
        primaryColor: '#5C8762',
        accentColor: '#22c55e',
        backgroundColor: '#fafafa',
        textColor: '#171717'
        // accentDarkColor intentionally omitted to simulate a legacy theme.
      }
    });

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    expect(payload.branding.colors.accentDark).toBe('#5C8762');
  });

  it('exposes surface tokens and uses theme-aware public site CSS', async () => {
    const publicSiteRows = buildPublicSiteRows({});
    const brandingRows = buildBrandingRows({
      themeConfig: {
        primaryColor: '#014E4E',
        accentColor: '#017C7C',
        backgroundColor: '#0D0D0D',
        surfaceColor: '#111414',
        elevatedColor: '#182222',
        surfaceBorderColor: '#1E2E2E',
        textColor: '#EBEBEB',
        mutedTextColor: '#B6C2C2'
      }
    });

    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(publicSiteRows) }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve(brandingRows) }));

    const payload = await getPublicSitePayload({ bypassCache: true });

    expect(payload.branding.colors.surface).toBe('#111414');
    expect(payload.branding.colors.elevated).toBe('#182222');
    expect(payload.branding.colors.border).toBe('#1E2E2E');
    expect(payload.branding.colors.mutedText).toBe('#B6C2C2');
    expect(payload.baseCss).toContain('var(--brand-surface');
    expect(payload.baseCss).toContain('var(--brand-muted-text');
  });

});

// ---------------------------------------------------------------------
// US-27 AC-27.1 — `handlePublicSiteRequest` checks the `publicSite`
// feature flag BEFORE app_settings is ever read, so a settings-only
// write (general_public_site_enabled=true) can't turn Backstage into
// a second publisher of `/` while the server-side flag stays false.
// ---------------------------------------------------------------------
describe('handlePublicSiteRequest (US-27 AC-27.1)', () => {
  beforeEach(() => {
    clearPublicSiteCache();
    jest.clearAllMocks();
  });

  function mockRes() {
    const res = {
      redirect: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
      end: jest.fn(),
    };
    res.status = jest.fn(() => res);
    return res;
  }

  function flagRow(enabled) {
    return { where: () => ({ first: () => Promise.resolve(enabled ? { key: 'publicSite', value: true } : null) }) };
  }

  it('redirects to /admin/login when the flag is false, even though general_public_site_enabled is true — and never reads app_settings', async () => {
    db.mockImplementationOnce(() => flagRow(false));

    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await handlePublicSiteRequest(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(302, '/admin/login');
    expect(res.send).not.toHaveBeenCalled();
    // Only the feature-flag lookup ran — getPublicSitePayload (which
    // reads general_public_site_enabled from app_settings) never fired.
    expect(db).toHaveBeenCalledTimes(1);
    expect(db).toHaveBeenCalledWith('feature_flags');
  });

  it('still redirects when the flag is true but general_public_site_enabled is false (existing app_settings gate stays intact)', async () => {
    db.mockImplementationOnce(() => flagRow(true));
    db.mockImplementationOnce(() => ({
      whereIn: () => Promise.resolve([
        { setting_key: 'general_public_site_enabled', setting_value: JSON.stringify(false) },
      ]),
    }));
    db.mockImplementationOnce(() => ({ whereIn: () => Promise.resolve([]) }));

    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await handlePublicSiteRequest(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith(302, '/admin/login');
  });

  it('renders the document when both the flag and general_public_site_enabled are true', async () => {
    db.mockImplementationOnce(() => flagRow(true));
    db.mockImplementationOnce(() => ({
      whereIn: () => Promise.resolve([
        { setting_key: 'general_public_site_enabled', setting_value: JSON.stringify(true) },
        { setting_key: 'general_public_site_html', setting_value: JSON.stringify('<h1>{{company_name}}</h1>') },
      ]),
    }));
    db.mockImplementationOnce(() => ({
      whereIn: () => Promise.resolve([
        { setting_key: 'branding_company_name', setting_value: JSON.stringify('Willow & Pine Studio') },
      ]),
    }));
    db.mockImplementationOnce(() => ({
      where: () => ({ whereIn: () => ({ select: () => Promise.resolve([]) }) }),
    }));

    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await handlePublicSiteRequest(req, res, next);

    expect(res.redirect).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Willow & Pine Studio'));
  });
});
