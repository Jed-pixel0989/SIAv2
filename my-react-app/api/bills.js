import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()
  const url = new URL(req.url)
  const actionParam = url.searchParams.get('action')

  // ── GET scheduled billing ──────────────────────────────────────────────────
  if (req.method === 'GET' && actionParam === 'scheduled') {
    const today = new Date()
    const dayOfMonth = today.getDate()

    if (dayOfMonth !== 25) {
      return json({ success: true, scheduled: false, message: 'Automatic billing runs on the 25th of each month.' })
    }

    const runKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const month = today.toLocaleString('en-US', { month: 'long' })
    const year = today.getFullYear()
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate()
    const billingPeriod = `${month} 1, ${year} - ${month} ${lastDay}, ${year}`
    const dueDate = new Date(today.getTime() + 15 * 86400000).toISOString().slice(0, 10)

    try {
      // Claim the run (UPSERT — skip if already done)
      const existing = await sql`SELECT run_key FROM billing_runs WHERE run_key = ${runKey}`
      if (existing.length > 0)
        return json({ success: true, scheduled: true, already_processed: true, run_key: runKey })

      await sql`
        INSERT INTO billing_runs (run_key, billing_period, run_date, status)
        VALUES (${runKey}, ${billingPeriod}, ${today.toISOString().slice(0, 10)}, 'Running')
      `

      const consumers = await sql`
        SELECT id, account_no, full_name, classification, last_reading
        FROM consumers
        WHERE status IN ('Active', 'Overdue') AND approval_status = 'Approved'
      `
      const tariffs = await sql`SELECT * FROM tariff_rates WHERE is_active = true`
      const tariffMap = {}
      for (const t of tariffs) tariffMap[t.classification] = t

      let inserted = 0
      for (const consumer of consumers) {
        const [lastBillRow] = await sql`
          SELECT pres_reading FROM bills WHERE consumer_id = ${consumer.id} ORDER BY id DESC LIMIT 1
        `
        const prev = lastBillRow ? parseFloat(lastBillRow.pres_reading) : 0
        const present = Math.max(prev, parseFloat(consumer.last_reading ?? 0))
        const consumption = Math.max(0, present - prev)
        const tariff = tariffMap[consumer.classification] ?? tariffMap['Residential']
        const minCharge = parseFloat(tariff?.min_charge ?? 180)
        const minCum = parseFloat(tariff?.min_cum ?? 10)
        const base = consumption <= minCum
          ? minCharge
          : minCharge + ((consumption - minCum) * parseFloat(tariff?.bracket_1_rate ?? 22.5))
        const envFee = Math.round(base * parseFloat(tariff?.environmental_fee_rate ?? 0.1) * 100) / 100
        const maintFee = parseFloat(tariff?.meter_maintenance_fee ?? 25)
        const total = Math.round((base + envFee + maintFee) * 100) / 100
        const billNo = `WS-${runKey.replace('-', '')}-${String(consumer.id).padStart(4, '0')}`

        await sql`
          INSERT INTO bills
            (bill_no, consumer_id, billing_period, prev_reading, pres_reading,
             consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty,
             total_amount, status, due_date, days_overdue)
          VALUES
            (${billNo}, ${consumer.id}, ${billingPeriod}, ${prev}, ${present},
             ${consumption}, ${base}, ${envFee}, ${maintFee}, 0, 0,
             ${total}, 'Ready', ${dueDate}, 0)
          ON CONFLICT (bill_no) DO NOTHING
        `
        await sql`UPDATE consumers SET last_reading = ${present} WHERE id = ${consumer.id}`

        const ntfCode = `NTF-${runKey.replace('-', '')}-${String(consumer.id).padStart(4, '0')}`
        await sql`
          INSERT INTO notifications
            (notification_code, type, recipient_name, account_no, message, channel, status)
          VALUES
            (${ntfCode}, 'Billing Notice', ${consumer.full_name}, ${consumer.account_no},
             ${`Your water bill for ${billingPeriod} is ready. Total due: PHP ${total.toFixed(2)}. Due ${dueDate}.`},
             'System Push', 'Sent')
          ON CONFLICT (notification_code) DO NOTHING
        `
        inserted++
      }

      await sql`
        UPDATE billing_runs
        SET inserted_count = ${inserted}, notification_count = ${inserted},
            status = 'Completed', completed_at = NOW()
        WHERE run_key = ${runKey}
      `

      return json({ success: true, scheduled: true, run_key: runKey, inserted_count: inserted })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  // ── GET all bills ──────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM bills ORDER BY id DESC`
    return json({ success: true, data: rows })
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const input = await parseBody(req)
    const action = input.action ?? 'single'

    try {
      if (action === 'batch') {
        const billsList = input.bills ?? []
        let insertedCount = 0

        for (const b of billsList) {
          const [cRow] = await sql`
            SELECT id FROM consumers
            WHERE consumer_code = ${b.consumerId ?? ''} OR account_no = ${b.accountNo ?? ''}
            LIMIT 1
          `
          if (!cRow) continue

          await sql`
            INSERT INTO bills
              (bill_no, consumer_id, billing_period, prev_reading, pres_reading,
               consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty,
               total_amount, status, due_date, days_overdue)
            VALUES
              (${b.id}, ${cRow.id}, ${b.period ?? 'Aug 01 – Aug 31, 2026'},
               ${b.prevReading ?? 0}, ${b.presReading ?? 0}, ${b.consumption ?? 0},
               ${b.baseAmount ?? 0}, ${b.envFee ?? 0}, ${b.maintFee ?? 0},
               ${b.arrears ?? 0}, ${b.penalty ?? 0}, ${b.totalAmount ?? 0},
               ${b.status ?? 'Ready'}, ${b.dueDate ?? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)}, 0)
            ON CONFLICT (bill_no) DO NOTHING
          `
          await sql`UPDATE consumers SET last_reading = ${b.presReading ?? 0} WHERE id = ${cRow.id}`
          insertedCount++
        }

        const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
        await sql`
          INSERT INTO audit_trail
            (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
          VALUES
            (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Billing',
             'Batch Bill Generation Run', ${input.cycle ?? 'Current Cycle'},
             ${`Batch billing run completed. Inserted ${insertedCount} billing statements.`}, '127.0.0.1')
        `

        return json({ success: true, inserted_count: insertedCount })
      }

      // Single bill
      const [cRow] = await sql`
        SELECT id FROM consumers
        WHERE consumer_code = ${input.consumerId ?? ''} OR account_no = ${input.accountNo ?? ''}
        LIMIT 1
      `
      const cDbId = cRow?.id ?? (await sql`SELECT id FROM consumers LIMIT 1`)[0]?.id

      const billNo = input.id ?? `WS-${Math.floor(240000 + Math.random() * 10000)}`
      const dueDate = input.dueDate ?? new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)

      const [insertedBill] = await sql`
        INSERT INTO bills
          (bill_no, consumer_id, billing_period, prev_reading, pres_reading,
           consumption_cum, base_amount, env_fee, maint_fee, arrears, penalty,
           total_amount, status, due_date, days_overdue)
        VALUES
          (${billNo}, ${cDbId}, ${input.period ?? 'Sep 01 – Sep 30, 2026'},
           ${input.prevReading ?? 0}, ${input.presReading ?? 0}, ${input.consumption ?? 0},
           ${input.baseAmount ?? 0}, ${input.envFee ?? 0}, ${input.maintFee ?? 0},
           ${input.arrears ?? 0}, ${input.penalty ?? 0}, ${input.totalAmount ?? 0},
           ${input.status ?? 'Ready'}, ${dueDate}, 0)
        RETURNING id
      `
      await sql`UPDATE consumers SET last_reading = ${input.presReading ?? 0} WHERE id = ${cDbId}`

      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Billing Officer', 'Billing',
           'Calculated & Queued Bill Statement', ${`${billNo} (${input.name ?? ''})`},
           ${`Queued billing statement. Total payable: ₱ ${parseFloat(input.totalAmount ?? 0).toFixed(2)}`},
           '127.0.0.1')
      `

      return json({ success: true, id: billNo, dbId: insertedBill.id })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
