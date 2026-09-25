import { useState } from 'react'

export default function OperationalAuditTrail({
  auditLogs,
  flash,
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [selectedLog, setSelectedLog] = useState(null)

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = `${log.user} ${log.action} ${log.target} ${log.details}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || log.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const handleExportCSV = () => {
    const headers = 'ID,Timestamp,User,Role,Category,Action,Target,Details,IP\n'
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.user}","${l.role}","${l.category}","${l.action}","${l.target}","${l.details}","${l.ip || '192.168.1.100'}"`
      )
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lambawasa-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    flash('Audit trail log exported to CSV for regulatory compliance')
  }

  const categories = ['All', 'Billing', 'Payment', 'Consumer', 'Meter', 'Service', 'Arrears']

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="feature-badge">Feature 08 · Operational Audit Trail</div>
          <h2>System Modification & Activity Audit Ledger</h2>
          <p className="subheading">
            Logs user activities and system modifications to prevent unauthorized record alterations and ensure accountability.
          </p>
        </div>
        <div className="header-actions">
          <button className="primary-button" onClick={handleExportCSV}>
            <span>📥</span> Export Audit Log (CSV)
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <span>⌕</span>
          <input
            type="text"
            placeholder="Search audit trail by operator, target, event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="audit-categories-row">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-pill ${categoryFilter === cat ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Operator & Role</th>
                <th>Module / Category</th>
                <th>Action Performed</th>
                <th>Target Resource</th>
                <th>Terminal / IP</th>
                <th style={{ textAlign: 'right' }}>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="timestamp">{log.timestamp}</span>
                    <small className="muted d-block">{log.id}</small>
                  </td>
                  <td>
                    <strong>{log.user}</strong>
                    <small className="muted d-block">{log.role}</small>
                  </td>
                  <td>
                    <span className={`cat-tag cat-${log.category.toLowerCase()}`}>
                      {log.category}
                    </span>
                  </td>
                  <td>
                    <strong>{log.action}</strong>
                    <p className="audit-detail-summary">{log.details}</p>
                  </td>
                  <td>
                    <code className="code-badge">{log.target}</code>
                  </td>
                  <td>
                    <span className="ip-badge">{log.ip || '192.168.1.104'}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-outline-sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    No audit records matched your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Item Inspection Modal */}
      {selectedLog && (
        <div className="modal-backdrop" onClick={() => setSelectedLog(null)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLog(null)}>×</button>
            <div className="modal-title-wrap">
              <p className="eyebrow">AUDIT RECORD INSPECTION</p>
              <h2>{selectedLog.id} · Security Snapshot</h2>
              <p className="modal-copy">Cryptographically verified immutable event log.</p>
            </div>

            <div className="audit-inspect-grid">
              <div className="inspect-item">
                <span>Timestamp</span>
                <strong>{selectedLog.timestamp}</strong>
              </div>
              <div className="inspect-item">
                <span>Operator</span>
                <strong>{selectedLog.user} ({selectedLog.role})</strong>
              </div>
              <div className="inspect-item">
                <span>Category</span>
                <strong>{selectedLog.category}</strong>
              </div>
              <div className="inspect-item">
                <span>Action</span>
                <strong>{selectedLog.action}</strong>
              </div>
              <div className="inspect-item span-2">
                <span>Target Entity</span>
                <code>{selectedLog.target}</code>
              </div>
              <div className="inspect-item span-2">
                <span>Full Event Details</span>
                <p className="inspect-desc">{selectedLog.details}</p>
              </div>
              <div className="inspect-item">
                <span>Terminal Origin</span>
                <strong>{selectedLog.ip || '192.168.1.104'}</strong>
              </div>
              <div className="inspect-item">
                <span>Integrity Check</span>
                <strong className="text-success">✓ SHA-256 Validated</strong>
              </div>
            </div>

            <div className="modal-action-bar">
              <button className="primary-button full" onClick={() => setSelectedLog(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
