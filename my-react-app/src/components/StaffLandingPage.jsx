import './ConsumerLandingPage.css'

export default function StaffLandingPage({ onOpenLogin }) {
  return (
    <main className="staff-entry-page">
      <section className="staff-entry-panel" aria-labelledby="staff-entry-title">
        <div className="staff-entry-mark" aria-hidden="true">◈</div>
        <span className="staff-entry-kicker">LAMBAWASA OPERATIONS</span>
        <h1 id="staff-entry-title">Utility operations access.</h1>
        <p>
          Sign in to manage field work, billing, consumer records, collections, reports, and municipal administration.
        </p>
        <div className="staff-entry-actions">
          <div className="staff-entry-option">
            <button type="button" className="staff-entry-primary" onClick={() => onOpenLogin('field')}>
              👷 Field Staff Login
            </button>
            <span className="staff-entry-credentials">Demo: <strong>roberto.ramos</strong> / <strong>demo1234</strong></span>
          </div>
          <div className="staff-entry-option">
            <button type="button" className="staff-entry-secondary" onClick={() => onOpenLogin('admin')}>
              Office Staff, President & Cashier Login
            </button>
            <span className="staff-entry-credentials">Demo: <strong>jamie.dizon</strong> / <strong>admin123</strong></span>
          </div>
        </div>
        <span className="staff-entry-note">Access includes field staff, office staff, president, and cashier roles.</span>
      </section>
    </main>
  )
}
