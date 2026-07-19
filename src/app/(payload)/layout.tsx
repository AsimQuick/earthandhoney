/**
 * ---
 * file: src/app/(payload)/layout.tsx
 * project: earthandhoney
 * purpose: Root layout for the Payload admin route group — wraps /admin and Payload API routes with Payload's RootLayout and wires the server-action handler
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import '@payloadcms/next/css'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
