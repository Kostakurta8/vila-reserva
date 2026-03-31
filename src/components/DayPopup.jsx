import { useEffect } from 'react';
import { nightsBetween, formatShort } from '../utils/dateHelpers';
import PayBadge from './PayBadge';

/**
 * Popup overlay that shows all reservations for a specific calendar day.
 * Appears when clicking a day with reservations on Dashboard or CalendarView.
 */
export default function DayPopup({
  t,
  rooms,
  dateStr,
  reservations, // reservations active on that date
  onClose,
  onOpenEdit,
  onOpenAdd,
  onCyclePayment,
  onDelete,
  totalRooms,
}) {
  /* ── ESC key to close ──────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  if (!dateStr || !reservations) return null;

  const d = new Date(dateStr + 'T12:00:00');
  const dayLabel = `${String(d.getDate()).padStart(2, '0')} ${t.months[d.getMonth()]} ${d.getFullYear()}`;

  const freeRooms = rooms.filter(
    (room) => !reservations.some((r) => r.roomId === room.id),
  );

  return (
    <div className="overlay day-popup-overlay" onClick={onClose}>
      <div className="day-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="day-popup-hdr">
          <div>
            <div className="day-popup-title">📅 {dayLabel}</div>
            <div className="day-popup-sub">
              {reservations.length} {reservations.length === 1 ? t.booking : t.bookings}
              {' · '}
              {freeRooms.length} {t.free.toLowerCase()}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Reservations list */}
        {reservations.length > 0 ? (
          <div className="day-popup-list">
            {reservations.map((res) => {
              const room = rooms.find((r) => r.id === res.roomId);
              const n = nightsBetween(res.checkIn, res.checkOut);
              const isArrival = res.checkIn === dateStr;
              const isDeparture = res.checkOut === dateStr;
              return (
                <div key={res.id} className="day-popup-item" style={{ cursor: 'pointer' }}
                  onClick={() => { onOpenEdit(res); onClose(); }}>
                  <div className="day-popup-room">{room?.name ?? '?'}</div>
                  <div className="day-popup-info">
                    <div className="day-popup-guest">
                      👤 {res.guestName}
                      {isArrival && <span className="cal-arr-badge" style={{ marginLeft: 6, fontSize: '.62rem' }}>↓ {t.arrival}</span>}
                      {isDeparture && <span className="cal-dep-badge" style={{ marginLeft: 6, fontSize: '.62rem' }}>↑ {t.departure}</span>}
                    </div>
                    <div className="day-popup-dates">
                      {formatShort(res.checkIn, t.months)} → {formatShort(res.checkOut, t.months)}
                      {' · '}{n} {n === 1 ? t.night : t.nights}
                      {' · '}{res.price} лв
                    </div>
                    {res.notes && <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>📝 {res.notes}</div>}
                  </div>
                  <PayBadge res={res} t={t} onCycle={onCyclePayment} />
                  <button
                    className="btn btn-outline btn-sm btn-icon"
                    title={t.editBooking}
                    onClick={(e) => { e.stopPropagation(); onOpenEdit(res); onClose(); }}
                  >
                    ✏️
                  </button>
                  {onDelete && (
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      title={t.deleteConfirm}
                      onClick={(e) => { e.stopPropagation(); onDelete(res.id); onClose(); }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="day-popup-empty">
            <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🌿</div>
            <div>{t.noRes}</div>
          </div>
        )}

        {/* Free rooms summary */}
        {freeRooms.length > 0 && reservations.length > 0 && (
          <div style={{ padding: '10px 0', fontSize: '.78rem', color: 'var(--ink2)' }}>
            <span style={{ fontWeight: 800 }}>✓ {freeRooms.length} {t.free.toLowerCase()}: </span>
            {freeRooms.slice(0, 8).map(r => r.name).join(', ')}
            {freeRooms.length > 8 && ` +${freeRooms.length - 8}`}
          </div>
        )}

        {/* Footer */}
        <div className="day-popup-foot">
          <button
            className="btn btn-mint btn-sm"
            onClick={() => { onOpenAdd(null, dateStr); onClose(); }}
          >
            + {t.newBooking}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
