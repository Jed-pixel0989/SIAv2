import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM payments ORDER BY id DESC`
    return json({ success: true, data: rows })
  }

  if (req.method === 'POST') {
    const input = await parseBody(req)
    const billNo     = input.billId ?? ''
    const orNumber   = input.orNumber ?? `OR-${new Date().getFullYear()}-${1000 + Math.floor(Math.random() * 8999)}`
    const amountPaid = parseFloat(input.amountPaid ?? 0)
    const tendered   = parseFloat(input.tendered ?? amountPaid)
    const change     = parseFloat(input.change ?? 0)
    const method     = input.method ?? 'Cash'
    const notes      = input.notes ?? 'Over-the-counter bill settlement.'
    const cashier    = input.cashier ?? 'Counter Cashier Alpha'

    try {
      // Find bill
      const [billRow] = await sql`
        SELECT id, consumer_id, status FROM bills WHERE bill_no = ${billNo} LIMIT 1
      `
      let billDbId    = billRow?.id ?? null
      let consumerDbId = billRow?.consumer_id ?? null

      // Fallback: find consumer by code
      if (!consumerDbId && input.consumerId) {
        const [cRow] = await sql`
          SELECT id FROM consumers
          WHERE consumer_code = ${input.consumerId} OR account_no = ${input.consumerId}
          LIMIT 1
        `
        consumerDbId = cRow?.id ?? null
      }

      // Insert payment
      const [pay] = await sql`
        INSERT INTO payments
          (or_number, bill_id, consumer_id, cashier_id, amount_paid, tendered_amount,
           change_amount, payment_method, payment_date, notes)
        VALUES
          (${orNumber}, ${billDbId}, ${consumerDbId}, 1, ${amountPaid}, ${tendered},
           ${change}, ${method}, NOW(), ${notes})
        RETURNING id
      `

      // Mark bill paid
      if (billDbId) {
        await sql`
          UPDATE bills SET status = 'Paid', paid_date = NOW(), days_overdue = 0, penalty = 0
          WHERE id = ${billDbId}
        `
      }

      // Update consumer status if no more overdue bills
      if (consumerDbId) {
        const [{ count }] = await sql`
          SELECT COUNT(*) AS count FROM bills
          WHERE consumer_id = ${consumerDbId} AND status = 'Overdue'
            AND id != ${billDbId ?? 0}
        `
        if (parseInt(count) === 0) {
          await sql`UPDATE consumers SET status = 'Active' WHERE id = ${consumerDbId}`
          await sql`UPDATE geo_connections SET status = 'Normal' WHERE consumer_id = ${consumerDbId}`
        }
      }

      // Audit
      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, ${cashier}, 'Cashier / POS', 'Payment',
           'Processed Counter Payment', ${`${orNumber} / Bill ${billNo}`},
           ${`Received ₱ ${amountPaid.toFixed(2)} via ${method}. Bill updated to PAID.`}, '127.0.0.1')
      `

      return json({
        success: true,
        message: 'Payment processed successfully.',
        data: { id: pay.id, orNumber, billId: billNo, amountPaid, method, status: 'Paid' },
      })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
