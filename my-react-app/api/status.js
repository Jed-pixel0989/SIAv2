import { getDb, json, handleOptions, CORS_HEADERS } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  try {
    const sql = getDb()
    const [{ version }] = await sql`SELECT version() AS version`

    const tables = await sql`
      SELECT table_name, (
        SELECT COUNT(*) FROM information_schema.tables t2
        WHERE t2.table_name = t.table_name
      ) AS row_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
    `

    // Get accurate counts for main tables
    const counts = {}
    const mainTables = [
      'consumers', 'bills', 'payments', 'meter_assets',
      'maintenance_tickets', 'audit_trail', 'notifications', 'users',
    ]
    for (const t of mainTables) {
      const [{ count }] = await sql`SELECT COUNT(*) AS count FROM ${sql(t)}`
      counts[t] = Number(count)
    }

    return json({
      success: true,
      connected: true,
      database: 'waterline_db (Neon Postgres)',
      server_version: version,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      table_counts: counts,
    })
  } catch (err) {
    return json({ success: false, connected: false, error: err.message }, 500)
  }
}
