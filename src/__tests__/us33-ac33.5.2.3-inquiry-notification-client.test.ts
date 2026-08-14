/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.5.2.3-inquiry-notification-client.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.5.2.3 — src/lib/inquiryNotification.ts is a real
 *          server-only client of the AC-33.5.2.2.2 route
 *          `POST /api/v1/notifications/inquiry`. Mocked-fetch unit tests
 *          (same technique as us25-ac25.2-backstage-client-flow-a.test.ts):
 *          pins the request URL, method, bearer auth from
 *          `BACKSTAGE_API_TOKEN`, and body shape (`recipient_email`,
 *          `form_title`, `source_page`, `submission_summary`,
 *          `submitted_at`); proves one POST is sent per configured
 *          recipient; proves failure modes (missing token, no recipients,
 *          non-2xx response, network error) each raise
 *          `InquiryNotificationError` naming the inquiry; and proves the
 *          module never imports or references any SMTP-related global
 *          (holds no SMTP credential, opens no SMTP connection, renders no
 *          subject or body — CLAUDE.md's System Ownership table).
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.5.2.3
 * ---
 */
import fs from 'fs'
import path from 'path'

import {
  DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS,
  InquiryNotificationError,
  sendInquiryNotification,
  type InquiryNotificationInput,
} from '@/lib/inquiryNotification'

const BASE_INQUIRY: InquiryNotificationInput = {
  id: 'inquiry-1',
  formId: 'form-1',
  sourcePage: '/weddings',
  recipientEmails: ['studio@earthandhoney.test'],
  formTitle: 'Get in touch',
  submissionSummary: 'Full name: Alex Rivera\nEmail: alex@example.com',
  submittedAt: '2026-08-14T00:00:00.000Z',
}

describe('AC-33.5.2.3: sendInquiryNotification is a real client of POST /api/v1/notifications/inquiry', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKSTAGE_API_TOKEN: 'pp_live_test-token' }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it('POSTs to /api/v1/notifications/inquiry with a bearer token and the exact data-field body the route expects', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))

    await sendInquiryNotification(BASE_INQUIRY)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://backstage-backend:3000/api/v1/notifications/inquiry')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pp_live_test-token',
      },
      signal: expect.any(AbortSignal),
    })
    expect(JSON.parse(init?.body as string)).toEqual({
      recipient_email: 'studio@earthandhoney.test',
      form_title: 'Get in touch',
      source_page: '/weddings',
      submission_summary: 'Full name: Alex Rivera\nEmail: alex@example.com',
      submitted_at: '2026-08-14T00:00:00.000Z',
    })
  })

  it('respects BACKSTAGE_BACKEND_URL when set, matching src/lib/backstageClient.ts\'s convention', async () => {
    process.env.BACKSTAGE_BACKEND_URL = 'http://custom-backstage:9999'
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))

    await sendInquiryNotification(BASE_INQUIRY)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://custom-backstage:9999/api/v1/notifications/inquiry',
      expect.anything(),
    )
  })

  it('sends one POST per configured recipient, sequentially', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))

    await sendInquiryNotification({
      ...BASE_INQUIRY,
      recipientEmails: ['studio@earthandhoney.test', 'second@earthandhoney.test'],
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const recipients = fetchMock.mock.calls.map(
      ([, init]) => (JSON.parse(init?.body as string) as { recipient_email: string }).recipient_email,
    )
    expect(recipients).toEqual(['studio@earthandhoney.test', 'second@earthandhoney.test'])
  })

  it('rejects with InquiryNotificationError naming the inquiry when BACKSTAGE_API_TOKEN is unset — never opens a network call', async () => {
    delete process.env.BACKSTAGE_API_TOKEN
    const fetchMock = jest.spyOn(global, 'fetch')

    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(InquiryNotificationError)
    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(/BACKSTAGE_API_TOKEN is not configured/)
    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(/inquiry-1/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects with InquiryNotificationError when there is no configured recipient', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')

    await expect(sendInquiryNotification({ ...BASE_INQUIRY, recipientEmails: [] })).rejects.toThrow(
      InquiryNotificationError,
    )
    await expect(sendInquiryNotification({ ...BASE_INQUIRY, recipientEmails: [] })).rejects.toThrow(
      /no configured recipient email/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects with InquiryNotificationError, carrying the HTTP status, on a non-2xx response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 500 }))

    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(InquiryNotificationError)
    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(/HTTP 500/)
  })

  it('rejects with InquiryNotificationError on a network error, without swallowing which recipient failed', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(InquiryNotificationError)
    await expect(sendInquiryNotification(BASE_INQUIRY)).rejects.toThrow(/studio@earthandhoney\.test/)
  })

  it('aborts and rejects with InquiryNotificationError after the timeout elapses', async () => {
    jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        const signal = (init as RequestInit).signal
        signal?.addEventListener('abort', () => {
          const err = new Error('This operation was aborted')
          err.name = 'AbortError'
          reject(err)
        })
      })
    })

    await expect(sendInquiryNotification(BASE_INQUIRY, 10)).rejects.toThrow(InquiryNotificationError)
    await expect(sendInquiryNotification(BASE_INQUIRY, 10)).rejects.toThrow(/timed out after 10ms/)
  })

  it('defaults the timeout to DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS (5000ms), mirroring backstageClient.ts', () => {
    expect(DEFAULT_INQUIRY_NOTIFICATION_TIMEOUT_MS).toBe(5000)
  })

  it('opens no SMTP connection and holds no SMTP credential — no reference to any SMTP_* env var or nodemailer', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/inquiryNotification.ts'),
      'utf8',
    )
    expect(source).not.toMatch(/SMTP_/)
    expect(source).not.toMatch(/nodemailer/i)
    expect(source).not.toMatch(/createTransport/i)
  })
})
