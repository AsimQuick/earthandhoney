/**
 * ---
 * file: src/app/(payload)/api/graphql-playground/route.ts
 * project: earthandhoney
 * purpose: Payload GraphQL Playground route for exploring the GraphQL API in development
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import config from '@payload-config'
import { GRAPHQL_PLAYGROUND_GET } from '@payloadcms/next/routes'

export const GET = GRAPHQL_PLAYGROUND_GET(config)
