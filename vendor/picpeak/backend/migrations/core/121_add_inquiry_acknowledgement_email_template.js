/**
 * Migration: add the `inquiry_acknowledgement` email template.
 *
 * US-33 AC-33.6 — an optional branded acknowledgement to the person who
 * submitted a Frontstage form, sent through this same, already-existing
 * email queue (`email_queue` + the 60-second `startEmailQueueProcessor`
 * loop in emailProcessor.js) rather than a second sending system, so
 * exactly one system ever sends any given email type (CLAUDE.md's email
 * pragmatic-default note). Sibling of
 * `120_add_inquiry_notification_email_template.js` (US-33 AC-33.5.2.1):
 * same idempotent shape, same reason it exists — without this row, every
 * `inquiry_acknowledgement` row the AC-33.6 route queues would sit
 * `pending` and retry to exhaustion exactly like the two templates finding
 * F9 already named (see scrum-master/po-requests.md finding F9).
 *
 * This is a NEW numbered migration — never an edit to any already-shipped
 * migration (Fork Discipline / Reminder 2) — and it inserts only; nothing
 * here alters a row or column an existing migration created. This
 * migration and its manifest entry are recorded together in
 * FORK_CHANGELOG.md and PICPEAK_PORT_LEDGER.md.
 *
 * `subject_de`/`body_*_de` are populated (not left null) so a German-locale
 * install (`getRecipientLanguage`) never falls through to an empty
 * template — same convention `120_add_inquiry_notification_email_template.js`
 * used. Inserts directly into the legacy `subject_en`/`body_html_en`/
 * `body_text_en` (and `_de`) columns rather than an
 * `email_template_translations` row, because `processTemplate`
 * (emailProcessor.js:503, 541-548) falls back to exactly those legacy
 * columns whenever no translations row exists for a `template_key`.
 *
 * Idempotent: guarded on `template_key` already existing, same pattern as
 * migration `120`.
 */

const TEMPLATE_KEY = 'inquiry_acknowledgement';

exports.up = async function (knex) {
  const existing = await knex('email_templates').where('template_key', TEMPLATE_KEY).first();
  if (existing) return;

  await knex('email_templates').insert({
    template_key: TEMPLATE_KEY,
    subject_en: 'Thank you for reaching out, {{form_title}}',
    subject_de: 'Vielen Dank für Ihre Anfrage, {{form_title}}',
    body_html_en: `
<h2>Thank you for your inquiry</h2>

<p>We've received your submission and will be in touch soon.</p>`,
    body_text_en: `Thank you for your inquiry

We've received your submission and will be in touch soon.`,
    body_html_de: `
<h2>Vielen Dank für Ihre Anfrage</h2>

<p>Wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.</p>`,
    body_text_de: `Vielen Dank für Ihre Anfrage

Wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen.`,
    variables: JSON.stringify(['form_title', 'submitted_at']),
  });
};

exports.down = async function (knex) {
  await knex('email_templates').where('template_key', TEMPLATE_KEY).delete();
};
