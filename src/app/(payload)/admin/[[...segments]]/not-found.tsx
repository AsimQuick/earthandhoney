/**
 * ---
 * file: src/app/(payload)/admin/[[...segments]]/not-found.tsx
 * project: earthandhoney
 * purpose: Payload's not-found view for unmatched routes under /admin
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import type { Metadata } from 'next'

import config from '@payload-config'
import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views'

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

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config, importMap, params, searchParams })

export default NotFound
