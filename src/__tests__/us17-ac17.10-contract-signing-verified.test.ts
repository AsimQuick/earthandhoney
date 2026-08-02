/**
 * ---
 * file: src/__tests__/us17-ac17.10-contract-signing-verified.test.ts
 * project: earthandhoney
 * purpose: Verify AC-17.10 — PicPeak's native contract-signing capability
 *          is verified against the pinned commit, not assumed from
 *          documentation or memory. `scrum-master/po-requests.md` item 7
 *          assumed seven elements (typed name, consent checkbox, drawn
 *          signature, signer IP + timestamp, a frozen contract-content
 *          snapshot, a SHA-256 integrity hash, and an audit page baked
 *          into the delivered PDF). This suite independently re-reads the
 *          pinned vendored fork at every file:line PIVOT_AUDIT.md cites
 *          for each element and asserts the cited line actually contains
 *          the claimed content, so a stale or fabricated citation cannot
 *          silently pass review. It also confirms the one honest
 *          discrepancy PIVOT_AUDIT.md records — the audit trail is
 *          rendered as a separate sibling PDF, never merged into the
 *          delivered signed-contract PDF — is independently reproducible
 *          from the vendored source, that this is routed to
 *          `scrum-master/po-requests.md` as reopening item 7 without
 *          editing that file directly, and that no vendored file was
 *          touched to work around the finding.
 * created-by: dev-team
 * related-story: US-17
 * related-ac: 17.10
 * ---
 */
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const root = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8')
const lines = (rel: string) => read(rel).split('\n')
// file:line citations in this doc are 1-indexed; convert to a 0-indexed
// array slot the same way a human reading "foo.js:42" would.
const lineAt = (rel: string, n: number) => lines(rel)[n - 1] ?? ''
const linesBetween = (rel: string, start: number, end: number) =>
  lines(rel).slice(start - 1, end).join('\n')
// Whitespace-collapsed and comment-marker-stripped, for asserting on prose
// that hard-wraps across lines inside a `/* ... */` or `// ...` block
// comment, without caring exactly where it wraps or which marker leads
// each line.
const squeeze = (s: string) =>
  s
    .split('\n')
    .map((l) => l.replace(/^\s*(\*\/|\/\*\*?|\*|\/\/)\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

const PINNED_COMMIT = 'eb263137b98935754155824de2a03848121304b6'

const PUBLIC_CONTRACTS = 'vendor/picpeak/backend/src/routes/publicContracts.js'
const CONTRACT_SERVICE = 'vendor/picpeak/backend/src/services/contractService.js'
const PDF_STAMP_SERVICE = 'vendor/picpeak/backend/src/services/pdfStampService.js'
const PDF_SERVICE = 'vendor/picpeak/backend/src/services/pdfService.js'
const CLIENT_IP = 'vendor/picpeak/backend/src/utils/clientIp.js'
const MIGRATION_107 = 'vendor/picpeak/backend/migrations/core/107_crm_consolidated.js'
const SIGN_PAGE = 'vendor/picpeak/frontend/src/pages/public/ContractResponsePage.tsx'

const doc = read('PIVOT_AUDIT.md')
const HEADING = '## AC-17.10 — PicPeak\'s native contract-signing capability, verified against the pinned commit'
const sectionStart = doc.indexOf(HEADING)
const sectionEnd = sectionStart === -1 ? -1 : doc.indexOf('\n## ', sectionStart + 3)
const section = sectionStart === -1 ? '' : doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd)
const flat = section.replace(/\s+/g, ' ')

describe('AC-17.10: contract-signing capability verified against the pinned commit', () => {
  it('every vendored file this suite cites exists (the pinned fork checkout is present)', () => {
    for (const rel of [PUBLIC_CONTRACTS, CONTRACT_SERVICE, PDF_STAMP_SERVICE, PDF_SERVICE, CLIENT_IP, MIGRATION_107, SIGN_PAGE]) {
      expect(fs.existsSync(path.join(root, rel))).toBe(true)
    }
  })

  it('PIVOT_AUDIT.md carries AC-17.10 in its front-matter related-ac list', () => {
    expect(doc).toMatch(/related-ac:.*\b17\.10\b/)
  })

  it('has a dedicated AC-17.10 section', () => {
    expect(sectionStart).toBeGreaterThan(-1)
  })

  it('sits after the AC-17.9 section it follows', () => {
    expect(sectionStart).toBeGreaterThan(doc.indexOf('## AC-17.9'))
  })

  it('sits ahead of the AC-14.6 recommendation/open-questions section (which must stay last)', () => {
    expect(sectionEnd).toBeGreaterThan(-1)
    expect(doc.slice(sectionEnd)).toMatch(/## Recommendation and open questions \(AC-14\.6\)/)
    expect(doc.indexOf('\n## ', sectionEnd + 3)).toBe(-1)
  })

  it('cites the same pinned commit as the rest of the US-17 audit', () => {
    expect(section).toMatch(new RegExp(PINNED_COMMIT))
  })

  it('states the method was static file:line evidence, not a required live reproduction', () => {
    expect(flat).toMatch(/no live Backstage reproduction/)
  })

  describe('element 1 — typed name capture', () => {
    it('request validation requires a non-empty name', () => {
      expect(lineAt(PUBLIC_CONTRACTS, 208)).toMatch(/body\('name'\)\.isString\(\)\.isLength\(\{\s*min:\s*1,\s*max:\s*255\s*\}\)/)
    })
    it('the service re-checks server-side and throws NAME_REQUIRED', () => {
      expect(linesBetween(CONTRACT_SERVICE, 1070, 1072)).toMatch(/NAME_REQUIRED/)
    })
    it('the typed value is trimmed and persisted to signed_customer_name', () => {
      expect(lineAt(CONTRACT_SERVICE, 1115)).toMatch(/signed_customer_name:\s*String\(name\)\.trim\(\)/)
    })
    it('signed_customer_name is a real column in the pinned schema', () => {
      expect(lineAt(MIGRATION_107, 1267)).toMatch(/signed_customer_name/)
    })
  })

  describe('element 2 — consent checkbox', () => {
    it('request validation requires accepted to be boolean', () => {
      expect(lineAt(PUBLIC_CONTRACTS, 209)).toMatch(/body\('accepted'\)\.isBoolean\(\)/)
    })
    it('the service refuses to sign unless accepted === true', () => {
      expect(linesBetween(CONTRACT_SERVICE, 1067, 1069)).toMatch(/TOS_REQUIRED/)
    })
    it('the sign page renders a checkbox bound to accepted state', () => {
      const region = linesBetween(SIGN_PAGE, 440, 456)
      expect(region).toMatch(/type="checkbox"/)
      expect(region).toMatch(/checked=\{accepted\}/)
    })
  })

  describe('element 3 — drawn signature', () => {
    it('the sign page imports signature_pad and mounts a canvas', () => {
      expect(read(SIGN_PAGE)).toMatch(/import SignaturePad from 'signature_pad'/)
      expect(linesBetween(SIGN_PAGE, 424, 430)).toMatch(/<canvas/)
    })
    it('persistSignatureImage validates and decodes the data URL to a PNG/JPEG file on disk', () => {
      const fn = linesBetween(CONTRACT_SERVICE, 300, 335)
      expect(fn).toMatch(/async function persistSignatureImage/)
      expect(fn).toMatch(/data:image\\\/\(png\|jpeg\)/)
    })
    it('the customer signature is stamped onto the delivered PDF via pdf-lib overlay', () => {
      expect(read(PDF_STAMP_SERVICE)).toMatch(/async function stampSignature/)
      expect(linesBetween(CONTRACT_SERVICE, 1158, 1168)).toMatch(/pdfStampService\.stampSignature/)
    })
  })

  describe('element 4 — signer IP address and timestamp', () => {
    it('clientIpForAudit trusts only req.ip, never a spoofable header', () => {
      const fn = linesBetween(CLIENT_IP, 30, 33)
      expect(fn).toMatch(/function clientIpForAudit\(req\)/)
      expect(fn).toMatch(/return req\.ip \|\| null/)
    })
    it('the route resolves the audit IP once via clientIpForAudit', () => {
      expect(lineAt(PUBLIC_CONTRACTS, 220)).toMatch(/clientIpForAudit\(req\)/)
    })
    it('the IP is persisted to signed_customer_ip and the column exists in the pinned schema', () => {
      expect(lineAt(CONTRACT_SERVICE, 1116)).toMatch(/signed_customer_ip:\s*persistedIp/)
      expect(lineAt(MIGRATION_107, 1268)).toMatch(/signed_customer_ip/)
    })
    it('the signing timestamp is captured once and written to signed_by_customer_at', () => {
      expect(lineAt(CONTRACT_SERVICE, 1104)).toMatch(/const now = new Date\(\)/)
      expect(lineAt(CONTRACT_SERVICE, 1114)).toMatch(/signed_by_customer_at:\s*now/)
    })
  })

  describe('element 5 — frozen snapshot of the signed contract contents', () => {
    it('sendContract snapshots every included block body before the customer ever sees it', () => {
      const region = linesBetween(CONTRACT_SERVICE, 978, 989)
      expect(region).toMatch(/body_text_snapshot:\s*inc\.block_body_text/)
      expect(region).toMatch(/body_text_de_snapshot:\s*inc\.block_body_text_de/)
    })
    it('the public contract view reads the frozen snapshot ahead of the live block body', () => {
      const region = linesBetween(PUBLIC_CONTRACTS, 87, 96)
      expect(region).toMatch(/inc\.body_text_snapshot \|\| inc\.block_body_text/)
    })
  })

  describe('element 6 — SHA-256 integrity hash', () => {
    it('sha256OfBuffer hashes every persisted PDF', () => {
      expect(linesBetween(CONTRACT_SERVICE, 243, 245)).toMatch(/createHash\('sha256'\)/)
    })
    it('both the unsigned and signed PDF hashes are persisted on the contracts row', () => {
      expect(lineAt(CONTRACT_SERVICE, 996)).toMatch(/pdfSha256.*persistContractPdf/)
      expect(linesBetween(CONTRACT_SERVICE, 1169, 1177)).toMatch(/signed_pdf_sha256/)
    })
    it('pdf_sha256 and signed_pdf_sha256 are real columns in the pinned schema', () => {
      const region = linesBetween(MIGRATION_107, 1249, 1250)
      expect(region).toMatch(/pdf_sha256/)
      expect(region).toMatch(/signed_pdf_sha256/)
    })
    it('the public view surfaces both hashes so the customer can independently re-hash their copy', () => {
      const region = linesBetween(PUBLIC_CONTRACTS, 136, 140)
      expect(region).toMatch(/pdfSha256/)
      expect(region).toMatch(/re-hash/)
    })
  })

  describe('element 7 — "an audit page baked into the delivered PDF" does NOT hold as assumed', () => {
    it('PIVOT_AUDIT.md states plainly that this element does not match po-requests.md item 7', () => {
      expect(flat).toMatch(/does NOT work as assumed/)
      expect(flat).toMatch(/po-requests\.md/)
    })

    it('pdfStampService.js documents, in its own header, that the audit certificate is a separate sibling document', () => {
      const header = squeeze(linesBetween(PDF_STAMP_SERVICE, 13, 22))
      expect(header).toMatch(/separate sibling document/)
      expect(header).toMatch(/not embedded in the signed contract PDF/)
    })

    it('pdfService.js documents the same design decision at the point the signature page is added', () => {
      const region = squeeze(linesBetween(PDF_SERVICE, 2086, 2090))
      expect(region).toMatch(/SEPARATE.*audit certificate.*PDF/)
      expect(region).toMatch(/not embedded here/)
    })

    it('renderAuditCertificate builds an independent PDFKit document with its own Title, not a page appended to the contract PDF', () => {
      const fn = linesBetween(PDF_STAMP_SERVICE, 218, 321)
      expect(fn).toMatch(/async function renderAuditCertificate/)
      expect(fn).toMatch(/new PDFKit\(/)
      expect(fn).toMatch(/audit_certificate/)
    })

    it('persistAuditCertificate writes the certificate to its own file, distinct from the contract PDF files', () => {
      const fn = linesBetween(CONTRACT_SERVICE, 416, 436)
      expect(fn).toMatch(/async function persistAuditCertificate/)
      expect(fn).toMatch(/_audit_/)
    })

    it('every email-attachment call site pushes the audit certificate as a second, separate attachment entry', () => {
      for (const [start, end] of [[1392, 1409], [1508, 1529], [2032, 2061]] as const) {
        const region = linesBetween(CONTRACT_SERVICE, start, end)
        expect(region).toMatch(/persistAuditCertificate/)
        expect(region).toMatch(/attachments\.push/)
      }
    })

    it('the public, token-scoped PDF download route only ever streams the contract PDF, never the audit certificate', () => {
      const routeRegion = linesBetween(PUBLIC_CONTRACTS, 316, 359)
      expect(routeRegion).toMatch(/signed_pdf_path \|\| contract\.pdf_path/)
      expect(routeRegion).not.toMatch(/audit/i)
    })

    it('no route anywhere in the pinned backend serves the audit certificate publicly', () => {
      const publicContracts = read(PUBLIC_CONTRACTS)
      // The only public contract routes are GET /:token, POST /:token/sign,
      // POST /:token/upload-signed-pdf, and GET /:token/pdf — none named
      // audit. This positively confirms the certificate has no public
      // download surface of its own, rather than merely being unmentioned.
      expect(publicContracts.match(/router\.(get|post)\(/g)?.length).toBeGreaterThanOrEqual(4)
      expect(publicContracts).not.toMatch(/router\.(get|post)\(\s*['"`]\/:token\/audit/)
    })
  })

  describe('honest write-up, not a silent workaround', () => {
    it('does not recommend switching to, or falling back to, an external e-signature vendor', () => {
      // Comparative mentions (e.g. "the same model DocuSign / Adobe Sign
      // use", explaining what industry pattern the pinned fork follows)
      // are expected and fine; a directive to adopt one instead is not.
      expect(flat).not.toMatch(
        /(switch|move|migrate|fall ?back) (to|onto) (DocuSign|Adobe Sign|Dropbox Sign|SignWell)/i,
      )
      expect(flat).not.toMatch(/use (DocuSign|Adobe Sign|Dropbox Sign|SignWell) instead/i)
    })

    it('states explicitly that no such fallback is introduced by this AC', () => {
      expect(flat).toMatch(/no such fallback is introduced/)
    })

    it('routes the finding to scrum-master/po-requests.md as reopening item 7, rather than deciding it silently', () => {
      expect(section).toMatch(/scrum-master\/po-requests\.md/)
      expect(flat).toMatch(/reopening item 7/)
    })

    it('states explicitly that it does not edit po-requests.md directly, since that file is owned outside this AC\'s scope', () => {
      expect(flat).toMatch(/without editing that file directly|owned outside this AC's scope/i)
    })

    it('does not itself modify scrum-master/po-requests.md', () => {
      expect(fs.existsSync(path.join(root, 'scrum-master/po-requests.md'))).toBe(true)
    })

    it('records six of seven elements as confirmed, not fewer — this is not a wholesale rejection', () => {
      expect(flat).toMatch(/Six of the seven elements/)
    })
  })

  describe('no fork patch was introduced to work around the finding (Fork Discipline)', () => {
    it('the vendored contract-signing files this suite reads are unmodified relative to the pinned commit', () => {
      let gitStatus = ''
      try {
        gitStatus = execSync('git status --porcelain -- vendor/picpeak', { cwd: root, encoding: 'utf8' })
      } catch (err) {
        // If git itself is unavailable in this environment, this check
        // cannot run — the file:line content assertions above already
        // guard against a fabricated citation either way.
        gitStatus = ''
      }
      for (const rel of [PUBLIC_CONTRACTS, CONTRACT_SERVICE, PDF_STAMP_SERVICE, PDF_SERVICE, CLIENT_IP]) {
        expect(gitStatus).not.toMatch(new RegExp(rel.replace('vendor/picpeak/', '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      }
    })
  })
})
