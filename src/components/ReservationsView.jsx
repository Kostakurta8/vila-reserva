import ResRow from './ResRow';

export default function ReservationsView({
  t,
  rooms,
  reservations,
  filteredRes,
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  sortBy,
  setSortBy,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  timeFilter,
  setTimeFilter,
  today,
  totalRevenue,
  calMonth,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onCyclePayment,
  onExport,
}) {
  const hasActiveFilters = filterStatus !== 'All' || dateFrom || dateTo || search.trim() || timeFilter !== 'all';

  const clearAll = () => {
    setFilterStatus('All');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setTimeFilter('all');
    setSortBy('dateDesc');
  };

  return (
    <>
      {/* Print header (visible only when printing) */}
      <div className="print-hdr">
        <h2
          style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: '1.5rem',
            marginBottom: 3,
          }}
        >
          {t.appName} — {t.nav.reservations}
        </h2>
        <p style={{ fontSize: '.81rem', color: '#666' }}>
          {t.exportGenerated}: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* ── Time filter tabs (All / Active / Past) ── */}
      <div className="time-tabs">
        {[
          { key: 'all', label: t.allRes, count: reservations.length },
          { key: 'active', label: t.activeRes, count: reservations.filter(r => r.checkOut >= today).length },
          { key: 'past', label: t.pastRes, count: reservations.filter(r => r.checkOut < today).length },
        ].map(tab => (
          <button
            key={tab.key}
            className={`time-tab ${timeFilter === tab.key ? 'on' : ''}`}
            onClick={() => setTimeFilter(tab.key)}
          >
            {tab.label}
            <span className="time-tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Search + Sort row ── */}
      <div className="search-sort-row">
        <div className="search-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <span className="search-icon">🔍</span>
          <input
            placeholder={`${t.searchPlaceholder} ${t.sortRoom.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div className="sort-wrap">
          <label className="sort-label">{t.sortBy}:</label>
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="dateDesc">{t.sortDateDesc}</option>
            <option value="dateAsc">{t.sortDateAsc}</option>
            <option value="guest">{t.sortGuest}</option>
            <option value="price">{t.sortPrice}</option>
            <option value="room">{t.sortRoom}</option>
          </select>
        </div>
      </div>

      {/* ── Date range + Payment filter row ── */}
      <div className="filter-row">
        <div className="date-range-wrap">
          <div className="date-range-field">
            <label>{t.dateFrom}</label>
            <input type="date" className="fi fi-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <span className="date-range-sep">→</span>
          <div className="date-range-field">
            <label>{t.dateTo}</label>
            <input type="date" className="fi fi-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="filters" style={{ marginBottom: 0 }}>
          {['All', 'Unpaid', 'Partial', 'Paid'].map((s) => (
            <div
              key={s}
              className={`fchip ${filterStatus === s ? 'on' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s === 'All' ? t.all : t[s.toLowerCase()] ?? s}
            </div>
          ))}
        </div>
      </div>

      {/* ── Results bar ── */}
      <div className="results-bar">
        <div className="f-count" style={{ marginLeft: 0 }}>
          {filteredRes.length} {t.results}
          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm clear-btn" onClick={clearAll}>
              ✕ {t.clearFilters}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.print()}
          >
            🖨️ {t.printBtn}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onExport}>
            ⬇️ {t.exportBtn}
          </button>
        </div>
      </div>

      {/* Reservation list */}
      {filteredRes.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-emoji">{hasActiveFilters ? '🔍' : '📋'}</div>
            <div className="empty-title">{hasActiveFilters ? t.noResultsFound : t.noRes}</div>
            <div className="empty-sub">{hasActiveFilters ? t.adjustFilters : t.noResDesc}</div>
            {hasActiveFilters ? (
              <button className="btn btn-outline" onClick={clearAll}>
                ✕ {t.clearFilters}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => onOpenAdd()}>
                + {t.newBooking}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="res-list">
          {filteredRes.map((res) => (
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
    </>
  );
}
