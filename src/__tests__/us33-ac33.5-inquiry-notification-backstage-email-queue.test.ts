/**
 * ---
 * file: src/__tests__/us33-ac33.5-inquiry-notification-backstage-email-queue.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5 — src/lib/inquiryNotification.ts queues the studio
 *          notification through the Backstage email queue's new
 *          `POST /api/v1/notifications/inquiry` route rather than sending
 *          anything itself. Unit-level: `fetch` is mocked so this suite
 *          exercises the request shape (URL, Bearer auth, JSON body), the
 *          one-POST-per-Forms-recipient fan-out, `buildSubmissionSummary`'s
 *          label:value formatting, and every failure path (non-2xx,
 *          network error, timeout, zero configured recipients) without a
 *          live Backstage. The live, mail-catcher-confirmed proof this AC
 *          also requires is recorded in AC-33.5_EMAIL_QUEUE_LIVE_PROOF.md.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5
 * ---
 */

import {
  buildSubmissionSummary,
  DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS,
  InquiryNotificationError,
  sendInquiryNotification,
  type InquiryNotificationInput,
} from '@/lib/inquiryNotification'

// jsdom provides no global `Response`, and the module under test reads only
// `res.ok`/`res.status` off what fetch resolves to — so a minimal stand-in is
// both sufficient and honest about the surface actually depended on.
function queueAccepted(): Response {
  return { ok: true, status: 201 } as Response
}

function queueRejected(status: number): Response {
  return { ok: false, status } as Response
}

describe('AC-33.5: inquiry notification queues through the Backstage email queue', () => {
  const originalBackstageUrl = process.env.BACKSTAGE_BACKEND_URL
  const originalToken = process.env.BACKSTAGE_API_TOKEN

  beforeEach(() => {
    process.env.BACKSTAGE_BACKEND_URL = 'http://backstage-backend:3000'
    process.env.BACKSTAGE_API_TOKEN = 'pp_live_test-token'
  })

  afterEach(() => {
    process.env.BACKSTAGE_BACKEND_URL = originalBackstageUrl
    process.env.BACKSTAGE_API_TOKEN = originalToken
    jest.restoreAllMocks()
  })

  const baseInput: InquiryNotificationInput = {
    id: 42,
    formId: 7,
    formTitle: 'Get in touch',
    sourcePage: '/weddings',
    formFields: [
      { name: 'fullName', label: 'Full name' },
      { name: 'email', label: 'Email' },
      { name: 'consent', label: 'I agree to be contacted' },
      { name: 'notes', label: 'Notes' },
    ],
    recipients: [{ email: 'studio@earthandhoney.test' }],
    values: { fullName: 'Jordan Casey', email: 'jordan@example.com', consent: true, notes: '' },
  }

  describe('buildSubmissionSummary', () => {
    it('formats each field as "Label: value", in field order, using the label not the storage key', () => {
      const summary = buildSubmissionSummary(baseInput.formFields, baseInput.values)
      expect(summary).toBe(
        ['Full name: Jordan Casey', 'Email: jordan@example.com', 'I agree to be contacted: Yes', 'Notes: (not provided)'].join(
          '\n',
        ),
      )
    })

    it('renders a false checkbox as "No"', () => {
      const summary = buildSubmissionSummary(
        [{ name: 'consent', label: 'Consent' }],
        { consent: false },
      )
      expect(summary).toBe('Consent: No')
    })

    it('renders a missing or null value as "(not provided)"', () => {
      expect(buildSubmissionSummary([{ name: 'x', label: 'X' }], {})).toBe('X: (not provided)')
      expect(buildSubmissionSummary([{ name: 'x', label: 'X' }], { x: null })).toBe('X: (not provided)')
    })
  })

  describe('the queued request', () => {
    it('POSTs to /api/v1/notifications/inquiry on the configured Backstage backend, with a Bearer token and JSON content-type', async () => {
      const fetchMock = jest.fn().mockResolvedValue(queueAccepted())
      global.fetch = fetchMock as unknown as typeof fetch

      await sendInquiryNotification(baseInput)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('http://backstage-backend:3000/api/v1/notifications/inquiry')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer pp_live_test-token',
      })
    })

    it('sends form_title, source_page, and a built submission_summary in the body', async () => {
      const fetchMock = jest.fn().mockResolvedValue(queueAccepted())
      global.fetch = fetchMock as unknown as typeof fetch

      await sendInquiryNotification(baseInput)

      const [, init] = fetchMock.mock.calls[0]
      const body = JSON.parse(init.body as string)
      expect(body.recipient_email).toBe('studio@earthandhoney.test')
      expect(body.form_title).toBe('Get in touch')
      expect(body.source_page).toBe('/weddings')
      expect(typeof body.submitted_at).toBe('string')
      expect(new Date(body.submitted_at).toString()).not.toBe('Invalid Date')
      expect(body.submission_summary).toBe(buildSubmissionSummary(baseInput.formFields, baseInput.values))
    })

    it('falls back to the Docker network hostname when BACKSTAGE_BACKEND_URL is unset', async () => {
      delete process.env.BACKSTAGE_BACKEND_URL
      const fetchMock = jest.fn().mockResolvedValue(queueAccepted())
      global.fetch = fetchMock as unknown as typeof fetch

      await sendInquiryNotification(baseInput)

      expect(fetchMock.mock.calls[0][0]).toBe('http://backstage-backend:3000/api/v1/notifications/inquiry')
    })

    it('issues one POST per configured Forms recipient', async () => {
      const fetchMock = jest.fn().mockResolvedValue(queueAccepted())
      global.fetch = fetchMock as unknown as typeof fetch

      await sendInquiryNotification({
        ...baseInput,
        recipients: [{ email: 'owner@earthandhoney.test' }, { email: 'assistant@earthandhoney.test' }],
      })

      expect(fetchMock).toHaveBeenCalledTimes(2)
      const recipientEmails = fetchMock.mock.calls
        .map(([, init]) => JSON.parse((init as RequestInit).body as string).recipient_email)
        .sort()
      expect(recipientEmails).toEqual(['assistant@earthandhoney.test', 'owner@earthandhoney.test'])
    })
  })

  describe('failure paths', () => {
    it('throws InquiryNotificationError when Backstage answers with a non-2xx status', async () => {
      global.fetch = jest.fn().mockResolvedValue(queueRejected(500)) as unknown as typeof fetch

      await expect(sendInquiryNotification(baseInput)).rejects.toBeInstanceOf(InquiryNotificationError)
      await expect(sendInquiryNotification(baseInput)).rejects.toThrow(/HTTP 500/)
    })

    it('throws InquiryNotificationError on a network error, naming the recipient', async () => {
      global.fetch = jest.fn().mockRejectedValue(new TypeError('fetch failed')) as unknown as typeof fetch

      await expect(sendInquiryNotification(baseInput)).rejects.toThrow(/studio@earthandhoney\.test/)
    })

    it('throws InquiryNotificationError on an aborted (timed-out) request', async () => {
      global.fetch = jest.fn().mockImplementation((_url: string, init: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            const err = new Error('The operation was aborted')
            err.name = 'AbortError'
            reject(err)
          })
        })
      }) as unknown as typeof fetch

      await expect(sendInquiryNotification(baseInput, 10)).rejects.toThrow(/Timed out/)
    })

    it('throws InquiryNotificationError without ever calling fetch when no Forms recipient is configured', async () => {
      const fetchMock = jest.fn()
      global.fetch = fetchMock as unknown as typeof fetch

      await expect(sendInquiryNotification({ ...baseInput, recipients: [] })).rejects.toThrow(/no configured Forms recipient/)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('rejects if any one of several recipients fails, even when others succeed', async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValueOnce(queueAccepted())
        .mockResolvedValueOnce(queueRejected(500))
      global.fetch = fetchMock as unknown as typeof fetch

      await expect(
        sendInquiryNotification({
          ...baseInput,
          recipients: [{ email: 'a@earthandhoney.test' }, { email: 'b@earthandhoney.test' }],
        }),
      ).rejects.toBeInstanceOf(InquiryNotificationError)
    })
  })

  it('exposes a sane default timeout', () => {
    expect(DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS).toBeGreaterThan(0)
    expect(DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS).toBeLessThanOrEqual(30000)
  })
})
