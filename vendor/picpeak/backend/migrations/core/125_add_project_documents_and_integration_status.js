/**
 * Migration: per-Project document area and integration-status record
 * (US-38 AC-38.4).
 *
 * Nothing in the fork gives a Project either of these before this
 * migration. PRD 22.3 lists "document area" among the ten things
 * automatic Project setup prepares, and PRD 23.4 requires the
 * photographer's cockpit to show both "quote, contract, invoice,
 * payment, and receipt references" and "integration failures" — neither
 * has anywhere to live. This migration creates two new tables:
 *
 * `project_documents` — the per-Project document area. One row per
 * document reference held against a Project:
 *
 *   project_id          — the owning Project (cascade-deleted with it).
 *   document_type        — e.g. 'quote', 'contract', 'invoice', 'receipt',
 *                           'other', matching PRD 23.4's named references.
 *   title                — display label.
 *   storage_key          — nullable; set when the document itself is a
 *                           file this system stores (e.g. a signed
 *                           contract PDF) under our own storage backend.
 *   external_reference    — nullable; a stored external identifier (per
 *                           Reminder 4 — resolved over the owning
 *                           system's API, never a cross-database join)
 *                           for a document whose record of truth lives
 *                           in another system, e.g. the ledger. Which
 *                           system owns which identifier is a PROJECT_DATA_MODEL_ADR.md
 *                           decision (US-38 AC-38.7); this migration only
 *                           gives the column somewhere to be stored.
 *   created_at, updated_at
 *
 * `project_integration_status` — one row per status observation the
 * Project's integrations (financial placeholder, Stripe, the fork's own
 * email queue, webhooks, ...) report. PRD 23.4 requires the cockpit to
 * surface integration failures, and US-43 AC-43.3 asserts an induced
 * failure appears there, so a status row must be able to carry a
 * failure's message and timestamp, not just a bare state:
 *
 *   project_id     — the owning Project (cascade-deleted with it).
 *   integration_key — which integration this observation is about, e.g.
 *                     'financial_placeholder', 'stripe', 'email_queue',
 *                     'webhook'.
 *   status          — 'success' | 'pending' | 'failure' (app-level
 *                     vocabulary, not a DB enum, matching how
 *                     `project_milestones.completion_state` is modelled).
 *   message         — nullable; required in practice whenever status is
 *                     'failure' (US-43 AC-38.3's cockpit reads this),
 *                     optional descriptive text otherwise.
 *   occurred_at     — when the observation happened; distinct from
 *                     created_at so a status can be backfilled or
 *                     recorded slightly after the fact without losing the
 *                     real event time.
 *   created_at, updated_at
 *
 * Both tables are additive and carry no data of their own yet — rows are
 * written by later stories (US-41's atomic Project setup, US-43's
 * cockpit, integration call sites). This migration only establishes that
 * both areas exist and are queryable, per AC-38.4.
 *
 * Idempotent: each table creation guarded by hasTable, matching this
 * fork's established migration pattern (122-124).
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('project_documents'))) {
    await knex.schema.createTable('project_documents', (table) => {
      table.increments('id').primary();
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.string('document_type', 32).notNullable();
      table.string('title', 255).notNullable();
      table.string('storage_key', 512);
      table.string('external_reference', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['project_id']);
      table.index(['project_id', 'document_type']);
    });
  }

  if (!(await knex.schema.hasTable('project_integration_status'))) {
    await knex.schema.createTable('project_integration_status', (table) => {
      table.increments('id').primary();
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.string('integration_key', 64).notNullable();
      table.string('status', 24).notNullable();
      table.text('message');
      table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['project_id']);
      table.index(['project_id', 'integration_key']);
    });
  }
};

exports.down = async function (knex) {
  if (await knex.schema.hasTable('project_integration_status')) {
    await knex.schema.dropTable('project_integration_status');
  }
  if (await knex.schema.hasTable('project_documents')) {
    await knex.schema.dropTable('project_documents');
  }
};
