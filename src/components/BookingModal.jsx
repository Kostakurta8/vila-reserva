import { useMemo, useEffect, useRef, useCallback } from 'react';
import { ROOM_TYPES, TYPE_ICONS } from '../data/rooms';
import { PAY_CYCLE } from '../data/theme';
import { nightsBetween, formatShort } from '../utils/dateHelpers';
import { checkBookingConflict } from '../utils/validation';

export default function BookingModal({
  t,
  rooms,
  modal,         // 'add' | 'edit'
  editRes,
  setEditRes,
  reservations,
  onSave,
  onClose,
}) {
  /* ── ESC key to close ──────────────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  /* ── Auto-focus first input on mount ───────────────────────── */
  const firstInputRef = useRef(null);
  useEffect(() => {
    if (firstInputRef.current) {
      setTimeout(() => firstInputRef.current.focus(), 100);
    }
  }, []);
  /* ── Live conflict detection ───────────────────────────────── */
  const liveConflict = useMemo(() => {
    if (!editRes?.roomId || !editRes?.checkIn || !editRes?.checkOut) return null;
    if (editRes.checkIn >= editRes.checkOut) return null;

    return checkBookingConflict(
      editRes.roomId,
      editRes.checkIn,
      editRes.checkOut,
      reservations,
      modal === 'edit' ? editRes.id : null,
    );
  }, [editRes?.roomId, editRes?.checkIn, editRes?.checkOut, reservations, modal, editRes?.id]);

  /* ── Mark rooms unavailable for the selected dates ─────────── */
  const unavailableRoomIds = useMemo(() => {
    if (!editRes?.checkIn || !editRes?.checkOut || editRes.checkIn >= editRes.checkOut)
      return new Set();

    const excludeId = modal === 'edit' ? editRes.id : null;
    const ids = new Set();
    for (const room of rooms) {
      if (checkBookingConflict(room.id, editRes.checkIn, editRes.checkOut, reservations, excludeId).hasConflict) {
        ids.add(room.id);
      }
    }
    return ids;
  }, [editRes?.checkIn, editRes?.checkOut, reservations, modal, editRes?.id]);

  /* ── Availability summary per type ─────────────────────────── */
  const availabilitySummary = useMemo(() => {
    const hasValidDates = editRes?.checkIn && editRes?.checkOut && editRes.checkIn < editRes.checkOut;
    if (!hasValidDates) return null;

    return ROOM_TYPES.map((type) => {
      const typeRooms = rooms.filter((r) => r.type === type);
      const available = typeRooms.filter((r) => !unavailableRoomIds.has(r.id));
      return { type, rooms: typeRooms, available, bookedCount: typeRooms.length - available.length };
    });
  }, [editRes?.checkIn, editRes?.checkOut, unavailableRoomIds, rooms]);

  /* ── Nights + suggested price ──────────────────────────────── */
  const validDates = editRes.checkIn && editRes.checkOut && editRes.checkIn < editRes.checkOut;
  const n = validDates ? nightsBetween(editRes.checkIn, editRes.checkOut) : 0;
  const suggestedPrice =
    validDates && editRes.roomId
      ? (rooms.find((r) => r.id === editRes.roomId)?.basePrice ?? 0) * n
      : 0;

  /* ── Auto-fill price when room + dates change ──────────────── */
  const prevSuggested = useRef(0);
  useEffect(() => {
    if (suggestedPrice > 0 && suggestedPrice !== prevSuggested.current) {
      const currentPrice = Number(editRes.price) || 0;
      // Auto-fill if price is empty OR still matches the previous suggested value
      if (currentPrice === 0 || currentPrice === prevSuggested.current) {
        setEditRes((prev) => ({ ...prev, price: String(suggestedPrice) }));
      }
      prevSuggested.current = suggestedPrice;
    }
  }, [suggestedPrice]);

  /* ── Field updater ─────────────────────────────────────────── */
  const set = (key) => (e) =>
    setEditRes((prev) => ({ ...prev, [key]: e.target.value }));

  /* ── Quick date presets ────────────────────────────────────── */
  const toISO = (d) => d.toISOString().slice(0, 10);
  const quickDates = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    // This weekend: Friday to Sunday
    const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
    const friday = new Date(today);
    friday.setDate(today.getDate() + ((5 - dayOfWeek + 7) % 7 || 7));
    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);

    // Next week: next Monday to next Sunday
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 - dayOfWeek + 7) % 7 || 7));
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    return [
      { label: t.tonight, checkIn: toISO(today), checkOut: toISO(tomorrow) },
      { label: t.tomorrow, checkIn: toISO(tomorrow), checkOut: toISO(dayAfterTomorrow) },
      { label: t.thisWeekend, checkIn: toISO(friday), checkOut: toISO(sunday) },
      { label: t.nextWeek, checkIn: toISO(nextMonday), checkOut: toISO(nextSunday) },
    ];
  })();

  const applyQuickDate = (preset) => {
    setEditRes((prev) => ({ ...prev, checkIn: preset.checkIn, checkOut: preset.checkOut }));
  };

  /* ── Date validation error ─────────────────────────────────── */
  const dateError =
    editRes.checkIn && editRes.checkOut && editRes.checkIn >= editRes.checkOut;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !liveConflict?.hasConflict && !dateError) onSave(); }}>
        {/* Header */}
        <div className="modal-hdr">
          <div className="modal-title">
            {modal === 'add' ? '✨ ' + t.newBooking : '✏️ ' + t.editBooking}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Conflict banner */}
        {liveConflict?.hasConflict && (
          <div className="conflict-banner">
            ⚠️ {t.conflictError}
            <span className="conflict-detail">
              {t.conflictWith}: {liveConflict.conflicting.guestName} (
              {formatShort(liveConflict.conflicting.checkIn, t.months)} →{' '}
              {formatShort(liveConflict.conflicting.checkOut, t.months)})
            </span>
          </div>
        )}

        {/* Date order error */}
        {dateError && (
          <div className="conflict-banner">⚠️ {t.dateOrderError}</div>
        )}

        {/* Quick date presets */}
        <div className="quick-dates">
          <span className="quick-dates-label">⚡ {t.quickDates}:</span>
          {quickDates.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={`quick-date-btn ${editRes.checkIn === preset.checkIn && editRes.checkOut === preset.checkOut ? 'active' : ''}`}
              onClick={() => applyQuickDate(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Dates — moved BEFORE room select so user picks dates first */}
        <div className="form-row">
          <div className="fg">
            <label>📅 {t.checkIn}</label>
            <input type="date" className="fi" value={editRes.checkIn} onChange={set('checkIn')} ref={firstInputRef} />
          </div>
          <div className="fg">
            <label>📅 {t.checkOut}</label>
            <input type="date" className="fi" value={editRes.checkOut} onChange={set('checkOut')} />
          </div>
        </div>

        {/* ── Proactive Availability Panel ── */}
        {availabilitySummary && (
          <div className="avail-panel">
            <div className="avail-panel-hdr">
              <span className="avail-panel-title">🏠 {t.availabilityPreview}</span>
              <span className="avail-panel-stat">
                <span className="avail-free-count">
                  ✓ {rooms.length - unavailableRoomIds.size} {t.free.toLowerCase()}
                </span>
                {unavailableRoomIds.size > 0 && (
                  <span className="avail-booked-count">
                    ⛔ {unavailableRoomIds.size} {t.unavailable}
                  </span>
                )}
              </span>
            </div>
            <div className="avail-types">
              {availabilitySummary.map(({ type, rooms, available, bookedCount }) => (
                <div key={type} className="avail-type-section">
                  <div className="avail-type-label">
                    {TYPE_ICONS[type]} {t.roomType[type]}
                    <span className="avail-type-count">
                      {available.length}/{rooms.length}
                    </span>
                  </div>
                  <div className="avail-room-chips">
                    {rooms.map((room) => {
                      const isBooked = unavailableRoomIds.has(room.id);
                      const isSelected = editRes.roomId === room.id;
                      return (
                        <button
                          key={room.id}
                          type="button"
                          className={`avail-chip ${isBooked ? 'booked' : 'open'} ${isSelected ? 'selected' : ''}`}
                          disabled={isBooked}
                          onClick={() => {
                            if (!isBooked) {
                              setEditRes((prev) => ({ ...prev, roomId: room.id }));
                            }
                          }}
                          title={
                            isBooked
                              ? `⛔ ${room.name} — ${t.unavailable}`
                              : `✓ ${room.name} — ${room.basePrice} ${t.perNight}`
                          }
                        >
                          {room.name.replace(/^(Single|Double|Suite|Family) /, '')}
                          {isBooked && <span className="avail-chip-x">⛔</span>}
                          {isSelected && <span className="avail-chip-check">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="avail-hint">{t.clickRoomToSelect}</div>
          </div>
        )}

        {/* Room select – grouped by type, unavailable rooms disabled */}
        <div className="fg">
          <label>🛏️ {t.room}</label>
          <select className="fi" value={editRes.roomId} onChange={set('roomId')}>
            <option value="">{t.selectRoom}</option>
            {ROOM_TYPES.map((type) => (
              <optgroup key={type} label={`${TYPE_ICONS[type]} ${t.roomType[type]}`}>
                {rooms.filter((r) => r.type === type).map((r) => {
                  const blocked = unavailableRoomIds.has(r.id);
                  return (
                    <option key={r.id} value={r.id} disabled={blocked}>
                      {r.name} · {r.basePrice} {t.perNight}
                      {blocked ? ` ⛔ ${t.unavailable}` : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Guest info */}
        <div className="form-row">
          <div className="fg">
            <label>👤 {t.guestName}</label>
            <input
              className="fi"
              placeholder="Иван Иванов"
              value={editRes.guestName}
              onChange={set('guestName')}
            />
          </div>
          <div className="fg">
            <label>📞 {t.contact}</label>
            <input
              className="fi"
              placeholder={t.contactPlaceholder}
              value={editRes.guestContact}
              onChange={set('guestContact')}
            />
          </div>
        </div>

        {/* Nights hint */}
        {validDates && n > 0 && (
          <div className="nights-hint">
            🌙 {n} {n === 1 ? t.night : t.nights} — {t.suggested}: {suggestedPrice} лв
          </div>
        )}

        {/* Price + Payment */}
        <div className="form-row">
          <div className="fg">
            <label>💰 {t.price}</label>
            <input
              type="number"
              className="fi"
              placeholder="0"
              value={editRes.price}
              onChange={set('price')}
            />
          </div>
          <div className="fg">
            <label>💳 {t.payStatus}</label>
            <select className="fi" value={editRes.paymentStatus} onChange={set('paymentStatus')}>
              {PAY_CYCLE.map((s) => (
                <option key={s} value={s}>
                  {t[s.toLowerCase()] ?? s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="fg">
          <label>📝 {t.notes}</label>
          <textarea
            className="fi"
            rows={3}
            placeholder={t.notesPlaceholder}
            value={editRes.notes}
            onChange={set('notes')}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Footer */}
        <div className="modal-foot">
          <button className="btn btn-outline" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="btn btn-mint"
            onClick={onSave}
            disabled={liveConflict?.hasConflict || dateError}
          >
            {modal === 'add' ? '✨ ' + t.add : '✅ ' + t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
