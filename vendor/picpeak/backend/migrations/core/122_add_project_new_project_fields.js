/**
 * Migration: New Project form fields (PRD 22.2) on `projects`.
 *
 * At the pinned commit, 117_add_projects.js created `projects` with exactly
 * six columns (id, name, customer_account_id, status, created_at,
 * updated_at). PRD 22.2's New Project form collects several fields that
 * table does not yet carry — this migration adds them:
 *
 *   photography_type       — workflow/template/gallery-default context.
 *   first_event_date       — nullable date; "or TBD" is represented by
 *   first_event_date_tbd     the sibling boolean rather than a magic date
 *                             value, so a TBD project has a real, queryable
 *                             flag instead of an ambiguous NULL.
 *   venue_city              — same TBD pattern as the event date.
 *   venue_city_tbd
 *   lead_source             — reporting.
 *   internal_note           — photographer-only context (text, unbounded).
 *   secondary_contact_name  — optional partner/parent/planner contact.
 *   secondary_contact_email   Split into name/email/phone (rather than one
 *   secondary_contact_phone   JSON blob) to match how the primary contact's
 *                              own fields are modelled on customer_accounts,
 *                              and so each is independently queryable/
 *                              mergeable into documents and emails.
 *   current_phase           — PRD 23.1's seven-phase list (Lead, Booking,
 *                              Preparation, Shoot, Post-production,
 *                              Delivery, Closed). Defaults to 'lead', the
 *                              phase every new Project starts in.
 *
 * Idempotent: every column guarded by hasColumn.
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('projects'))) return;

  const columns = [
    'photography_type',
    'first_event_date',
    'first_event_date_tbd',
    'venue_city',
    'venue_city_tbd',
    'lead_source',
    'internal_note',
    'secondary_contact_name',
    'secondary_contact_email',
    'secondary_contact_phone',
    'current_phase',
  ];
  const missing = [];
  for (const column of columns) {
    if (!(await knex.schema.hasColumn('projects', column))) missing.push(column);
  }
  if (missing.length === 0) return;

  await knex.schema.alterTable('projects', (table) => {
    if (missing.includes('photography_type')) {
      table.string('photography_type', 64);
    }
    if (missing.includes('first_event_date')) {
      table.date('first_event_date');
    }
    if (missing.includes('first_event_date_tbd')) {
      table.boolean('first_event_date_tbd').notNullable().defaultTo(false);
    }
    if (missing.includes('venue_city')) {
      table.string('venue_city', 255);
    }
    if (missing.includes('venue_city_tbd')) {
      table.boolean('venue_city_tbd').notNullable().defaultTo(false);
    }
    if (missing.includes('lead_source')) {
      table.string('lead_source', 128);
    }
    if (missing.includes('internal_note')) {
      table.text('internal_note');
    }
    if (missing.includes('secondary_contact_name')) {
      table.string('secondary_contact_name', 255);
    }
    if (missing.includes('secondary_contact_email')) {
      table.string('secondary_contact_email', 255);
    }
    if (missing.includes('secondary_contact_phone')) {
      table.string('secondary_contact_phone', 64);
    }
    if (missing.includes('current_phase')) {
      table.string('current_phase', 24).notNullable().defaultTo('lead');
    }
  });
};

exports.down = async function (knex) {
  if (!(await knex.schema.hasTable('projects'))) return;

  const columns = [
    'photography_type',
    'first_event_date',
    'first_event_date_tbd',
    'venue_city',
    'venue_city_tbd',
    'lead_source',
    'internal_note',
    'secondary_contact_name',
    'secondary_contact_email',
    'secondary_contact_phone',
    'current_phase',
  ];
  const present = [];
  for (const column of columns) {
    if (await knex.schema.hasColumn('projects', column)) present.push(column);
  }
  if (present.length === 0) return;

  await knex.schema.alterTable('projects', (table) => {
    for (const column of present) {
      table.dropColumn(column);
    }
  });
};
