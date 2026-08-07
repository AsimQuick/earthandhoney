/**
 * Public Site Service
 *
 * Builds the raw-HTML/CSS homepage payload (sanitization + branding
 * token substitution) and serves it via `handlePublicSiteRequest`, the
 * handler for GET / (mounted in server.js). Gated by two independent
 * checks, both of which must pass:
 *   1. the `publicSite` feature flag (feature_flags table) — checked
 *      first, before any app_settings row is read (US-27 AC-27.1)
 *   2. the `general_public_site_enabled` app_settings value
 */

const crypto = require('crypto');
const sanitizeHtml = require('sanitize-html');
const { db } = require('../database/db');
const logger = require('../utils/logger');
const { sanitizeCss } = require('../utils/cssSanitizer');
const {
  DEFAULT_PUBLIC_SITE_TITLE,
  DEFAULT_PUBLIC_SITE_HTML,
  DEFAULT_PUBLIC_SITE_CSS,
} = require('../constants/publicSiteDefaults');

const CACHE_TTL_MS = Number(process.env.PUBLIC_SITE_CACHE_TTL_MS || 60_000);

let cachedPayload = null;
let cacheExpiresAt = 0;

const ALLOWED_HTML_TAGS = [
  'a', 'article', 'aside', 'blockquote', 'br', 'button', 'caption', 'div',
  'em', 'figure', 'figcaption', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'header', 'hr', 'img', 'li', 'main', 'nav', 'ol', 'p', 'section', 'span',
  'strong', 'sup', 'sub', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  'ul'
];

const COMMON_ATTRIBUTES = ['class', 'id', 'role', 'aria-label', 'aria-hidden'];

function parseSettingValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

async function fetchPublicSiteSettings() {
  const rows = await db('app_settings')
    .whereIn('setting_key', [
      'general_public_site_enabled',
      'general_public_site_html',
      'general_public_site_custom_css'
    ]);

  const map = {
    general_public_site_enabled: false,
    general_public_site_html: DEFAULT_PUBLIC_SITE_HTML,
    general_public_site_custom_css: ''
  };

  rows.forEach((row) => {
    const parsed = parseSettingValue(row.setting_value);
    map[row.setting_key] = parsed == null ? map[row.setting_key] : parsed;
  });

  return map;
}

function sanitizeBrandUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    return null;
  }

  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:')) {
    return null;
  }

  return trimmed;
}

async function fetchBrandingContext() {
  const rows = await db('app_settings')
    .whereIn('setting_key', [
      'branding_company_name',
      'branding_company_tagline',
      'branding_support_email',
      'branding_logo_url',
      'branding_footer_text',
      'theme_config'
    ]);

  const context = {
    companyName: null,
    companyTagline: null,
    supportEmail: null,
    logoUrl: null,
    footerText: null,
    // 8-token CI palette mirrored from frontend ThemeConfig.
    // primary/accent are kept as legacy aliases (primary == accent-dark);
    // new tokens are surface, elevated, border, mutedText, accentDark.
    colors: {
      primary: '#16a34a',
      accent: '#0f766e',
      accentDark: '#16a34a',
      background: '#f4fbf6',
      surface: '#ffffff',
      elevated: '#f5f5f5',
      border: '#e5e5e5',
      text: '#0f172a',
      mutedText: '#737373'
    }
  };

  rows.forEach((row) => {
    const parsed = parseSettingValue(row.setting_value);
    switch (row.setting_key) {
    case 'branding_company_name':
      context.companyName = parsed || context.companyName;
      break;
    case 'branding_company_tagline':
      context.companyTagline = parsed || context.companyTagline;
      break;
    case 'branding_support_email':
      context.supportEmail = parsed || context.supportEmail;
      break;
    case 'branding_logo_url':
      context.logoUrl = sanitizeBrandUrl(parsed);
      break;
    case 'branding_footer_text':
      context.footerText = parsed || context.footerText;
      break;
    case 'theme_config': {
      try {
        const themeConfig = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
        if (themeConfig && typeof themeConfig === 'object') {
          // Legacy 4 colors
          context.colors.primary = themeConfig.primaryColor || context.colors.primary;
          context.colors.accent = themeConfig.accentColor || context.colors.accent;
          context.colors.background = themeConfig.backgroundColor || context.colors.background;
          context.colors.text = themeConfig.textColor || context.colors.text;
          // 8-token CI palette additions
          context.colors.accentDark = themeConfig.accentDarkColor || themeConfig.primaryColor || context.colors.accentDark;
          context.colors.surface = themeConfig.surfaceColor || context.colors.surface;
          context.colors.elevated = themeConfig.elevatedColor || context.colors.elevated;
          context.colors.border = themeConfig.surfaceBorderColor || context.colors.border;
          context.colors.mutedText = themeConfig.mutedTextColor || context.colors.mutedText;
        }
      } catch (error) {
        logger.warn('Failed to parse theme configuration for public site', { error: error.message });
      }
      break;
    }
    default:
      break;
    }
  });

  return context;
}

function sanitizeHtmlPayload(html) {
  const sanitized = sanitizeHtml(html || '', {
    allowedTags: ALLOWED_HTML_TAGS,
    allowedAttributes: {
      '*': COMMON_ATTRIBUTES,
      a: ['href', 'target', 'rel', ...COMMON_ATTRIBUTES],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding', ...COMMON_ATTRIBUTES],
      button: ['type', ...COMMON_ATTRIBUTES]
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: (tagName, attribs) => {
        const transformed = { ...attribs };
        if (transformed.href && !/^https?:|^mailto:|^tel:/i.test(transformed.href)) {
          // sanitize-html will remove disallowed schemes, but we guard as well
          delete transformed.href;
        }

        if (transformed.target === '_blank') {
          transformed.rel = transformed.rel ? `${transformed.rel} noopener noreferrer`.trim() : 'noopener noreferrer';
        }

        return { tagName, attribs: transformed };
      }
    },
    nonBooleanAttributes: ['target'],
    parser: {
      lowerCaseAttributeNames: true
    }
  });

  return sanitized;
}

function buildCachedPayload(raw) {
  const sanitizedHtml = sanitizeHtmlPayload(raw.publicSite.general_public_site_html || DEFAULT_PUBLIC_SITE_HTML);
  const sanitizedCss = sanitizeCss(raw.publicSite.general_public_site_custom_css || '');
  const enabled = Boolean(raw.publicSite.general_public_site_enabled);
  const title = raw.branding.companyName || DEFAULT_PUBLIC_SITE_TITLE;
  const baseCss = sanitizeCss(DEFAULT_PUBLIC_SITE_CSS);

  const substitutedHtml = applyBrandTokens(sanitizedHtml, raw.branding);

  const hash = crypto
    .createHash('sha1')
    .update(`${enabled}|${substitutedHtml}|${sanitizedCss}|${baseCss}|${JSON.stringify(raw.branding)}`)
    .digest('hex');

  return {
    enabled,
    html: substitutedHtml,
    css: sanitizedCss,
    baseCss,
    title,
    branding: raw.branding,
    etag: `W/"${hash}"`
  };
}

async function getPublicSitePayload({ bypassCache = false } = {}) {
  if (!bypassCache && cachedPayload && Date.now() < cacheExpiresAt) {
    return cachedPayload;
  }

  const [publicSite, branding] = await Promise.all([
    fetchPublicSiteSettings(),
    fetchBrandingContext()
  ]);

  const payload = buildCachedPayload({ publicSite, branding });

  cachedPayload = payload;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;

  return payload;
}

function clearPublicSiteCache() {
  cachedPayload = null;
  cacheExpiresAt = 0;
}

// ---------------------------------------------------------------------
// Request handler for GET / (US-27 AC-27.1)
//
// `handlePublicSiteRequest` and the document-rendering helpers below
// used to live inline in server.js. Moved here so the route can be
// unit-tested without booting the full server (server.js calls
// startServer() at import time). Behaviour is unchanged except for the
// new `publicSite` feature-flag gate, checked FIRST — before
// getPublicSitePayload() ever reads the `general_public_site_enabled`
// app_settings row — so a settings-only write can no longer turn
// Backstage into a second publisher of `/` (the duplicate AC-18.5
// identified). Missing/false flag row → disabled, mirroring the
// quotes/bills server-side gate pattern in adminQuotes.js.
// ---------------------------------------------------------------------

async function isPublicSiteFeatureEnabled() {
  const row = await db('feature_flags').where({ key: 'publicSite' }).first();
  return Boolean(row && (row.value === true || row.value === 1 || row.value === '1'));
}

function composeInlineStyles(payload) {
  const { branding } = payload;
  const cssSegments = [];

  cssSegments.push(`:root {
  --brand-primary: ${branding.colors.primary};
  --brand-accent: ${branding.colors.accent};
  --brand-background: ${branding.colors.background};
  --brand-text: ${branding.colors.text};
  --brand-surface: ${branding.colors.surface || '#ffffff'};
  --brand-elevated: ${branding.colors.elevated || '#f5f5f5'};
  --brand-border: ${branding.colors.border || '#e5e5e5'};
  --brand-muted-text: ${branding.colors.mutedText || '#737373'};
}`);

  if (payload.baseCss) {
    cssSegments.push(payload.baseCss);
  }

  if (payload.css) {
    cssSegments.push(`/* Custom styles */\n${payload.css}`);
  }

  return cssSegments.join('\n\n');
}

function escapeDocumentHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderBrandHeader(branding) {
  const displayName = escapeDocumentHtml(branding.companyName || 'PicPeak');
  const logoSrc = encodeURI(branding.logoUrl || '/picpeak-logo-transparent.png');
  const logo = `<img src="${logoSrc}" alt="${displayName}" class="brand-logo" loading="lazy" decoding="async" />`;

  const tagline = branding.companyTagline
    ? `<p class="brand-tagline">${escapeDocumentHtml(branding.companyTagline)}</p>`
    : '';

  return `<header class="site-header">
  <div class="header-inner">
    <div class="brand">
      ${logo}
      <div class="brand-copy">
        <p class="brand-label">${displayName}</p>
        ${tagline}
      </div>
    </div>
    <nav class="site-nav">
      <a href="#features">${'Features'}</a>
      <a href="#workflow">${'Workflow'}</a>
      <a href="#collections">${'Collections'}</a>
      <a href="#stories">${'Stories'}</a>
      <a href="#contact">${'Contact'}</a>
    </nav>
  </div>
</header>`;
}

function renderBrandFooter(branding) {
  const displayName = escapeDocumentHtml(branding.companyName || 'PicPeak');
  const footerNote = branding.footerText
    ? `<p>${escapeDocumentHtml(branding.footerText)}</p>`
    : '<p>Powered by PicPeak to keep every celebration beautifully organised.</p>';

  const supportEmail = escapeDocumentHtml(branding.supportEmail || '');
  const supportLink = supportEmail
    ? `<a href="mailto:${supportEmail}">Support</a>`
    : '';

  const legalLinks = `
    <a href="/datenschutz">Privacy Policy</a>
    <a href="/impressum">Impressum</a>
    ${supportLink}
  `;

  return `<footer class="site-footer" id="contact">
  <div class="footer-inner">
    <div>
      <h2>${displayName}</h2>
      ${footerNote}
    </div>
    <div class="footer-links">
      ${legalLinks}
    </div>
  </div>
</footer>`;
}

function buildSeoMetaTags(seoSettings) {
  const tags = [];
  const robotsDirectives = [];

  if (seoSettings.seo_meta_noindex) robotsDirectives.push('noindex');
  if (seoSettings.seo_meta_nofollow) robotsDirectives.push('nofollow');

  if (robotsDirectives.length > 0) {
    tags.push(`<meta name="robots" content="${robotsDirectives.join(', ')}" />`);
  }

  if (seoSettings.seo_meta_noai) {
    tags.push('<meta name="robots" content="noai, noimageai" />');
  }

  return tags.join('\n  ');
}

function buildPublicSiteDocument(payload) {
  const inlineStyles = composeInlineStyles(payload);
  const header = renderBrandHeader(payload.branding);
  const footer = renderBrandFooter(payload.branding);
  const seoMeta = payload.seoSettings ? buildSeoMetaTags(payload.seoSettings) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeDocumentHtml(payload.title)}</title>
  <meta name="description" content="Curated photo galleries and stories from unforgettable celebrations." />
  ${seoMeta}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>${inlineStyles}</style>
</head>
<body>
  <div class="site-shell">
    ${header}
    <main class="site-main">
      ${payload.html}
    </main>
    ${footer}
  </div>
</body>
</html>`;
}

async function handlePublicSiteRequest(req, res, next) {
  try {
    const flagEnabled = await isPublicSiteFeatureEnabled();
    if (!flagEnabled) {
      res.redirect(302, '/admin/login');
      return;
    }

    const payload = await getPublicSitePayload();

    if (!payload.enabled) {
      res.redirect(302, '/admin/login');
      return;
    }

    if (payload.etag && req.headers['if-none-match'] === payload.etag) {
      res.status(304).end();
      return;
    }

    // Inject SEO meta settings into payload
    try {
      const seoRows = await db('app_settings')
        .where('setting_type', 'seo')
        .whereIn('setting_key', ['seo_meta_noindex', 'seo_meta_nofollow', 'seo_meta_noai'])
        .select('setting_key', 'setting_value');
      const seoSettings = {};
      for (const row of seoRows) {
        let val = row.setting_value;
        if (typeof val === 'string') { try { val = JSON.parse(val); } catch {} }
        seoSettings[row.setting_key] = val;
      }
      payload.seoSettings = seoSettings;
    } catch {}

    const document = buildPublicSiteDocument(payload);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30, must-revalidate');
    res.setHeader('ETag', payload.etag);
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; object-src 'none'; script-src 'self'; form-action 'self'");

    res.status(200).send(document);
  } catch (error) {
    logger.error('Failed to render public site', { error: error.message });
    next();
  }
}

async function getDefaultPublicSitePayload() {
  const branding = await fetchBrandingContext();
  return buildCachedPayload({
    publicSite: {
      general_public_site_enabled: false,
      general_public_site_html: DEFAULT_PUBLIC_SITE_HTML,
      general_public_site_custom_css: ''
    },
    branding
  });
}

async function getRawPublicSiteSettings() {
  return fetchPublicSiteSettings();
}

function applyBrandTokens(html, branding) {
  if (!html) {
    return html;
  }

  const tokens = {
    company_name: branding.companyName || '',
    company_tagline: branding.companyTagline || '',
    support_email: branding.supportEmail || '',
    brand_logo_url: branding.logoUrl || '/picpeak-logo-transparent.png',
    brand_primary_hex: branding.colors?.primary || '#2563eb',
    brand_accent_hex: branding.colors?.accent || '#1d4ed8',
    brand_background_hex: branding.colors?.background || '#f8fafc',
    brand_text_hex: branding.colors?.text || '#0f172a'
  };

  return html.replace(/\{\{\s*(company_name|company_tagline|support_email|brand_logo_url|brand_primary_hex|brand_accent_hex|brand_background_hex|brand_text_hex)\s*\}\}/gi,
    (_, key) => tokens[key] || '');
}

module.exports = {
  getPublicSitePayload,
  clearPublicSiteCache,
  getDefaultPublicSitePayload,
  getRawPublicSiteSettings,
  isPublicSiteFeatureEnabled,
  handlePublicSiteRequest
};
