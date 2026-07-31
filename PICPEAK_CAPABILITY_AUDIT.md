<!--
---
file: PICPEAK_CAPABILITY_AUDIT.md
project: earthandhoney
purpose: AC-15.2 — identify a specific upstream PicPeak commit that contains
         all four capabilities the pivot depends on (Projects grouping above
         galleries, customer accounts, webhooks, S3-compatible storage), and
         record the evidence for each capability at that commit. States that
         a single such commit exists on the default branch, so the AC's
         blocking-finding condition is not triggered.
created-by: dev-team
related-story: US-15
related-ac: 15.2
---
-->

# PicPeak Upstream — Capability Audit and Candidate Commit (AC-15.2)

## 1. Method

For each of the four required capabilities, the upstream repository
(`https://github.com/PicPeak/picpeak`, verified to exist and be MIT-licensed
in `PICPEAK_LICENCE_VERIFICATION.md`, AC-15.1) was queried via the GitHub
Commits API (`GET /repos/PicPeak/picpeak/commits?path=<file>`), paginated to
the last page, to find the **first commit that introduced the file(s)
implementing that capability**. The capability introduced most recently
among the four sets a floor: no commit before it can contain all four. That
commit's tree was then checked directly (`GET
/repos/PicPeak/picpeak/contents/<file>?ref=<sha>`) to confirm the other three
capabilities' files are also present there (i.e. not introduced-then-removed
out of order), and `GET /repos/PicPeak/picpeak/compare/<sha>...main` was used
to confirm the commit is an ancestor of the current default branch (`main`),
not an abandoned branch.

This decision logic — "does the candidate commit have all required
capabilities present, and if not, what is missing" — is encoded and
unit-tested in `auditCapabilities` (`src/lib/capabilityAudit.ts`).

## 2. Evidence per capability

### Projects grouping above galleries

- **File:** `backend/src/routes/adminProjects.js` (+ `backend/src/services/projectService.js`)
- **Introducing commit:** `eb263137b98935754155824de2a03848121304b6`
- **Commit date:** 2026-06-06T01:50:55Z
- **Commit message:** `feat(crm): Project Overview phase 2 — project service + routes`
- **Evidence:** the file's own header comment states *"Mounted at
  /api/admin/projects. Projects group events; the overview rolls up the
  per-event/per-customer documents."* In PicPeak, an "event" is the gallery
  entity served by `gallery.js` (a public gallery is fetched and rendered
  per-event slug) — so "Projects group events" is exactly "Projects group
  above galleries."

### Customer accounts

- **Files:** `backend/src/routes/customer.js`, `backend/src/routes/customerAuth.js`,
  `backend/src/routes/adminCustomers.js`
- **Introducing commit:** `087ef45942a8a51d09af2cd8ec85aca330f6cf7f`
- **Commit date:** 2026-05-10T22:05:20Z
- **Commit message:** `feat(customers): customer portal (#354) on top of feature-flags reorg`
- **Evidence:** commit message documents new schema tables
  `customer_accounts`, `customer_invitations`, `event_customer_assignments`,
  `customer_password_resets`, RBAC permissions `customers.view/.create/.delete`,
  and endpoints `/api/admin/customers` (invite, list, search, assign,
  deactivate, reset password) plus `/api/customer/auth/*` and
  `/api/customer/*` (login, dashboard, accept-invite, reset).

### Webhooks

- **File:** `backend/src/routes/adminWebhooks.js` (+ `webhookService.js`, `webhookDeliveryWorker`)
- **Introducing commit:** `c488f481caacf0d63dafc47f509e8de2708bc30f`
- **Commit date:** 2026-04-28T08:07:39Z
- **Commit message:** `feat: outbound webhooks for event/photo lifecycle (#327)`
- **Evidence:** commit message documents schema (`webhooks`, `webhook_deliveries`
  tables, migration 082), HMAC-SHA256 signed delivery, retry/backoff, and
  admin endpoints `/api/admin/webhooks` (CRUD + test + deliveries + replay).
  Verified upstream with 8/8 backend integration tests and 1/1 Playwright
  E2E spec per the commit message.

### S3-compatible storage

- **File:** `backend/src/services/storage/S3StorageBackend.js` (+ `StorageBackend.js`, `LocalFsStorage.js`, `index.js`)
- **Introducing commit:** `1b717ce5ededa343d2fbb7e1c3493b4434743565`
- **Commit date:** 2026-04-28T08:06:36Z
- **Commit message:** `feat: native S3 storage backend (#328) + presigned download follow-up`
- **Evidence:** commit message documents `STORAGE_BACKEND=local|s3` selecting
  between `LocalFsStorage` and `S3StorageBackend` behind a shared
  `StorageBackend` interface, explicitly naming AWS S3, MinIO, **Cloudflare
  R2**, Backblaze B2, Wasabi, and DigitalOcean Spaces as supported targets —
  directly compatible with this project's Cloudflare R2 storage requirement.
  Note: an earlier, narrower `s3Storage.js` (S3/MinIO adapter scoped only to
  the *backup* feature) exists from commit `f6a79c815e3085a56cbe7bac2964dd135f5e88bb`
  (2025-07-22), but that does not cover storing photos/galleries themselves —
  the capability this pivot depends on is the general-purpose storage
  backend from `S3StorageBackend.js` above, which all managed photo/thumbnail/
  hero/watermark/archive read-write paths were refactored onto in the same
  commit.

## 3. Candidate commit — all four present together

The capability introduced most recently among the four is **Projects
grouping** (`eb263137b98935754155824de2a03848121304b6`, 2026-06-06). Its tree
was checked directly and confirms the other three capabilities' files are
also present at that commit:

| File | Blob SHA at `eb263137` | Size |
|---|---|---|
| `backend/src/routes/customer.js` | `1db4979148312b19837cb54c1c50e26dfe583f66` | 29512 |
| `backend/src/routes/adminWebhooks.js` | `fa1d4fece766b9f4c11856d095fdd261b2c7a5d6` | 16164 |
| `backend/src/services/storage/S3StorageBackend.js` | `31701d3a95021ec8b0ac153c555e328ab0372eaa` | 5543 |
| `backend/src/routes/adminProjects.js` | `ec19d3267dcb837cc910c66c8288209a2c3f843f` | 4168 |

`GET /repos/PicPeak/picpeak/compare/eb263137b98935754155824de2a03848121304b6...main`
returned `status: "ahead"`, `ahead_by: 622`, `behind_by: 0` — confirming this
commit is an ancestor of the current `main` HEAD
(`3bcded78a448f5b099e87a73c7f1e44e859882aa`), not on an abandoned branch.

**Candidate commit: `eb263137b98935754155824de2a03848121304b6`** (branch:
`main`, dated 2026-06-06T01:50:55Z). This is recorded here as the earliest
commit verified to provide all four capabilities; AC-15.3 pins the fork to
the specific commit selected for the actual fork baseline (which may be this
commit or a later one on `main`, at the Dev Team's discretion for other
stability/dependency reasons — but not an earlier one, since no earlier
commit can contain the Projects-grouping capability).

## 4. Conclusion and blocking-finding status

**All four capabilities are provided by a single upstream commit.** Per
AC-15.2's condition — "If no single commit provides all four, the gap is
documented as a blocking finding" — that condition is **not** triggered; no
blocking finding is raised, and `auditCapabilities` (`src/lib/capabilityAudit.ts`)
run against this evidence set returns `allPresent: true` and
`blockingFinding: null`.

- **Audited:** 2026-07-31
- **Audited by:** dev-team (US-15, AC-15.2)
