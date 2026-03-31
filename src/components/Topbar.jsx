import { getGreeting } from '../utils/dateHelpers';

export default function Topbar({ t, view, lang, onNewBooking, onToggleSidebar, freeCount, occupiedCount, arrivalsCount }) {
  return (
    <div className="topbar">
      <button className="hamburger" onClick={onToggleSidebar} aria-label="Menu">
        <span /><span /><span />
      </button>
      <div>
        <div className="topbar-title">{t.nav[view]}</div>
        <div className="topbar-sub">
          {getGreeting(t)} ·{' '}
          {new Date().toLocaleDateString(lang === 'bg' ? 'bg-BG' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </div>
      </div>
      {/* Quick stats pills */}
      <div className="topbar-stats">
        <span className="topbar-pill" style={{ color: '#1a7a4a', background: 'rgba(58, 170, 120, 0.1)' }}>
          ✓ {freeCount} {t.free}
        </span>
        <span className="topbar-pill" style={{ color: '#e8715a', background: 'rgba(232, 113, 90, 0.1)' }}>
          ● {occupiedCount} {t.occWord}
        </span>
        {arrivalsCount > 0 && (
          <span className="topbar-pill" style={{ color: '#5ba3d4', background: 'rgba(91, 163, 212, 0.1)' }}>
            ✈️ {arrivalsCount} {t.arrivalsToday}
          </span>
        )}
      </div>
      <div className="topbar-right">
        <button className="btn btn-primary" onClick={onNewBooking} title="N">
          + {t.newBooking}
        </button>
      </div>
    </div>
  );
}
