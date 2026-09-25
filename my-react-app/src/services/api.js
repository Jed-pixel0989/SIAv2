// Frontend API Service communicating with XAMPP MySQL waterline_db via PHP endpoints

// Returns true when running on a known cloud/static host (no PHP backend available)
const isCloudDeployment = () => {
  const host = window.location.hostname
  return (
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.pages.dev') ||
    host === 'localhost' && Number(window.location.port) === 4173 // vite preview without XAMPP
  )
}

const getApiUrl = (endpoint) => {
  // When running via Vite dev server or preview, PHP is on XAMPP's web server (port 80)
  const vitePort = Number(window.location.port)
  const isViteServer = vitePort >= 5173 && vitePort <= 5199
  const base = isViteServer
    ? `${window.location.protocol}//${window.location.hostname}/SIA/api`
    : `${window.location.origin}/SIA/api`
  return `${base}/${endpoint}`
}

export const api = {
  // Check Database Connection & Server Health
  async checkDbStatus() {
    if (isCloudDeployment()) {
      return { success: true, connected: false, mode: 'demo', error: 'No backend available on this host' }
    }
    try {
      const res = await fetch(getApiUrl('status.php'), { method: 'GET' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text) throw new Error('Empty response')
      return JSON.parse(text)
    } catch (err) {
      console.warn('DB Status Check Error:', err)
      return { success: true, connected: false, mode: 'local', error: err.message }
    }
  },

  // Fetch all initial data from MySQL waterline_db
  async fetchSystemData() {
    if (isCloudDeployment()) {
      console.warn('Running on cloud host — no PHP backend available. Using mock data.')
      return null
    }
    try {
      const res = await fetch(getApiUrl('data.php'), { method: 'GET' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (!text) throw new Error('Empty response from data.php')
      const json = JSON.parse(text)
      if (json.success && json.data) {
        return json.data
      }
      throw new Error(json.error || 'Failed to parse database data')
    } catch (err) {
      console.error('Failed to fetch system data from database:', err)
      return null
    }
  },

  async saveBoundaries(serviceBoundary, clusterBoundaries) {
    try {
      const res = await fetch(getApiUrl('boundaries.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceBoundary, clusterBoundaries }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: true, mode: 'local' }
    } catch (err) {
      localStorage.setItem('lambawasa_serviceBoundary', JSON.stringify(serviceBoundary))
      localStorage.setItem('lambawasa_clusterBoundaries', JSON.stringify(clusterBoundaries))
      return { success: true, mode: 'local' }
    }
  },

  // Create Consumer
  async addConsumer(consumerData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('consumers.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(consumerData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API addConsumer error:', err)
      return { success: false, error: err.message }
    }
  },

  async updateConsumerApproval(consumerId, approvalStatus) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('consumers.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId, approvalStatus }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API updateConsumerApproval error:', err)
      return { success: false, error: err.message }
    }
  },

  async deleteConsumer(consumerId, actorRole) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('consumers.php'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consumerId, actorRole }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API deleteConsumer error:', err)
      return { success: false, error: err.message }
    }
  },

  async requestConsumerLocationChange(consumerId, latitude, longitude) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('consumers.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'location-request', consumerId, latitude, longitude }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API requestConsumerLocationChange error:', err)
      return { success: false, error: err.message }
    }
  },

  async decideConsumerLocationChange(consumerId, locationApprovalStatus) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('consumers.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'location-decision', consumerId, locationApprovalStatus }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API decideConsumerLocationChange error:', err)
      return { success: false, error: err.message }
    }
  },

  // Process POS Payment
  async processPayment(paymentData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('payments.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API processPayment error:', err)
      return { success: false, error: err.message }
    }
  },

  // Queue Bill
  async queueBill(billData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('bills.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single', ...billData }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API queueBill error:', err)
      return { success: false, error: err.message }
    }
  },

  // Batch Bills
  async batchBills(cycle, targetZone, billsList) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('bills.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', cycle, targetZone, bills: billsList }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API batchBills error:', err)
      return { success: false, error: err.message }
    }
  },

  async runScheduledBilling() {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('bills.php?action=scheduled'), { method: 'GET' })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API scheduled billing error:', err)
      return { success: false, error: err.message }
    }
  },

  // Create Maintenance Ticket
  async createTicket(ticketData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('tickets.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API createTicket error:', err)
      return { success: false, error: err.message }
    }
  },

  // Update Maintenance Ticket Status
  async updateTicket(ticketData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('tickets.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API updateTicket error:', err)
      return { success: false, error: err.message }
    }
  },

  // Add Meter Asset
  async addMeter(meterData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('meters.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meterData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API addMeter error:', err)
      return { success: false, error: err.message }
    }
  },

  // Update Meter Asset
  async updateMeter(meterData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('meters.php'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meterData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API updateMeter error:', err)
      return { success: false, error: err.message }
    }
  },

  // Record Audit Trail
  async recordAudit(auditData) {
    if (isCloudDeployment()) return { success: true, mode: 'demo' } // silently skip on cloud
    try {
      const res = await fetch(getApiUrl('audit.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API recordAudit error:', err)
      return { success: false, error: err.message }
    }
  },

  async createNotification(notificationData) {
    if (isCloudDeployment()) return { success: true, mode: 'demo' } // silently skip on cloud
    try {
      const res = await fetch(getApiUrl('notifications.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API createNotification error:', err)
      return { success: false, error: err.message }
    }
  },

  // Auth: Login
  async login(username, password) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('auth.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API login error:', err)
      return { success: false, error: err.message }
    }
  },

  // Auth: Register
  async register(userData) {
    if (isCloudDeployment()) return { success: false, error: 'No backend available on this host.' }
    try {
      const res = await fetch(getApiUrl('auth.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', ...userData }),
      })
      const text = await res.text()
      return text ? JSON.parse(text) : { success: false, error: 'Empty response from server' }
    } catch (err) {
      console.error('API register error:', err)
      return { success: false, error: err.message }
    }
  },
}
