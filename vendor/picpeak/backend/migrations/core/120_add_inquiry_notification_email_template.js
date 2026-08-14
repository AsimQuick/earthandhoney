/**
 * Migration: add the `inquiry_received` email template.
 *
 * US-33 AC-33.5 — a Frontstage form submission notifies the studio through
 * this same, already-existing email queue (`email_queue` + the 60-second
 * `startEmailQueueProcessor` loop in emailProcessor.js). The queue itself
 * needs no new column: `event_id` is nullable (see db.js's `createTable`
 * for `email_queue`) because an inquiry is not a gallery event, so the row
 * this AC queues carries `event_id: null`. What's missing is the template
 * row `sendTemplateEmail` looks up by `template_key` — without it, every
 * `inquiry_received` row would sit `pending` and retry to exhaustion
 * exactly like the two templates finding F9 already named
 * (`gallery_expired`, `archive_complete` — scrum-master/po-requests.md).
 * This is a NEW numbered migration, not an edit to any already-shipped
 * migration (Fork Discipline / Reminder 2), and it inserts only — nothing
 * here alters a row or column an existing migration created.
 *
 * `subject_de`/`body_*_de` are populated (not left null) so a German-locale
 * install (`getRecipientLanguage`) never falls through to an empty
 * template — same convention `059_add_admin_email_templates.js` used for
 * its two new templates.
 *
 * Idempotent: guarded on `template_key` already existing, same pattern as
 * `059_add_admin_email_templates.js`.
 */

const TEMPLATE_KEY = 'inquiry_received';

exports.up = async function (knex) {
  const existing = await knex('email_templates').where('template_key', TEMPLATE_KEY).first();
  if (existing) return;

  await knex('email_templates').insert({
    template_key: TEMPLATE_KEY,
    subject_en: 'New inquiry: {{form_title}}',
    subject_de: 'Neue Anfrage: {{form_title}}',
    body_html_en: `
<h2>New inquiry: {{form_title}}</h2>

<p>Submitted from <strong>{{source_page}}</strong> at {{submitted_at}}.</p>

<pre style="white-space: pre-wrap; font-family: inherit; background-color: #f9f9f9; padding: 16px; border-radius: 8px; border: 1px solid #eee;">{{submission_summary}}</pre>`,
    body_text_en: `New inquiry: {{form_title}}

Submitted from {{source_page}} at {{submitted_at}}.

{{submission_summary}}`,
    body_html_de: `
<h2>Neue Anfrage: {{form_title}}</h2>

<p>Gesendet von <strong>{{source_page}}</strong> um {{submitted_at}}.</p>

<pre style="white-space: pre-wrap; font-family: inherit; background-color: #f9f9f9; padding: 16px; border-radius: 8px; border: 1px solid #eee;">{{submission_summary}}</pre>`,
    body_text_de: `Neue Anfrage: {{form_title}}

Gesendet von {{source_page}} um {{submitted_at}}.

{{submission_summary}}`,
    variables: JSON.stringify(['form_title', 'source_page', 'submitted_at', 'submission_summary']),
  });
};

exports.down = async function (knex) {
  await knex('email_templates').where('template_key', TEMPLATE_KEY).delete();
};
