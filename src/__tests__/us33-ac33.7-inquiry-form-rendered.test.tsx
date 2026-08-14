/**
 * ---
 * file: src/__tests__/us33-ac33.7-inquiry-form-rendered.test.tsx
 * project: earthandhoney
 * purpose: AC-33.7 — proves InquiryForm's rendered markup matches the PRD
 *          §20.1 visual direction requirements that are actually
 *          DOM-observable (large readable labels via explicit
 *          `<label htmlFor>` association, one clear submit action, a
 *          responsive/fluid layout with no fixed pixel widths), that a
 *          field-level error is announced to assistive technology
 *          (`role="alert"` wired to its control via `aria-describedby` and
 *          `aria-invalid`), and that the form is fully keyboard-operable
 *          (native tab order visits every real control and the submit
 *          button, in document order, and the AC-33.4 honeypot is excluded
 *          from both the tab order and the accessibility tree). Reuses the
 *          AC-31.3 token-only guard (detectStyleDrift +
 *          detectNonTokenTailwindClasses + a real Tailwind/postcss compile)
 *          against this component's own source, the same way
 *          us31-ac31.3-standard-page-template.test.tsx proved it for
 *          StandardPageTemplate.
 * created-by: dev-team
 * related-story: US-33
 * related-ac: 33.7
 * ---
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fs from 'fs'
import path from 'path'
import postcss from 'postcss'

import { InquiryForm, type InquiryFormConfig } from '@/components/forms/InquiryForm'
import { detectNonTokenTailwindClasses } from '@/lib/style-guard/detectNonTokenTailwindClasses'
import { detectStyleDrift } from '@/lib/style-guard/detectStyleDrift'

const ROOT = process.cwd()
const COMPONENT_PATH = 'src/components/forms/InquiryForm.tsx'
const componentSource = fs.readFileSync(path.join(ROOT, COMPONENT_PATH), 'utf8')

const SEVEN_FIELD_TYPES_FORM: InquiryFormConfig = {
  publicTitle: "Let's talk about your day",
  description: 'Tell us a little about what you have in mind.',
  fields: [
    { fieldType: 'shortText', name: 'fullName', label: 'Full name', required: true },
    { fieldType: 'email', name: 'email', label: 'Email', required: true, helpText: "We'll reply here." },
    { fieldType: 'phone', name: 'phone', label: 'Phone', required: false },
    { fieldType: 'date', name: 'eventDate', label: 'Event date', required: false },
    {
      fieldType: 'dropdown',
      name: 'eventType',
      label: 'Event type',
      required: true,
      options: [
        { label: 'Wedding', value: 'wedding' },
        { label: 'Engagement', value: 'engagement' },
      ],
    },
    { fieldType: 'checkbox', name: 'consent', label: 'I agree to be contacted', required: true },
    { fieldType: 'longText', name: 'message', label: 'Your message', required: false },
  ],
}

describe('US-33 AC-33.7: InquiryForm renders the PRD §20.1 visual direction', () => {
  it('renders the public title and description', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    expect(screen.getByRole('heading', { name: "Let's talk about your day" })).toBeInTheDocument()
    expect(screen.getByText('Tell us a little about what you have in mind.')).toBeInTheDocument()
  })

  it('associates every one of the seven field types with its label and renders the correct native control', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)

    expect(screen.getByLabelText('Full name (required)')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Email (required)')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('Event date')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Event type (required)').tagName).toBe('SELECT')
    expect(screen.getByLabelText('I agree to be contacted (required)')).toHaveAttribute('type', 'checkbox')
    expect(screen.getByLabelText('Your message').tagName).toBe('TEXTAREA')
  })

  it('marks only the fields the Forms document declares required with the required HTML attribute and label text', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    expect(screen.getByLabelText('Full name (required)')).toBeRequired()
    expect(screen.getByLabelText('Phone')).not.toBeRequired()
    expect(screen.queryByLabelText('Phone (required)')).toBeNull()
  })

  it('mirrors the server-authoritative per-type max length (AC-33.3) as a native maxLength attribute', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    expect(screen.getByLabelText('Full name (required)')).toHaveAttribute('maxLength', '200')
    expect(screen.getByLabelText('Email (required)')).toHaveAttribute('maxLength', '254')
    expect(screen.getByLabelText('Your message')).toHaveAttribute('maxLength', '5000')
  })

  it('renders the dropdown options in declared order', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    const select = screen.getByLabelText('Event type (required)')
    const options = within(select).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Select…', 'Wedding', 'Engagement'])
  })

  it('renders help text and wires it to its control via aria-describedby', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    const emailInput = screen.getByLabelText('Email (required)')
    const describedBy = emailInput.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    const helpNode = document.getElementById(describedBy!.split(' ')[0])
    expect(helpNode?.textContent).toBe("We'll reply here.")
  })

  it('renders exactly one submit action', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('type', 'submit')
    expect(buttons[0]).toHaveTextContent('Send')
  })

  it('calls the injected onSubmit with the entered values and never with a honeypot value the user never touched', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Full name (required)'), 'Jamie Rivera')
    await user.type(screen.getByLabelText('Email (required)'), 'jamie@example.com')
    await user.selectOptions(screen.getByLabelText('Event type (required)'), 'wedding')
    await user.click(screen.getByLabelText('I agree to be contacted (required)'))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const submitted = onSubmit.mock.calls[0][0]
    expect(submitted.fullName).toBe('Jamie Rivera')
    expect(submitted.honeypot).toBeUndefined()
  })
})

describe('US-33 AC-33.7: field-level errors are announced to assistive technology', () => {
  it('renders a role="alert" error wired via aria-describedby and marks the control aria-invalid', () => {
    render(
      <InquiryForm
        form={SEVEN_FIELD_TYPES_FORM}
        errors={[{ field: 'email', message: 'Email must be a valid email address' }]}
      />,
    )

    const emailInput = screen.getByLabelText('Email (required)')
    expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Email must be a valid email address')
    expect(emailInput.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('does not mark or describe fields with no error', () => {
    render(
      <InquiryForm
        form={SEVEN_FIELD_TYPES_FORM}
        errors={[{ field: 'email', message: 'Email must be a valid email address' }]}
      />,
    )
    const nameInput = screen.getByLabelText('Full name (required)')
    expect(nameInput).not.toHaveAttribute('aria-invalid')
  })

  it('renders no alert when there are no errors', () => {
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('US-33 AC-33.7: the form is fully operable by keyboard', () => {
  it('Tab visits every real control and the submit button, in document order, and never the honeypot', async () => {
    const user = userEvent.setup()
    render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)

    const expectedOrder = [
      screen.getByLabelText('Full name (required)'),
      screen.getByLabelText('Email (required)'),
      screen.getByLabelText('Phone'),
      screen.getByLabelText('Event date'),
      screen.getByLabelText('Event type (required)'),
      screen.getByLabelText('I agree to be contacted (required)'),
      screen.getByLabelText('Your message'),
      screen.getByRole('button', { name: 'Send' }),
    ]

    for (const expected of expectedOrder) {
      await user.tab()
      expect(document.activeElement).toBe(expected)
    }
  })

  it('the honeypot carries tabIndex=-1 and is hidden from the accessibility tree', () => {
    const { container } = render(<InquiryForm form={SEVEN_FIELD_TYPES_FORM} />)
    const honeypot = container.querySelector('input[name="honeypot"]')
    expect(honeypot).not.toBeNull()
    expect(honeypot).toHaveAttribute('tabindex', '-1')

    // aria-hidden on an ancestor removes it from the accessibility tree —
    // Testing Library's role queries (hidden: false by default) must not
    // surface it as a textbox.
    const accessibleTextboxes = screen.getAllByRole('textbox')
    expect(accessibleTextboxes).not.toContain(honeypot)
  })
})

describe('US-33 AC-33.7: no raw hex colour, raw px font-size, or arbitrary Tailwind bracket (reusing US-23 AC-23.7)', () => {
  const matches = detectStyleDrift(componentSource)

  it('introduces zero hex/px-font-size/arbitrary-bracket violations', () => {
    expect(matches).toEqual([])
  })
})

describe('US-33 AC-33.7: every Tailwind class is token-backed or purely structural (reusing US-31 AC-31.3)', () => {
  it('introduces zero non-token utility classes', () => {
    expect(detectNonTokenTailwindClasses(componentSource)).toEqual([])
  })

  it('the guard actually catches a non-token escape hatch (not vacuously green)', () => {
    expect(detectNonTokenTailwindClasses('<div className="py-8 rounded-2xl text-6xl">')).toEqual([
      'py-8',
      'rounded-2xl',
      'text-6xl',
    ])
  })
})

describe('US-33 AC-33.7: the token-derived classes this component uses really do compile to token references', () => {
  it('every class name the component actually uses compiles to a var(--...) declaration, not a bare/default Tailwind value', async () => {
    const tailwindPostcss = (await import('@tailwindcss/postcss')).default
    const tokensPath = path.join(ROOT, 'src/styles/tokens.css')

    // Purely-structural (value-free) classes this component uses — tokens.css
    // defines no scale for any of these (border-width, display/flex keywords,
    // fluid-width keywords, the screen-reader-only clip technique), so they
    // have no token to compile to by design, not because they're unchecked —
    // detectNonTokenTailwindClasses above already proves each is either
    // token-backed or on this exact structural allowlist.
    const STRUCTURAL_ONLY = new Set(['flex', 'flex-col', 'w-full', 'sr-only', 'border'])
    const probeClasses = Array.from(componentSource.matchAll(/className=(?:"([^"]*)")/g))
      .flatMap((match) => match[1].split(/\s+/))
      .filter(Boolean)
      .filter((cls) => !STRUCTURAL_ONLY.has(cls))
      .filter((cls, index, all) => all.indexOf(cls) === index)

    expect(probeClasses.length).toBeGreaterThan(0)

    const entryCss = [
      '@import "tailwindcss" source(none);',
      `@import "${tokensPath}";`,
      `@source inline("${probeClasses.join(' ')}");`,
    ].join('\n')

    const result = await postcss([tailwindPostcss({ base: ROOT })]).process(entryCss, {
      from: path.join(ROOT, 'src/__tests__/__fixtures__/us33-ac33.7-probe.css'),
    })

    for (const cls of probeClasses) {
      const escaped = cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rule = new RegExp(`\\.${escaped}\\s*\\{[^}]*\\}`).exec(result.css)?.[0] ?? ''
      expect(rule).toMatch(/var\(--(color|spacing|radius|text|leading|font)-?[\w-]*\)/)
    }
  }, 30000)
})
