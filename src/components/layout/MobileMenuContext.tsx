/**
 * ---
 * file: src/components/layout/MobileMenuContext.tsx
 * project: earthandhoney
 * purpose: Client-side open/closed state for the mobile vertical-menu
 *          drawer, shared between MobileMenuTrigger (the hamburger button)
 *          and VerticalMenu (the drawer it controls) without forcing every
 *          consumer of PublicShell into the client bundle. Defaults to a
 *          no-op, permanently-closed value so VerticalMenu/MobileMenuTrigger
 *          keep rendering correctly when unit-tested in isolation, outside
 *          a MobileMenuProvider.
 * created-by: dev-team
 * related-story: US-8
 * related-ac: 8.3
 * ---
 */
'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type MobileMenuState = {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const noop = () => {}

const MobileMenuContext = createContext<MobileMenuState>({
  isOpen: false,
  toggle: noop,
  close: noop,
})

export function MobileMenuProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isOpen, setIsOpen] = useState(false)

  const value: MobileMenuState = {
    isOpen,
    toggle: () => setIsOpen((prev) => !prev),
    close: () => setIsOpen(false),
  }

  return <MobileMenuContext.Provider value={value}>{children}</MobileMenuContext.Provider>
}

export function useMobileMenu() {
  return useContext(MobileMenuContext)
}
