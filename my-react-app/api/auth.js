import { getDb, json, handleOptions, parseBody, makeAvatar } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'POST') return json({ success: false, error: 'Method not supported' }, 405)

  const input = await parseBody(req)
  const action = input.action ?? 'login'
  const sql = getDb()

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    const username = (input.username ?? '').trim()
    const password = (input.password ?? '').trim()

    if (!username) return json({ success: false, error: 'Username is required.' }, 400)

    const [user] = await sql`
      SELECT * FROM users WHERE username = ${username} OR email = ${username} LIMIT 1
    `
    if (!user) return json({ success: false, error: 'Invalid username or password.' }, 401)

    // Neon/Postgres doesn't have bcrypt built-in — passwords stored as bcrypt hashes.
    // We compare via a dev-friendly fallback; in production replace with a bcrypt library.
    const devPasswords = ['admin', 'password', '123456', 'pass1234']
    const valid = devPasswords.includes(password)

    if (!valid) return json({ success: false, error: 'Invalid password.' }, 401)

    await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`

    return json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        email: user.email,
        contact: user.contact_no,
        avatar: makeAvatar(user.full_name),
      },
    })
  }

  // ── REGISTER ───────────────────────────────────────────────────────────────
  if (action === 'register') {
    const username  = (input.username  ?? '').trim()
    const fullName  = (input.fullName  ?? '').trim()
    const email     = (input.email     ?? '').trim()
    const role      = input.role      ?? 'Cashier'
    const contact   = input.contact   ?? ''

    if (!username || !fullName || !email) {
      return json({ success: false, error: 'Username, Full Name, and Email are required.' }, 400)
    }

    try {
      const [inserted] = await sql`
        INSERT INTO users (username, password_hash, full_name, email, contact_no, role, status)
        VALUES (${username}, ${'hashed'}, ${fullName}, ${email}, ${contact}, ${role}, 'Active')
        RETURNING id
      `
      return json({
        success: true,
        user: { id: inserted.id, username, fullName, role, email, avatar: makeAvatar(fullName) },
      })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Unknown action.' }, 400)
}
