/**
 * ---
 * file: src/components/forms/InquiryForm.tsx
 * project: earthandhoney
 * purpose: AC-33.7 — the rendered form matching PRD §20.1's visual
 *          direction (large readable labels, generous spacing, minimal
 *          fields, one clear submit action, responsive, no generic SaaS
 *          styling), built only from src/styles/tokens.css tokens (verified
 *          by this component's own test, reusing the AC-31.3
 *          detectStyleDrift/detectNonTokenTailwindClasses/postcss-compile
 *          guard). Renders whichever fields a Forms document
 *          (src/collections/Forms.ts) declares, in declared order, mapping
 *          each of the seven V1 field types to its native HTML control — the
 *          browser-side validation mirror that src/lib/validateInquirySubmission.ts's
 *          own header names as AC-33.7's concern (`required`, `type="email"`,
 *          and a per-type `maxLength` read from that file's
 *          INQUIRY_FIELD_MAX_LENGTH) so a human editing in a real browser
 *          gets the same rules the server enforces authoritatively, without
 *          this component ever becoming a second source of truth for them.
 *          Every label is an explicit <label htmlFor> paired to its
 *          control's id (never implicit wrapping) so the association is
 *          assertable directly from the rendered DOM. A field-level error
 *          (an InquiryValidationError this component is handed, matching the
 *          shape src/app/(frontend)/api/inquiries/route.ts's 400 response
 *          already returns) renders as a `role="alert"` element wired to its
 *          control via `aria-describedby` and `aria-invalid`, so assistive
 *          technology is told both that the control is invalid and why.
 *          Only native, always-keyboard-operable controls are used — no
 *          `tabIndex` override anywhere except the honeypot input (AC-33.4's
 *          spam signal), which is deliberately taken out of the tab order
 *          and hidden from assistive technology (`tabIndex={-1}`,
 *          `aria-hidden`, `sr-only`) since a real visitor should never reach
 *          or be told about it — only a scripted bot reading the raw DOM
 *          fills it in. `onSubmit` is an injected callback (this file never
 *          calls `fetch` itself) — consistent with src/lib/submitInquiry.ts's
 *          own dependency-injection shape — so this component's test can
 *          assert submit behaviour without mocking a network call; wiring
 *          this component to `/api/inquiries` is left to whatever server
 *          component places it on a page.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.7
 * ---
 */
'use client'

import { useId, useState, type FormEvent, type ReactNode } from 'react'

import { INQUIRY_FIELD_MAX_LENGTH, type InquiryFormFieldType, type InquiryValidationError } from '@/lib/validateInquirySubmission'

export interface InquiryFormFieldOption {
  label: string
  value: string
}

export interface InquiryFormFieldConfig {
  fieldType: InquiryFormFieldType
  name: string
  label: string
  helpText?: string | null
  required?: boolean | null
  options?: InquiryFormFieldOption[] | null
}

export interface InquiryFormConfig {
  publicTitle: string
  description?: string | null
  fields: InquiryFormFieldConfig[]
}

export interface InquiryFormProps {
  form: InquiryFormConfig
  errors?: InquiryValidationError[]
  onSubmit?: (values: Record<string, unknown>) => void
}

// The honeypot field name AC-33.4's server-side isHoneypotFilled() reads off
// the submitted body (src/app/(frontend)/api/inquiries/route.ts's
// `body.honeypot`).
const HONEYPOT_FIELD_NAME = 'honeypot'

function errorFor(errors: InquiryValidationError[] | undefined, fieldName: string): InquiryValidationError | undefined {
  return errors?.find((error) => error.field === fieldName)
}

function inputTypeFor(fieldType: InquiryFormFieldType): string {
  if (fieldType === 'email') return 'email'
  if (fieldType === 'phone') return 'tel'
  if (fieldType === 'date') return 'date'
  return 'text'
}

export function InquiryForm({ form, errors, onSubmit }: Readonly<InquiryFormProps>) {
  const baseId = useId()
  const [values, setValues] = useState<Record<string, unknown>>({})

  function setValue(name: string, value: unknown) {
    setValues((previous) => ({ ...previous, [name]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit?.(values)
  }

  return (
    <form data-testid="inquiry-form" onSubmit={handleSubmit} className="flex w-full flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h2 className="font-display text-2xl leading-tight text-ink">{form.publicTitle}</h2>
        {form.description ? (
          <p className="text-base leading-relaxed text-ink-secondary" style={{ maxWidth: 'var(--measure-normal)' }}>
            {form.description}
          </p>
        ) : null}
      </div>

      {form.fields.map((field) => {
        const controlId = `${baseId}-${field.name}`
        const helpId = field.helpText ? `${controlId}-help` : undefined
        const fieldError = errorFor(errors, field.name)
        const errorId = fieldError ? `${controlId}-error` : undefined
        const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined
        const label = field.required ? `${field.label} (required)` : field.label
        const maxLength = INQUIRY_FIELD_MAX_LENGTH[field.fieldType]

        let control: ReactNode
        if (field.fieldType === 'longText') {
          control = (
            <textarea
              id={controlId}
              name={field.name}
              required={Boolean(field.required)}
              maxLength={maxLength}
              rows={5}
              aria-describedby={describedBy}
              aria-invalid={fieldError ? true : undefined}
              className="w-full rounded-md border border-border bg-surface p-sm text-lg leading-snug text-ink"
              value={(values[field.name] as string) ?? ''}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          )
        } else if (field.fieldType === 'dropdown') {
          control = (
            <select
              id={controlId}
              name={field.name}
              required={Boolean(field.required)}
              aria-describedby={describedBy}
              aria-invalid={fieldError ? true : undefined}
              className="w-full rounded-md border border-border bg-surface p-sm text-lg leading-snug text-ink"
              value={(values[field.name] as string) ?? ''}
              onChange={(event) => setValue(field.name, event.target.value)}
            >
              <option value="" disabled>
                Select…
              </option>
              {(field.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )
        } else if (field.fieldType === 'checkbox') {
          control = (
            <input
              id={controlId}
              name={field.name}
              type="checkbox"
              required={Boolean(field.required)}
              aria-describedby={describedBy}
              aria-invalid={fieldError ? true : undefined}
              checked={Boolean(values[field.name])}
              onChange={(event) => setValue(field.name, event.target.checked)}
            />
          )
        } else {
          control = (
            <input
              id={controlId}
              name={field.name}
              type={inputTypeFor(field.fieldType)}
              required={Boolean(field.required)}
              maxLength={maxLength}
              aria-describedby={describedBy}
              aria-invalid={fieldError ? true : undefined}
              className="w-full rounded-md border border-border bg-surface p-sm text-lg leading-snug text-ink"
              value={(values[field.name] as string) ?? ''}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          )
        }

        return (
          <div key={field.name} className="flex flex-col gap-2xs" data-testid="inquiry-form-field">
            <label htmlFor={controlId} className="text-lg leading-snug text-ink">
              {label}
            </label>
            {field.helpText ? (
              <p id={helpId} className="text-sm leading-normal text-ink-tertiary">
                {field.helpText}
              </p>
            ) : null}
            {control}
            {fieldError ? (
              <p id={errorId} role="alert" className="text-sm leading-normal text-ink">
                {fieldError.message}
              </p>
            ) : null}
          </div>
        )
      })}

      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${baseId}-${HONEYPOT_FIELD_NAME}`}>Leave this field blank</label>
        <input
          id={`${baseId}-${HONEYPOT_FIELD_NAME}`}
          name={HONEYPOT_FIELD_NAME}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={(values[HONEYPOT_FIELD_NAME] as string) ?? ''}
          onChange={(event) => setValue(HONEYPOT_FIELD_NAME, event.target.value)}
        />
      </div>

      <button
        type="submit"
        data-testid="inquiry-form-submit"
        className="w-full rounded-md bg-ink p-sm text-lg text-surface"
      >
        Send
      </button>
    </form>
  )
}
