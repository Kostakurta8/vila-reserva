export default function Sidebar({
  t,
  lang,
  setLang,
  view,
  setView,
  rooms,
  open,
  onClose,
  arrivals,
  freeCount,
  activeResCount,
  onLogout,
}) {
  const navItems = [
    { id: "dashboard", icon: "📊" },
    {
      id: "rooms",
      icon: "🏠",
      badge: freeCount > 0 ? freeCount : null,
      badgeColor: "#1a7a4a",
    },
    {
      id: "reservations",
      icon: "📋",
      badge: activeResCount > 0 ? activeResCount : null,
      badgeColor: "#5ba3d4",
    },
    {
      id: "calendar",
      icon: "📅",
      badge: arrivals > 0 ? arrivals : null,
      badgeColor: "#e8715a",
    },
    { id: "settings", icon: "⚙️" },
  ];

  return (
    <aside className={`sb ${open ? "open" : ""}`}>
      <div className="sb-logo">
        <div className="sb-logo-icon">🏡</div>
        <h1>{t.appName}</h1>
        <span>{t.appSub}</span>
        <button className="sb-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sb-lang">
        {["bg", "en"].map((l) => (
          <button
            key={l}
            className={`lb ${lang === l ? "on" : "off"}`}
            onClick={() => setLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <nav className="sb-nav">
        {navItems.map((n) => (
          <div
            key={n.id}
            className={`nav-btn ${view === n.id ? "active" : ""}`}
            onClick={() => {
              setView(n.id);
              onClose();
            }}
          >
            <span className="nav-icon">{n.icon}</span>
            {t.nav[n.id]}
            {n.badge != null && (
              <span className="nav-badge" style={{ background: n.badgeColor }}>
                {n.badge}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Quick stats footer */}
      <div className="sb-foot">
        <div className="sb-quick-stats">
          <div className="sb-stat">
            <span className="sb-stat-val" style={{ color: "#3aaa78" }}>
              {freeCount}
            </span>
            <span className="sb-stat-lbl">{t.free}</span>
          </div>
          <div className="sb-stat-divider" />
          <div className="sb-stat">
            <span className="sb-stat-val" style={{ color: "#e8715a" }}>
              {rooms.length - freeCount}
            </span>
            <span className="sb-stat-lbl">{t.occWord}</span>
          </div>
          <div className="sb-stat-divider" />
          <div className="sb-stat">
            <span className="sb-stat-val" style={{ color: "#5ba3d4" }}>
              {rooms.length}
            </span>
            <span className="sb-stat-lbl">{t.roomsWord}</span>
          </div>
        </div>
        {onLogout && (
          <button className="sb-logout" onClick={onLogout} title="Logout">
            🚪 {lang === "bg" ? "Изход" : "Logout"}
          </button>
        )}
      </div>
    </aside>
  );
}
