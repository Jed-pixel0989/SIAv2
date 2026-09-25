import { useState } from 'react'

export default function HRModule({ staff, complaints, consumers = [], clusterBoundaries = [], onAddStaff, onUpdateStaffStatus, flash }) {
  // Derive zones from actual data
  const allZones = Array.from(new Set([
    ...consumers.map((c) => c.zone).filter(Boolean),
    ...clusterBoundaries.map((cl) => cl.name).filter(Boolean),
  ])).sort()

  const [showAddModal, setShowAddModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Field Staffs')
  const [zone, setZone] = useState(() => allZones[0] || '')
  const [contact, setContact] = useState('')

  const handleAddSubmit = (e) => {
    e.preventDefault()
    if (!fullName.trim()) return

    const newStaff = {
      id: `STF-0${staff.length + 1}`,
      fullName: fullName.trim(),
      role,
      zone,
      contact: contact || '+63 917 000 0000',
      status: 'Active',
      joinDate: new Date().toISOString().split('T')[0],
      openTickets: 0,
    }

    onAddStaff(newStaff)
    setShowAddModal(false)
    setFullName('')
    setContact('')
    flash(`Staff member ${newStaff.fullName} registered successfully under ${role}.`)
  }

  return (
    <div className="module-page fade-in">
      <div className="module-header-row">
        <div>
          <h2>Human Resources & Personnel Management</h2>
          <p className="subtext">
            Lambawasa Staff Roster, Field Crew Allocations, and Workload Distribution
          </p>
        </div>
        <div className="header-badge-group">
          <button className="primary-button" onClick={() => setShowAddModal(true)}>
            + Register New Staff
          </button>
        </div>
      </div>

      {/* Staff summary cards */}
      <div className="grid-cards-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', margin: '14px 0 20px' }}>
        <div className="metric-box">
          <span className="metric-lbl">Total Headcount</span>
          <strong className="metric-val">{staff.length} Employees</strong>
          <small className="metric-sub">Active personnel</small>
        </div>
        <div className="metric-box">
          <span className="metric-lbl">Field Technicians</span>
          <strong className="metric-val text-primary">{staff.filter((s) => s.role === 'Field Staffs').length} Technicians</strong>
          <small className="metric-sub">On-site maintenance & GIS</small>
        </div>
        <div className="metric-box">
          <span className="metric-lbl">Office & Billing Staff</span>
          <strong className="metric-val text-cyan">{staff.filter((s) => s.role === 'Office Staffs').length} Personnel</strong>
          <small className="metric-sub">Customer accounts & ledger</small>
        </div>
        <div className="metric-box">
          <span className="metric-lbl">Cashiers & POS</span>
          <strong className="metric-val text-success">{staff.filter((s) => s.role === 'Cashier').length} Tellers</strong>
          <small className="metric-sub">Counter payment operations</small>
        </div>
      </div>

      {/* Personnel Roster */}
      <div className="card-panel">
        <h3>Lambawasa Staff Directory</h3>
        <table className="data-table" style={{ width: '100%', marginTop: '14px' }}>
          <thead>
            <tr>
              <th>Staff ID</th>
              <th>Full Name</th>
              <th>Department / Role</th>
              <th>Assigned District</th>
              <th>Contact Number</th>
              <th>Employment Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td><code>{s.id}</code></td>
                <td><strong>{s.fullName}</strong></td>
                <td>
                  <span className={`pill ${s.role === 'Field Staffs' ? 'pill-cyan' : s.role === 'Cashier' ? 'pill-green' : 'pill-yellow'}`}>
                    {s.role}
                  </span>
                </td>
                <td>{s.zone}</td>
                <td>{s.contact}</td>
                <td><small>{s.joinDate}</small></td>
                <td>
                  <span className={`pill ${s.status === 'Active' ? 'pill-green' : 'pill-red'}`}>
                    {s.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-outline-sm"
                    onClick={() => {
                      const next = s.status === 'Active' ? 'Inactive' : 'Active'
                      onUpdateStaffStatus(s.id, next)
                      flash(`Status of ${s.fullName} changed to ${next}.`)
                    }}
                  >
                    Toggle Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Intake New Staff Member</h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
              <label>
                Full Name:
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </label>
              <label>
                Role:
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="Field Staffs">Field Staffs (Technician / Meter Reader)</option>
                  <option value="Office Staffs">Office Staffs (Billing / Customer Service)</option>
                  <option value="Cashier">Cashier (Point of Sale Teller)</option>
                  <option value="Administrator">System Administrator</option>
                </select>
              </label>
              <label>
                Assigned Zone:
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  {allZones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </label>
              <label>
                Contact Number:
                <input type="text" placeholder="+63 917 000 0000" value={contact} onChange={(e) => setContact(e.target.value)} />
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-outline-sm" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="primary-button">Save Staff Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
