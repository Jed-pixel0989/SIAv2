import { getDb, json, handleOptions, parseBody } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM meter_assets ORDER BY id DESC`
    return json({ success: true, data: rows })
  }

  if (req.method === 'POST') {
    const input = await parseBody(req)
    const serialNo    = (input.serialNo ?? '').trim()
    const brand       = input.brand ?? 'Aquaflow Pro'
    const model       = input.model ?? 'AF-20-Brass'
    const size        = input.size ?? '1/2 inch'
    const installDate = input.installDate ?? new Date().toISOString().slice(0, 10)
    const zone        = input.zone ?? 'Mabuhay'
    const status      = input.status ?? 'Active'

    if (!serialNo) return json({ success: false, error: 'Serial number is required.' }, 400)

    try {
      const nextCalib = new Date(installDate)
      nextCalib.setFullYear(nextCalib.getFullYear() + 2)
      const nextCalibStr = nextCalib.toISOString().slice(0, 10)

      const [inserted] = await sql`
        INSERT INTO meter_assets
          (serial_no, brand, model, pipe_size, install_date, zone,
           last_calibration, next_calibration, status)
        VALUES
          (${serialNo}, ${brand}, ${model}, ${size}, ${installDate}, ${zone},
           ${installDate}, ${nextCalibStr}, ${status})
        RETURNING id
      `

      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Meter',
           'Intake New Meter Asset', ${serialNo},
           ${`Registered ${brand} (${size}) in warehouse inventory.`}, '127.0.0.1')
      `

      return json({ success: true, id: inserted.id, serialNo })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  if (req.method === 'PUT') {
    const input = await parseBody(req)
    const serialNo   = (input.serialNo ?? '').trim()
    const status     = input.status ?? 'Active'
    const lastCalib  = input.lastCalibration ?? new Date().toISOString().slice(0, 10)
    const nextCalib  = input.nextCalibration ?? new Date(Date.now() + 2 * 365 * 86400000).toISOString().slice(0, 10)

    try {
      await sql`
        UPDATE meter_assets
        SET status = ${status}, last_calibration = ${lastCalib}, next_calibration = ${nextCalib}
        WHERE serial_no = ${serialNo}
      `

      if (input.historyEntry) {
        const [meter] = await sql`SELECT id FROM meter_assets WHERE serial_no = ${serialNo} LIMIT 1`
        if (meter) {
          const h = input.historyEntry
          await sql`
            INSERT INTO meter_calibrations
              (meter_id, calibration_date, event_type, technician_name,
               accuracy_margin, test_result, notes)
            VALUES
              (${meter.id}, ${h.date ?? lastCalib}, ${h.type ?? 'Routine Calibration'},
               ${h.technician ?? 'Roberto Ramos'}, ${h.accuracyMargin ?? '+/- 0.3%'},
               ${h.testResult ?? 'Passed'}, ${h.notes ?? 'Calibration benchmark test passed.'})
          `
        }
      }

      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Meter',
           'Logged Meter Service/Calibration', ${serialNo},
           ${`Status: ${status}. Calibrated on ${lastCalib}.`}, '127.0.0.1')
      `

      return json({ success: true, message: 'Meter updated successfully.' })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
