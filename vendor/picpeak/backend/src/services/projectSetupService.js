/**
 * ---
 * file: vendor/picpeak/backend/src/services/projectSetupService.js
 * project: earthandhoney
 * purpose: US-41 AC-41.1.2.1 — the single shared setup path PRD 22.3
 *          requires: one `completeProjectSetup` entry point that
 *          `routes/adminProjects.js`'s `POST /` handler calls once,
 *          immediately after `projectService.createProject` — one create
 *          call, one setup path, not ten call sites that happen to agree,
 *          the same single-authority shape AC-39.3.2 proved for the next
 *          action and AC-39.6.2 for the timeline. This file exports
 *          exactly that one entry point; item 1 (the Project record
 *          itself) stays `projectService.createProject`'s own insert —
 *          this module never creates the Project — and no read-back
 *          route is added here (AC-41.1.2.3's scope).
 *
 *          PROJECT_SETUP_MECHANISM_MAP.md (AC-41.1.1) named, for each of
 *          PRD 22.3's other nine items, the one fork mechanism that
 *          satisfies it. Six of those nine need code from this module;
 *          three (6 next-action, 7 document area, 8 email merge context)
 *          need none, for the structural reasons the map gives under each
 *          — nothing exists yet to insert for any of the three:
 *
 *            2. operational client relationship — ensureClientRelationship:
 *               an existing `customer_accounts` row (by id, or found by
 *               the caller's primary-contact email), or — only when
 *               neither resolves — a new PASSIVE row via the
 *               already-shipped `customerAccountsService.createDirect`.
 *               The map's item 2(b) records this item can never be
 *               satisfied by mere addressability, so a create supplying
 *               neither `customerAccountId` nor `primaryContactEmail` is
 *               rejected here with a `ValidationError` rather than
 *               producing a Project that fails it (AC-41.2). The
 *               resulting `projects.customer_account_id` write goes
 *               through `projectService.updateProject`, the existing
 *               owner of that table — this file never writes `projects`
 *               itself.
 *            3. empty project media area/folder — ensureProjectMediaArea
 *               writes a zero-byte marker object through the storage
 *               abstraction's own `put()`, never a raw filesystem call —
 *               the mistake the map found in Gallery-create's own
 *               folder-creation code (upstream findings F6/F7).
 *            4. Project Room access record — ensureProjectRoomAccess: the
 *               already-shipped `customerAccountsService.createInvitation`,
 *               reused as-is including its own duplicate guard; skipped
 *               when the resolved client already has an active login
 *               (`password_hash` set) — that account already IS its own
 *               access record, per the map's answer B. `createInvitation`
 *               queues its own invitation email through
 *               `emailProcessor.queueEmail` — item 8's merge context,
 *               built entirely by the email queue's own mechanism; this
 *               file builds no template and calls no second merge system.
 *            5. default phase and milestones — the phase default ('lead')
 *               is migration 122's own column default, already set by
 *               item 1's insert. seedProjectMilestones clones migration
 *               124's eighteen PRD 23.2 template rows (`project_id IS
 *               NULL`) into this Project's own rows.
 *            9. financial integration placeholder —
 *               recordFinancialPlaceholder writes one migration-125
 *               `project_integration_status` row, `status: 'pending'`,
 *               naming no external system and making no external call
 *               (AC-41.6).
 *           10. activity timeline — one `ENTRY_TYPES.PROJECT_CREATED`
 *               entry through the one shared `activityTimelineService`
 *               (US-39 AC-39.6.2), never a direct insert.
 *               `PROJECT_CREATED` is the fourth `ENTRY_TYPES` member this
 *               AC adds to `activityTimelineEntry.js` — the map's item 10
 *               recorded it missing.
 *
 *          The pure shapes (the media-area key, a cloned milestone row,
 *          the placeholder row, the timeline summary text) live in
 *          `projectSetupRules.js`, unit-testable without Docker. This
 *          file requires `../database/db`, so — matching every other
 *          DB-backed service in this fork (`nextActionService.js`,
 *          `activityTimelineService.js`) — it is proven structurally in
 *          the UNIT lane and behaviourally in the LIVE lane, never
 *          `require()`-d directly in a UNIT suite.
 *
 *          Whether the writes below belong in one transaction is
 *          AC-41.4's question, not this AC's.
 *
 *          US-41 AC-41.1.2.3 adds this module's other half: one read-back
 *          function per item the mechanism map's question 12 recorded as
 *          having no read-back route at all — media area (item 3), Project
 *          Room access (item 4), the milestone list (item 5), the
 *          document area (item 7) and the integration status (item 9).
 *          `routes/adminProjects.js` adds one `GET` per function
 *          (`/:id/media-area`, `/:id/room-access`, `/:id/milestones`,
 *          `/:id/documents`, `/:id/integration-status`), each reading
 *          through its named function here and never through a query of
 *          its own — the same single-authority shape as the write side,
 *          now proven for reads too. Each function returns `null` when the
 *          Project itself does not exist, so the route can 404 without a
 *          lookup of its own.
 * created-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.1
 * updated-by: dev-team
 * related-story: US-41
 * related-ac: 41.1.2.3
 * ---
 */

const { db } = require('../database/db');
const projectService = require('./projectService');
const customerAccountsService = require('./customerAccountsService');
const activityTimelineService = require('./activityTimelineService');
const { ENTRY_TYPES } = require('./activityTimelineEntry');
const { getStorage } = require('./storage');
const {
  projectMediaFolderKey,
  cloneMilestoneTemplateRows,
  buildFinancialPlaceholderRow,
  describeProjectCreated,
} = require('./projectSetupRules');
const { ValidationError, ConflictError } = require('../utils/errors');

const PROJECT_MILESTONES_TABLE = 'project_milestones';
const PROJECT_INTEGRATION_STATUS_TABLE = 'project_integration_status';
const PROJECT_DOCUMENTS_TABLE = 'project_documents';
const CUSTOMER_ACCOUNTS_TABLE = 'customer_accounts';
const CUSTOMER_INVITATIONS_TABLE = 'customer_invitations';

/**
 * PRD 22.3 item 2. An explicit existing `customerAccountId`, or — only
 * when the caller supplies none — a new PASSIVE account via the
 * already-shipped `customerAccountsService.createDirect`, keyed on the
 * primary contact's email. Never inserts into `customer_accounts` itself
 * when an existing row (by id or by email) already resolves the
 * relationship.
 */
async function ensureClientRelationship({ customerAccountId, primaryContactEmail }, adminId) {
  if (customerAccountId) {
    const existing = await db(CUSTOMER_ACCOUNTS_TABLE).where({ id: customerAccountId }).first();
    if (!existing) {
      throw new ValidationError(`No customer account with id ${customerAccountId} exists.`);
    }
    return { customerAccountId: existing.id, email: existing.email, hasActiveAccount: !!existing.password_hash };
  }

  const email = String(primaryContactEmail || '').trim().toLowerCase();
  if (!email) {
    throw new ValidationError(
      "Either customerAccountId or primaryContactEmail is required — PRD 22.3's automatic "
      + 'Project setup must establish the operational client relationship on every create.',
    );
  }

  const existing = await db(CUSTOMER_ACCOUNTS_TABLE).where({ email }).first();
  if (existing) {
    return { customerAccountId: existing.id, email: existing.email, hasActiveAccount: !!existing.password_hash };
  }

  const created = await customerAccountsService.createDirect({ email, prefill: {}, createdByAdminId: adminId });
  return { customerAccountId: created.id, email, hasActiveAccount: false };
}

/**
 * PRD 22.3 item 4. A client with an already-active login needs nothing
 * new — that account IS its own access record. Everyone else gets
 * `customerAccountsService.createInvitation`, whose own idempotency guard
 * (a still-open invitation for this email, or an already-active account
 * racing us) is honoured rather than re-implemented here: a
 * `ConflictError` from it means an access record already exists, which is
 * the state this item asks for. Every other failure propagates.
 */
async function ensureProjectRoomAccess(client, adminId) {
  if (client.hasActiveAccount) return;

  try {
    await customerAccountsService.createInvitation({ email: client.email, invitedById: adminId, prefill: null });
  } catch (error) {
    if (!(error instanceof ConflictError)) throw error;
  }
}

/**
 * PRD 22.3 item 5's milestone half: clones migration 124's eighteen
 * `project_id IS NULL` template rows onto this Project.
 */
async function seedProjectMilestones(projectId) {
  const templates = await db(PROJECT_MILESTONES_TABLE)
    .whereNull('project_id')
    .select('milestone_key', 'name', 'sequence_order')
    .orderBy('sequence_order', 'asc');
  if (templates.length === 0) return;

  await db(PROJECT_MILESTONES_TABLE).insert(cloneMilestoneTemplateRows(templates, projectId, new Date()));
}

/**
 * PRD 22.3 item 3: the empty media area, written through the storage
 * abstraction — the one mechanism the map named, and the reason F6/F7's
 * EACCES does not reproduce here (that defect is Gallery-create's own raw
 * `fs.mkdir` bypass of this abstraction, not the abstraction itself).
 */
async function ensureProjectMediaArea(projectId) {
  await getStorage().put(projectMediaFolderKey(projectId), Buffer.alloc(0));
}

/** PRD 22.3 item 9: one placeholder row, provably not an external integration call. */
async function recordFinancialPlaceholder(projectId) {
  await db(PROJECT_INTEGRATION_STATUS_TABLE).insert(buildFinancialPlaceholderRow(projectId, new Date()));
}

/**
 * The single setup path `routes/adminProjects.js`'s `POST /` handler
 * calls immediately after `projectService.createProject`. `project` is
 * that call's already-created row (item 1); this function never inserts
 * a `projects` row of its own, and its only write to that table is the
 * follow-up `customer_account_id` assignment — through `projectService`,
 * and only when the create insert did not already carry it.
 *
 * Items 1, 6, 7 and 8 need no code here: item 1 is the caller's own
 * insert; items 6-8 have nothing to insert, per
 * PROJECT_SETUP_MECHANISM_MAP.md's own analysis of each.
 *
 * @param {{id: number, name: string, customerAccountId: number|null}} project
 * @param {{customerAccountId?: number|null, primaryContactEmail?: string|null}} request
 * @param {{adminId: number, adminName: string}} actor
 */
async function completeProjectSetup(project, { customerAccountId = null, primaryContactEmail = null } = {}, { adminId, adminName }) {
  // Item 2 — the operational client relationship, assigned explicitly.
  const client = await ensureClientRelationship({ customerAccountId, primaryContactEmail }, adminId);
  if (project.customerAccountId !== client.customerAccountId) {
    await projectService.updateProject(project.id, { customerAccountId: client.customerAccountId });
  }

  // Item 4 (and, through it, item 8's merge context).
  await ensureProjectRoomAccess(client, adminId);

  // Item 5's milestone half — the phase half is migration 122's own column default.
  await seedProjectMilestones(project.id);

  // Item 3 — the media area, through the storage abstraction only.
  await ensureProjectMediaArea(project.id);

  // Item 9 — the financial placeholder row.
  await recordFinancialPlaceholder(project.id);

  // Item 10 — one timeline entry, through the one shared append function.
  await activityTimelineService.appendActivityTimelineEntry(
    { id: project.id },
    ENTRY_TYPES.PROJECT_CREATED,
    { adminId, name: adminName },
    {
      summary: describeProjectCreated(project.name),
      metadata: { customerAccountId: client.customerAccountId },
    },
  );
}

/**
 * AC-41.1.2.3 read-back, item 3: whether the zero-byte media-area marker
 * `ensureProjectMediaArea` writes actually exists, checked through the same
 * storage abstraction's own `exists()` — never a raw filesystem check.
 * Returns `null` when the Project itself does not exist.
 */
async function getProjectMediaAreaStatus(projectId) {
  const project = await projectService.getProjectById(projectId);
  if (!project) return null;
  const key = projectMediaFolderKey(projectId);
  const exists = await getStorage().exists(key);
  return { projectId, key, exists };
}

/**
 * AC-41.1.2.3 read-back, item 4: this Project's resolved client's access
 * state. Per PROJECT_SETUP_MECHANISM_MAP.md's answer B there is no
 * dedicated per-Project access table — access resolves to whichever of
 * item 2's own objects lets the client authenticate: an active
 * `customer_accounts` login, or a still-open (not yet accepted)
 * `customer_invitations` row — the map's own wording for this item, kept
 * literally, so this read-back states no access rule the map did not
 * record. Returns `null` when the Project itself does not exist.
 */
async function getProjectRoomAccessStatus(projectId) {
  const project = await projectService.getProjectById(projectId);
  if (!project) return null;
  if (!project.customerAccountId) {
    return { projectId, customerAccountId: null, hasActiveAccount: false, invitationPending: false };
  }

  const account = await db(CUSTOMER_ACCOUNTS_TABLE).where({ id: project.customerAccountId }).first();
  const hasActiveAccount = !!(account && account.password_hash);
  let invitationPending = false;
  if (!hasActiveAccount && account) {
    const pending = await db(CUSTOMER_INVITATIONS_TABLE).where({ email: account.email }).whereNull('accepted_at').first();
    invitationPending = !!pending;
  }
  return { projectId, customerAccountId: project.customerAccountId, hasActiveAccount, invitationPending };
}

/**
 * AC-41.1.2.3 read-back, item 5's milestone list: this Project's own
 * cloned `project_milestones` rows (never the `project_id IS NULL`
 * templates), sequence-order first. Returns `null` when the Project
 * itself does not exist.
 */
async function getProjectMilestones(projectId) {
  const project = await projectService.getProjectById(projectId);
  if (!project) return null;
  const milestones = await db(PROJECT_MILESTONES_TABLE)
    .where({ project_id: projectId })
    .select('milestone_key', 'name', 'sequence_order', 'completion_state', 'completed_at', 'completed_by')
    .orderBy('sequence_order', 'asc');
  return { projectId, milestones };
}

/**
 * AC-41.1.2.3 read-back, item 7: this Project's `project_documents` rows.
 * Migration 125 records this table as additive and carrying no data of
 * its own yet, so a correctly-empty array is the expected answer for
 * every Project today — the same well-defined empty result the map's item
 * 7 already described. Returns `null` when the Project itself does not
 * exist.
 */
async function getProjectDocuments(projectId) {
  const project = await projectService.getProjectById(projectId);
  if (!project) return null;
  const documents = await db(PROJECT_DOCUMENTS_TABLE)
    .where({ project_id: projectId })
    .select('id', 'document_type', 'title', 'storage_key', 'external_reference', 'created_at', 'updated_at')
    .orderBy('created_at', 'asc');
  return { projectId, documents };
}

/**
 * AC-41.1.2.3 read-back, item 9: this Project's `project_integration_status`
 * rows — today, exactly the one 'financial_placeholder' row
 * `recordFinancialPlaceholder` writes. Returns `null` when the Project
 * itself does not exist.
 */
async function getProjectIntegrationStatus(projectId) {
  const project = await projectService.getProjectById(projectId);
  if (!project) return null;
  const integrations = await db(PROJECT_INTEGRATION_STATUS_TABLE)
    .where({ project_id: projectId })
    .select('integration_key', 'status', 'message', 'occurred_at', 'created_at', 'updated_at')
    .orderBy('occurred_at', 'asc');
  return { projectId, integrations };
}

module.exports = {
  completeProjectSetup,
  getProjectMediaAreaStatus,
  getProjectRoomAccessStatus,
  getProjectMilestones,
  getProjectDocuments,
  getProjectIntegrationStatus,
};
