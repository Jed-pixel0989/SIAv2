import { getDb, json, handleOptions, parseBody, makeAvatar } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()

  const sql = getDb()

  // ── GET ────────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM consumers ORDER BY id DESC`
    return json({ success: true, data: rows })
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const input = await parseBody(req)
    const consumerCode = (input.consumerId ?? input.id ?? '').trim()
    const actorRole = (input.actorRole ?? '').trim()

    if (actorRole !== 'President')
      return json({ success: false, error: 'Only the President can remove consumer accounts.' }, 403)
    if (!consumerCode)
      return json({ success: false, error: 'Consumer account is required.' }, 400)

    const [consumer] = await sql`
      SELECT id, full_name, account_no FROM consumers
      WHERE consumer_code = ${consumerCode} OR id::text = ${consumerCode}
      LIMIT 1
    `
    if (!consumer) return json({ success: false, error: 'Consumer account not found.' }, 404)

    try {
      await sql`DELETE FROM payments WHERE consumer_id = ${consumer.id}`
      await sql`DELETE FROM bills WHERE consumer_id = ${consumer.id}`
      await sql`DELETE FROM notifications WHERE account_no = ${consumer.account_no}`
      await sql`DELETE FROM consumers WHERE id = ${consumer.id}`

      return json({
        success: true,
        deleted: { id: consumerCode, name: consumer.full_name, accountNo: consumer.account_no },
      })
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  // ── POST ───────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const input = await parseBody(req)
    const name           = (input.name ?? '').trim()
    const accountNo      = (input.accountNo ?? '').trim()
    const username       = (input.username ?? '').toLowerCase().trim() || null
    const contact        = (input.contact ?? '').trim()
    const address        = (input.address ?? '').trim()
    const zone           = (input.zone ?? '').trim()
    const classification = input.classification ?? 'Residential'
    const meterNo        = (input.meterNo ?? '').trim()
    const connectionDate = input.connectionDate ?? new Date().toISOString().slice(0, 10)
    const lastReading    = parseFloat(input.lastReading ?? 0)
    const status         = input.status === 'Pending Approval' ? 'Pending' : (input.status ?? 'Active')
    const approvalStatus = input.approvalStatus ?? (status === 'Pending' ? 'Pending' : 'Approved')

    if (!name || !accountNo || !zone)
      return json({ success: false, error: 'Name, Account No, and Zone are required.' }, 400)

    try {
      const [countRow] = await sql`SELECT COUNT(*) AS c FROM consumers`
      const consumerCode = input.id ?? `C-${1001 + parseInt(countRow.c)}`

      // Check uniqueness
      const [existing] = await sql`
        SELECT id FROM consumers WHERE consumer_code = ${consumerCode} OR account_no = ${accountNo}
      `
      const finalCode = existing
        ? `C-${2000 + Math.floor(Math.random() * 7999)}`
        : consumerCode

      const [inserted] = await sql`
        INSERT INTO consumers
          (consumer_code, account_no, username, full_name, contact_no, service_address,
           zone, classification, meter_serial, status, approval_status,
           connection_date, last_reading)
        VALUES
          (${finalCode}, ${accountNo}, ${username}, ${name}, ${contact}, ${address},
           ${zone}, ${classification}, ${meterNo || null}, ${status}, ${approvalStatus},
           ${connectionDate}, ${lastReading})
        RETURNING id
      `
      const consumerDbId = inserted.id

      // Meter asset
      if (meterNo) {
        const nextCalib = new Date(connectionDate)
        nextCalib.setFullYear(nextCalib.getFullYear() + 2)
        const nextCalibStr = nextCalib.toISOString().slice(0, 10)

        const [meterInserted] = await sql`
          INSERT INTO meter_assets
            (serial_no, brand, model, pipe_size, install_date, consumer_id, zone,
             last_calibration, next_calibration, status)
          VALUES
            (${'MTR-' + meterNo.replace('MTR-', '')}, 'Aquaflow Pro', 'AF-20-Brass',
             '1/2 inch', ${connectionDate}, ${consumerDbId}, ${zone},
             ${connectionDate}, ${nextCalibStr}, 'Active')
          RETURNING id
        `
        await sql`
          INSERT INTO meter_calibrations
            (meter_id, calibration_date, event_type, technician_name, accuracy_margin, test_result, notes)
          VALUES
            (${meterInserted.id}, ${connectionDate}, 'Installation', 'Roberto Ramos',
             '+/- 0.2%', 'Passed', 'Newly registered consumer line and meter installed.')
        `
      }

      // Geo pin
      const lat = parseFloat(input.latitude ?? input.serviceCoordinates?.lat ?? (14.6 + (Math.random() - 0.5) * 0.06))
      const lng = parseFloat(input.longitude ?? input.serviceCoordinates?.lng ?? (121.05 + (Math.random() - 0.5) * 0.06))
      await sql`
        INSERT INTO geo_connections (consumer_id, zone, latitude, longitude, status)
        VALUES (${consumerDbId}, ${zone}, ${lat}, ${lng}, 'Normal')
      `

      // Audit
      const logCode = `AUD-${1000 + Math.floor(Math.random() * 8999)}`
      await sql`
        INSERT INTO audit_trail
          (log_code, user_id, user_name, user_role, category, action, target_entity, details, ip_address)
        VALUES
          (${logCode}, 1, 'Jamie Dizon', 'Administrator', 'Consumer',
           'Registered Consumer Profile', ${`${name} (${accountNo})`},
           ${`Created profile in ${zone} with assigned meter ${meterNo}.`}, '127.0.0.1')
      `

      return json({
        success: true,
        message: 'Consumer created successfully.',
        data: {
          dbId: consumerDbId, id: finalCode, accountNo, name, contact, address,
          zone, classification, meterNo, status: approvalStatus === 'Pending' ? 'Pending Approval' : status,
          approvalStatus, connectionDate, lastReading,
        },
      }, 201)
    } catch (err) {
      return json({ success: false, error: err.message }, 500)
    }
  }

  // ── PUT ────────────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const input = await parseBody(req)
    const consumerCode = (input.consumerId ?? input.id ?? '').trim()
    const action = input.action ?? 'approval'

    if (action === 'location-request') {
      const lat = parseFloat(input.latitude ?? 0)
      const lng = parseFloat(input.longitude ?? 0)
      if (!consumerCode || !lat || !lng)
        return json({ success: false, error: 'Consumer and coordinates are required.' }, 400)

      await sql`
        UPDATE consumers
        SET location_approval_status = 'Pending',
            requested_latitude = ${lat}, requested_longitude = ${lng}
        WHERE consumer_code = ${consumerCode}
      `
      return json({ success: true, locationApprovalStatus: 'Pending' })
    }

    if (action === 'location-decision') {
      const decision = input.locationApprovalStatus ?? ''
      if (!consumerCode || !['Approved', 'Rejected'].includes(decision))
        return json({ success: false, error: 'Consumer and location decision are required.' }, 400)

      if (decision === 'Approved') {
        const [consumer] = await sql`
          SELECT id, requested_latitude, requested_longitude
          FROM consumers WHERE consumer_code = ${consumerCode}
        `
        if (!consumer?.requested_latitude)
          return json({ success: false, error: 'No pending location request found.' }, 404)

        await sql`
          UPDATE geo_connections
          SET latitude = ${consumer.requested_latitude}, longitude = ${consumer.requested_longitude}
          WHERE consumer_id = ${consumer.id}
        `
        await sql`
          UPDATE consumers
          SET location_approval_status = 'Approved',
              requested_latitude = NULL, requested_longitude = NULL
          WHERE consumer_code = ${consumerCode}
        `
      } else {
        await sql`
          UPDATE consumers
          SET location_approval_status = 'Rejected',
              requested_latitude = NULL, requested_longitude = NULL
          WHERE consumer_code = ${consumerCode}
        `
      }
      return json({ success: true, locationApprovalStatus: decision })
    }

    // Default: approval decision
    const decision = input.approvalStatus ?? ''
    if (!consumerCode || !['Approved', 'Rejected'].includes(decision))
      return json({ success: false, error: 'Consumer and approval decision are required.' }, 400)

    const newStatus = decision === 'Approved' ? 'Active' : 'Pending'
    await sql`
      UPDATE consumers SET status = ${newStatus}, approval_status = ${decision}
      WHERE consumer_code = ${consumerCode}
    `
    return json({ success: true, approvalStatus: decision, status: decision === 'Approved' ? 'Active' : 'Rejected' })
  }

  return json({ success: false, error: 'Method not supported' }, 405)
}
