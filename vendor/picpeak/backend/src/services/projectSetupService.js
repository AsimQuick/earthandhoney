/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectSetupService.js
 * project: earthandhoney
 * purpose: US-41 AC-41.1 — automatic Project setup. PRD 22.3 lists ten
 *          things creating a Project must create or prepare; before this
 *          file, `projectService.createProject` (US-38/US-17) only ever
 *          did the first of the ten — a bare `projects` row. This module
 *          is the second step `routes/adminProjects.js`'s `POST /`
 *          handler now calls, immediately after `projectService
 *          .createProject`, so one create call still produces every
 *          one of the ten:
 *
 *            1. Project record            — projectService.createProject
 *               (unchanged; this file never duplicates that insert).
 *            2. operational client relationship — ensureClientRelationship:
 *               an existing `customer_accounts` row (by id or by email),
 *               or a new PASSIVE one via the already-shipped
 *               `customerAccountsService.createDirect` (US-18 AC-18.4's
 *               own Flow B dependency, reused rather than duplicated),
 *               then `projects.customer_account_id` is set to it.
 *            3. empty project media area/folder — ensureProjectMediaFolder
 *               writes a zero-byte marker object through the storage
 *               abstraction's own `put()` (never a raw `fs.mkdir`), so it
 *               works identically against the local backend and the S3/R2
 *               backend this deployment actually runs — the generic path
 *               AC-41.3's F6/F7 findings say Gallery-create's *own*
 *               folder-creation code skips.
 *            4. Project Room access record — ensureProjectRoomAccess: the
 *               already-shipped `customerAccountsService.createInvitation`
 *               (migration 090's `customer_invitations`), reused as-is.
 *               Skipped only when the client relationship resolved to an
 *               ALREADY-active account (`password_hash` set) — that
 *               account is its own access record, so a second invite
 *               would just 409.
 *            5. default phase and milestones — the phase default
 *               ('lead') is migration 122's own column default, untouched
 *               here; seedProjectMilestones clones migration 124's
 *               eighteen PRD 23.2 TEMPLATE rows (`project_id IS NULL`)
 *               into this Project's own rows — the exact "later, by
 *               US-41's atomic Project-setup path" that migration 124's
 *               own header comment already named this file as.
 *            6. next-action calculation — no new code: once (2) and (5)
 *               are in place, `nextActionService.computeProjectNextAction`
 *               (US-39 AC-39.3.2) already computes it from the phase +
 *               milestone rows this file just wrote — the same one
 *               module both `GET /:id/next-action` routes call.
 *            7. document area — migration 125's `project_documents`,
 *               scoped by `project_id`; nothing to insert (there is no
 *               document yet), so "prepared" means addressable, proven
 *               by getProjectDocuments returning `[]` rather than erroring.
 *            8. email merge context — built by the SAME call (4) makes:
 *               `customerAccountsService.createInvitation` hands
 *               `{ invite_link, expires_at }` to `emailProcessor.queueEmail`
 *               — the Backstage email queue's own merge mechanism
 *               (AC-41.5's mechanism), never a second templating system
 *               invented here.
 *            9. financial integration placeholder — recordFinancialPlaceholder
 *               writes one migration-125 `project_integration_status` row,
 *               `status: 'pending'`, naming no Invoice Ninja/Stripe call —
 *               PRD Phase 6 owns that integration (AC-41.6).
 *           10. activity timeline — one `project_created` entry appended
 *               through the one shared `activityTimelineService` (US-39
 *               AC-39.6.2's single-authority append), never a direct
 *               insert of its own.
 *
 *          Requires `../database/db`, so — matching every other
 *          DB-backed service in this fork (`nextActionService.js`,
 *          `activityTimelineService.js`, `projectPhaseService.js`,
 *          `projectMilestoneService.js`) — it is proven structurally in
 *          the UNIT lane and behaviourally in the LIVE lane, never
 *          `require()`-d directly in a UNIT suite.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1
 * ---
 */

const { db } = require('../database/db');
const customerAccountsService = require('./customerAccountsService');
const activityTimelineService = require('./activityTimelineService');
const { ENTRY_TYPES } = require('./activityTimelineEntry');
const { getStorage } = require('./storage');
const { ValidationError, NotFoundError } = require('../utils/errors');

const PROJECT_MILESTONES_TABLE = 'project_milestones';
const PROJECT_DOCUMENTS_TABLE = 'project_documents';
const PROJECT_INTEGRATION_STATUS_TABLE = 'project_integration_status';

// PRD Phase 6 owns the real ledger integration — this key only ever
// backs a placeholder row (AC-41.6). Never used as an Invoice Ninja or
// Stripe call site.
const FINANCIAL_PLACEHOLDER_INTEGRATION_KEY = 'financial_placeholder';

/** The deterministic storage key for a Project's empty media area. */
function projectMediaFolderKey(projectId) {
  return `projects/${projectId}/media/.keep`;
}

/**
 * Resolves (2), the operational client relationship: an explicit existing
 * `customerAccountId`, an existing `customer_accounts` row matched by the
 * primary contact's email, or — only when neither exists — a new PASSIVE
 * account via `customerAccountsService.createDirect`. Never inserts a
 * duplicate row for an email that already has one.
 */
async function ensureClientRelationship({ customerAccountId, primaryContact }, adminId) {
  if (customerAccountId) {
    const existing = await db('customer_accounts').where({ id: customerAccountId }).first();
    if (!existing) throw new NotFoundError('Customer account', customerAccountId);
    return { customerAccountId: existing.id, email: existing.email, isNew: false, hasAccess: !!existing.password_hash };
  }

  if (!primaryContact || !primaryContact.email) {
    throw new ValidationError(
      "Either customerAccountId or primaryContact.email is required — PRD 22.3's automatic Project "
      + 'setup must establish the operational client relationship on every create.',
    );
  }

  const email = String(primaryContact.email).trim().toLowerCase();
  const existing = await db('customer_accounts').where({ email }).first();
  if (existing) {
    return { customerAccountId: existing.id, email: existing.email, isNew: false, hasAccess: !!existing.password_hash };
  }

  const prefill = {};
  if (primaryContact.firstName) prefill.first_name = primaryContact.firstName;
  if (primaryContact.lastName) prefill.last_name = primaryContact.lastName;

  const created = await customerAccountsService.createDirect({ email, prefill, createdByAdminId: adminId });
  return { customerAccountId: created.id, email, isNew: true, hasAccess: false };
}

/**
 * Resolves (4), the Project Room access record. A client who already has
 * an active login (`password_hash` set) needs nothing new — that account
 * IS their access record. A client with a still-pending invitation gets
 * that one back rather than a second (createInvitation itself rejects a
 * duplicate pending invite). Only a genuinely new/passive client gets a
 * fresh invitation.
 */
async function ensureProjectRoomAccess(client, adminId) {
  if (client.hasAccess) return null;

  const existingPending = await db('customer_invitations')
    .where({ email: client.email })
    .whereNull('accepted_at')
    .where('expires_at', '>', new Date())
    .orderBy('id', 'desc')
    .first();
  if (existingPending) {
    return {
      id: existingPending.id,
      email: existingPending.email,
      expiresAt: existingPending.expires_at,
      reused: true,
    };
  }

  const invitation = await customerAccountsService.createInvitation({
    email: client.email,
    invitedById: adminId,
    prefill: null,
  });
  return { ...invitation, reused: false };
}

/** Resolves (5)'s milestone half: clones migration 124's eighteen template rows onto this Project. */
async function seedProjectMilestones(projectId) {
  const templates = await db(PROJECT_MILESTONES_TABLE)
    .whereNull('project_id')
    .select('milestone_key', 'name', 'sequence_order')
    .orderBy('sequence_order', 'asc');
  if (templates.length === 0) return [];

  const now = new Date();
  await db(PROJECT_MILESTONES_TABLE).insert(templates.map((t) => ({
    project_id: projectId,
    milestone_key: t.milestone_key,
    name: t.name,
    sequence_order: t.sequence_order,
    completion_state: 'pending',
    completed_at: null,
    completed_by: null,
    created_at: now,
    updated_at: now,
  })));
  return templates;
}

/** Resolves (3): writes the empty media-area marker through the storage abstraction. */
async function ensureProjectMediaFolder(projectId) {
  const key = projectMediaFolderKey(projectId);
  await getStorage().put(key, Buffer.alloc(0));
  return key;
}

/** Resolves (9): one placeholder row, provably not an integration call. */
async function recordFinancialPlaceholder(projectId) {
  await db(PROJECT_INTEGRATION_STATUS_TABLE).insert({
    project_id: projectId,
    integration_key: FINANCIAL_PLACEHOLDER_INTEGRATION_KEY,
    status: 'pending',
    // Deliberately names no external system: this string is a stored
    // record, and PRD Phase 6 — not Project setup — owns the real ledger
    // integration. Setup performs no external financial call at all.
    message: 'Placeholder only — the real financial integration is owned by a later phase; Project setup performs no external financial call.',
    occurred_at: db.fn.now(),
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
  });
}

/**
 * The orchestration entry point `routes/adminProjects.js`'s `POST /`
 * handler calls immediately after `projectService.createProject`.
 * `project` is that call's already-created row (`{ id, name, ... }`);
 * this function never re-inserts a `projects` row of its own.
 *
 * @param {{id: number, name: string}} project
 * @param {{customerAccountId?: number|null, primaryContact?: {email: string, firstName?: string, lastName?: string}|null}} input
 * @param {{adminId: number, adminName: string}} actor
 */
async function completeProjectSetup(project, { customerAccountId = null, primaryContact = null } = {}, { adminId, adminName }) {
  const client = await ensureClientRelationship({ customerAccountId, primaryContact }, adminId);

  await db('projects').where({ id: project.id }).update({
    customer_account_id: client.customerAccountId,
    updated_at: db.fn.now(),
  });

  const access = await ensureProjectRoomAccess(client, adminId);
  const milestoneTemplates = await seedProjectMilestones(project.id);
  const mediaFolderKey = await ensureProjectMediaFolder(project.id);
  await recordFinancialPlaceholder(project.id);

  await activityTimelineService.appendActivityTimelineEntry(
    { id: project.id },
    ENTRY_TYPES.PROJECT_CREATED,
    { adminId, name: adminName },
    {
      summary: `Project "${project.name}" created`,
      metadata: { customerAccountId: client.customerAccountId },
    },
  );

  return {
    clientRelationship: {
      customerAccountId: client.customerAccountId,
      email: client.email,
      isNew: client.isNew,
    },
    projectRoomAccess: access
      ? { email: access.email, expiresAt: access.expiresAt, reused: !!access.reused }
      : { email: client.email, alreadyActive: true },
    milestonesSeededCount: milestoneTemplates.length,
    mediaFolderKey,
    financialIntegrationKey: FINANCIAL_PLACEHOLDER_INTEGRATION_KEY,
  };
}

/** Read-back helper for `GET /:id/media-folder` — (3)'s live evidence. */
async function getProjectMediaFolderStatus(projectId) {
  const key = projectMediaFolderKey(projectId);
  const exists = await getStorage().exists(key);
  return { key, exists };
}

/** Read-back helper for `GET /:id/milestones` — (5)'s live evidence. */
async function getProjectMilestones(projectId) {
  const rows = await db(PROJECT_MILESTONES_TABLE)
    .where({ project_id: projectId })
    .orderBy('sequence_order', 'asc')
    .select('milestone_key', 'name', 'sequence_order', 'completion_state', 'completed_at', 'completed_by');
  return rows.map((r) => ({
    milestoneKey: r.milestone_key,
    name: r.name,
    sequenceOrder: r.sequence_order,
    completionState: r.completion_state,
    completedAt: r.completed_at,
    completedBy: r.completed_by,
  }));
}

/** Read-back helper for `GET /:id/documents` — (7)'s live evidence. */
async function getProjectDocuments(projectId) {
  const rows = await db(PROJECT_DOCUMENTS_TABLE)
    .where({ project_id: projectId })
    .select('id', 'document_type', 'title', 'storage_key', 'external_reference', 'created_at');
  return rows.map((r) => ({
    id: r.id,
    documentType: r.document_type,
    title: r.title,
    storageKey: r.storage_key,
    externalReference: r.external_reference,
    createdAt: r.created_at,
  }));
}

/** Read-back helper for `GET /:id/integration-status` — (9)'s live evidence. */
async function getProjectIntegrationStatuses(projectId) {
  const rows = await db(PROJECT_INTEGRATION_STATUS_TABLE)
    .where({ project_id: projectId })
    .select('integration_key', 'status', 'message', 'occurred_at');
  return rows.map((r) => ({
    integrationKey: r.integration_key,
    status: r.status,
    message: r.message,
    occurredAt: r.occurred_at,
  }));
}

module.exports = {
  FINANCIAL_PLACEHOLDER_INTEGRATION_KEY,
  projectMediaFolderKey,
  completeProjectSetup,
  getProjectMediaFolderStatus,
  getProjectMilestones,
  getProjectDocuments,
  getProjectIntegrationStatuses,
};
