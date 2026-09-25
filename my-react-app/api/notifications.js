import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM notifications ORDER BY id DESC`
    const items = rows.map((n) => ({
      id:              n.notification_code,
      type:            n.type,
      recipient:       n.recipient_name,
      accountNo:       n.account_no,
      consumerId:      n.consumer_id      ?? null,
      ticketId:        n.ticket_id        ?? null,
      resolutionImage: n.resolution_image ?? null,
      message:         n.message,
      channel:         n.channel,
      status:          n.status,
      sentAt:          n.sent_at,
    }))
    return json({ success: true, data: items })
  }

  if (req.method === 'POST') {
    const input = await parseBody(req)
    const code            = input.id              ?? `NTF-${Date.now()}${Math.floor(Math.random() * 999)}`
    const type            = input.type            ?? 'Service Alert'
    const recipient       = (input.recipient      ?? '').trim()
    const accountNo       = (input.accountNo      ?? '').trim()
    const consumerId      = (input.consumerId      ?? '') || null
    const ticketId        = (input.ticketId        ?? '') || null
    const resolutionImage = input.resolutionImage  ?? null
    const message         = (input.message         ?? '').trim()
    const channel         = input.channel          ?? 'System Push'

    if (!recipient || !accountNo || !message)
      return json({ success: false, error: 'Recipient, account number, and message are required.' }, 400)

    try {
      await sql`
        INSERT INTO notifications
          (notification_code, type, recipient_name, account_no, consumer_id, ticket_id,
           resolution_image, message, channel, status)
        VALUES
          (${code}, ${type}, ${recipient}, ${accountNo}, ${consumerId}, ${ticketId},
           ${resolutionImage}, ${message}, ${channel}, 'Sent')
      `
      return json({ success: true, id: code }, 201)
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
