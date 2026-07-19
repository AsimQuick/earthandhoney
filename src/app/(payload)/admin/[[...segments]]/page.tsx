/**
 * ---
 * file: src/app/(payload)/admin/[[...segments]]/page.tsx
 * project: earthandhoney
 * purpose: Catch-all route rendering the Payload admin panel UI at /admin and its nested views
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import type { Metadata } from 'next'

import config from '@payload-config'
import { generatePageMetadata, RootPage } from '@payloadcms/next/views'

import { importMap } from '../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, importMap, params, searchParams })

export default Page
