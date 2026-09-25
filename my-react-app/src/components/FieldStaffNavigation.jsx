import { useState } from 'react'
import './FieldStaffNavigation.css'

const fieldDestinations = [
  ['Overview', '⌂', 'Home'],
  ['Consumption Calculator', '◷', 'Read Meter'],
  ['Meter Assets', '▣', 'Meters'],
  ['Geographical Mapping', '⌖', 'Field map'],
  ['Service Desk', '⚒', 'Tickets'],
]

export default function FieldStaffNavigation({ activeNav, onNavigate, complaints = [], onSignOut }) {
  const [isOpen, setIsOpen] = useState(false)
  const openDestination = (destination) => {
    onNavigate(destination === 'Overview' ? 'Overview' : destination)
    setIsOpen(false)
  }
  const openTickets = complaints.filter((complaint) => complaint.status !== 'Resolved').length

  return (
    <div className={`field-staff-navigation ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="field-staff-menu-toggle"
        aria-label={isOpen ? 'Close field staff navigation' : 'Open field staff navigation'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span /><span /><span />
      </button>
      {isOpen && (
        <nav className="field-staff-menu" aria-label="Field Staff Navigation">
          {fieldDestinations.map(([destination, icon, label]) => (
            <button
              type="button"
              key={destination}
              className={activeNav === destination ? 'active' : ''}
              onClick={() => openDestination(destination)}
            >
              <span className="field-menu-icon">{icon}</span>
              <span>{label}</span>
              {destination === 'Service Desk' && openTickets > 0 && <b>{openTickets}</b>}
            </button>
          ))}
          <button type="button" className="field-menu-signout" onClick={onSignOut}>
            <span className="field-menu-icon">↪</span>
            <span>Sign out</span>
          </button>
        </nav>
      )}
    </div>
  )
}
