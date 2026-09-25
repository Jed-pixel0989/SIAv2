// Shared database helper for Vercel serverless functions
// Connects to Neon Postgres via DATABASE_URL environment variable

import { neon } from '@neondatabase/serverless'

/** Returns a tagged-template SQL executor connected to Neon. */
export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.')
  }
  return neon(process.env.DATABASE_URL)
}

/** Standard CORS + JSON headers */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Content-Type': 'application/json',
}

/** Send a JSON response with standard headers */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS })
}

/** Handle preflight OPTIONS requests */
export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/** Parse JSON body safely */
export async function parseBody(req) {
  try {
    const text = await req.text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

/** Generate a 2-letter avatar from a full name */
export function makeAvatar(fullName = '') {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0].toUpperCase())
    .join('')
    .slice(0, 2) || 'U'
}
