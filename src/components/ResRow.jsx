import { useState } from 'react';
import { nightsBetween, formatShort } from '../utils/dateHelpers';
import { downloadReservationExcel } from '../utils/excelExport';
import PayBadge from './PayBadge';

export default function ResRow({ res, t, rooms, onEdit, onDelete, onCyclePayment, showActions = true, today }) {
  const room = rooms.find((r) => r.id === res.roomId);
  const n = nightsBetween(res.checkIn, res.checkOut);
  const [expanded, setExpanded] = useState(false);

  // Status indicator
  const isActive = today && res.checkIn <= today && res.checkOut > today;
  const isPast = today && res.checkOut < today;
  const isUpcoming = today && res.checkIn > today;

  return (
    <div className={`rr ${isActive ? 'rr-active' : ''} ${isPast ? 'rr-past' : ''}`}
      onClick={() => setExpanded(!expanded)}
      style={{ cursor: 'pointer' }}
    >
      <div className="room-badge">{room?.name ?? '?'}</div>

      <div className="rg">
        <div className="rg-name">
          {res.guestName}
          {isActive && <span className="rr-status-dot active" title={t.activeRes}>●</span>}
          {isUpcoming && <span className="rr-status-dot upcoming" title={t.arrivalsToday}>◉</span>}
        </div>
        {res.guestContact && <div className="rg-contact">{res.guestContact}</div>}
        {!expanded && res.notes && <div className="rg-note-preview">📝 {res.notes.length > 40 ? res.notes.slice(0, 40) + '...' : res.notes}</div>}
      </div>

      <div className="rd">
        <div className="rd-main">
          {formatShort(res.checkIn, t.months)} → {formatShort(res.checkOut, t.months)}
        </div>
        <div className="rd-sub">
          {n} {n === 1 ? t.night : t.nights}
        </div>
      </div>

      <div className="rp">{res.price} лв</div>

      <PayBadge res={res} t={t} onCycle={onCyclePayment} />

      {showActions && (
        <div className="ra" onClick={(e) => e.stopPropagation()}>
          <button
            className="btn btn-outline btn-sm btn-icon"
            title={t.downloadExcel || 'Excel'}
            onClick={() => downloadReservationExcel(res, t, rooms)}
          >
            📥
          </button>
          <button
            className="btn btn-outline btn-sm btn-icon"
            title={t.editBooking}
            onClick={() => onEdit(res)}
          >
            ✏️
          </button>
          <button
            className="btn btn-danger btn-sm btn-icon"
            title={t.deleteConfirm}
            onClick={() => onDelete(res.id)}
          >
            🗑️
          </button>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="rr-expanded" onClick={(e) => e.stopPropagation()}>
          {res.notes && (
            <div className="rr-detail">
              <span className="rr-detail-label">📝 {t.notes}:</span>
              <span>{res.notes}</span>
            </div>
          )}
          <div className="rr-detail">
            <span className="rr-detail-label">🛏️ {t.room}:</span>
            <span>{room?.name ?? '?'} · {t.roomType[room?.type] ?? room?.type} · {room?.basePrice ?? '?'} {t.perNight}</span>
          </div>
          <div className="rr-detail">
            <span className="rr-detail-label">💰 {t.price}:</span>
            <span>{res.price} лв ({n} {n === 1 ? t.night : t.nights} × {room?.basePrice ?? '?'} = {(room?.basePrice ?? 0) * n} лв {t.suggested.toLowerCase()})</span>
          </div>
        </div>
      )}
    </div>
  );
}
