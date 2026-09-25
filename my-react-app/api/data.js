import { getDb, json, handleOptions, makeAvatar } from './_db.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method === 'OPTIONS') return handleOptions()
  if (req.method !== 'GET') return json({ success: false, error: 'Method not supported' }, 405)

  try {
    const sql = getDb()

    // 1. Consumers
    const consumerRows = await sql`SELECT * FROM consumers ORDER BY id ASC`
    const consumerMap = {}
    const consumers = consumerRows.map((row) => {
      const item = {
        dbId: row.id,
        id: row.consumer_code,
        accountNo: row.account_no,
        username: row.username ?? null,
        name: row.full_name,
        contact: row.contact_no,
        address: row.service_address,
        zone: row.zone,
        classification: row.classification,
        meterNo: row.meter_serial,
        status:
          row.approval_status === 'Rejected'
            ? 'Rejected'
            : row.approval_status === 'Pending'
            ? 'Pending Approval'
            : row.status,
        approvalStatus: row.approval_status,
        locationApprovalStatus: row.location_approval_status ?? 'None',
        requestedLatitude: row.requested_latitude != null ? parseFloat(row.requested_latitude) : null,
        requestedLongitude: row.requested_longitude != null ? parseFloat(row.requested_longitude) : null,
        connectionDate: row.connection_date,
        lastReading: parseFloat(row.last_reading),
        avatar: makeAvatar(row.full_name),
      }
      consumerMap[row.id] = item
      return item
    })

    // 2. Meter calibrations grouped by meter_id
    const calibRows = await sql`SELECT * FROM meter_calibrations ORDER BY calibration_date ASC`
    const calibByMeter = {}
    for (const cal of calibRows) {
      if (!calibByMeter[cal.meter_id]) calibByMeter[cal.meter_id] = []
      calibByMeter[cal.meter_id].push({
        date: cal.calibration_date,
        type: cal.event_type,
        technician: cal.technician_name,
        notes: cal.notes ?? '',
        accuracyMargin: cal.accuracy_margin ?? '',
        testResult: cal.test_result ?? '',
      })
    }

    // 3. Meters
    const meterRows = await sql`
      SELECT m.*, c.consumer_code, c.full_name AS consumer_name
      FROM meter_assets m
      LEFT JOIN consumers c ON m.consumer_id = c.id
      ORDER BY m.id ASC
    `
    const meters = meterRows.map((m) => ({
      id: m.id,
      serialNo: m.serial_no,
      brand: m.brand,
      model: m.model ?? '',
      size: m.pipe_size ?? '1/2 inch',
      installDate: m.install_date,
      consumerId: m.consumer_code ?? (m.consumer_id ? `C-${m.consumer_id}` : ''),
      consumerName: m.consumer_name ?? 'Unassigned',
      zone: m.zone ?? 'Mabuhay',
      lastCalibration: m.last_calibration ?? m.install_date,
      nextCalibration: m.next_calibration ?? m.install_date,
      status: m.status,
      history: calibByMeter[m.id] ?? [
        { date: m.install_date, type: 'Installation', technician: 'Roberto Ramos', notes: 'Meter commissioned and sealed.' },
      ],
    }))

    // 4. Geo pins
    const geoRows = await sql`
      SELECT g.*, c.consumer_code, c.full_name, c.meter_serial, c.last_reading
      FROM geo_connections g
      LEFT JOIN consumers c ON g.consumer_id = c.id
      ORDER BY g.id ASC
    `
    const geoPins = geoRows.map((g, idx) => ({
      id: `GP-${g.id}`,
      consumerId: g.consumer_code ?? `C-${g.consumer_id}`,
      name: g.full_name ?? 'Unknown',
      zone: g.zone,
      x: 20 + ((idx * 17 + 13) % 65),
      y: 25 + ((idx * 23 + 7) % 55),
      lat: parseFloat(g.latitude),
      lng: parseFloat(g.longitude),
      latitude: parseFloat(g.latitude),
      longitude: parseFloat(g.longitude),
      status: g.status,
      meterNo: g.meter_serial ?? '',
      reading: parseFloat(g.last_reading ?? 0),
    }))

    // 5. Bills
    const billRows = await sql`
      SELECT b.*, c.consumer_code, c.full_name, c.account_no, c.zone AS c_zone
      FROM bills b
      LEFT JOIN consumers c ON b.consumer_id = c.id
      ORDER BY b.id DESC
    `
    const bills = billRows.map((b) => ({
      dbId: b.id,
      id: b.bill_no,
      consumerId: b.consumer_code ?? `C-${b.consumer_id}`,
      name: b.full_name ?? 'Consumer',
      accountNo: b.account_no ?? '',
      zone: b.c_zone ?? 'Mabuhay',
      period: b.billing_period,
      prevReading: parseFloat(b.prev_reading),
      presReading: parseFloat(b.pres_reading),
      consumption: parseFloat(b.consumption_cum),
      baseAmount: parseFloat(b.base_amount),
      envFee: parseFloat(b.env_fee),
      maintFee: parseFloat(b.maint_fee),
      arrears: parseFloat(b.arrears),
      penalty: parseFloat(b.penalty),
      totalAmount: parseFloat(b.total_amount),
      status: b.status,
      dueDate: b.due_date,
      paidDate: b.paid_date ?? null,
      daysOverdue: b.days_overdue ?? 0,
      avatar: makeAvatar(b.full_name ?? ''),
    }))

    // 6. Payments
    const paymentRows = await sql`
      SELECT p.*, b.bill_no, c.consumer_code, c.full_name, u.full_name AS cashier_name
      FROM payments p
      LEFT JOIN bills b ON p.bill_id = b.id
      LEFT JOIN consumers c ON p.consumer_id = c.id
      LEFT JOIN users u ON p.cashier_id = u.id
      ORDER BY p.id DESC
    `
    const payments = paymentRows.map((p) => ({
      id: p.id,
      orNumber: p.or_number,
      billId: p.bill_no ?? `WS-${p.bill_id}`,
      consumerId: p.consumer_code ?? `C-${p.consumer_id}`,
      consumerName: p.full_name ?? 'Counter Consumer',
      amountPaid: parseFloat(p.amount_paid),
      tendered: parseFloat(p.tendered_amount),
      change: parseFloat(p.change_amount),
      method: p.payment_method,
      date: p.payment_date,
      cashier: p.cashier_name ?? 'Counter Cashier Alpha',
      notes: p.notes ?? '',
    }))

    // 7. Tickets
    const ticketRows = await sql`
      SELECT t.*, c.consumer_code, c.full_name, c.account_no
      FROM maintenance_tickets t
      LEFT JOIN consumers c ON t.consumer_id = c.id
      ORDER BY t.id DESC
    `
    const complaints = ticketRows.map((t) => ({
      dbId: t.id,
      id: t.ticket_no,
      ticketNo: t.ticket_no,
      consumerId: t.consumer_code ?? `C-${t.consumer_id}`,
      consumerName: t.full_name ?? 'Reporting Consumer',
      accountNo: t.account_no ?? '',
      zone: t.zone,
      issueType: t.issue_type,
      priority: t.priority,
      status: t.status,
      reportedAt: t.reported_at,
      resolvedAt: t.resolved_at ?? null,
      assignedTo: t.technician_name ?? 'Roberto Ramos',
      assignedTech: t.technician_name ?? 'Roberto Ramos',
      description: t.description ?? '',
      resolution: t.resolution_notes ?? '',
      notes: t.resolution_notes ?? '',
      resolutionImage: t.resolution_image ?? null,
    }))

    // 8. Audit logs
    const auditRows = await sql`SELECT * FROM audit_trail ORDER BY id DESC LIMIT 100`
    const auditLogs = auditRows.map((a) => ({
      id: a.log_code,
      timestamp: a.created_at,
      user: a.user_name,
      role: a.user_role ?? 'Operator',
      category: a.category,
      action: a.action,
      target: a.target_entity,
      details: a.details,
      ip: a.ip_address ?? '127.0.0.1',
    }))

    // 9. Staff
    const userRows = await sql`SELECT * FROM users ORDER BY id ASC`
    const staff = userRows.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.full_name,
      fullName: u.full_name,
      role: u.role,
      email: u.email,
      phone: u.contact_no ?? '+63 900 000 0000',
      status: u.status,
      zone: 'Central Hub',
      activeTickets: 1,
      completedTickets: 14,
      rating: 4.9,
    }))

    // 10. Notifications
    const notifRows = await sql`SELECT * FROM notifications ORDER BY id DESC`
    const notifications = notifRows.map((n) => ({
      id: n.notification_code,
      type: n.type,
      recipient: n.recipient_name,
      accountNo: n.account_no,
      consumerId: n.consumer_id ?? null,
      ticketId: n.ticket_id ?? null,
      resolutionImage: n.resolution_image ?? null,
      message: n.message,
      channel: n.channel,
      status: n.status,
      sentAt: n.sent_at,
    }))

    // 11. Tariff
    const tariffRows = await sql`SELECT * FROM tariff_rates`
    const tariff = {
      residential: { minCharge: 180, minCuM: 10, bracket1: 22.5, bracket2: 28, bracket3: 35 },
      commercial:  { minCharge: 360, minCuM: 10, bracket1: 42,   bracket2: 52, bracket3: 65 },
      institutional: { minCharge: 250, minCuM: 10, bracket1: 30, bracket2: 38, bracket3: 48 },
      environmentalFeeRate: 0.1,
      meterMaintenanceFee: 25,
      overduePenaltyRate: 0.1,
    }
    for (const tr of tariffRows) {
      const key = tr.classification.toLowerCase()
      if (tariff[key]) {
        tariff[key].minCharge = parseFloat(tr.min_charge)
        tariff[key].minCuM   = parseInt(tr.min_cum)
        tariff[key].bracket1 = parseFloat(tr.bracket_1_rate)
        tariff[key].bracket2 = parseFloat(tr.bracket_2_rate)
        tariff[key].bracket3 = parseFloat(tr.bracket_3_rate)
      }
      tariff.environmentalFeeRate = parseFloat(tr.environmental_fee_rate)
      tariff.meterMaintenanceFee  = parseFloat(tr.meter_maintenance_fee)
      tariff.overduePenaltyRate   = parseFloat(tr.overdue_penalty_rate)
    }

    // 12. Boundaries
    const boundaryRows = await sql`SELECT boundary_key, boundary_data FROM system_boundaries`
    let serviceBoundary = null
    let clusterBoundaries = []
    for (const row of boundaryRows) {
      const data = typeof row.boundary_data === 'string'
        ? JSON.parse(row.boundary_data)
        : row.boundary_data
      if (row.boundary_key === 'service') serviceBoundary = data
      if (row.boundary_key === 'clusters') clusterBoundaries = data
    }

    return json({
      success: true,
      source: 'Neon Postgres (waterline_db)',
      data: {
        consumers, meters, geoPins, bills, payments,
        complaints, auditLogs, staff, notifications,
        tariff, serviceBoundary, clusterBoundaries,
      },
    })
  } catch (err) {
    return json({ success: false, error: err.message }, 500)
  }
}
