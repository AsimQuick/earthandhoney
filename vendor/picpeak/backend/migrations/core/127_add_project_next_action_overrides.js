/**
 * Migration: a photographer's manual override of a Project's computed next
 * action (US-39 AC-39.5, PRD 23.4 "manual overrides").
 *
 * Nothing in the fork lets a photographer replace the AC-39.3.2 computed
 * next-action string before this migration — `computeProjectNextAction`
 * (`nextActionService.js`) is the only source. This migration creates
 * `project_next_action_overrides`, one row per Project (`project_id`
 * unique), so a Project has at most one *current* override rather than an
 * accumulating history:
 *
 *   project_id     — the overridden Project. Unique: a repeat override
 *                     replaces the prior one (upserted by
 *                     `nextActionOverrideService.js`), it does not
 *                     accumulate.
 *   override_text  — the photographer-authored replacement text.
 *   actor_admin_id — the admin who set the current override. SET NULL on
 *                     delete so the row (and its actor_name snapshot)
 *                     survives an admin account being removed later.
 *   actor_name     — a snapshot of that admin's username at write time,
 *                     the durable "who" this AC's evidence reads back even
 *                     if actor_admin_id is later nulled.
 *   created_at     — when this Project was FIRST overridden.
 *   updated_at     — when the current override was set; the "timestamp"
 *                     this AC's evidence clause requires, refreshed on
 *                     every subsequent override of the same Project.
 *
 * This is a distinct concept from `project_booking_requirements`' own,
 * unrelated use of the word "override" (a Project's non-default booking
 * requirement set, migration 126) — different table, different meaning.
 *
 * Idempotent: table creation guarded by hasTable, matching migrations
 * 122-126's convention. No seed data — an override only ever exists once a
 * photographer sets one.
 */

exports.up = async function (knex) {
  if (!(await knex.schema.hasTable('project_next_action_overrides'))) {
    await knex.schema.createTable('project_next_action_overrides', (table) => {
      table.increments('id').primary();
      table.integer('project_id').unsigned().notNullable()
        .references('id').inTable('projects').onDelete('CASCADE');
      table.text('override_text').notNullable();
      table.integer('actor_admin_id').unsigned()
        .references('id').inTable('admin_users').onDelete('SET NULL');
      table.string('actor_name', 255).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['project_id']);
    });
  }
};

exports.down = async function (knex) {
  if (await knex.schema.hasTable('project_next_action_overrides')) {
    await knex.schema.dropTable('project_next_action_overrides');
  }
};
