/**
 * ---
 * file: src/__tests__/us33-ac33.2-submit-inquiry-ordering.test.ts
 * project: earthandhoney
 * purpose: Verify AC-33.2's create-before-notify ordering in
 *          src/lib/submitInquiry.ts with mocked dependencies (no `payload`
 *          import, no database) — the durable-persistence proof against a
 *          real database is the companion LIVE suite,
 *          us33-ac33.2-inquiry-durable-persist-live.test.ts. Proves: (1)
 *          `createInquiry` is called and awaited before `notify` is ever
 *          invoked, (2) a `notify` rejection does not reject or alter
 *          `submitInquiry`'s own resolved result — the record is unaffected
 *          by a failed or slow notification, and (3) the submitted values,
 *          source page, and utm parameters are the exact values forwarded
 *          to `createInquiry`.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.2
 * ---
 */
import { submitInquiry, type SubmitInquiryInput } from '@/lib/submitInquiry'

const BASE_INPUT: SubmitInquiryInput = {
  formId: 'form-1',
  values: { fullName: 'Alex Rivera', email: 'alex@example.com' },
  sourcePage: '/weddings',
  utm: { source: 'instagram', medium: 'social', campaign: 'summer-2026', term: 'wedding-photographer', content: 'bio-link' },
}

describe('AC-33.2: submitInquiry commits before it notifies', () => {
  it('calls createInquiry and awaits it before notify is invoked', async () => {
    const callOrder: string[] = []
    const createInquiry = jest.fn(async () => {
      callOrder.push('createInquiry:start')
      await new Promise((resolve) => setTimeout(resolve, 5))
      callOrder.push('createInquiry:end')
      return { id: 'inquiry-1' }
    })
    const notify = jest.fn(async () => {
      callOrder.push('notify')
    })

    await submitInquiry({ createInquiry, notify }, BASE_INPUT)

    expect(callOrder).toEqual(['createInquiry:start', 'createInquiry:end', 'notify'])
  })

  it('a notification failure does not reject submitInquiry or change the persisted id — the inquiry still exists', async () => {
    const createInquiry = jest.fn(async () => ({ id: 'inquiry-2' }))
    const notify = jest.fn(async () => {
      throw new Error('forced notification failure')
    })

    const result = await submitInquiry({ createInquiry, notify }, BASE_INPUT)

    expect(createInquiry).toHaveBeenCalledTimes(1)
    expect(notify).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 'inquiry-2', notified: false })
  })

  it('notify is never called if createInquiry itself fails — no notification for a record that never persisted', async () => {
    const createInquiry = jest.fn(async () => {
      throw new Error('database unavailable')
    })
    const notify = jest.fn(async () => {})

    await expect(submitInquiry({ createInquiry, notify }, BASE_INPUT)).rejects.toThrow('database unavailable')
    expect(notify).not.toHaveBeenCalled()
  })

  it('forwards the exact submitted values, source page, and utm parameters to createInquiry', async () => {
    let received: SubmitInquiryInput | undefined
    const createInquiry = jest.fn(async (input: SubmitInquiryInput) => {
      received = input
      return { id: 'inquiry-3' }
    })
    const notify = jest.fn(async () => {})

    await submitInquiry({ createInquiry, notify }, BASE_INPUT)

    expect(received).toEqual(BASE_INPUT)
    expect(received?.values).toEqual({ fullName: 'Alex Rivera', email: 'alex@example.com' })
    expect(received?.sourcePage).toBe('/weddings')
    expect(received?.utm).toEqual({
      source: 'instagram',
      medium: 'social',
      campaign: 'summer-2026',
      term: 'wedding-photographer',
      content: 'bio-link',
    })
  })

  it('when notify succeeds, the result reports notified: true', async () => {
    const createInquiry = jest.fn(async () => ({ id: 'inquiry-4' }))
    const notify = jest.fn(async () => {})

    const result = await submitInquiry({ createInquiry, notify }, BASE_INPUT)

    expect(result).toEqual({ id: 'inquiry-4', notified: true })
  })
})
