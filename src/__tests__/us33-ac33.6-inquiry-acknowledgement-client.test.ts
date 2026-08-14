/**
 * @jest-environment node
 */
/**
 * ---
 * file: src/__tests__/us33-ac33.6-inquiry-acknowledgement-client.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.6 — src/lib/inquiryAcknowledgement.ts is off by
 *          default (only the literal string 'true' for
 *          INQUIRY_ACKNOWLEDGEMENT_ENABLED enables it; unset/empty/any other
 *          value issues zero `fetch` calls), is a real server-only client of
 *          Backstage's `POST /api/v1/notifications/inquiry-acknowledgement`
 *          route when enabled (one POST, never a loop — there is exactly
 *          one submitter), silently no-ops when the form carried no
 *          submitter email, and never references any SMTP-related global —
 *          the same shape and technique as
 *          us33-ac33.5.2.3-inquiry-notification-client.test.ts. Also covers
 *          `findSubmitterEmail`: the first `email`-type form field's
 *          submitted value, or undefined when none exists or it was left
 *          empty.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.6
 * ---
 */
import fs from 'fs'
import path from 'path'

import {
  DEFAULT_INQUIRY_ACKNOWLEDGEMENT_TIMEOUT_MS,
  InquiryAcknowledgementError,
  findSubmitterEmail,
  isInquiryAcknowledgementEnabled,
  sendInquiryAcknowledgement,
  type InquiryAcknowledgementInput,
} from '@/lib/inquiryAcknowledgement'
import type { InquiryFormFieldDef } from '@/lib/validateInquirySubmission'

const BASE_INQUIRY: InquiryAcknowledgementInput = {
  id: 'inquiry-1',
  formTitle: 'Get in touch',
  submitterEmail: 'alex@example.com',
  submittedAt: '2026-08-14T00:00:00.000Z',
}

describe('AC-33.6: sendInquiryAcknowledgement is off by default', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, BACKSTAGE_API_TOKEN: 'pp_live_test-token' }
    delete process.env.INQUIRY_ACKNOWLEDGEMENT_ENABLED
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it.each([undefined, '', 'false', 'TRUE', '1', 'yes'])(
    'issues no fetch call at all when INQUIRY_ACKNOWLEDGEMENT_ENABLED is %p',
    async (value) => {
      if (value === undefined) {
        delete process.env.INQUIRY_ACKNOWLEDGEMENT_ENABLED
      } else {
        process.env.INQUIRY_ACKNOWLEDGEMENT_ENABLED = value
      }
      const fetchMock = jest.spyOn(global, 'fetch')

      await sendInquiryAcknowledgement(BASE_INQUIRY)

      expect(fetchMock).not.toHaveBeenCalled()
      expect(isInquiryAcknowledgementEnabled()).toBe(false)
    },
  )

  it('isInquiryAcknowledgementEnabled is true only for the exact literal "true"', () => {
    process.env.INQUIRY_ACKNOWLEDGEMENT_ENABLED = 'true'
    expect(isInquiryAcknowledgementEnabled()).toBe(true)
  })
})

describe('AC-33.6: sendInquiryAcknowledgement, enabled, is a real client of POST /api/v1/notifications/inquiry-acknowledgement', () => {
  const ORIGINAL_ENV = process.env

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      BACKSTAGE_API_TOKEN: 'pp_live_test-token',
      INQUIRY_ACKNOWLEDGEMENT_ENABLED: 'true',
    }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    jest.restoreAllMocks()
  })

  it('POSTs exactly once with a bearer token and the exact data-field body the route expects', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))

    await sendInquiryAcknowledgement(BASE_INQUIRY)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://backstage-backend:3000/api/v1/notifications/inquiry-acknowledgement')
    expect(init).toMatchObject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer pp_live_test-token',
      },
      signal: expect.any(AbortSignal),
    })
    expect(JSON.parse(init?.body as string)).toEqual({
      recipient_email: 'alex@example.com',
      form_title: 'Get in touch',
      submitted_at: '2026-08-14T00:00:00.000Z',
    })
  })

  it("respects BACKSTAGE_BACKEND_URL when set, matching inquiryNotification.ts's convention", async () => {
    process.env.BACKSTAGE_BACKEND_URL = 'http://custom-backstage:9999'
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 201 }))

    await sendInquiryAcknowledgement(BASE_INQUIRY)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://custom-backstage:9999/api/v1/notifications/inquiry-acknowledgement',
      expect.anything(),
    )
  })

  it('issues no fetch call when the form carried no submitter email', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')

    await sendInquiryAcknowledgement({ ...BASE_INQUIRY, submitterEmail: undefined })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects with InquiryAcknowledgementError naming the inquiry when BACKSTAGE_API_TOKEN is unset', async () => {
    delete process.env.BACKSTAGE_API_TOKEN
    const fetchMock = jest.spyOn(global, 'fetch')

    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(InquiryAcknowledgementError)
    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(/BACKSTAGE_API_TOKEN is not configured/)
    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(/inquiry-1/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects with InquiryAcknowledgementError, carrying the HTTP status, on a non-2xx response', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 500 }))

    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(InquiryAcknowledgementError)
    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(/HTTP 500/)
  })

  it('rejects with InquiryAcknowledgementError on a network error', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'))

    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(InquiryAcknowledgementError)
    await expect(sendInquiryAcknowledgement(BASE_INQUIRY)).rejects.toThrow(/inquiry-1/)
  })

  it('aborts and rejects with InquiryAcknowledgementError after the timeout elapses', async () => {
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

    await expect(sendInquiryAcknowledgement(BASE_INQUIRY, 10)).rejects.toThrow(InquiryAcknowledgementError)
    await expect(sendInquiryAcknowledgement(BASE_INQUIRY, 10)).rejects.toThrow(/timed out after 10ms/)
  })

  it('defaults the timeout to DEFAULT_INQUIRY_ACKNOWLEDGEMENT_TIMEOUT_MS (5000ms)', () => {
    expect(DEFAULT_INQUIRY_ACKNOWLEDGEMENT_TIMEOUT_MS).toBe(5000)
  })

  it('opens no SMTP connection and holds no SMTP credential — no reference to any SMTP_* env var or nodemailer', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/inquiryAcknowledgement.ts'),
      'utf8',
    )
    expect(source).not.toMatch(/SMTP_/)
    expect(source).not.toMatch(/nodemailer/i)
    expect(source).not.toMatch(/createTransport/i)
  })
})

describe('AC-33.6: findSubmitterEmail', () => {
  const FIELDS: InquiryFormFieldDef[] = [
    { fieldType: 'shortText', name: 'fullName', label: 'Full name', required: true },
    { fieldType: 'email', name: 'email', label: 'Email', required: true },
    { fieldType: 'longText', name: 'message', label: 'Message' },
  ]

  it("returns the submitted value of the form's email-type field", () => {
    expect(findSubmitterEmail(FIELDS, { fullName: 'Alex Rivera', email: 'alex@example.com' })).toBe(
      'alex@example.com',
    )
  })

  it('returns undefined when no field on the form is of type email', () => {
    const noEmailFields = FIELDS.filter((f) => f.fieldType !== 'email')
    expect(findSubmitterEmail(noEmailFields, { fullName: 'Alex Rivera' })).toBeUndefined()
  })

  it('returns undefined when the email field exists but was left empty', () => {
    expect(findSubmitterEmail(FIELDS, { fullName: 'Alex Rivera', email: '' })).toBeUndefined()
  })

  it('returns undefined when the email field value is not a string', () => {
    expect(findSubmitterEmail(FIELDS, { fullName: 'Alex Rivera', email: 12345 })).toBeUndefined()
  })

  it('returns the FIRST email-type field when more than one exists', () => {
    const twoEmailFields: InquiryFormFieldDef[] = [
      { fieldType: 'email', name: 'primaryEmail', label: 'Primary email' },
      { fieldType: 'email', name: 'secondaryEmail', label: 'Secondary email' },
    ]
    expect(
      findSubmitterEmail(twoEmailFields, {
        primaryEmail: 'first@example.com',
        secondaryEmail: 'second@example.com',
      }),
    ).toBe('first@example.com')
  })
})
