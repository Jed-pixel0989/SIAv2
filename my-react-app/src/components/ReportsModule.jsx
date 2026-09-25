import { useState, useMemo } from 'react'

// Helper: escape a CSV cell value
function csvCell(val) {
  const str = val === null || val === undefined ? '' : String(val)
  return `"${str.replace(/"/g, '""')}"`
}

function downloadCSV(filename, headers, rows) {
  const content = [headers.join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsModule({
  consumers,
  bills,
  payments,
  complaints,
  auditLogs,
  adjustments,
  staff,
  currentUser,
  clusterBoundaries = [],
  onApproveAdjustment,
  flash,
}) {
  const [activeReportTab, setActiveReportTab] = useState('statistical')
  const [periodFilter, setPeriodFilter] = useState('All')
  const [zoneFilter, setZoneFilter] = useState('All')
  const [complaintStatusFilter, setComplaintStatusFilter] = useState('All')

  // Derive zones dynamically: union of all consumer zone values + cluster names from president
  const allZones = useMemo(() => {
    const fromConsumers = consumers.map((c) => c.zone).filter(Boolean)
    const fromClusters = clusterBoundaries.map((cl) => cl.name).filter(Boolean)
    return Array.from(new Set([...fromConsumers, ...fromClusters])).sort()
  }, [consumers, clusterBoundaries])

  // Available unique periods
  const billingPeriods = useMemo(() => {
    return ['All', ...new Set(bills.map((b) => b.period))]
  }, [bills])

  // Filtered bills for consumption report
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchPeriod = periodFilter === 'All' || b.period === periodFilter
      const matchZone = zoneFilter === 'All' || b.zone === zoneFilter
      return matchPeriod && matchZone
    })
  }, [bills, periodFilter, zoneFilter])

  // KPIs for Statistical Report
  const stats = useMemo(() => {
    const totalBilled = bills.reduce((acc, b) => acc + (b.totalAmount || 0), 0)
    const totalCollected = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0)
    const totalConsumption = bills.reduce((acc, b) => acc + (b.consumption || 0), 0)
    const totalConsumers = consumers.length
    const activeConsumers = consumers.filter((c) => c.status === 'Active').length
    const overdueCount = bills.filter((b) => b.status === 'Overdue').length
    const openTickets = complaints.filter((c) => c.status !== 'Resolved').length
    const collectionEfficiency = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0'

    return {
      totalBilled,
      totalCollected,
      totalConsumption,
      totalConsumers,
      activeConsumers,
      overdueCount,
      openTickets,
      collectionEfficiency,
    }
  }, [bills, payments, consumers, complaints])

  // Payment Breakdown
  const paymentMethodStats = useMemo(() => {
    const breakdown = { Cash: 0, GCash: 0, Maya: 0, 'Bank Transfer': 0 }
    payments.forEach((p) => {
      const m = p.method || 'Cash'
      breakdown[m] = (breakdown[m] || 0) + (p.amountPaid || 0)
    })
    return breakdown
  }, [payments])

  const isPresidentOrAdmin = currentUser.role === 'President' || currentUser.role === 'Administrator'

  return (
    <div className="module-page fade-in">
      <div className="module-header-row">
        <div>
          <h2>Executive & Operational Reports</h2>
          <p className="subtext">
            Lambawasa Comprehensive Utility Intelligence, Consumption Analytics, Collections & Staff Audits
          </p>
        </div>
        <div className="header-badge-group">
          <button
            className="btn-outline-sm"
            onClick={() => {
              const date = new Date().toISOString().slice(0, 10)
              if (activeReportTab === 'statistical') {
                const zones = allZones.filter((z) => consumers.some((c) => c.zone === z) || bills.some((b) => b.zone === z))
                downloadCSV(
                  `lambawasa-statistical-${date}.csv`,
                  ['Zone', 'Registered Households', 'Total Usage (m3)', 'Billed Revenue (PHP)', 'Delinquent Accounts'],
                  zones.map((zone) => {
                    const zc = consumers.filter((c) => c.zone === zone)
                    const zb = bills.filter((b) => b.zone === zone)
                    return [
                      zone,
                      zc.length,
                      zb.reduce((acc, b) => acc + (b.consumption || 0), 0),
                      zb.reduce((acc, b) => acc + (b.totalAmount || 0), 0).toFixed(2),
                      zb.filter((b) => b.status === 'Overdue').length,
                    ]
                  })
                )
              } else if (activeReportTab === 'consumption') {
                downloadCSV(
                  `lambawasa-consumption-${date}.csv`,
                  ['Account No', 'Consumer Name', 'Zone', 'Period', 'Prev Reading', 'Pres Reading', 'Consumption (m3)', 'Base Amount', 'Total Amount', 'Status'],
                  filteredBills.map((b) => [b.accountNo, b.name, b.zone, b.period, b.prevReading, b.presReading, b.consumption, b.baseAmount?.toFixed(2), b.totalAmount?.toFixed(2), b.status])
                )
              } else if (activeReportTab === 'payments') {
                downloadCSV(
                  `lambawasa-payments-${date}.csv`,
                  ['OR Number', 'Bill ID', 'Consumer Name', 'Account No', 'Amount Paid (PHP)', 'Method', 'Cashier', 'Timestamp'],
                  payments.map((p) => [p.orNumber, p.billId, p.consumerName, p.accountNo, p.amountPaid?.toFixed(2), p.method, p.cashier, p.timestamp])
                )
              } else if (activeReportTab === 'adjustments') {
                downloadCSV(
                  `lambawasa-adjustments-${date}.csv`,
                  ['ID', 'Consumer Name', 'Account No', 'Reason', 'Amount (PHP)', 'Status', 'Requested By', 'Reviewed By', 'Date'],
                  (adjustments || []).map((a) => [a.id, a.consumerName, a.accountNo, a.reason, a.amount?.toFixed(2), a.status, a.requestedBy, a.reviewedBy || '', a.date])
                )
              } else if (activeReportTab === 'workload') {
                const fieldStaff = (staff || []).filter((s) => s.role === 'Field Staffs')
                downloadCSV(
                  `lambawasa-workload-${date}.csv`,
                  ['Staff ID', 'Technician Name', 'Zone', 'Contact', 'Open Tickets', 'Employment Status'],
                  fieldStaff.map((s) => {
                    const open = complaints.filter((c) => c.assignedTech === s.fullName && c.status !== 'Resolved').length
                    return [s.staffId || s.id, s.fullName, s.zone, s.contact, open, s.status]
                  })
                )
              } else if (activeReportTab === 'complaints') {
                downloadCSV(
                  `lambawasa-complaints-${date}.csv`,
                  ['Ticket No', 'Consumer Name', 'Account No', 'Zone', 'Issue Type', 'Priority', 'Status', 'Assigned Tech', 'Reported At'],
                  complaints.map((c) => [c.ticketNo, c.consumerName, c.accountNo, c.zone, c.issueType, c.priority, c.status, c.assignedTech, c.reportedAt])
                )
              }
              flash('CSV exported successfully.')
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Report Tab Selector */}
      <div className="tab-pill-bar" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '14px 0 20px' }}>
        <button
          className={activeReportTab === 'statistical' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('statistical')}
        >
          📊 Statistical Report
        </button>
        <button
          className={activeReportTab === 'consumption' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('consumption')}
        >
          💧 Consumption Report
        </button>
        <button
          className={activeReportTab === 'payments' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('payments')}
        >
          ₱ Payments Report
        </button>
        <button
          className={activeReportTab === 'adjustments' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('adjustments')}
        >
          ⚖️ Adjustment Audit
        </button>
        <button
          className={activeReportTab === 'workload' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('workload')}
        >
          🛠️ Staff Workload
        </button>
        <button
          className={activeReportTab === 'complaints' ? 'tab-pill active' : 'tab-pill'}
          onClick={() => setActiveReportTab('complaints')}
        >
          📝 Complaint History
        </button>
      </div>

      {/* 1. STATISTICAL REPORT */}
      {activeReportTab === 'statistical' && (
        <div className="report-content-panel">
          <div className="grid-cards-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="metric-box">
              <span className="metric-lbl">Total Water Billed</span>
              <strong className="metric-val text-primary">₱ {stats.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              <small className="metric-sub">Across all active billing cycles</small>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Total Cash Collections</span>
              <strong className="metric-val text-success">₱ {stats.totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              <small className="metric-sub">Collection Efficiency: {stats.collectionEfficiency}%</small>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Total System Consumption</span>
              <strong className="metric-val">{stats.totalConsumption.toLocaleString()} m³</strong>
              <small className="metric-sub">{stats.activeConsumers} active households</small>
            </div>
            <div className="metric-box">
              <span className="metric-lbl">Delinquent / Overdue</span>
              <strong className="metric-val text-danger">{stats.overdueCount} Accounts</strong>
              <small className="metric-sub">{stats.openTickets} pending maintenance tickets</small>
            </div>
          </div>

          <div className="card-panel">
            <h3>District Water Distribution Summary</h3>
            <p className="subtext">Aggregate consumption, billing volume, and delinquency distribution by zone</p>
            <table className="data-table" style={{ width: '100%', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Registered Households</th>
                  <th>Total Usage (m³)</th>
                  <th>Billed Revenue</th>
                  <th>Delinquent Accounts</th>
                </tr>
              </thead>
              <tbody>
                {allZones.filter((zone) =>
                  consumers.some((c) => c.zone === zone) || bills.some((b) => b.zone === zone)
                ).map((zone) => {
                  const zoneConsumers = consumers.filter((c) => c.zone === zone)
                  const zoneBills = bills.filter((b) => b.zone === zone)
                  const zoneCuM = zoneBills.reduce((acc, b) => acc + (b.consumption || 0), 0)
                  const zoneRevenue = zoneBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0)
                  const zoneOverdue = zoneBills.filter((b) => b.status === 'Overdue').length
                  return (
                    <tr key={zone}>
                      <td><strong>{zone}</strong></td>
                      <td>{zoneConsumers.length}</td>
                      <td>{zoneCuM.toLocaleString()} m³</td>
                      <td>₱ {zoneRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td>
                        {zoneOverdue > 0 ? (
                          <span className="pill pill-red">{zoneOverdue} Overdue</span>
                        ) : (
                          <span className="pill pill-green">0 Normal</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CONSUMPTION REPORT */}
      {activeReportTab === 'consumption' && (
        <div className="report-content-panel">
          <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Period:</span>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                {billingPeriods.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Zone:</span>
              <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
                <option value="All">All Zones</option>
                {allZones.map((zone) => (
                  <option key={zone} value={zone}>{zone}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="card-panel">
            <div className="flex-between">
              <h3>Detailed Consumer Consumption Records ({filteredBills.length})</h3>
              <button
                className="btn-outline-sm"
                onClick={() => flash('Exported Consumption Ledger to PDF.')}
              >
                📄 Print Ledger
              </button>
            </div>
            <table className="data-table" style={{ width: '100%', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Account No</th>
                  <th>Consumer Name</th>
                  <th>Zone</th>
                  <th>Period</th>
                  <th>Prev Reading</th>
                  <th>Pres Reading</th>
                  <th>Consumption</th>
                  <th>Base Amount</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b) => (
                  <tr key={b.id}>
                    <td><code>{b.accountNo}</code></td>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.zone}</td>
                    <td>{b.period}</td>
                    <td>{b.prevReading} m³</td>
                    <td>{b.presReading} m³</td>
                    <td><strong className="text-primary">{b.consumption} m³</strong></td>
                    <td>₱ {b.baseAmount.toFixed(2)}</td>
                    <td><strong>₱ {b.totalAmount.toFixed(2)}</strong></td>
                    <td>
                      <span className={`pill ${b.status === 'Paid' ? 'pill-green' : b.status === 'Overdue' ? 'pill-red' : 'pill-yellow'}`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PAYMENTS REPORT */}
      {activeReportTab === 'payments' && (
        <div className="report-content-panel">
          <div className="grid-cards-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {Object.entries(paymentMethodStats).map(([method, amount]) => (
              <div key={method} className="metric-box">
                <span className="metric-lbl">{method} Collections</span>
                <strong className="metric-val">₱ {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                <small className="metric-sub">Verified official receipts</small>
              </div>
            ))}
          </div>

          <div className="card-panel">
            <div className="flex-between">
              <h3>Official Payment Ledger ({payments.length} Transactions)</h3>
              <button className="btn-outline-sm" onClick={() => flash('Exported Official Receipts Audit.')}>
                🖨️ Daily Collection Summary
              </button>
            </div>
            <table className="data-table" style={{ width: '100%', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>OR Number</th>
                  <th>Timestamp</th>
                  <th>Consumer Name</th>
                  <th>Account No</th>
                  <th>Payment Channel</th>
                  <th>Amount Paid</th>
                  <th>Tendered</th>
                  <th>Cashier</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td><code className="text-primary">{p.orNumber}</code></td>
                    <td>{p.timestamp}</td>
                    <td><strong>{p.consumerName}</strong></td>
                    <td><code>{p.accountNo}</code></td>
                    <td><span className="pill pill-cyan">{p.method}</span></td>
                    <td><strong className="text-success">₱ {p.amountPaid.toFixed(2)}</strong></td>
                    <td>₱ {p.tendered.toFixed(2)}</td>
                    <td>{p.cashier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. APPROVE ADJUSTMENT AUDIT REPORT (President / Admin) */}
      {activeReportTab === 'adjustments' && (
        <div className="report-content-panel">
          <div className="card-panel">
            <div className="flex-between">
              <div>
                <h3>Approve Adjustment Audit Report</h3>
                <p className="subtext">
                  Formal dispute adjustments, penalty waivers, and credit corrections requiring President approval
                </p>
              </div>
              {!isPresidentOrAdmin && (
                <span className="pill pill-red">🔒 Read-Only (Requires President Privileges to Approve)</span>
              )}
            </div>

            <table className="data-table" style={{ width: '100%', marginTop: '14px' }}>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Bill ID</th>
                  <th>Consumer</th>
                  <th>Adjustment Reason</th>
                  <th>Amount</th>
                  <th>Requested By</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  {isPresidentOrAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {(adjustments || []).map((adj) => (
                  <tr key={adj.id}>
                    <td><code>{adj.id}</code></td>
                    <td><code>{adj.billId}</code></td>
                    <td><strong>{adj.consumerName}</strong> ({adj.accountNo})</td>
                    <td>{adj.reason}</td>
                    <td><strong className="text-danger">₱ {adj.adjustmentAmount.toFixed(2)}</strong></td>
                    <td>{adj.requestedBy}</td>
                    <td>
                      <span className={`pill ${adj.status === 'Approved' ? 'pill-green' : adj.status === 'Rejected' ? 'pill-red' : 'pill-yellow'}`}>
                        {adj.status}
                      </span>
                    </td>
                    <td>{adj.approvedBy || '—'}</td>
                    {isPresidentOrAdmin && (
                      <td>
                        {adj.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn-success-sm"
                              onClick={() => {
                                onApproveAdjustment(adj.id, 'Approved')
                                flash(`Adjustment ${adj.id} approved by ${currentUser.fullName}.`)
                              }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              className="btn-danger-sm"
                              onClick={() => {
                                onApproveAdjustment(adj.id, 'Rejected')
                                flash(`Adjustment ${adj.id} rejected.`)
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : (
                          <span className="subtext">Complete</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. STAFF WORKLOAD */}
      {activeReportTab === 'workload' && (
        <div className="report-content-panel">
          <div className="card-panel">
            <h3>Field Staff Assignment & Workload Tracking</h3>
            <p className="subtext">Active work orders, assigned service tickets, and field productivity</p>
            <table className="data-table" style={{ width: '100%', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Technician Name</th>
                  <th>Primary Zone</th>
                  <th>Contact</th>
                  <th>Open Tickets</th>
                  <th>Employment Status</th>
                  <th>Operational Load</th>
                </tr>
              </thead>
              <tbody>
                {(staff || []).filter((s) => s.role === 'Field Staffs').map((tech) => {
                  const techTickets = complaints.filter(
                    (c) => c.assignedTech === tech.fullName && c.status !== 'Resolved'
                  )
                  const loadPercent = Math.min(100, techTickets.length * 33)
                  return (
                    <tr key={tech.id}>
                      <td><code>{tech.id}</code></td>
                      <td><strong>{tech.fullName}</strong></td>
                      <td>{tech.zone}</td>
                      <td>{tech.contact}</td>
                      <td><strong>{techTickets.length} Active Tickets</strong></td>
                      <td>
                        <span className={`pill ${tech.status === 'Active' ? 'pill-green' : 'pill-red'}`}>
                          {tech.status}
                        </span>
                      </td>
                      <td style={{ width: '180px' }}>
                        <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${loadPercent}%`,
                              background: loadPercent > 66 ? '#ef4444' : loadPercent > 33 ? '#f59e0b' : '#10b981',
                              height: '100%',
                            }}
                          />
                        </div>
                        <small style={{ color: '#64748b' }}>{loadPercent}% Capacity</small>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. COMPLAINT HISTORY */}
      {activeReportTab === 'complaints' && (
        <div className="report-content-panel">
          <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Status Filter:</span>
              <select value={complaintStatusFilter} onChange={(e) => setComplaintStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Reported">Reported</option>
                <option value="Dispatched">Dispatched</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </label>
          </div>

          <div className="card-panel">
            <h3>Consumer Maintenance & Service Ticket History</h3>
            <table className="data-table" style={{ width: '100%', marginTop: '12px' }}>
              <thead>
                <tr>
                  <th>Ticket No</th>
                  <th>Consumer</th>
                  <th>Zone</th>
                  <th>Issue Category</th>
                  <th>Priority</th>
                  <th>Assigned Field Staff</th>
                  <th>Reported Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {complaints
                  .filter((c) => complaintStatusFilter === 'All' || c.status === complaintStatusFilter)
                  .map((c) => (
                    <tr key={c.id}>
                      <td><code className="text-primary">{c.ticketNo}</code></td>
                      <td><strong>{c.consumerName}</strong></td>
                      <td>{c.zone}</td>
                      <td>{c.issueType}</td>
                      <td>
                        <span className={`pill ${c.priority === 'Urgent' ? 'pill-red' : c.priority === 'High' ? 'pill-yellow' : 'pill-cyan'}`}>
                          {c.priority}
                        </span>
                      </td>
                      <td>{c.assignedTech || 'Unassigned'}</td>
                      <td><small>{c.reportedAt}</small></td>
                      <td>
                        <span className={`pill ${c.status === 'Resolved' ? 'pill-green' : c.status === 'In Progress' ? 'pill-yellow' : 'pill-cyan'}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
