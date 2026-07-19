/**
 * ---
 * file: src/app/(payload)/api/graphql/route.ts
 * project: earthandhoney
 * purpose: Payload GraphQL API route, consumed by the admin panel UI
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import config from '@payload-config'
import { GRAPHQL_POST } from '@payloadcms/next/routes'

export const POST = GRAPHQL_POST(config)
