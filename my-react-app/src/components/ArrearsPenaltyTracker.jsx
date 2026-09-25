import { useState } from 'react'

export default function ArrearsPenaltyTracker({
  bills,
  onApplyPenalty,
  onOpenPOS,
  flash,
}) {
  const [selectedOverdueBill, setSelectedOverdueBill] = useState(null)
  const [noticeModal, setNoticeModal] = useState(false)

  // Overdue bills
  const overdueBills = bills.filter((b) => b.status === 'Overdue')

  // Calculate summaries
  const totalArrears = overdueBills.reduce((acc, b) => acc + (b.baseAmount + b.arrears), 0)
  const totalPenalties = overdueBills.reduce((acc, b) => acc + b.penalty, 0)
  const totalOutstanding = overdueBills.reduce((acc, b) => acc + b.totalAmount, 0)

  // Aging categories
  const under30Days = overdueBills.filter((b) => (b.daysOverdue || 0) <= 30)
  const over30Days = overdueBills.filter((b) => (b.daysOverdue || 0) > 30)

  const handleServeNotice = (bill) => {
    setSelectedOverdueBill(bill)
    setNoticeModal(true)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="feature-badge">Feature 06 · Arrears & Penalty Tracker</div>
          <h2>Delinquency, Aging & Penalty Tracker</h2>
          <p className="subheading">
            Flags unpaid bills and automatically computes penalties on overdue accounts to manage outstanding balances efficiently.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="primary-button"
            onClick={() => {
              onApplyPenalty()
              flash('Automated 10% statutory overdue penalty recomputed across all delinquent accounts')
            }}
          >
            <span>⚡</span> Recompute 10% Statutory Penalties
          </button>
        </div>
      </div>

      {/* Arrears Metrics */}
      <div className="metrics-row">
        <div className="mini-kpi-card">
          <span>Total Delinquent Accounts</span>
          <strong className="text-orange">{overdueBills.length} Accounts</strong>
          <small>Flagged past due date</small>
        </div>
        <div className="mini-kpi-card">
          <span>Unpaid Arrears Principal</span>
          <strong>₱ {totalArrears.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          <small>Base uncollected revenue</small>
        </div>
        <div className="mini-kpi-card">
          <span>Computed Penalties (10%)</span>
          <strong className="text-warning">₱ {totalPenalties.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          <small>Late surcharges applied</small>
        </div>
        <div className="mini-kpi-card">
          <span>Total Receivables at Risk</span>
          <strong className="text-orange">₱ {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          <small>Combined balance due</small>
        </div>
      </div>

      {/* Aging Schedule Breakdown */}
      <div className="aging-buckets-row">
        <div className="bucket-card">
          <div className="bucket-top">
            <span>1 – 30 Days Overdue</span>
            <span className="badge-tag">First Notice</span>
          </div>
          <h3>{under30Days.length} Accounts</h3>
          <p>Eligible for reminder SMS & billing notice.</p>
        </div>

        <div className="bucket-card critical">
          <div className="bucket-top">
            <span>31+ Days Overdue (Critical)</span>
            <span className="badge-tag red">48-Hr Disconnection</span>
          </div>
          <h3>{over30Days.length} Accounts</h3>
          <p>Subject to immediate meter lock-off or disconnection order.</p>
        </div>
      </div>

      {/* Overdue Accounts Table */}
      <div className="table-card">
        <div className="panel-heading" style={{ padding: '18px 20px 0' }}>
          <div>
            <p className="eyebrow">ACTIVE DELINQUENT ACCOUNTS</p>
            <h3>Outstanding Arrears & Penalties Schedule</h3>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Consumer / Account</th>
                <th>Zone</th>
                <th>Due Date</th>
                <th>Aging (Days)</th>
                <th>Principal Base</th>
                <th>10% Penalty</th>
                <th>Total Balance Due</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdueBills.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div className="consumer-cell">
                      <div className="avatar">{b.avatar || 'OV'}</div>
                      <div>
                        <strong>{b.name}</strong>
                        <small>{b.accountNo} · Statement {b.id}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="zone-tag">{b.zone}</span>
                  </td>
                  <td>
                    <span className="text-orange font-bold">{b.dueDate}</span>
                  </td>
                  <td>
                    <span className="aging-badge">
                      {b.daysOverdue || 14} days overdue
                    </span>
                  </td>
                  <td>
                    <span>₱ {(b.baseAmount + b.arrears).toFixed(2)}</span>
                  </td>
                  <td>
                    <strong className="text-warning">+₱ {b.penalty.toFixed(2)}</strong>
                  </td>
                  <td>
                    <strong className="text-orange">
                      ₱ {b.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions">
                      <button
                        className="btn-outline-sm btn-action"
                        onClick={() => handleServeNotice(b)}
                      >
                        Issue Notice
                      </button>
                      <button
                        className="btn-outline-sm"
                        onClick={() => onOpenPOS(b.accountNo)}
                      >
                        POS Settle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {overdueBills.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    🎉 Excellent! No overdue accounts or unpaid arrears found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disconnection Warning Notice Modal */}
      {noticeModal && selectedOverdueBill && (
        <div className="modal-backdrop" onClick={() => setNoticeModal(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setNoticeModal(false)}>×</button>
            <div className="warning-notice-paper">
              <div className="notice-header">
                <h2>NOTICE OF IMPENDING DISCONNECTION</h2>
                <p>WATER UTILITY OPERATIONAL REGULATORY OFFICE</p>
              </div>

              <div className="notice-body">
                <p><strong>TO THE ACCOUNT HOLDER:</strong></p>
                <p className="notice-consumer-box">
                  <strong>{selectedOverdueBill.name}</strong><br />
                  Account No: <code>{selectedOverdueBill.accountNo}</code><br />
                  Zone: {selectedOverdueBill.zone}
                </p>

                <p>
                  Official records indicate that your water utility account has an outstanding past-due balance of:
                </p>

                <div className="notice-balance-box">
                  <span>TOTAL DELINQUENT AMOUNT (INCL. 10% PENALTY)</span>
                  <h1>₱ {selectedOverdueBill.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h1>
                </div>

                <p>
                  Pursuant to Water Utility Rules and Regulations, you are hereby given forty-eight (48) hours from receipt of this notice to settle the account at our Cashier P.O.S. counters.
                </p>
                <p className="notice-warning-footer">
                  FAILURE TO SETTLE WILL RESULT IN IMMEDIATE CESSATION OF WATER SERVICE AND REMOVAL OF THE METER ASSET.
                </p>
              </div>
            </div>

            <div className="modal-action-bar">
              <button
                className="btn-secondary"
                onClick={() => {
                  flash(`Notice of Disconnection printed for ${selectedOverdueBill.name}`)
                  setNoticeModal(false)
                }}
              >
                🖨️ Print Formal Notice
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  const acc = selectedOverdueBill.accountNo
                  setNoticeModal(false)
                  onOpenPOS(acc)
                }}
              >
                Proceed to Payment POS <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
