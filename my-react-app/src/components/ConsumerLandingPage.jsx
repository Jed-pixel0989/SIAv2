import './ConsumerLandingPage.css'

export default function ConsumerLandingPage({ onOpenLogin, onOpenRegister }) {
  return (
    <main className="consumer-entry-page">
      <header className="consumer-entry-header">
        <div className="consumer-entry-brand">
          <div className="consumer-entry-mark" aria-hidden="true">💧</div>
          <div>
            <strong>Lambawasa</strong>
            <span>Household services</span>
          </div>
        </div>
        <button type="button" className="consumer-entry-header-login" onClick={() => onOpenLogin('consumer')}>
          Sign in <span aria-hidden="true">{'->'}</span>
        </button>
      </header>

      <section className="consumer-entry-hero" aria-labelledby="consumer-entry-title">
        <div className="consumer-entry-copy">
          <span className="consumer-entry-kicker">WATER, MADE SIMPLE</span>
          <h1 id="consumer-entry-title">A clearer view of your household water.</h1>
          <p>
            Stay ahead of every reading, statement, and service request with one calm, reliable account.
          </p>
          <div className="consumer-entry-actions">
            <button type="button" className="consumer-entry-login" onClick={() => onOpenLogin('consumer')}>
              Open consumer portal <span aria-hidden="true">{'->'}</span>
            </button>
            <button type="button" className="consumer-entry-register" onClick={() => onOpenLogin('field')}>
              Field staff demo
            </button>
            <button type="button" className="consumer-entry-register" onClick={onOpenRegister}>
              Create an account
            </button>
          </div>
          <p className="consumer-entry-note">Already registered? Use your account number or username to sign in.</p>
        </div>

        <div className="consumer-entry-preview" aria-label="Consumer portal preview">
          <div className="consumer-entry-preview-topline">
            <span>HOUSEHOLD SNAPSHOT</span>
            <span className="consumer-entry-live"><i /> Live service</span>
          </div>
          <div className="consumer-entry-balance">
            <span>Current statement</span>
            <strong>Ready when you are</strong>
            <small>View your balance after signing in</small>
          </div>
          <div className="consumer-entry-preview-grid">
            <div><span className="preview-icon">◷</span><strong>Meter readings</strong><small>Track usage</small></div>
            <div><span className="preview-icon">✓</span><strong>Easy payments</strong><small>Settle securely</small></div>
          </div>
          <div className="consumer-entry-waterline"><span /><span /><span /><span /><span /><span /></div>
        </div>
      </section>

      <section className="consumer-entry-services" aria-label="Household services">
        <div className="consumer-entry-section-label"><span>YOUR HOUSEHOLD, CONNECTED</span><span>03 SERVICES</span></div>
        <div className="consumer-entry-service-list">
          <article><span className="service-number">01</span><div><h2>See your usage</h2><p>Follow your meter readings and understand your monthly consumption.</p></div><span className="service-arrow" aria-hidden="true">↗</span></article>
          <article><span className="service-number">02</span><div><h2>Pay with confidence</h2><p>Keep statements, payment history, and receipts together.</p></div><span className="service-arrow" aria-hidden="true">↗</span></article>
          <article><span className="service-number">03</span><div><h2>Get support faster</h2><p>Report a concern and follow its progress from your portal.</p></div><span className="service-arrow" aria-hidden="true">↗</span></article>
        </div>
      </section>
    </main>
  )
}
