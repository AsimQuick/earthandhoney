/**
 * Migration: Event detail fields (PRD 22.4) on `events`.
 *
 * PRD 22.4 names ten things a Project's event detail must carry. At the
 * pinned commit plus migration 122 (US-38 AC-38.1), `events` already covers
 * four of them:
 *
 *   name/type            — event_name, event_type            (001_init.js)
 *   date/time             — event_date, event_time_start,
 *                            event_time_end                   (001_init.js,
 *                            107_crm_consolidated.js)
 *   full-day state         — is_full_day                      (107_crm_consolidated.js)
 *
 * "or TBD" for the date/time item has no representation yet — event_date is
 * NOT NULL at the table level, so there is no way to record "date not yet
 * set" today. This migration closes that gap and adds the six items with no
 * column at all:
 *
 *   event_date_tbd          — the explicit TBD flag for date/time, same
 *                              pattern as projects.first_event_date_tbd
 *                              from migration 122: a real, queryable flag
 *                              rather than an ambiguous placeholder date.
 *   venue_name               — venue name.
 *   venue_address            — full address.
 *   venue_map_link            — map link (URL).
 *   coordinator_name          — the on-site coordinator/contact, split into
 *   coordinator_email          name/email/phone (rather than one JSON blob)
 *   coordinator_phone          for the same reason migration 122 split the
 *                              secondary contact: independently queryable
 *                              and mergeable into documents and emails.
 *   coverage_notes            — what the photographer is contracted to
 *                              cover on the day; visible internally.
 *   client_visible_notes      — notes about the event the client is meant
 *                              to see in the Project Room.
 *   internal_notes            — photographer-only context. Deliberately a
 *                              separate column from client_visible_notes
 *                              (never the same field gated by a flag) so
 *                              US-44 AC-44.2 can assert the internal one is
 *                              structurally absent from any client-facing
 *                              payload, not merely hidden by a filter that
 *                              could be forgotten on one code path.
 *
 * Idempotent: every column guarded by hasColumn, same shape as 122.
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('events'))) return;

  const columns = [
    'event_date_tbd',
    'venue_name',
    'venue_address',
    'venue_map_link',
    'coordinator_name',
    'coordinator_email',
    'coordinator_phone',
    'coverage_notes',
    'client_visible_notes',
    'internal_notes',
  ];
  const missing = [];
  for (const column of columns) {
    if (!(await knex.schema.hasColumn('events', column))) missing.push(column);
  }
  if (missing.length === 0) return;

  await knex.schema.alterTable('events', (table) => {
    if (missing.includes('event_date_tbd')) {
      table.boolean('event_date_tbd').notNullable().defaultTo(false);
    }
    if (missing.includes('venue_name')) {
      table.string('venue_name', 255);
    }
    if (missing.includes('venue_address')) {
      table.text('venue_address');
    }
    if (missing.includes('venue_map_link')) {
      table.string('venue_map_link', 1024);
    }
    if (missing.includes('coordinator_name')) {
      table.string('coordinator_name', 255);
    }
    if (missing.includes('coordinator_email')) {
      table.string('coordinator_email', 255);
    }
    if (missing.includes('coordinator_phone')) {
      table.string('coordinator_phone', 64);
    }
    if (missing.includes('coverage_notes')) {
      table.text('coverage_notes');
    }
    if (missing.includes('client_visible_notes')) {
      table.text('client_visible_notes');
    }
    if (missing.includes('internal_notes')) {
      table.text('internal_notes');
    }
  });
};

exports.down = async function (knex) {
  if (!(await knex.schema.hasTable('events'))) return;

  const columns = [
    'event_date_tbd',
    'venue_name',
    'venue_address',
    'venue_map_link',
    'coordinator_name',
    'coordinator_email',
    'coordinator_phone',
    'coverage_notes',
    'client_visible_notes',
    'internal_notes',
  ];
  const present = [];
  for (const column of columns) {
    if (await knex.schema.hasColumn('events', column)) present.push(column);
  }
  if (present.length === 0) return;

  await knex.schema.alterTable('events', (table) => {
    for (const column of present) {
      table.dropColumn(column);
    }
  });
};
