import { useState } from 'react';
import ResRow from './ResRow';
import DayPopup from './DayPopup';

export default function CalendarView({
  t,
  rooms,
  reservations,
  today,
  calMonth,
  calPrev,
  calNext,
  setCalMonth,
  reservationsOnDate,
  arrivalsOnDate,
  departuresOnDate,
  getReservationsForDate,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onCyclePayment,
}) {
  const { year: cy, month: cm } = calMonth;
  const now = new Date();

  /* ── Day popup state ───────────────────────────────────────── */
  const [dayPopup, setDayPopup] = useState(null);

  /* ── Calendar cells ────────────────────────────────────────── */
  const calDays = () => {
    const first = (new Date(cy, cm, 1).getDay() + 6) % 7; // Monday = 0
    const total = new Date(cy, cm + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(d);
    return cells;
  };

  const resOnDay = (day) => {
    if (!day) return 0;
    const ds = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reservationsOnDate(ds);
  };

  /* ── Month reservations ────────────────────────────────────── */
  const monthStart = `${cy}-${String(cm + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(cy, cm + 1, 0).getDate();
  const monthEnd = `${cy}-${String(cm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const monthRes = reservations
    .filter((r) => r.checkIn <= monthEnd && r.checkOut >= monthStart)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  return (
    <>
      <div className="card" style={{ maxWidth: 660, marginBottom: 22 }}>
        <div className="cal-hdr">
          <div className="cal-month">
            {t.months[cm]} {cy}
          </div>
          <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm cal-year-btn" onClick={() => setCalMonth({ year: cy - 1, month: cm })} title={cy - 1}>
              «
            </button>
            <button className="btn btn-ghost btn-sm" onClick={calPrev}>
              ‹ {t.months[(cm - 1 + 12) % 12].slice(0, 3)}
            </button>
            <button
              className="btn btn-outline btn-sm cal-today-btn"
              onClick={() => setCalMonth({ year: now.getFullYear(), month: now.getMonth() })}
            >
              ● {t.today}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={calNext}>
              {t.months[(cm + 1) % 12].slice(0, 3)} ›
            </button>
            <button className="btn btn-ghost btn-sm cal-year-btn" onClick={() => setCalMonth({ year: cy + 1, month: cm })} title={cy + 1}>
              »
            </button>
          </div>
        </div>

        <div className="cal-grid" style={{ gap: 5 }}>
          {t.days.map((d) => (
            <div key={d} className="cal-dl">
              {d}
            </div>
          ))}
          {calDays().map((day, i) => {
            const cnt = resOnDay(day);
            const isToday =
              day && cy === now.getFullYear() && cm === now.getMonth() && day === now.getDate();
            const dateStr = day
              ? `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              : null;
            const arrCnt = day ? arrivalsOnDate(dateStr) : 0;
            const depCnt = day ? departuresOnDate(dateStr) : 0;
            return (
              <div
                key={i}
                className={`cal-cell ${
                  !day
                    ? 'empty'
                    : isToday
                      ? 'tod'
                      : cnt > 0
                        ? cnt >= rooms.length
                          ? 'full'
                          : 'has'
                        : 'norm'
                } ${day ? 'clickable' : ''}`}
                style={{ height: 52, aspectRatio: 'unset', borderRadius: 10 }}
                onClick={() => {
                  if (!day) return;
                  if (cnt > 0) {
                    setDayPopup({ dateStr });
                  } else {
                    onOpenAdd(null, dateStr);
                  }
                }}
                title={
                  day
                    ? cnt > 0
                      ? `${cnt} ${cnt === 1 ? t.booking : t.bookings} — ${t.clickToView}`
                      : `${t.newBooking} — ${day} ${t.months[cm]}`
                    : ''
                }
              >
                <span style={{ fontSize: '.86rem' }}>{day ?? ''}</span>
                {cnt > 0 && !isToday && (
                  <span className="cal-cnt">
                    {cnt}🛏️
                  </span>
                )}
                {day && cnt === 0 && !isToday && (
                  <span className="cal-plus-hint">+</span>
                )}
                {day && (arrCnt > 0 || depCnt > 0) && (
                  <span className="cal-indicators">
                    {arrCnt > 0 && <span className="cal-arr-badge" title={t.arrival}>↓{arrCnt}</span>}
                    {depCnt > 0 && <span className="cal-dep-badge" title={t.departure}>↑{depCnt}</span>}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="cal-legend">
          <div className="cal-leg-item">
            <div
              className="cal-leg-dot"
              style={{ background: '#fdeee8', border: '1.5px solid #f0a99a' }}
            />
            {t.partialBookings}
          </div>
          <div className="cal-leg-item">
            <div className="cal-leg-dot" style={{ background: '#e8715a' }} />
            {t.fullyBooked}
          </div>
          <div className="cal-leg-item">
            <div className="cal-leg-dot" style={{ background: '#254d65' }} />
            {t.todayLabel}
          </div>
          <div className="cal-leg-item">
            <span className="cal-arr-badge" style={{ fontSize: '.65rem' }}>↓</span>
            {t.arrival}
          </div>
          <div className="cal-leg-item">
            <span className="cal-dep-badge" style={{ fontSize: '.65rem' }}>↑</span>
            {t.departure}
          </div>
        </div>
      </div>

      <div className="sec-title">
        📋 {t.monthReservations} {t.months[cm]}
      </div>
      {monthRes.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-emoji">🗓️</div>
            <div className="empty-sub">{t.noRes}</div>
          </div>
        </div>
      ) : (
        <div className="res-list">
          {monthRes.map((res) => (
            <ResRow
              key={res.id}
              res={res}
              t={t}
              rooms={rooms}
              today={today}
              onEdit={onOpenEdit}
              onDelete={onDelete}
              onCyclePayment={onCyclePayment}
            />
          ))}
        </div>
      )}

      {/* Day popup */}
      {dayPopup && (
        <DayPopup
          t={t}
          rooms={rooms}
          dateStr={dayPopup.dateStr}
          reservations={getReservationsForDate(dayPopup.dateStr)}
          onClose={() => setDayPopup(null)}
          onOpenEdit={onOpenEdit}
          onOpenAdd={onOpenAdd}
          onCyclePayment={onCyclePayment}
          onDelete={onDelete}
          totalRooms={rooms.length}
        />
      )}
    </>
  );
}
