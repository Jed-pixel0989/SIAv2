import { useState } from 'react'

export default function BatchBillGeneration({
  bills,
  onOpenPOS,
  flash,
}) {
  const [billFilter, setBillFilter] = useState('All')
  const [selectedBillForPrint, setSelectedBillForPrint] = useState(null)

  const filteredBills = bills.filter((b) => {
    if (billFilter === 'All') return b.status !== 'Paid'
    return b.status === billFilter
  })

  const readyCount = bills.filter((b) => b.status === 'Ready').length
  const overdueCount = bills.filter((b) => b.status === 'Overdue').length
  const paidCount = bills.filter((b) => b.status === 'Paid').length
  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="feature-badge">Feature 05 · Batch Bill Generation</div>
          <h2>Automated Multi-Account Billing Run</h2>
          <p className="subheading">
            Automates multi-account billing runs using verified meter readings to prevent operational delays during peak billing periods.
          </p>
        </div>
      </div>

      {/* Automatic billing schedule */}
      <div className="batch-control-card">
        <div className="batch-config-grid">
          <div>
            <label className="batch-label">Automatic Billing Schedule</label>
            <div className="reading-health-indicator">
              <span className="dot dot-aqua" />
              <strong>Every 25th of the month</strong>
            </div>
          </div>

          <div>
            <label className="batch-label">Coverage</label>
            <div className="reading-health-indicator">
              <span className="dot dot-aqua" />
              <strong>All approved consumers</strong>
            </div>
          </div>

          <div>
            <label className="batch-label">Verified Readings Status</label>
            <div className="reading-health-indicator">
              <span className="dot dot-aqua" />
              <strong>100% Readings Logged</strong>
            </div>
          </div>

        </div>
        <div className="batch-progress-bar-wrap">
          <div className="batch-progress-bar" style={{ width: '100%' }} />
          <small>Bills, consumer balances, and billing notifications update automatically through the monthly scheduler.</small>
        </div>
      </div>

      {/* Bills Ledger */}
      <div className="table-tabs" style={{ marginTop: '24px' }}>
        <button
          className={billFilter === 'All' ? 'selected' : ''}
          onClick={() => setBillFilter('All')}
        >
          Active Bills <b>{bills.filter((b) => b.status !== 'Paid').length}</b>
        </button>
        <button
          className={billFilter === 'Ready' ? 'selected' : ''}
          onClick={() => setBillFilter('Ready')}
        >
          Ready for Payment <b>{readyCount}</b>
        </button>
        <button
          className={billFilter === 'Overdue' ? 'selected' : ''}
          onClick={() => setBillFilter('Overdue')}
        >
          Overdue <b className="red-count">{overdueCount}</b>
        </button>
        <button
          className={billFilter === 'Paid' ? 'selected' : ''}
          onClick={() => setBillFilter('Paid')}
        >
          Paid Consumer Log <b>{paidCount}</b>
        </button>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Statement ID</th>
                <th>Consumer / Account</th>
                <th>Billing Period</th>
                <th>Reading (Prev → Pres)</th>
                <th>Usage</th>
                <th>Amount Due</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong className="code-badge">{b.id}</strong>
                    <small className="muted d-block">Due: {b.dueDate}</small>
                  </td>
                  <td>
                    <div className="consumer-cell">
                      <div className="avatar">{b.avatar || 'CS'}</div>
                      <div>
                        <strong>{b.name}</strong>
                        <small>{b.accountNo} · {b.zone}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="muted">{b.period}</span>
                  </td>
                  <td>
                    <span>{b.prevReading} → {b.presReading}</span>
                  </td>
                  <td>
                    <strong>{b.consumption} m³</strong>
                  </td>
                  <td>
                    <strong className="text-aqua">
                      ₱ {b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                    {b.penalty > 0 && (
                      <small className="text-orange d-block">+₱ {b.penalty.toFixed(2)} penalty</small>
                    )}
                  </td>
                  <td>
                    <span className={`status-pill ${b.status.toLowerCase()}`}>
                      <i /> {b.status}
                    </span>
                    {b.status === 'Paid' && (
                      <small className="muted d-block">
                        Paid {b.paidDate || 'recorded'}{b.receiptNo ? ` · ${b.receiptNo}` : ''}
                      </small>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions">
                      <button
                        className="btn-outline-sm"
                        onClick={() => setSelectedBillForPrint(b)}
                      >
                        View SOA
                      </button>
                      {b.status !== 'Paid' && (
                        <button
                          className="btn-outline-sm btn-action"
                          onClick={() => onOpenPOS(b.accountNo)}
                        >
                          Pay at POS
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Water Utility Statement of Account (SOA) Modal */}
      {selectedBillForPrint && (
        <div className="modal-backdrop" onClick={() => setSelectedBillForPrint(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedBillForPrint(null)}>×</button>
            <div className="statement-paper">
              <div className="statement-header">
                <div>
                  <div className="brand-print">LAMBAWASA MUNICIPAL UTILITY</div>
                  <p className="statement-sub">Republic of the Philippines · Water District Operations</p>
                </div>
                <div className="statement-number-box">
                  <span>STATEMENT OF ACCOUNT</span>
                  <h3>{selectedBillForPrint.id}</h3>
                  <small>Billing Date: 03 Sep 2026</small>
                </div>
              </div>

              <div className="statement-consumer-row">
                <div>
                  <span className="label">Account Holder:</span>
                  <strong>{selectedBillForPrint.name}</strong>
                  <p>{selectedBillForPrint.accountNo} · Zone: {selectedBillForPrint.zone}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="label">Payment Due Date:</span>
                  <h4 className="text-orange">{selectedBillForPrint.dueDate}</h4>
                  <small className="muted">Please pay on or before due date to avoid 10% penalty.</small>
                </div>
              </div>

              <div className="statement-breakdown-box">
                <table className="statement-table">
                  <thead>
                    <tr>
                      <th>Meter Reading</th>
                      <th>Consumption</th>
                      <th>Base Rate</th>
                      <th>Environmental (10%)</th>
                      <th>Maintenance</th>
                      <th>Arrears / Penalties</th>
                      <th style={{ textAlign: 'right' }}>Total Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedBillForPrint.prevReading} → {selectedBillForPrint.presReading}</td>
                      <td>{selectedBillForPrint.consumption} m³</td>
                      <td>₱ {selectedBillForPrint.baseAmount?.toFixed(2) || '0.00'}</td>
                      <td>₱ {selectedBillForPrint.envFee?.toFixed(2) || '0.00'}</td>
                      <td>₱ {selectedBillForPrint.maintFee?.toFixed(2) || '25.00'}</td>
                      <td>₱ {(selectedBillForPrint.arrears + selectedBillForPrint.penalty).toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>₱ {selectedBillForPrint.totalAmount.toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="statement-footer-barcode">
                <div className="barcode-mock">
                  ||| | |||| | ||| |||| | || ||| ||||||| | |||
                </div>
                <span>* {selectedBillForPrint.id} *</span>
              </div>
            </div>

            <div className="modal-action-bar">
              <button
                className="btn-secondary"
                onClick={() => flash('Statement sent to connected thermal printer')}
              >
                🖨️ Print Statement
              </button>
              {selectedBillForPrint.status !== 'Paid' && (
                <button
                  className="primary-button"
                  onClick={() => {
                    const acc = selectedBillForPrint.accountNo
                    setSelectedBillForPrint(null)
                    onOpenPOS(acc)
                  }}
                >
                  Pay Now at POS <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
