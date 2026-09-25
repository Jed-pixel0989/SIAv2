// Frontend API Service
// Routes to Vercel serverless functions on cloud, or XAMPP PHP on local.

// ─── Environment detection ────────────────────────────────────────────────────

const isCloudDeployment = () => {
  const host = window.location.hostname
  const port = Number(window.location.port)
  return (
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.pages.dev') ||
    (host === 'localhost' && port === 4173) // vite preview without XAMPP
  )
}

/**
 * Returns the correct base URL for API calls.
 *
 * Cloud  → /api            (Vercel serverless functions, same origin)
 * Local  → /SIA/api        (XAMPP PHP, served on port 80)
 */
const getApiBase = () => {
  if (isCloudDeployment()) return '/api'
  // Vite dev server (5173-5199) or vite preview (4173): PHP still lives on port 80
  return `${window.location.protocol}//${window.location.hostname}/SIA/api`
}

/**
 * Build a full URL for a given endpoint name.
 * Cloud:  /api/consumers
 * Local:  http://localhost/SIA/api/consumers.php
 */
const getApiUrl = (name, query = '') => {
  const base = getApiBase()
  const suffix = isCloudDeployment() ? name : `${name}.php`
  return `${base}/${suffix}${query}`
}

// ─── Safe fetch helpers ───────────────────────────────────────────────────────

async function safeFetch(url, options = {}) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  if (!text) throw new Error('Empty response from server')
  return JSON.parse(text)
}

// ─── API surface ──────────────────────────────────────────────────────────────

export const api = {

  // ── Status / health ────────────────────────────────────────────────────────
  async checkDbStatus() {
    try {
      return await safeFetch(getApiUrl('status'))
    } catch (err) {
      console.warn('DB Status Check Error:', err)
      return { success: true, connected: false, mode: 'local', error: err.message }
    }
  },

  // ── Full data sync ─────────────────────────────────────────────────────────
  async fetchSystemData() {
    try {
      const json = await safeFetch(getApiUrl('data'))
      if (json.success && json.data) return json.data
      throw new Error(json.error || 'Failed to parse database data')
    } catch (err) {
      console.error('Failed to fetch system data:', err)
      return null
    }
  },

  // ── Boundaries ─────────────────────────────────────────────────────────────
  async saveBoundaries(serviceBoundary, clusterBoundaries) {
    try {
      return await safeFetch(getApiUrl('boundaries'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceBoundary, clusterBoundaries }),
      })
    } catch (err) {
      // Fallback to localStorage when offline
      localStorage.setItem('lambawasa_serviceBoundary', JSON.stringify(serviceBoundary))
      localStorage.setItem('lambawasa_clusterBoundaries', JSON.stringify(clusterBoundaries))
      return { success: true, mode: 'local' }
    }
  },

  // ── Consumers ──────────────────────────────────────────────────────────────
  async addConsumer(consumerData) {
    try {
      return await safeFetch(getApiUrl('consumers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumerData),
      })
    } catch (err) {
      console.error('API addConsumer error:', err)
      return { success: false, error: err.message }
    }
  },

  async updateConsumerApproval(consumerId, approvalStatus) {
    try {
      return await safeFetch(getApiUrl('consumers'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId, approvalStatus }),
      })
    } catch (err) {
      console.error('API updateConsumerApproval error:', err)
      return { success: false, error: err.message }
    }
  },

  async deleteConsumer(consumerId, actorRole) {
    try {
      return await safeFetch(getApiUrl('consumers'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId, actorRole }),
      })
    } catch (err) {
      console.error('API deleteConsumer error:', err)
      return { success: false, error: err.message }
    }
  },

  async requestConsumerLocationChange(consumerId, latitude, longitude) {
    try {
      return await safeFetch(getApiUrl('consumers'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'location-request', consumerId, latitude, longitude }),
      })
    } catch (err) {
      console.error('API requestConsumerLocationChange error:', err)
      return { success: false, error: err.message }
    }
  },

  async decideConsumerLocationChange(consumerId, locationApprovalStatus) {
    try {
      return await safeFetch(getApiUrl('consumers'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'location-decision', consumerId, locationApprovalStatus }),
      })
    } catch (err) {
      console.error('API decideConsumerLocationChange error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Payments ───────────────────────────────────────────────────────────────
  async processPayment(paymentData) {
    try {
      return await safeFetch(getApiUrl('payments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
    } catch (err) {
      console.error('API processPayment error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Bills ──────────────────────────────────────────────────────────────────
  async queueBill(billData) {
    try {
      return await safeFetch(getApiUrl('bills'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single', ...billData }),
      })
    } catch (err) {
      console.error('API queueBill error:', err)
      return { success: false, error: err.message }
    }
  },

  async batchBills(cycle, targetZone, billsList) {
    try {
      return await safeFetch(getApiUrl('bills'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', cycle, targetZone, bills: billsList }),
      })
    } catch (err) {
      console.error('API batchBills error:', err)
      return { success: false, error: err.message }
    }
  },

  async runScheduledBilling() {
    try {
      // query string handled the same way on both backends
      const url = isCloudDeployment()
        ? '/api/bills?action=scheduled'
        : getApiUrl('bills', '?action=scheduled')
      return await safeFetch(url)
    } catch (err) {
      console.error('API scheduled billing error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Tickets ────────────────────────────────────────────────────────────────
  async createTicket(ticketData) {
    try {
      return await safeFetch(getApiUrl('tickets'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })
    } catch (err) {
      console.error('API createTicket error:', err)
      return { success: false, error: err.message }
    }
  },

  async updateTicket(ticketData) {
    try {
      return await safeFetch(getApiUrl('tickets'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })
    } catch (err) {
      console.error('API updateTicket error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Meters ─────────────────────────────────────────────────────────────────
  async addMeter(meterData) {
    try {
      return await safeFetch(getApiUrl('meters'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meterData),
      })
    } catch (err) {
      console.error('API addMeter error:', err)
      return { success: false, error: err.message }
    }
  },

  async updateMeter(meterData) {
    try {
      return await safeFetch(getApiUrl('meters'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meterData),
      })
    } catch (err) {
      console.error('API updateMeter error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Audit trail ────────────────────────────────────────────────────────────
  async recordAudit(auditData) {
    try {
      return await safeFetch(getApiUrl('audit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData),
      })
    } catch (err) {
      // Non-critical — log and continue
      console.warn('API recordAudit error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  async createNotification(notificationData) {
    try {
      return await safeFetch(getApiUrl('notifications'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      })
    } catch (err) {
      console.warn('API createNotification error:', err)
      return { success: false, error: err.message }
    }
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  async login(username, password) {
    try {
      return await safeFetch(getApiUrl('auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      })
    } catch (err) {
      console.error('API login error:', err)
      return { success: false, error: err.message }
    }
  },

  async register(userData) {
    try {
      return await safeFetch(getApiUrl('auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...userData }),
      })
    } catch (err) {
      console.error('API register error:', err)
      return { success: false, error: err.message }
    }
  },
}
