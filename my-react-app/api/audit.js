import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM audit_trail ORDER BY id DESC LIMIT 100`
    return json({ success: true, data: rows })
  }

  if (req.method === 'POST') {
    const input    = await parseBody(req)
    const category = input.category ?? 'System'
    const action   = input.action   ?? 'Operation'
    const target   = input.target   ?? 'System'
    const details  = input.details  ?? ''
    const user     = input.user     ?? 'Administrator'
    const role     = input.role     ?? 'Administrator'
    const ip       = input.ip       ?? '127.0.0.1'

    try {
      const [{ count }] = await sql`SELECT COUNT(*) AS count FROM audit_trail`
      const logCode = input.id ?? `AUD-${906 + parseInt(count)}`

      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, ${user}, ${role}, ${category}, ${action}, ${target}, ${details}, ${ip})
      `

      return json({ success: true, id: logCode })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
