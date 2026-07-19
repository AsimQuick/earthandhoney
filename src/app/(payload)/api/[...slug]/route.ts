/**
 * ---
 * file: src/app/(payload)/api/[...slug]/route.ts
 * project: earthandhoney
 * purpose: Payload REST API catch-all route, consumed by the admin panel UI
 * created-by: dev-team
 * related-story: US-1
 * related-ac: 1.1
 * ---
 */
import config from '@payload-config'
import {
  REST_DELETE,
  REST_GET,
  REST_OPTIONS,
  REST_PATCH,
  REST_POST,
  REST_PUT,
} from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
