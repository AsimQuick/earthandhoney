/**
 * ---
 * file: src/__tests__/us38-ac38.7-project-data-model-adr.test.ts
 * project: earthandhoney
 * purpose: Verify AC-38.7 — PROJECT_DATA_MODEL_ADR.md records the option
 *          chosen, the options rejected, and the reason, for two decisions:
 *          (a) extending the fork's own `projects`/`events` tables versus a
 *          parallel Earth & Honey project table, and (b) where the
 *          Project-to-Inquiry and Project-to-ledger cross-system
 *          identifiers live, per Reminder 4. Also asserts the financial
 *          identifier is recorded as a placeholder, quoted verbatim from
 *          the AC text, rather than implying a live ledger integration.
 *          Cross-checks the ADR's citations against the actual migrations
 *          and services they reference, so the claims are evidence, not
 *          assertion.
 * created-by: dev-team
 * related-story: US-38
 * related-ac: 38.7
 * ---
 */
import fs from 'fs'
import path from 'path'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const exists = (rel: string) => fs.existsSync(path.join(root, rel))

const DOC_PATH = 'PROJECT_DATA_MODEL_ADR.md'

describe('AC-38.7: PROJECT_DATA_MODEL_ADR.md exists and carries its structured header', () => {
  it('exists at the repo root', () => {
    expect(exists(DOC_PATH)).toBe(true)
  })

  const doc = read(DOC_PATH)

  it('carries the structured metadata header required for every code/doc file', () => {
    expect(doc).toMatch(/file:\s*PROJECT_DATA_MODEL_ADR\.md/)
    expect(doc).toMatch(/related-story:\s*US-38/)
    expect(doc).toMatch(/related-ac:\s*38\.7/)
  })
})

describe('AC-38.7: decision (a) — extend fork tables vs. a parallel Earth & Honey project table', () => {
  const doc = read(DOC_PATH)
  const start = doc.indexOf('## Decision (a)')
  const end = doc.indexOf('## Decision (b)')

  it('has a dedicated decision (a) section, before decision (b)', () => {
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
  })

  const section = doc.slice(start, end)

  it('names the option chosen: extend projects/events in place', () => {
    expect(section).toMatch(/Decision: Option 1.*extend `projects`\/`events` in place/i)
  })

  it('names the rejected options: a parallel Earth & Honey project table, and a fully duplicated table', () => {
    expect(section).toMatch(/parallel Earth\s*&\s*Honey project table/i)
    expect(section).toMatch(/Option 2 \(a parallel Earth & Honey project table\) was rejected/)
    expect(section).toMatch(/Option 3 \(a wholly independent, unlinked duplicate\) was rejected/)
  })

  it('gives a reason grounded in Pillar 5 (one owner per business function)', () => {
    expect(section).toMatch(/Pillar 5/)
    expect(section).toMatch(/duplicate ownership/i)
  })

  it('cites the actual migrations implementing the chosen option', () => {
    for (const migration of [
      '122_add_project_new_project_fields.js',
      '123_add_event_detail_fields.js',
      '124_add_project_milestones.js',
      '125_add_project_documents_and_integration_status.js',
    ]) {
      expect(section).toContain(migration)
    }
  })

  describe('citations are real', () => {
    it('098_add_email_template_category.js alters email_templates via knex.schema.alterTable', () => {
      const src = read('vendor/picpeak/backend/migrations/core/098_add_email_template_category.js')
      expect(src).toMatch(/alterTable\('email_templates'/)
    })

    it('112_add_customer_skonto_disabled.js alters customer_accounts via knex.schema.alterTable', () => {
      const src = read('vendor/picpeak/backend/migrations/core/112_add_customer_skonto_disabled.js')
      expect(src).toMatch(/alterTable\('customer_accounts'/)
    })

    it('122 and 123 use ALTER TABLE (hasColumn-guarded), 124 and 125 use CREATE TABLE (hasTable-guarded)', () => {
      const alterMigrations = ['122_add_project_new_project_fields.js', '123_add_event_detail_fields.js']
      const createMigrations = ['124_add_project_milestones.js', '125_add_project_documents_and_integration_status.js']
      for (const file of alterMigrations) {
        const src = read(`vendor/picpeak/backend/migrations/core/${file}`)
        expect(src).toMatch(/hasColumn/)
        expect(src).toMatch(/alterTable/)
      }
      for (const file of createMigrations) {
        const src = read(`vendor/picpeak/backend/migrations/core/${file}`)
        expect(src).toMatch(/hasTable/)
        expect(src).toMatch(/createTable/)
      }
    })

    it('no new migration mints a second Project identity: all four foreign-key onto or alter the existing projects/events tables', () => {
      const src124 = read('vendor/picpeak/backend/migrations/core/124_add_project_milestones.js')
      const src125 = read('vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js')
      expect(src124).toMatch(/references\('id'\)\.inTable\('projects'\)/)
      expect(src125).toMatch(/references\('id'\)\.inTable\('projects'\)/)
    })
  })
})

describe('AC-38.7: decision (b) — where the Project-to-Inquiry and Project-to-ledger identifiers live', () => {
  const doc = read(DOC_PATH)
  const start = doc.indexOf('## Decision (b)')
  const end = doc.indexOf('### The financial identifier is a placeholder')

  it('has a dedicated decision (b) section', () => {
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
  })

  const section = doc.slice(start, end)

  it('quotes Reminder 4 — stored external identifiers, resolved over an API, no cross-database join', () => {
    expect(section).toMatch(/no cross-database joins/i)
    expect(section).toMatch(/stored external identifiers, resolved over an API/i)
  })

  describe('(b-i) Project-to-Inquiry', () => {
    const biStart = doc.indexOf('### (b-i) Project-to-Inquiry identifier')
    const biEnd = doc.indexOf('### (b-ii) Project-to-ledger identifier')
    const biSection = doc.slice(biStart, biEnd)

    it('section exists', () => {
      expect(biStart).toBeGreaterThan(-1)
      expect(biEnd).toBeGreaterThan(biStart)
    })

    it('states which side stores the identifier: Frontstage stores the Backstage-issued ids', () => {
      expect(biSection).toMatch(/Decision: option 2.*Frontstage stores the Backstage-issued ids/i)
    })

    it('names the rejected option of a Backstage-side pointer column', () => {
      expect(biSection).toMatch(/Option 1 was rejected/)
      expect(biSection).toMatch(/source_inquiry_id/)
    })

    it('grounds the decision in the already-shipped PAYLOAD_PICPEAK_API_CONTRACT.md Flow B', () => {
      expect(biSection).toContain('PAYLOAD_PICPEAK_API_CONTRACT.md')
      expect(biSection).toContain('Flow B')
      expect(biSection).toMatch(/stored external identifiers — never a foreign key into\s+`backstage-db`/)
    })

    it('citation is real: PAYLOAD_PICPEAK_API_CONTRACT.md Flow B states Frontstage stores both Backstage ids', () => {
      const contract = read('PAYLOAD_PICPEAK_API_CONTRACT.md')
      expect(contract).toMatch(
        /Both ids are written onto the Frontstage Lead\/Client record as\s+\*\*stored external identifiers\*\*/,
      )
    })

    it('citation is real: no projects migration adds an inquiry/lead pointer column', () => {
      const migrationsDir = path.join(root, 'vendor/picpeak/backend/migrations/core')
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js'))
      for (const file of files) {
        const src = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
        expect(src).not.toMatch(/source_inquiry_id|inquiry_id|lead_id/)
      }
    })

    it('citation is real: projectService.createProject accepts only name and customerAccountId, no inquiry identifier', () => {
      const src = read('vendor/picpeak/backend/src/services/projectService.js')
      expect(src).toMatch(/async function createProject\(\{ name, customerAccountId = null \}/)
    })
  })

  describe('(b-ii) Project-to-ledger', () => {
    const biiStart = doc.indexOf('### (b-ii) Project-to-ledger identifier')
    const biiEnd = doc.indexOf('### The financial identifier is a placeholder')
    const biiSection = doc.slice(biiStart, biiEnd)

    it('section exists', () => {
      expect(biiStart).toBeGreaterThan(-1)
      expect(biiEnd).toBeGreaterThan(biiStart)
    })

    it('states which side stores the identifier: Backstage stores the ledger-issued identifier', () => {
      expect(biiSection).toMatch(/Decision: option 1.*Backstage stores the ledger's identifier/i)
      expect(biiSection).toContain('project_documents.external_reference')
    })

    it('names the rejected option of Invoice Ninja storing our project id', () => {
      expect(biiSection).toMatch(/Option 2 was rejected/)
      expect(biiSection).toMatch(/Invoice Ninja is headless and\s+API-only/)
    })

    it('names the rejected option of a dedicated mapping table', () => {
      expect(biiSection).toMatch(/Option 3 was rejected/)
    })

    it('citation is real: migration 125 defers this exact ownership-direction question to this ADR', () => {
      const src = read('vendor/picpeak/backend/migrations/core/125_add_project_documents_and_integration_status.js')
      expect(src).toContain('system owns which identifier is a PROJECT_DATA_MODEL_ADR.md')
      expect(src).toMatch(/US-38 AC-38\.7/)
    })
  })
})

describe('AC-38.7: the financial identifier is recorded as a placeholder, quoted verbatim from the AC text', () => {
  const doc = read(DOC_PATH)

  it('contains the exact placeholder sentence from AC-38.7, verbatim and unwrapped', () => {
    expect(doc).toContain(
      '**The financial identifier is a placeholder in this sprint - PRD Phase 6 owns the ledger.**',
    )
  })

  it('states no Invoice Ninja integration exists yet, rather than implying one does', () => {
    const section = doc.slice(doc.indexOf('### The financial identifier is a placeholder'))
    expect(section).toMatch(/No Invoice Ninja integration exists/i)
    expect(section).toMatch(/AC-41\.6/)
  })

  it('citation is real: sprint 6 available_configuration states no sprint-6 story touches Stripe or Invoice Ninja', () => {
    const sprint = JSON.parse(read('scrum-master/sprint6.json'))
    expect(sprint.available_configuration).toContain(
      'NO SPRINT-6 STORY TOUCHES STRIPE OR INVOICE NINJA - finance is PRD Phase 6, and US-41 AC-41.6 tests that the financial integration placeholder makes no call to either.',
    )
  })

  it('the placeholder section is the last section of the document', () => {
    const afterHeading = doc.slice(doc.indexOf('### The financial identifier is a placeholder'))
    const nextHeading = afterHeading.slice('### The financial identifier is a placeholder'.length).match(/^\s*#{2,3} /m)
    expect(nextHeading).toBeNull()
  })
})
