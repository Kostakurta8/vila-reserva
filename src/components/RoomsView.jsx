import { useState, useMemo } from 'react';
import { ROOM_TYPES, TYPE_ICONS, TYPE_COLORS } from '../data/rooms';
import { formatLong } from '../utils/dateHelpers';
import ResRow from './ResRow';

export default function RoomsView({
  t,
  rooms,
  reservations,
  today,
  occupiedIds,
  freeCount,
  occupancyPct,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onCyclePayment,
}) {
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [roomSearch, setRoomSearch] = useState('');
  const [sortRooms, setSortRooms] = useState('name'); // 'name' | 'type' | 'price' | 'status'

  /* ── Filtered rooms ────────────────────────────────────────── */
  const filteredRooms = useMemo(() => {
    let list = [...rooms];
    if (typeFilter !== 'All') list = list.filter((r) => r.type === typeFilter);
    if (statusFilter === 'Available') list = list.filter((r) => !occupiedIds.has(r.id));
    if (statusFilter === 'Occupied') list = list.filter((r) => occupiedIds.has(r.id));
    if (roomSearch.trim()) {
      const q = roomSearch.toLowerCase().trim();
      list = list.filter((r) => {
        const active = reservations.find((res) => res.roomId === r.id && res.checkIn <= today && res.checkOut > today);
        return r.name.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (active?.guestName || '').toLowerCase().includes(q);
      });
    }
    // Sort
    switch (sortRooms) {
      case 'type':
        list.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
        break;
      case 'price':
        list.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'status':
        list.sort((a, b) => {
          const aOcc = occupiedIds.has(a.id) ? 1 : 0;
          const bOcc = occupiedIds.has(b.id) ? 1 : 0;
          return aOcc - bOcc || a.name.localeCompare(b.name);
        });
        break;
      default:
        list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [typeFilter, statusFilter, occupiedIds, rooms, roomSearch, reservations, today, sortRooms]);

  return (
    <>
      {/* ── Header ── */}
      <div className="sec-hdr">
        <div style={{ fontSize: '.88rem', color: 'var(--ink2)' }}>
          <span style={{ color: '#1a7a4a', fontWeight: 900 }}>
            ✓ {freeCount} {t.free.toLowerCase()}
          </span>
          {' · '}
          <span style={{ color: '#c0533a', fontWeight: 900 }}>
            ● {occupiedIds.size} {t.occWord.toLowerCase()}
          </span>
          {' · '}
          <span style={{ color: '#9a6200', fontWeight: 900 }}>
            {occupancyPct}% {t.occupancyRate}
          </span>
        </div>
        <button className="btn btn-primary" onClick={() => onOpenAdd()}>
          + {t.newBooking}
        </button>
      </div>

      {/* ── Search + Sort ── */}
      <div className="search-sort-row">
        <div className="search-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon">🔍</span>
          <input
            placeholder={`${t.searchPlaceholder.replace(t.searchPlaceholder.split(' ').pop(), '')}${t.room.toLowerCase()}, ${t.guestName.toLowerCase()}...`}
            value={roomSearch}
            onChange={(e) => setRoomSearch(e.target.value)}
          />
          {roomSearch && (
            <button className="search-clear" onClick={() => setRoomSearch('')}>✕</button>
          )}
        </div>
        <div className="sort-wrap">
          <label className="sort-label">{t.sortBy}:</label>
          <select className="sort-select" value={sortRooms} onChange={e => setSortRooms(e.target.value)}>
            <option value="name">{t.roomName}</option>
            <option value="type">{t.roomTypeLabel}</option>
            <option value="price">{t.price}</option>
            <option value="status">{t.nav.rooms}</option>
          </select>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="filters">
        {/* Type filter */}
        <div
          className={`fchip ${typeFilter === 'All' ? 'on' : ''}`}
          onClick={() => setTypeFilter('All')}
        >
          {t.allTypes}
        </div>
        {ROOM_TYPES.map((type) => (
          <div
            key={type}
            className={`fchip ${typeFilter === type ? 'on' : ''}`}
            onClick={() => setTypeFilter(type)}
          >
            {TYPE_ICONS[type]} {t.roomType[type]}
          </div>
        ))}

        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />

        {/* Status filter */}
        {['All', 'Available', 'Occupied'].map((s) => (
          <div
            key={s}
            className={`fchip ${statusFilter === s ? 'on' : ''}`}
            onClick={() => setStatusFilter(s)}
            style={
              statusFilter === s
                ? {
                    background:
                      s === 'Available'
                        ? '#dcf5eb'
                        : s === 'Occupied'
                          ? '#ffe5de'
                          : undefined,
                    color:
                      s === 'Available'
                        ? '#1a7a4a'
                        : s === 'Occupied'
                          ? '#c0533a'
                          : undefined,
                    borderColor:
                      s === 'Available'
                        ? '#7ddaab'
                        : s === 'Occupied'
                          ? '#f0a99a'
                          : undefined,
                  }
                : {}
            }
          >
            {s === 'All' ? t.all : s === 'Available' ? t.available : t.occWord}
          </div>
        ))}

        <div className="f-count">
          {filteredRooms.length} {t.roomCount}
        </div>
      </div>

      {/* ── Room Grid ── */}
      <div className="rooms-grid">
        {filteredRooms.map((room) => {
          const occ = occupiedIds.has(room.id);
          const roomRes = reservations.filter((r) => r.roomId === room.id);
          const active = roomRes.find((r) => r.checkIn <= today && r.checkOut > today);
          const tc = TYPE_COLORS[room.type];

          return (
            <div
              key={room.id}
              className={`rc ${occ ? 'occ' : 'free'}`}
              style={
                !occ
                  ? { background: `linear-gradient(135deg,${tc.bg},#fff)`, borderColor: `${tc.accent}55` }
                  : {}
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="rc-name">
                    {room.name} {TYPE_ICONS[room.type]}
                  </div>
                  <div className="rc-type">{t.roomType[room.type]}</div>
                </div>
                <div className="rc-status">
                  {occ ? '●' : '✓'} {occ ? t.occWord : t.free}
                </div>
              </div>

              {active ? (
                <div className="rc-guest">
                  <div className="gn">👤 {active.guestName}</div>
                  <div className="gd">
                    {t.until} {formatLong(active.checkOut, t.months)}
                  </div>
                  {active.guestContact && <div className="gd">{active.guestContact}</div>}
                </div>
              ) : (
                <div className="rc-available-hint">
                  ✓ {t.readyToBook}
                </div>
              )}

              <div className="rc-price">
                {t.basePrice}: {room.basePrice} {t.perNight}
              </div>

              <div style={{ marginTop: 9, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: '.73rem' }}
                  onClick={() => onOpenAdd(room.id)}
                >
                  + {t.book}
                </button>
                {active && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '.71rem' }}
                    onClick={() => onOpenEdit(active)}
                    title={t.editBooking}
                  >
                    ✏️ {t.editBooking}
                  </button>
                )}
                {roomRes.length > 0 && (
                  <span style={{ fontSize: '.71rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                    📋 {roomRes.length} {roomRes.length === 1 ? t.booking : t.bookings}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Active Bookings ── */}
      <div className="card">
        <div className="sec-title">📋 {t.activeBookings}</div>
        {reservations.filter((r) => r.checkOut >= today).length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🌿</div>
            <div className="empty-sub">{t.noActiveBookings}</div>
          </div>
        ) : (
          <div className="res-list">
            {reservations
              .filter((r) => r.checkOut >= today)
              .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
              .map((res) => (
                <ResRow
                  key={res.id}
                  res={res}
                  t={t}
                  rooms={rooms}
                  onEdit={onOpenEdit}
                  onDelete={onDelete}
                  onCyclePayment={onCyclePayment}
                />
              ))}
          </div>
        )}
      </div>
    </>
  );
}
