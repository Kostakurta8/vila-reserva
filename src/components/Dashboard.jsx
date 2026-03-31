import { ROOM_TYPES, TYPE_ICONS, TYPE_COLORS } from '../data/rooms';
import { PAY_COLORS } from '../data/theme';
import { formatShort } from '../utils/dateHelpers';
import DayPopup from './DayPopup';
import { useState } from 'react';

export default function Dashboard({
  t,
  rooms,
  reservations,
  today,
  occupiedIds,
  freeCount,
  occupancyPct,
  arrivals,
  departures,
  upcoming,
  monthRevenue,
  totalRevenue,
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
  onViewChange,
}) {
  const { year: cy, month: cm } = calMonth;
  const now = new Date();

  /* ── Day popup state ───────────────────────────────────────── */
  const [dayPopup, setDayPopup] = useState(null); // { dateStr, reservations }

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

  /* ── Room type summary for dashboard ───────────────────────── */
  const typeSummary = ROOM_TYPES.map((type) => {
    const typeRooms = rooms.filter((r) => r.type === type);
    const occCount = typeRooms.filter((r) => occupiedIds.has(r.id)).length;
    return { type, total: typeRooms.length, occupied: occCount, free: typeRooms.length - occCount };
  });

  /* ── Occupied rooms list ───────────────────────────────────── */
  const occupiedRoomsList = rooms.filter((r) => occupiedIds.has(r.id)).map((room) => {
    const active = reservations.find(
      (r) => r.roomId === room.id && r.checkIn <= today && r.checkOut > today,
    );
    return { room, active };
  });

  return (
    <>
      {/* ── Welcome banner (shown when no reservations at all) ── */}
      {reservations.length === 0 && (
        <div className="welcome-banner">
          <div className="welcome-emoji">🏡</div>
          <h2 className="welcome-title">{t.welcomeTitle}</h2>
          <p className="welcome-sub">{t.welcomeSub}</p>
          <button className="btn btn-mint" style={{ marginTop: 14 }} onClick={() => onOpenAdd()}>
            + {t.newBooking}
          </button>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        <div className="sc sage sc-clickable" role="button" tabIndex={0} onClick={() => onViewChange('rooms')} onKeyDown={e => e.key === 'Enter' && onViewChange('rooms')} title={t.viewAll}>
          <span className="sc-emoji">🏡</span>
          <div className="sc-lbl">{t.freeToday}</div>
          <div className="sc-val">{freeCount}</div>
          <div className="sc-sub">
            {t.of} {rooms.length} {t.roomsWord}
          </div>
          <div className="sc-bar">
            <div
              className="sc-fill"
              style={{ width: `${rooms.length ? (freeCount / rooms.length) * 100 : 0}%`, background: '#3aaa78' }}
            />
          </div>
          <span className="sc-link">{t.nav.rooms} →</span>
        </div>
        <div className="sc peach sc-clickable" role="button" tabIndex={0} onClick={() => onViewChange('rooms')} onKeyDown={e => e.key === 'Enter' && onViewChange('rooms')} title={t.viewAll}>
          <span className="sc-emoji">🔑</span>
          <div className="sc-lbl">{t.occupied}</div>
          <div className="sc-val">{occupiedIds.size}</div>
          <div className="sc-sub">
            {occupancyPct}% {t.occupancyRate}
          </div>
          <div className="sc-bar">
            <div className="sc-fill" style={{ width: `${occupancyPct}%`, background: '#e8715a' }} />
          </div>
          <span className="sc-link">{t.nav.rooms} →</span>
        </div>
        <div className="sc sky sc-clickable" role="button" tabIndex={0} onClick={() => onViewChange('calendar')} onKeyDown={e => e.key === 'Enter' && onViewChange('calendar')} title={t.viewAll}>
          <span className="sc-emoji">✈️</span>
          <div className="sc-lbl">{t.arrivalsToday}</div>
          <div className="sc-val">{arrivals.length}</div>
          <div className="sc-sub">
            {departures.length} {t.checkOut2.toLowerCase()}
          </div>
          <span className="sc-link">{t.nav.calendar} →</span>
        </div>
        <div className="sc sand sc-clickable" role="button" tabIndex={0} onClick={() => onViewChange('reservations')} onKeyDown={e => e.key === 'Enter' && onViewChange('reservations')} title={t.viewAll}>
          <span className="sc-emoji">💰</span>
          <div className="sc-lbl">{t.monthRevenue}</div>
          <div className="sc-val">{monthRevenue.toFixed(0)}</div>
          <div className="sc-sub">лв</div>
          <span className="sc-link">{t.nav.reservations} →</span>
        </div>
      </div>

      {/* ── Room Overview + Upcoming ── */}
      <div className="dg2">
        <div className="card">
          <div className="sec-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏠 {t.roomOverview}</span>
            <button className="btn btn-outline btn-sm" onClick={() => onViewChange('rooms')}>
              {t.nav.rooms} →
            </button>
          </div>

          {/* Type breakdown */}
          <div className="type-summary">
            {typeSummary.map(({ type, total, occupied, free }) => {
              const tc = TYPE_COLORS[type];
              return (
                <div key={type} className="type-row">
                  <span className="type-row-icon">{TYPE_ICONS[type]}</span>
                  <span className="type-row-name">{t.roomType[type]}</span>
                  <span className="type-row-count">
                    <span style={{ color: '#1a7a4a', fontWeight: 900 }}>{free}</span>
                    <span style={{ color: 'var(--muted)' }}> / {total}</span>
                  </span>
                  <div className="type-row-bar">
                    <div
                      className="type-row-fill"
                      style={{
                        width: `${(occupied / total) * 100}%`,
                        background: tc.accent,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Occupied rooms list */}
          {occupiedRoomsList.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className="sec-subtitle">{t.occupiedRooms}</div>
              {occupiedRoomsList.map(({ room, active }) => (
                <div key={room.id} className={`occ-item ${active ? 'occ-clickable' : ''}`}
                  role={active ? 'button' : undefined} tabIndex={active ? 0 : undefined}
                  onClick={() => active && onOpenEdit(active)}
                  onKeyDown={e => e.key === 'Enter' && active && onOpenEdit(active)}
                  title={active ? `${t.editBooking}: ${active.guestName}` : ''}
                >
                  <div className="occ-room">
                    <span className="occ-room-name">{room.name}</span>
                    <span className="occ-room-type">{TYPE_ICONS[room.type]}</span>
                  </div>
                  {active && (
                    <div className="occ-guest">
                      <span className="occ-guest-name">👤 {active.guestName}</span>
                      <span className="occ-guest-until">
                        {t.until} {formatShort(active.checkOut, t.months)}
                      </span>
                    </div>
                  )}
                  {active && <span className="occ-edit-hint">✏️</span>}
                </div>
              ))}
            </div>
          )}
          {occupiedRoomsList.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: '.85rem' }}>
              🌿 {t.noOccupied}
            </div>
          )}
        </div>

        <div className="card">
          <div className="sec-title">✈️ {t.next7}</div>
          {arrivals.length === 0 && departures.length === 0 && upcoming.length === 0 ? (
            <div className="empty" style={{ padding: '20px 0' }}>
              <div className="empty-emoji">🌴</div>
              <div className="empty-sub">{t.noUpcoming}</div>
            </div>
          ) : (
            <>
              {[
                ...arrivals.map((r) => ({ type: 'arrive', res: r, date: today })),
                ...departures.map((r) => ({ type: 'depart', res: r, date: today })),
                ...upcoming,
              ].map((e, i) => (
                <div key={i} className="upi upi-clickable" role="button" tabIndex={0}
                  onClick={() => onOpenEdit(e.res)}
                  onKeyDown={ev => ev.key === 'Enter' && onOpenEdit(e.res)}
                  title={`${t.editBooking}: ${e.res.guestName}`}
                >
                  <div className={`upi-dot ${e.type === 'arrive' ? 'arr' : 'dep'}`}>
                    {e.type === 'arrive' ? '✈️' : '🧳'}
                  </div>
                  <div className="upi-info">
                    <div className="upi-name">{e.res.guestName}</div>
                    <div className="upi-sub">
                      {e.type === 'arrive' ? t.checkIn2 : t.checkOut2} ·{' '}
                      {rooms.find((x) => x.id === e.res.roomId)?.name}
                    </div>
                  </div>
                  <div className="upi-date">
                    {e.date === today ? t.today : formatShort(e.date, t.months)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Calendar + Revenue ── */}
      <div className="dg3">
        <div className="card">
          <div className="cal-hdr">
            <div className="cal-month">
              {t.months[cm]} {cy}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={calPrev}>
                ‹
              </button>
              <button
                className="btn btn-outline btn-sm"
                style={{ fontSize: '.74rem' }}
                onClick={() =>
                  setCalMonth({ year: now.getFullYear(), month: now.getMonth() })
                }
              >
                {t.today}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={calNext}>
                ›
              </button>
            </div>
          </div>
          <div className="cal-grid">
            {t.days.map((d) => (
              <div key={d} className="cal-dl">
                {d}
              </div>
            ))}
            {calDays().map((day, i) => {
              const cnt = resOnDay(day);
              const isToday =
                day &&
                cy === now.getFullYear() &&
                cm === now.getMonth() &&
                day === now.getDate();
              const dateStr = day
                ? `${cy}-${String(cm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                : null;
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
                  <span>{day ?? ''}</span>
                  {cnt > 0 && !isToday && <span className="cal-cnt">{cnt}</span>}
                  {day && cnt === 0 && !isToday && <span className="cal-plus-hint">+</span>}
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
          </div>
        </div>

        <div className="card">
          <div className="sec-title">💰 {t.revenueSummary}</div>
          <div style={{ marginBottom: 16 }}>
            <div className="rev-lbl">{t.thisMonth}</div>
            <div className="rev-val big">{monthRevenue.toFixed(2)} лв</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="rev-lbl">{t.allTime}</div>
            <div className="rev-val">{totalRevenue.toFixed(2)} лв</div>
          </div>
          <div className="rev-lbl" style={{ marginBottom: 8 }}>
            {t.paymentBreakdown}
          </div>
          {['Paid', 'Partial', 'Unpaid'].map((s) => {
            const cnt = reservations.filter((r) => r.paymentStatus === s).length;
            const c = PAY_COLORS[s];
            return (
              <div key={s} className="pr">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.83rem' }}>
                  <span className="pr-dot" style={{ background: c.text }} />
                  {t[s.toLowerCase()] ?? s}
                </span>
                <span style={{ fontWeight: 900, fontSize: '.9rem' }}>{cnt}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 16 }}>
            <div className="rev-lbl">{t.totalRes}</div>
            <div className="rev-val" style={{ fontSize: '2.1rem' }}>
              {reservations.length}
            </div>
          </div>
        </div>
      </div>

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
