import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM maintenance_tickets ORDER BY id DESC`
    return json({ success: true, data: rows })
  }

  if (req.method === 'POST') {
    const input = await parseBody(req)
    const ticketNo   = input.id ?? `SR-${new Date().getFullYear()}-${1000 + Math.floor(Math.random() * 8999)}`
    const cCode      = input.consumerId ?? ''
    const issueType  = input.issueType ?? 'Service Request'
    const priority   = input.priority ?? 'Medium'
    const status     = input.status ?? 'Reported'
    const technician = input.assignedTo ?? 'Roberto Ramos'
    const description = input.description ?? ''

    const [cRow] = await sql`
      SELECT id, zone FROM consumers
      WHERE consumer_code = ${cCode} OR full_name = ${input.consumerName ?? ''}
      LIMIT 1
    `
    const cDbId = cRow?.id ?? null
    const zone  = input.zone ?? cRow?.zone ?? 'Mabuhay'

    try {
      const [inserted] = await sql`
        INSERT INTO maintenance_tickets
          (ticket_no, consumer_id, zone, issue_type, priority, status,
           technician_name, reported_at, description)
        VALUES
          (${ticketNo}, ${cDbId}, ${zone}, ${issueType}, ${priority}, ${status},
           ${technician}, NOW(), ${description})
        RETURNING id
      `

      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Service',
           'Dispatched Service Ticket', ${`${ticketNo} (${issueType})`},
           ${`Assigned to ${technician} for ${input.consumerName ?? ''} (${zone}).`}, '127.0.0.1')
      `

      return json({ success: true, id: ticketNo, dbId: inserted.id, message: 'Ticket created successfully.' })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  if (req.method === 'PUT') {
    const input  = await parseBody(req)
    const ticketNo       = input.id ?? ''
    const status         = input.status ?? 'Resolved'
    const resolution     = input.resolution ?? 'Completed field inspection and resolution.'
    const technician     = input.assignedTo ?? null
    const resolutionImage = input.resolutionImage ?? null

    try {
      if (status === 'Resolved') {
        await sql`
          UPDATE maintenance_tickets
          SET status = ${status}, resolution_notes = ${resolution},
              resolved_at = NOW()
              ${resolutionImage != null ? sql`, resolution_image = ${resolutionImage}` : sql``}
              ${technician ? sql`, technician_name = ${technician}` : sql``}
          WHERE ticket_no = ${ticketNo}
        `
      } else {
        await sql`
          UPDATE maintenance_tickets
          SET status = ${status}, resolution_notes = ${resolution}
              ${resolutionImage != null ? sql`, resolution_image = ${resolutionImage}` : sql``}
              ${technician ? sql`, technician_name = ${technician}` : sql``}
          WHERE ticket_no = ${ticketNo}
        `
      }

      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Service',
           'Updated Ticket Status', ${ticketNo},
           ${`Status updated to ${status}. Notes: ${resolution}`}, '127.0.0.1')
      `

      return json({ success: true, message: 'Ticket updated successfully.' })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
