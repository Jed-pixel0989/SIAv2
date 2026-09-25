import { useState } from 'react'
import { calculateConsumptionBill, initialTariff } from '../data/mockData'

export default function AutomatedConsumptionCalculator({
  consumers,
  onQueueBill,
  flash,
}) {
  const [selectedConsumerId, setSelectedConsumerId] = useState(consumers[0]?.id || '')
  const [prevReading, setPrevReading] = useState('120')
  const [presReading, setPresReading] = useState('145')
  const [classification, setClassification] = useState('Residential')

  const selectedConsumer = consumers.find((c) => c.id === selectedConsumerId)

  // When a consumer is selected from dropdown, update defaults
  const handleConsumerChange = (id) => {
    setSelectedConsumerId(id)
    const c = consumers.find((item) => item.id === id)
    if (c) {
      setPrevReading(String(c.lastReading - 18 > 0 ? c.lastReading - 18 : 0))
      setPresReading(String(c.lastReading))
      setClassification(c.classification)
    }
  }

  const pReadingNum = Number(prevReading) || 0
  const cReadingNum = Number(presReading) || 0
  const isNegative = cReadingNum < pReadingNum
  const isHighSpike = (cReadingNum - pReadingNum) > 50

  const calcResult = calculateConsumptionBill(
    prevReading,
    presReading,
    classification,
    initialTariff
  )

  const handleQueueBill = () => {
    if (isNegative) {
      flash('Cannot queue negative consumption! Check meter reading.')
      return
    }

    if (selectedConsumer) {
      onQueueBill({
        consumerId: selectedConsumer.id,
        name: selectedConsumer.name,
        accountNo: selectedConsumer.accountNo,
        zone: selectedConsumer.zone,
        prevReading: pReadingNum,
        presReading: cReadingNum,
        consumption: calcResult.consumption,
        baseAmount: calcResult.baseAmount,
        envFee: calcResult.envFee,
        maintFee: calcResult.maintFee,
        totalAmount: calcResult.totalAmount,
      })
      flash(`Verified bill statement queued for ${selectedConsumer.name}`)
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <div>
          <div className="feature-badge">Feature 04 · Automated Consumption Calculator</div>
          <h2>Tiered Tariff & Usage Calculation Engine</h2>
          <p className="subheading">
            Computes precise usage data for every household automatically to prevent skipping calculations and eliminate unfair billing.
          </p>
        </div>
      </div>

      <div className="calculator-layout">
        {/* Left column: Input parameters & Anomaly Alerts */}
        <div className="calculator-inputs-card">
          <div className="card-title-bar">
            <h3>Meter Reading & Parameters</h3>
            <span className="badge-live">Live Math Engine</span>
          </div>

          <div className="field-meter-route-strip">
            <span className="route-badge">🚶 Field Route Reader</span>
            <div className="route-controls">
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => {
                  const currIdx = consumers.findIndex((c) => c.id === selectedConsumerId)
                  if (currIdx > 0) handleConsumerChange(consumers[currIdx - 1].id)
                }}
                disabled={consumers.findIndex((c) => c.id === selectedConsumerId) <= 0}
              >
                ◀ Prev House
              </button>
              <span className="route-pos">
                {consumers.findIndex((c) => c.id === selectedConsumerId) + 1} of {consumers.length}
              </span>
              <button
                type="button"
                className="btn-outline-sm"
                onClick={() => {
                  const currIdx = consumers.findIndex((c) => c.id === selectedConsumerId)
                  if (currIdx >= 0 && currIdx < consumers.length - 1) handleConsumerChange(consumers[currIdx + 1].id)
                }}
                disabled={consumers.findIndex((c) => c.id === selectedConsumerId) >= consumers.length - 1}
              >
                Next House ▶
              </button>
            </div>
          </div>

          <label>
            Select Consumer Account:
            <select
              value={selectedConsumerId}
              onChange={(e) => handleConsumerChange(e.target.value)}
            >
              {consumers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.accountNo}) - {c.zone}
                </option>
              ))}
            </select>
          </label>

          <div className="calc-row-two">
            <label>
              Rate Classification:
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                <option value="Residential">Residential Rate</option>
                <option value="Commercial">Commercial Rate</option>
              </select>
            </label>

            <label>
              Assigned Meter Serial:
              <input
                disabled
                value={selectedConsumer ? selectedConsumer.meterNo : 'MTR-AUTO'}
                className="disabled-input"
              />
            </label>
          </div>

          <div className="calc-row-two">
            <label>
              Previous Meter Reading (m³):
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={prevReading}
                onChange={(e) => setPrevReading(e.target.value)}
              />
            </label>

            <label>
              Present Meter Reading (m³):
              <input
                type="number"
                inputMode="decimal"
                min="0"
                className="input-present-reading"
                value={presReading}
                onChange={(e) => setPresReading(e.target.value)}
              />
            </label>
          </div>

          {/* Anomaly Detection Feedback */}
          {isNegative && (
            <div className="alert-banner alert-danger">
              <strong>⚠️ Dial Inversion / Rollback Anomaly:</strong>
              <p>
                Present reading is lower than previous reading. Please dispatch a technician to verify the physical counter or check for dial reset.
              </p>
            </div>
          )}

          {isHighSpike && !isNegative && (
            <div className="alert-banner alert-warning">
              <strong>⚠️ High Consumption Surge Detected (+{calcResult.consumption} m³):</strong>
              <p>
                Usage is significantly above standard household threshold. Potential subterranean pipe leak or commercial overflow.
              </p>
            </div>
          )}

          {!isNegative && !isHighSpike && (
            <div className="alert-banner alert-success">
              <strong>✓ Reading Verified & In Range:</strong>
              <p>Consumption matches expected historical baseline (+{calcResult.consumption} m³).</p>
            </div>
          )}

          <div className="calc-action-row">
            <button
              className="primary-button full"
              disabled={isNegative}
              onClick={handleQueueBill}
            >
              <span>＋</span> Push to Verified Billing Queue
            </button>
          </div>
        </div>

        {/* Right column: Real-time Itemized Calculation Breakdown */}
        <div className="calculator-results-card">
          <div className="card-title-bar">
            <h3>Automated Math Computation Breakdown</h3>
            <span className="cu-m-tag">Total: {calcResult.consumption} cu.m</span>
          </div>

          <div className="consumption-display">
            <div className="display-metric">
              <span>Usage Volume</span>
              <h2>{calcResult.consumption} <small>m³</small></h2>
            </div>
            <div className="display-metric right">
              <span>Computed Total</span>
              <h2 className="text-aqua">₱ {calcResult.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
            </div>
          </div>

          <div className="bracket-table-wrap">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Tier Bracket</th>
                  <th>Usage (m³)</th>
                  <th>Rate / m³</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {calcResult.bracketBreakdown.map((b, i) => (
                  <tr key={i}>
                    <td>{b.label}</td>
                    <td>{b.cuM} m³</td>
                    <td>₱ {b.rate.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>₱ {b.amount.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="subtotal-row">
                  <td colSpan={3}>Base Commodity Charge</td>
                  <td style={{ textAlign: 'right' }}>₱ {calcResult.baseAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    Environmental Sewerage Fee (10%)
                  </td>
                  <td style={{ textAlign: 'right' }}>₱ {calcResult.envFee.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    Meter Maintenance & Watershed Care
                  </td>
                  <td style={{ textAlign: 'right' }}>₱ {calcResult.maintFee.toFixed(2)}</td>
                </tr>
                <tr className="grand-total-row">
                  <td colSpan={3}>
                    <strong>TOTAL COMPUTED BILL</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>₱ {calcResult.totalAmount.toFixed(2)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="audit-guarantee-note">
            🛡️ <strong>Fair-Billing Regulatory Compliance:</strong> Eliminates human arithmetic error by enforcing codified water district tariff rates automatically.
          </div>
        </div>
      </div>
    </div>
  )
}
