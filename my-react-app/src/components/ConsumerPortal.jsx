import React, { useEffect, useRef, useState } from 'react'
import L from '../services/leaflet'
import 'leaflet/dist/leaflet.css'
import './ConsumerPortal.css'

export default function ConsumerPortal({
  currentUser,
  consumers = [],
  geoPins = [],
  bills = [],
  payments = [],
  complaints = [],
  notifications = [],
  onPayBillOnline,
  onFileComplaint,
  onUpdateProfile,
  onClearNotifications,
  onSignOut,
  flash,
}) {
  // Navigation & View States
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'bills' | 'usage' | 'service' | 'account' | 'history'
  const [activeModal, setActiveModal] = useState(null) // 'pay' | 'receipt' | 'ticket' | 'meter' | 'dossier' | 'notice' | 'reportSent'
  const [hideBalance, setHideBalance] = useState(false)
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [submittedReport, setSubmittedReport] = useState(null)
  const [profileEmail, setProfileEmail] = useState(currentUser.email || '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const profileMapRef = useRef(null)
  const profileMapInstanceRef = useRef(null)

  // Payment Form States
  const [payMethod, setPayMethod] = useState('GCash')
  const [isPaying, setIsPaying] = useState(false)

  // Complaint Form States
  const [issueType, setIssueType] = useState('Low Water Pressure')
  const [customIssueType, setCustomIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [landmarkLocation, setLandmarkLocation] = useState(currentUser.address || '')

  // Identify active consumer record
  const activeConsumer =
    consumers.find(
      (c) =>
        (currentUser.consumerId && c.id === currentUser.consumerId) ||
        (currentUser.accountNo && c.accountNo === currentUser.accountNo) ||
        (currentUser.username && c.username?.toLowerCase() === currentUser.username.toLowerCase()) ||
        (currentUser.fullName && c.name?.toLowerCase() === currentUser.fullName.toLowerCase())
    ) || {
      id: currentUser.consumerId || 'C-1001',
      accountNo: currentUser.accountNo || 'ACC-88201',
      name: currentUser.fullName || 'Amina Okafor',
      contact: currentUser.contact || '+63 917 234 5678',
      address: currentUser.address || 'Block 4 Lot 12, Riverdale Heights',
      email: currentUser.email || '',
      zone: currentUser.zone || 'Mabuhay',
      classification: currentUser.classification || 'Residential',
      meterNo: currentUser.meterNo || 'MTR-77291',
      status: 'Active',
      connectionDate: '2024-03-15',
      lastReading: 148,
      avatar: currentUser.avatar || 'AO',
    }

  const activeGeoPin = geoPins.find(
    (pin) => pin.consumerId === activeConsumer.id
      || pin.consumerId === currentUser.consumerId
      || pin.name?.toLowerCase() === activeConsumer.name?.toLowerCase()
  )
  const profileCoordinates = activeGeoPin && {
    lat: Number(activeGeoPin.lat ?? activeGeoPin.latitude),
    lng: Number(activeGeoPin.lng ?? activeGeoPin.longitude),
  }

  useEffect(() => {
    if (activeModal !== 'dossier' || !profileMapRef.current || !profileCoordinates?.lat || !profileCoordinates?.lng) return undefined

    const map = L.map(profileMapRef.current, {
      center: [profileCoordinates.lat, profileCoordinates.lng],
      zoom: 16,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: 'Map data &copy; Google Maps',
    }).addTo(map)
    L.marker([profileCoordinates.lat, profileCoordinates.lng])
      .addTo(map)
      .bindPopup(`${activeConsumer.name}<br />Registered service location`)
      .openPopup()
    profileMapInstanceRef.current = map
    window.setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      profileMapInstanceRef.current = null
    }
  }, [activeModal, activeConsumer.id, profileCoordinates?.lat, profileCoordinates?.lng])

  // Filter relational data for active household
  const myBills = bills.filter(
    (b) =>
      b.accountNo === activeConsumer.accountNo ||
      (activeConsumer.id && b.consumerId === activeConsumer.id)
  )
  const myPayments = payments.filter(
    (p) =>
      p.accountNo === activeConsumer.accountNo ||
      (activeConsumer.id && p.consumerId === activeConsumer.id)
  )
  const myComplaints = complaints.filter(
    (c) =>
      c.accountNo === activeConsumer.accountNo ||
      (activeConsumer.id && c.consumerId === activeConsumer.id)
  )
  const myNotifications = notifications.filter(
    (notification) => notification.consumerId === activeConsumer.id
      || notification.accountNo === activeConsumer.accountNo
      || notification.recipient === activeConsumer.name
  )
  const isNewConsumer = Boolean(activeConsumer.isNewAccount || currentUser.isNewAccount)

  useEffect(() => {
    if (activeConsumer.address && !landmarkLocation) {
      setLandmarkLocation(activeConsumer.address)
    }
  }, [activeConsumer.address, landmarkLocation])

  const handleProfileUpdate = (event) => {
    event.preventDefault()
    if (newPassword && newPassword.length < 8) {
      if (flash) flash('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      if (flash) flash('New passwords do not match.')
      return
    }

    setNewPassword('')
    setConfirmNewPassword('')
    if (onUpdateProfile) {
      onUpdateProfile({
        email: profileEmail.trim(),
        password: newPassword || undefined,
      })
    }
    if (flash) flash('Profile details updated successfully.')
  }

  const unpaidBill = myBills.find((b) => b.status === 'Ready' || b.status === 'Overdue')
  const hasCurrentStatement = myBills.length > 0
  const latestBill = unpaidBill || myBills[0] || {
    id: null,
    totalAmount: 0,
    consumption: 0,
    dueDate: null,
    status: 'No Statement',
    period: 'Current billing cycle',
    baseAmount: 0,
    envFee: 0,
    maintFee: 0,
    arrears: 0,
    penalty: 0,
  }

  const receiptBill = selectedReceipt
    ? myBills.find((bill) => bill.id === selectedReceipt.billId)
    : null
  const receiptPenalty = Number(selectedReceipt?.penalty ?? receiptBill?.penalty ?? 0)
  const receiptPreviousReading = Number(selectedReceipt?.prevReading ?? receiptBill?.prevReading ?? 0)
  const receiptPresentReading = Number(selectedReceipt?.presReading ?? receiptBill?.presReading ?? 0)
  const receiptConsumption = Number(selectedReceipt?.consumption ?? receiptBill?.consumption ?? Math.max(0, receiptPresentReading - receiptPreviousReading))

  // Copy account number
  const handleCopyAccount = () => {
    navigator.clipboard.writeText(activeConsumer.accountNo)
    setCopiedAccount(true)
    setTimeout(() => setCopiedAccount(false), 2000)
    if (flash) flash(`Account number ${activeConsumer.accountNo} copied to clipboard!`)
  }

  // Submit Online Payment
  const handlePaySubmit = (e) => {
    e.preventDefault()
    if (!unpaidBill) {
      if (flash) flash(hasCurrentStatement ? 'All statement obligations are settled!' : 'No payable statement is available yet. Billing is calculated at month-end.')
      return
    }

    const billToPay = unpaidBill
    setIsPaying(true)

    setTimeout(() => {
      const orNumber = `OR-2026-${Math.floor(1000 + Math.random() * 9000)}`
      const paymentRecord = {
        id: `PAY-${Date.now()}`,
        orNumber,
        billId: billToPay.id,
        consumerId: activeConsumer.id,
        consumerName: activeConsumer.name,
        accountNo: activeConsumer.accountNo,
        amountPaid: billToPay.totalAmount,
        penalty: billToPay.penalty || 0,
        arrears: billToPay.arrears || 0,
        prevReading: billToPay.prevReading || 0,
        presReading: billToPay.presReading || 0,
        consumption: billToPay.consumption || 0,
        tendered: billToPay.totalAmount,
        change: 0.0,
        method: payMethod,
        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        cashier: `Online Payment Gateway (${payMethod})`,
        notes: `Over-the-counter online settlement via ${payMethod}.`,
      }

      if (onPayBillOnline) {
        onPayBillOnline(billToPay.id, paymentRecord)
      }
      setIsPaying(false)
      setSelectedReceipt(paymentRecord)
      setActiveModal('receipt')
      if (flash) flash(`Payment of ₱ ${billToPay.totalAmount.toFixed(2)} completed via ${payMethod}! Official Receipt: ${orNumber}`)
    }, 800)
  }

  // Submit Complaint / Service Ticket (Aligned with Field Staff Service Desk)
  const handleComplaintSubmit = (e) => {
    e.preventDefault()
    const submittedIssueType = issueType === 'Other' ? customIssueType.trim() : issueType
    if (issueType === 'Other' && !submittedIssueType) {
      if (flash) flash('Please describe the problem you want to report.')
      return
    }
    const newTicketNo = `SR-2026-0${190 + complaints.length}`
    const newTicket = {
      id: newTicketNo,
      ticketNo: newTicketNo,
      consumerId: activeConsumer.id,
      consumerName: activeConsumer.name,
      accountNo: activeConsumer.accountNo,
      zone: activeConsumer.zone,
      issueType: submittedIssueType,
      priority: 'Medium',
      status: 'Reported',
      assignedTech: 'Office Staff Intake',
      assignedTo: 'Office Staff Intake',
      reportedAt: new Date().toLocaleString(),
      description: description.trim() || submittedIssueType,
      notes: 'Received by Office Staff for review and dispatch.',
      resolution: 'Queued for mobile inspection van.',
    }

    if (onFileComplaint) {
      onFileComplaint(newTicket)
    }
    setSubmittedReport(newTicket)
    setDescription('')
    setLandmarkLocation(activeConsumer.address || '')
    setCustomIssueType('')
    setIssueType('Low Water Pressure')
    setActiveModal('reportSent')
    if (flash) flash(`Problem report ${newTicket.ticketNo} submitted to Office Staff.`)
  }

  return (
    <div className="cp-viewport">
      {/* Smartphone App Shell (Header starts cleanly, no status bar) */}
      <div className="cp-phone-frame">
        
        {/* Profile / App Header */}
        <header className="cp-header">
          <div className="cp-profile-box">
            <div className="cp-avatar-ring">
              {activeConsumer.avatar || activeConsumer.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="cp-profile-info">
              <span className="cp-greeting">
                Hello, <strong className="cp-user-name">{activeConsumer.name.split(' ')[0]}!</strong> 👋
              </span>
              <div className="cp-account-line">
                <span>Account No : {activeConsumer.accountNo}</span>
                <button
                  className="cp-btn-copy"
                  onClick={handleCopyAccount}
                  title="Copy Account Number"
                >
                  {copiedAccount ? '✓' : '📋'}
                </button>
              </div>
            </div>
          </div>

          <div className="cp-header-actions">
            <button
              className="cp-btn-icon"
              onClick={() => setActiveModal('notice')}
              title="District Notifications"
            >
              🔔
              <span className="cp-bell-dot" />
            </button>
            <button
              className="cp-btn-icon"
              onClick={onSignOut}
              title="Sign Out"
            >
              ↪
            </button>
          </div>
        </header>

        {/* Main Scrollable Body */}
        <main className="cp-body">
          
          {/* TAB: HOME VIEW */}
          {activeTab === 'home' && (
            <>
              {/* Vibrant Gradient Card (Current Water Statement) */}
              <div className="cp-balance-card">
                <div className="cp-card-circles" />
                
                <div className="cp-balance-top">
                  <span className="cp-balance-label">
                    Current Water Statement
                    <button
                      className="cp-btn-eye"
                      onClick={() => setHideBalance(!hideBalance)}
                      title="Toggle Amount Privacy"
                    >
                      {hideBalance ? '🙈' : '👁️'}
                    </button>
                  </span>
                  <button
                    className="cp-balance-history-btn"
                    onClick={() => setActiveTab('bills')}
                  >
                    Details ›
                  </button>
                </div>

                <div className="cp-amount-wrap">
                  <span className="cp-currency-sign">₱</span>
                  <span className="cp-balance-amount">
                    {hideBalance
                      ? '••••••'
                      : (unpaidBill ? unpaidBill.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00')}
                  </span>
                </div>

                <div className="cp-card-actions-row">
                  <button
                    className="cp-btn-topup"
                    onClick={() => setActiveModal('pay')}
                    disabled={!unpaidBill}
                  >
                    <span>💳</span> Pay Statement
                  </button>

                  <div className="cp-badge-due">
                    <span>💧</span>
                    <span>
                      {hasCurrentStatement ? `${latestBill.consumption ?? 0} m³ · ${activeConsumer.zone}` : 'No statement yet · 0 m³'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Action Grid (8 Colorful Action Buttons) */}
              <section className="cp-action-grid">
                <button className="cp-action-btn" onClick={() => setActiveModal('pay')} disabled={!unpaidBill}>
                  <div className="cp-icon-circle bg-soft-blue">💳</div>
                  <span className="cp-action-label">Pay Bill</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveTab('bills')}>
                  <div className="cp-icon-circle bg-soft-cyan">📄</div>
                  <span className="cp-action-label">Statement</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveTab('history')}>
                  <div className="cp-icon-circle bg-soft-orange">🧾</div>
                  <span className="cp-action-label">Receipts</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveTab('usage')}>
                  <div className="cp-icon-circle bg-soft-emerald">📊</div>
                  <span className="cp-action-label">Usage</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveModal('meter')}>
                  <div className="cp-icon-circle bg-soft-amber">💧</div>
                  <span className="cp-action-label">Cubic Meter</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveModal('ticket')}>
                  <div className="cp-icon-circle bg-soft-purple">🛠️</div>
                  <span className="cp-action-label">Report Problem</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveModal('dossier')}>
                  <div className="cp-icon-circle bg-soft-slate">👤</div>
                  <span className="cp-action-label">Profile</span>
                </button>

                <button className="cp-action-btn" onClick={() => setActiveModal('notice')}>
                  <div className="cp-icon-circle bg-soft-rose">🔔</div>
                  <span className="cp-action-label">Alerts</span>
                </button>
              </section>

              {/* Action Banner Card (Water Supply & Meter Health) */}
              <section className="cp-notice-card">
                <div className="cp-notice-main">
                  <div className="cp-notice-icon-circle">
                    <span>🚰</span>
                  </div>
                  <div className="cp-notice-text">
                    <h4 className="cp-notice-title">Water Service & Connection Health</h4>
                    <p className="cp-notice-desc">
                      District supply across <strong>{activeConsumer.zone}</strong> is optimal (48 PSI). Meter <strong>{activeConsumer.meterNo}</strong> is active and verified by field staff.
                    </p>
                  </div>
                </div>
                <button
                  className="cp-notice-btn"
                  onClick={() => setActiveModal('meter')}
                >
                    Inspect Digital Cubic Meter →
                </button>
              </section>

              {/* Field Service Ticket Tracker (Direct Alignment with Field Staff) */}
              {myComplaints.length > 0 && (
                <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      👷 Active Field Work Order
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      myComplaints[0].status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {myComplaints[0].status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Ticket No:</span>
                      <strong className="text-slate-800 font-mono">{myComplaints[0].ticketNo || myComplaints[0].id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Issue:</span>
                      <span className="font-medium text-slate-800">{myComplaints[0].issueType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Technician:</span>
                      <strong className="text-sky-700 font-semibold">{myComplaints[0].assignedTech || myComplaints[0].assignedTo || 'Roberto Ramos'}</strong>
                    </div>
                    {myComplaints[0].notes && (
                      <div className="pt-1.5 border-t border-slate-200 text-[11px] text-slate-500 italic">
                        "{myComplaints[0].notes || myComplaints[0].resolution}"
                      </div>
                    )}
                    {myComplaints[0].resolutionImage && myComplaints[0].status === 'Resolved' && (
                      <div className="pt-2 border-t border-slate-200">
                        <p style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📷 Repair Photo</p>
                        <img
                          src={myComplaints[0].resolutionImage}
                          alt="Repair documentation"
                          style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Recent Activity Feed */}
              <section className="cp-history-card">
                <div className="cp-history-header">
                  <h3 className="cp-history-title">Recent Activity</h3>
                  <span className="cp-history-badge">Live Ledger</span>
                </div>

                <div className="cp-tx-list">
                  {/* Latest Payment */}
                  {myPayments.length > 0 ? (
                    myPayments.slice(0, 2).map((p) => (
                      <div
                        key={p.id}
                        className="cp-tx-item"
                        onClick={() => {
                          setSelectedReceipt(p)
                          setActiveModal('receipt')
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="cp-tx-left">
                          <div className="cp-tx-icon-circle tx-out">↑</div>
                          <div className="cp-tx-details">
                            <span className="cp-tx-name">Water Bill Settlement</span>
                            <span className="cp-tx-time">
                              {p.date ? p.date.split(' ')[0] : '2026-09-02'} · {p.method}
                            </span>
                          </div>
                        </div>
                        <div className="cp-tx-right">
                          <span className="cp-tx-amount neg">
                            -₱ {Number(p.amountPaid).toFixed(2)}
                          </span>
                          <span className="cp-tx-status">Paid (OR)</span>
                        </div>
                      </div>
                    ))
                  ) : !isNewConsumer ? (
                    <div className="cp-tx-item">
                      <div className="cp-tx-left">
                        <div className="cp-tx-icon-circle tx-out">↑</div>
                        <div className="cp-tx-details">
                          <span className="cp-tx-name">Counter POS Payment</span>
                          <span className="cp-tx-time">02 Sep 2026 14:28 · Cash</span>
                        </div>
                      </div>
                      <div className="cp-tx-right">
                        <span className="cp-tx-amount neg">-₱ 744.40</span>
                        <span className="cp-tx-status">Paid</span>
                      </div>
                    </div>
                  ) : null}

                  {/* Meter Reading Run */}
                  {!isNewConsumer && (
                  <div className="cp-tx-item">
                    <div className="cp-tx-left">
                      <div className="cp-tx-icon-circle tx-in">💧</div>
                      <div className="cp-tx-details">
                        <span className="cp-tx-name">Field Verified Reading</span>
                        <span className="cp-tx-time">31 Aug 2026 · Field Tech Team</span>
                      </div>
                    </div>
                    <div className="cp-tx-right">
                      <span className="cp-tx-amount neutral">
                        {activeConsumer.lastReading || 148} m³
                      </span>
                      <span className="cp-tx-status">Verified Dial</span>
                    </div>
                  </div>
                  )}

                  {/* Complaint / Ticket */}
                  {myComplaints.length > 0 && (
                    <div className="cp-tx-item">
                      <div className="cp-tx-left">
                        <div className="cp-tx-icon-circle tx-service">🛠️</div>
                        <div className="cp-tx-details">
                          <span className="cp-tx-name">{myComplaints[0].issueType}</span>
                          <span className="cp-tx-time">{myComplaints[0].reportedAt || '03 Sep 2026'}</span>
                        </div>
                      </div>
                      <div className="cp-tx-right">
                        <span className="cp-tx-amount neutral" style={{ fontSize: '11px' }}>
                          {myComplaints[0].status}
                        </span>
                        <span className="cp-tx-status">{myComplaints[0].ticketNo || myComplaints[0].id}</span>
                      </div>
                    </div>
                  )}
                  {isNewConsumer && myPayments.length === 0 && myComplaints.length === 0 && (
                    <div className="cp-tx-item">
                      <div className="cp-tx-left">
                        <div className="cp-tx-icon-circle tx-in">💧</div>
                        <div className="cp-tx-details">
                          <span className="cp-tx-name">No recent activity</span>
                          <span className="cp-tx-time">Activity will appear after your first billing cycle.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="cp-btn-view-all"
                  onClick={() => setActiveTab('history')}
                >
                  View All Activity ›
                </button>
              </section>
            </>
          )}

          {/* TAB: STATEMENTS / BILLS */}
          {activeTab === 'bills' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">Active Statement</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${unpaidBill ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {unpaidBill ? 'Payment Due' : 'Fully Settled'}
                  </span>
                </div>

                <div className="my-4 text-center">
                  <span className="text-xs text-slate-400 font-medium block">Total Payable</span>
                  <strong className="text-3xl font-extrabold text-slate-900 block mt-1">
                    ₱ {Number(latestBill.totalAmount).toFixed(2)}
                  </strong>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Due Date: <strong>{latestBill.dueDate || 'Calculated at month-end'}</strong>
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 text-slate-600">
                  <div className="flex justify-between">
                    <span>Commodity Water Charge ({latestBill.consumption ?? 0} m³)</span>
                    <strong className="text-slate-800">₱ {Number(latestBill.baseAmount ?? 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Environmental Surcharge (10%)</span>
                    <strong className="text-slate-800">₱ {Number(latestBill.envFee ?? 0).toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Meter Maintenance Fee</span>
                    <strong className="text-slate-800">₱ {Number(latestBill.maintFee ?? 0).toFixed(2)}</strong>
                  </div>
                  {Number(latestBill.arrears || 0) > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Past Arrears</span>
                      <span>₱ {Number(latestBill.arrears).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <button
                  className="cp-btn-primary w-full mt-4"
                  onClick={() => setActiveModal('pay')}
                  disabled={!unpaidBill}
                >
                  {unpaidBill ? 'Proceed to Payment Gateway →' : 'No Payment Due Yet'}
                </button>
              </div>

              {/* Statement History */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h4 className="font-bold text-xs text-slate-700 mb-3 uppercase tracking-wider">Statement Ledger</h4>
                <div className="space-y-2">
                  {myBills.map((b) => (
                    <div key={b.id} className="flex justify-between items-center p-2.5 rounded-xl bg-slate-50 text-xs">
                      <div>
                        <strong className="text-slate-800 block">{b.id}</strong>
                        <span className="text-slate-400">{b.period || 'Cycle 2026'}</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-slate-800 block">₱ {Number(b.totalAmount).toFixed(2)}</strong>
                        <span className={`text-[10px] font-bold ${b.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: USAGE / CONSUMPTION */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm mb-1">Monthly Consumption Analytics</h3>
                <p className="text-xs text-slate-400 mb-4">Household water consumption volume in cubic meters (m³)</p>

                {/* Visual Bar Chart */}
                <div className="flex items-end justify-between h-40 pt-6 pb-2 px-2 border-b border-slate-100">
                  {[
                    { month: 'Apr', val: 18 },
                    { month: 'May', val: 21 },
                    { month: 'Jun', val: 19 },
                    { month: 'Jul', val: 22 },
                    { month: 'Aug', val: 24 },
                    { month: 'Sep', val: 15 },
                  ].map((d, i) => (
                    <div key={d.month} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-[10px] font-bold text-slate-600">{d.val}m³</span>
                      <div
                        className={`w-7 rounded-t-lg transition-all ${
                          i === 4 ? 'bg-sky-500 shadow-md shadow-sky-200' : 'bg-slate-200'
                        }`}
                        style={{ height: `${d.val * 4.5}px` }}
                      />
                      <span className="text-[11px] font-semibold text-slate-500 mt-1">{d.month}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-sky-50 p-3 rounded-xl">
                    <span className="text-sky-600 font-medium block text-[11px]">6-Month Average</span>
                    <strong className="text-sky-900 text-base">19.8 m³ / mo</strong>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl">
                    <span className="text-emerald-600 font-medium block text-[11px]">Efficiency State</span>
                    <strong className="text-emerald-900 text-base">Optimal (Normal)</strong>
                  </div>
                </div>
              </div>

              {/* Water Conservation */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h4 className="font-bold text-xs text-slate-700 mb-2">💡 Conservation Advisory</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Field staff recommends periodically checking toilet flappers and garden shutoff valves. A minor leak of 1 drop per second can waste over 2,000 liters of water each month.
                </p>
              </div>
            </div>
          )}

          {/* TAB: HISTORY ARCHIVE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-slate-800 text-sm">Official Transaction History</h3>
                  <button
                    className="text-xs text-sky-600 font-semibold"
                    onClick={() => setActiveTab('home')}
                  >
                    Back to Home
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {myPayments.map((p) => (
                    <div
                      key={p.id}
                      className="py-3 flex justify-between items-center cursor-pointer hover:bg-slate-50/50 rounded-lg px-1 transition"
                      onClick={() => {
                        setSelectedReceipt(p)
                        setActiveModal('receipt')
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-600 font-bold text-xs">✓ Official Receipt</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{p.orNumber}</span>
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5 block">{p.date || '02 Sep 2026'} · {p.method}</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-bold text-slate-800 block">-₱ {Number(p.amountPaid).toFixed(2)}</strong>
                        <span className="text-[10px] text-sky-600">View official receipt</span>
                      </div>
                    </div>
                  ))}

                  {myBills.map((b) => (
                    <div key={b.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="text-slate-800 font-semibold text-xs block">Invoice {b.id}</span>
                        <span className="text-[11px] text-slate-400">{b.period} · {b.consumption} m³</span>
                      </div>
                      <div className="text-right">
                        <strong className="text-xs font-bold text-slate-800 block">₱ {Number(b.totalAmount).toFixed(2)}</strong>
                        <span className={`text-[10px] font-bold ${b.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {b.status === 'Paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNT PROFILE */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-sky-200">
                  {activeConsumer.avatar || 'AO'}
                </div>
                <h3 className="font-extrabold text-base text-slate-800">{activeConsumer.name}</h3>
                <span className="text-xs text-slate-400 block mt-0.5">{activeConsumer.accountNo} · Sector {activeConsumer.zone}</span>

                <div className="mt-4 pt-4 border-t border-slate-100 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery Address</span>
                    <span className="font-medium text-slate-800 text-right max-w-[180px]">{activeConsumer.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mobile Contact</span>
                    <span className="font-medium text-slate-800">{activeConsumer.contact}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Meter Serial Number</span>
                    <span className="font-mono font-bold text-sky-600">{activeConsumer.meterNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Commission Date</span>
                    <span className="font-medium text-slate-800">{activeConsumer.connectionDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tariff Classification</span>
                    <span className="font-medium text-slate-800">{activeConsumer.classification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Latest Verified Reading</span>
                    <strong className="text-slate-900 font-mono">{activeConsumer.lastReading || 148} m³</strong>
                  </div>
                </div>

                <button
                  className="w-full mt-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition"
                  onClick={onSignOut}
                >
                  ↪ Sign Out of Consumer Portal
                </button>
              </div>
            </div>
          )}

        </main>

        {/* Floating Bottom Navigation Bar (Dock) */}
        <nav className="cp-bottom-nav">
          <button
            className={`cp-nav-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <span className="cp-nav-icon">🏠</span>
            <span>Home</span>
          </button>

          <button
            className={`cp-nav-item ${activeTab === 'bills' ? 'active' : ''}`}
            onClick={() => setActiveTab('bills')}
          >
            <span className="cp-nav-icon">📄</span>
            <span>Bills</span>
          </button>

          {/* Central Raised Floating Button for Quick Pay */}
          <button
            className="cp-nav-center-btn"
            onClick={() => setActiveModal('pay')}
            title="Instant Settlement"
          >
            💧
          </button>

          <button
            className={`cp-nav-item ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => setActiveTab('usage')}
          >
            <span className="cp-nav-icon">📊</span>
            <span>Analytics</span>
          </button>

          <button
            className="cp-nav-item"
            onClick={() => setActiveModal('dossier')}
          >
            <span className="cp-nav-icon">👤</span>
            <span>Profile</span>
          </button>
        </nav>

        {/* ─── MODAL: PROFILE & ACCOUNT SETTINGS ─── */}
        {activeModal === 'dossier' && (
          <div className="cp-modal-backdrop cp-modal-centered" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title">Profile & Account</h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-400 text-white font-bold text-2xl flex items-center justify-center mx-auto mb-2 shadow-lg shadow-sky-200">
                  {activeConsumer.avatar || 'AO'}
                </div>
                <h4 className="font-extrabold text-base text-slate-800">{activeConsumer.name}</h4>
                <span className="text-xs text-slate-400">{activeConsumer.accountNo}</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between gap-4">
                  <span>Service Address</span>
                  <strong className="text-slate-800 text-right">{activeConsumer.address}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Mobile Contact</span>
                  <strong className="text-slate-800">{activeConsumer.contact}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Meter Number</span>
                  <strong className="text-sky-700">{activeConsumer.meterNo}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Classification</span>
                  <strong className="text-slate-800">{activeConsumer.classification}</strong>
                </div>
              </div>

              <div className="cp-profile-location-card">
                <div className="cp-profile-location-header">
                  <div>
                    <span className="cp-profile-location-label">Registered Map Location</span>
                    <strong>{profileCoordinates ? 'President-approved service pin' : 'Location unavailable'}</strong>
                  </div>
                  <span className="cp-profile-location-icon">📍</span>
                </div>
                {profileCoordinates ? (
                  <>
                    <div ref={profileMapRef} className="cp-profile-location-map" />
                    <small>{profileCoordinates.lat.toFixed(6)}, {profileCoordinates.lng.toFixed(6)}</small>
                  </>
                ) : (
                  <div className="cp-profile-location-empty">No registered map pin is available yet.</div>
                )}
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-3">
                <div className="cp-input-group">
                  <label className="cp-input-label" htmlFor="profile-email">Gmail / Email Account</label>
                  <input
                    id="profile-email"
                    className="cp-input"
                    type="email"
                    value={profileEmail}
                    onChange={(event) => setProfileEmail(event.target.value)}
                    placeholder="you@gmail.com"
                    required
                  />
                </div>
                <div className="cp-input-group">
                  <label className="cp-input-label" htmlFor="profile-password">New Password</label>
                  <input
                    id="profile-password"
                    className="cp-input"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Leave blank to keep current password"
                    minLength={8}
                  />
                </div>
                <div className="cp-input-group">
                  <label className="cp-input-label" htmlFor="profile-password-confirm">Confirm New Password</label>
                  <input
                    id="profile-password-confirm"
                    className="cp-input"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(event) => setConfirmNewPassword(event.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                <button type="submit" className="cp-btn-primary w-full">
                  Save Profile Changes
                </button>
              </form>

              <button className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition" onClick={onSignOut}>
                ↪ Sign Out of Consumer Portal
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL: PAYMENT SHEET ─── */}
        {activeModal === 'pay' && (
          <div className="cp-modal-backdrop cp-modal-centered" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title" style={{ fontSize: '1.7rem', lineHeight: '0.9', letterSpacing: '-0.06em', whiteSpace: 'nowrap' }}>
                  Settle Water Statement Online
                </h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <div className="bg-sky-50 rounded-2xl p-4 text-center border border-sky-100">
                <span className="text-xs text-sky-700 block font-medium">Payable Amount</span>
                <strong className="text-3xl font-extrabold text-sky-950 block mt-1">
                  ₱ {Number(latestBill.totalAmount).toFixed(2)}
                </strong>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {activeConsumer.name} · {activeConsumer.accountNo}
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Select Digital Payment Channel</span>
                <div className="cp-pay-methods-grid">
                  {['GCash', 'Maya', 'Bank Transfer'].map((m) => (
                    <button
                      key={m}
                      className={`cp-method-btn ${payMethod === m ? 'selected' : ''}`}
                      onClick={() => setPayMethod(m)}
                    >
                      <span className="text-xl">
                        {m === 'GCash' ? '📱' : m === 'Maya' ? '💳' : '🏦'}
                      </span>
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="cp-btn-primary mt-2"
                onClick={handlePaySubmit}
                disabled={isPaying || !unpaidBill}
              >
                {isPaying ? 'Authorizing Gateway Transaction...' : unpaidBill ? `Pay ₱ ${Number(latestBill.totalAmount).toFixed(2)} via ${payMethod}` : 'No payable statement available'}
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL: OFFICIAL RECEIPT ─── */}
        {activeModal === 'receipt' && (
          <div className="cp-modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title">Official Payment Receipt</h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 text-xs space-y-3 font-mono">
                <div className="text-center pb-2 border-b border-slate-200">
                  <strong className="text-slate-800 text-sm block">LAMBAWASA UTILITY DISTRICT</strong>
                  <span className="text-slate-500 text-[10px]">Official Serialized E-Receipt (P.O.S.)</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No (OR):</span>
                  <strong className="text-slate-800">{selectedReceipt?.orNumber || 'OR-2026-9042'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account Name:</span>
                  <strong className="text-slate-800">{activeConsumer.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Account No:</span>
                  <span className="text-slate-800">{activeConsumer.accountNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Channel:</span>
                  <span className="text-slate-800">{selectedReceipt?.method || payMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Previous Consumption:</span>
                  <span className="text-slate-800">{receiptPreviousReading.toFixed(2)} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Meter Reading:</span>
                  <span className="text-slate-800">{receiptPresentReading.toFixed(2)} m³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Usage Summary:</span>
                  <strong className="text-sky-700">{receiptConsumption.toFixed(2)} m³ consumed</strong>
                </div>
                {receiptPenalty > 0 && (
                  <div className="flex justify-between font-bold">
                    <span className="text-red-600">Penalty:</span>
                    <span className="text-red-600">₱ {receiptPenalty.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                  <span className="text-slate-800">Amount Settled:</span>
                  <span className="text-emerald-600">₱ {selectedReceipt ? Number(selectedReceipt.amountPaid).toFixed(2) : '1,473.70'}</span>
                </div>
                <div className="text-center pt-2 text-[10px] text-slate-400">
                  Status: VERIFIED & COMMITTED TO MUNICIPAL LEDGER
                </div>
              </div>

              <button
                className="cp-btn-primary"
                onClick={() => {
                  window.print()
                }}
              >
                🖨️ Print / Save Official Receipt
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL: FILE COMPLAINT / REPORT PROBLEM ─── */}
        {activeModal === 'ticket' && (
          <div className="cp-modal-backdrop" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title">Report Issue to Field Crew</h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <form onSubmit={handleComplaintSubmit} className="space-y-3 text-xs">
                <div className="cp-input-group">
                  <label className="cp-input-label">Issue Category</label>
                  <select
                    className="cp-input"
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                  >
                    <option value="Low Water Pressure">Low Water Pressure (Sector Mainline)</option>
                    <option value="Pipe Leak Near Curb Stop">Pipe Leak Near Curb Stop</option>
                    <option value="Water Discoloration Check">Water Discoloration / Turbidity</option>
                    <option value="Meter Dial Fogging">Meter Glass Fogging / Damaged Dial</option>
                    <option value="Other">Other problem</option>
                  </select>
                </div>

                {issueType === 'Other' && (
                  <div className="cp-input-group">
                    <label className="cp-input-label" htmlFor="custom-problem-type">Describe the problem</label>
                    <input
                      id="custom-problem-type"
                      className="cp-input"
                      type="text"
                      placeholder="e.g. No water supply in the kitchen"
                      value={customIssueType}
                      onChange={(e) => setCustomIssueType(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="cp-input-group">
                  <label className="cp-input-label">Detailed Notes / Landmark Location</label>
                  <textarea
                    className="cp-input"
                    rows={3}
                    placeholder="Your registered service location will appear here..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <textarea
                    className="cp-input mt-2"
                    rows={2}
                    value={landmarkLocation}
                    onChange={(e) => setLandmarkLocation(e.target.value)}
                    placeholder="Registered consumer location"
                    aria-label="Consumer service location and landmarks"
                  />
                </div>

                <button type="submit" className="cp-btn-primary w-full mt-2">
                  Report Problem to Field Service →
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: REPORT SENT CONFIRMATION ─── */}
        {activeModal === 'reportSent' && submittedReport && (
          <div className="cp-modal-backdrop cp-modal-centered" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet cp-report-sent-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title">Report Sent</h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <div className="cp-report-sent-icon">✓</div>
              <h4 className="cp-report-sent-title">Your problem was reported</h4>
              <p className="cp-report-sent-copy">
                Your report was sent to Office Staff for review and forwarding to Field Staff.
              </p>
              <div className="cp-report-sent-summary">
                <div><span>Ticket Number</span><strong>{submittedReport.ticketNo}</strong></div>
                <div><span>Problem</span><strong>{submittedReport.issueType}</strong></div>
                <div><span>Status</span><strong>Reported - Office Staff Intake</strong></div>
              </div>
              <button className="cp-btn-primary w-full" onClick={() => setActiveModal(null)}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL: DIGITAL CUBIC METER ─── */}
        {activeModal === 'meter' && (
          <div className="cp-modal-backdrop cp-modal-centered" onClick={() => setActiveModal(null)}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />
              <div className="cp-sheet-header">
                <h3 className="cp-sheet-title">Digital Cubic Meter</h3>
                <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
              </div>

              <div className="bg-slate-900 text-white rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
                <div className="w-24 h-24 rounded-full border-4 border-sky-400 flex flex-col items-center justify-center mx-auto my-2 bg-slate-800">
                  <span className="text-2xl font-black font-mono text-sky-300">
                    {activeConsumer.lastReading || 148}
                  </span>
                  <span className="text-[10px] text-slate-400">CUBIC METERS (m³)</span>
                </div>
                <strong className="text-sm font-bold block text-slate-200 mt-2">
                  {activeConsumer.meterNo}
                </strong>
                <span className="text-xs text-sky-400 block font-medium">
                  Aquaflow Pro Brass (1/2") · Tamper Sealed
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-2 text-slate-600">
                <div className="flex justify-between">
                  <span>Calibration Status</span>
                  <strong className="text-emerald-600">Certified Compliant (+/- 0.3%)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Assigned Sector</span>
                  <span className="font-semibold text-slate-800">{activeConsumer.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Technician</span>
                  <span className="text-slate-800">Roberto Ramos (Field Team Alpha)</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Routine Calibration</span>
                  <span className="text-slate-800">March 2028</span>
                </div>
              </div>

              <button className="cp-btn-primary" onClick={() => setActiveModal(null)}>
                Close Cubic Meter Details
              </button>
            </div>
          </div>
        )}

        {/* ─── MODAL: NOTIFICATIONS / INFO ─── */}
        {activeModal === 'notice' && (
          <div className="cp-modal-backdrop cp-modal-centered" onClick={() => { setActiveModal(null); setSelectedNotification(null) }}>
            <div className="cp-modal-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="cp-sheet-handle" />

              {/* ── DETAIL VIEW ── */}
              {selectedNotification ? (() => {
                const isResolution = selectedNotification.type === 'Service Alert' || selectedNotification.message?.toLowerCase().includes('resolved')
                // Find related complaint by ticketId stored on the notification
                const relatedComplaint = selectedNotification.ticketId
                  ? complaints.find((c) => c.id === selectedNotification.ticketId)
                  : complaints.find(
                      (c) => c.status === 'Resolved' && (
                        c.consumerId === activeConsumer.id ||
                        c.accountNo === activeConsumer.accountNo
                      ) && selectedNotification.message?.includes(c.issueType)
                    )
                // Read image: dedicated localStorage map (cross-session) > notification > complaint in state
                const imageStore = (() => { try { return JSON.parse(localStorage.getItem('lambawasa_resolutionImages') || '{}') } catch { return {} } })()
                const resolvedImage =
                  imageStore[selectedNotification.ticketId] ||
                  selectedNotification.resolutionImage ||
                  relatedComplaint?.resolutionImage ||
                  null

                return (
                  <>
                    <div className="cp-sheet-header">
                      <button
                        className="cp-sheet-close"
                        style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#475569' }}
                        onClick={() => setSelectedNotification(null)}
                      >
                        ← Back
                      </button>
                      <button className="cp-sheet-close" onClick={() => { setActiveModal(null); setSelectedNotification(null) }}>✕</button>
                    </div>

                    <div style={{ padding: '4px 0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '22px' }}>{isResolution ? '✅' : '🔔'}</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '14px', color: '#0f4c3a' }}>
                            {isResolution ? 'Problem Report Update' : (selectedNotification.type || 'Notification')}
                          </strong>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{selectedNotification.sentAt}</span>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', background: '#f8fdfb', border: '1px solid #d1fae5', borderRadius: '10px', padding: '12px' }}>
                        {selectedNotification.message}
                      </p>

                      {resolvedImage && (
                        <div style={{ marginTop: '14px' }}>
                          <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            📷 Field Repair Photo
                          </p>
                          <img
                            src={resolvedImage}
                            alt="Field repair documentation"
                            style={{ width: '100%', borderRadius: '10px', border: '1px solid #d1fae5', objectFit: 'cover', maxHeight: '240px' }}
                          />
                        </div>
                      )}

                      {isResolution && relatedComplaint && (
                        <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 12px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#64748b' }}>Ticket No:</span>
                            <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>{relatedComplaint.ticketNo}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#64748b' }}>Issue:</span>
                            <span style={{ color: '#0f172a' }}>{relatedComplaint.issueType}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Technician:</span>
                            <strong style={{ color: '#0369a1' }}>{relatedComplaint.assignedTech || relatedComplaint.assignedTo}</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    <button className="cp-btn-primary" onClick={() => { setActiveModal(null); setSelectedNotification(null) }}>
                      Close
                    </button>
                  </>
                )
              })() : (
              /* ── LIST VIEW ── */
              <>
                <div className="cp-sheet-header">
                  <h3 className="cp-sheet-title">District Notices & Alerts</h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {myNotifications.length > 0 && (
                      <button
                        style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: '1px solid #fecaca', borderRadius: '6px', padding: '3px 9px', cursor: 'pointer' }}
                        onClick={() => {
                          if (onClearNotifications) onClearNotifications(activeConsumer.id, activeConsumer.accountNo)
                        }}
                      >
                        🗑 Clear All
                      </button>
                    )}
                    <button className="cp-sheet-close" onClick={() => setActiveModal(null)}>✕</button>
                  </div>
                </div>

                <div className="space-y-3">
                  {myNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs"
                      style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                      onClick={() => setSelectedNotification(notification)}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#d1fae5'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong className="text-emerald-900 block font-bold">✓ Problem Report Update</strong>
                        <span style={{ fontSize: '10px', color: '#6b9e94', marginLeft: '8px', whiteSpace: 'nowrap' }}>Tap to view →</span>
                      </div>
                      <p className="text-slate-600 mt-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{notification.sentAt}</span>
                    </div>
                  ))}

                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs">
                    <strong className="text-sky-900 block font-bold">💧 Scheduled Sector Flushing</strong>
                    <p className="text-slate-600 mt-1">
                      Routine mainline flushing in {activeConsumer.zone} scheduled Sunday 23:00 - 02:00. Normal pressure maintained.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">14 Sep 2026</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                    <strong className="text-emerald-900 block font-bold">✓ Verified Billing Statement</strong>
                    <p className="text-slate-600 mt-1">
                      August statement generated based on verified meter reading of {activeConsumer.lastReading || 148} m³.
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">01 Sep 2026</span>
                  </div>
                </div>

                <button className="cp-btn-primary" onClick={() => setActiveModal(null)}>
                  Close Notifications
                </button>
              </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
