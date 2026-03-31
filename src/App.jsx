import { useCallback, useEffect, useMemo, useState } from "react";
import LANG from "./data/translations";
import { apiLogin, apiLogout, apiVerifyToken } from "./hooks/useApi";
import { useReservations } from "./hooks/useReservations";
import { useRooms } from "./hooks/useRooms";
import {
    formatLong,
    formatShort,
    generateId,
    nightsBetween,
} from "./utils/dateHelpers";
import { checkBookingConflict, validateBooking } from "./utils/validation";

import BookingModal from "./components/BookingModal";
import CalendarView from "./components/CalendarView";
import ConfirmDialog from "./components/ConfirmDialog";
import Dashboard from "./components/Dashboard";
import LoginScreen from "./components/LoginScreen";
import ReservationsView from "./components/ReservationsView";
import RoomManagement from "./components/RoomManagement";
import RoomsView from "./components/RoomsView";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

export default function App() {
  /* ── Auth state ────────────────────────────────────────────── */
  const [authed, setAuthed] = useState(null); // null = checking, true/false
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    apiVerifyToken().then((valid) => setAuthed(valid));
  }, []);

  // Listen for forced logout (401 from API)
  useEffect(() => {
    const handler = () => setAuthed(false);
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, []);

  const handleLogin = useCallback(async (password) => {
    await apiLogin(password);
    setAuthed(true);
    setAuthError("");
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setAuthed(false);
  }, []);

  // Show loading while checking token
  if (authed === null) {
    return (
      <div className="login-screen">
        <div className="login-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!authed) {
    return <LoginScreen onLogin={handleLogin} error={authError} />;
  }

  return <AppContent onLogout={handleLogout} />;
}

function AppContent({ onLogout }) {
  /* ── Language & view ───────────────────────────────────────── */
  const [lang, setLang] = useState("bg");
  const t = LANG[lang];
  const [view, setView] = useState("dashboard");

  /* ── Mobile sidebar state ──────────────────────────────────── */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  /* ── Global keyboard shortcuts ─────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      // Ignore if typing in an input/textarea/select
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        openAdd();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  /* ── Scroll to top on view change ──────────────────────────── */
  useEffect(() => {
    const contentEl = document.querySelector(".content");
    if (contentEl) contentEl.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  /* ── Rooms from API ────────────────────────────────────────── */
  const {
    rooms,
    loading: roomsLoading,
    addRoom,
    updateRoom: updateRoomApi,
    deleteRoom: deleteRoomApi,
  } = useRooms();

  /* ── Reservation state (from hook) ─────────────────────────── */
  const {
    reservations,
    loading: resLoading,
    today,
    toast,
    showToast,
    dismissToast,
    occupiedIds,
    freeCount,
    occupancyPct,
    arrivals,
    departures,
    upcoming,
    monthRevenue,
    totalRevenue,
    addReservation,
    updateReservation,
    deleteReservation,
    cyclePayment,
    reservationsOnDate,
    arrivalsOnDate,
    departuresOnDate,
    getReservationsForDate,
  } = useReservations(rooms);

  /* ── Modal state ───────────────────────────────────────────── */
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [editRes, setEditRes] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, guestName, roomName }

  const openAdd = useCallback((roomId, checkInDate) => {
    setEditRes({
      roomId: roomId || "",
      guestName: "",
      guestContact: "",
      checkIn: checkInDate || "",
      checkOut: "",
      price: "",
      paymentStatus: "Unpaid",
      notes: "",
    });
    setModal("add");
  }, []);

  const openEdit = useCallback((res) => {
    setEditRes({ ...res });
    setModal("edit");
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setEditRes(null);
  }, []);

  const saveRes = useCallback(async () => {
    /* Validate required fields */
    const { valid, errors } = validateBooking(editRes);
    if (!valid) {
      if (errors.includes("dateOrder")) {
        showToast("❌ " + t.dateOrderError);
      } else {
        showToast("❌ " + t.fillRequired);
      }
      return;
    }

    /* Check for double-booking conflict */
    const { hasConflict, conflicting } = checkBookingConflict(
      editRes.roomId,
      editRes.checkIn,
      editRes.checkOut,
      reservations,
      modal === "edit" ? editRes.id : null,
    );

    if (hasConflict) {
      showToast(
        `❌ ${t.conflictError} (${conflicting.guestName}: ${formatShort(conflicting.checkIn, t.months)} → ${formatShort(conflicting.checkOut, t.months)})`,
      );
      return;
    }

    /* Save */
    try {
      if (modal === "add") {
        await addReservation({ ...editRes, id: generateId() });
        showToast("✅ " + t.add);
      } else {
        await updateReservation(editRes);
        showToast("✏️ " + t.save);
      }
      closeModal();
    } catch (err) {
      showToast("❌ " + (err.message || t.fillRequired));
    }
  }, [
    editRes,
    modal,
    reservations,
    t,
    showToast,
    addReservation,
    updateReservation,
    closeModal,
  ]);

  /* ── Delete handler ────────────────────────────────────────── */
  const requestDelete = useCallback(
    (id) => {
      const res = reservations.find((r) => r.id === id);
      const room = rooms.find((r) => r.id === res?.roomId);
      setConfirmDelete({
        id,
        guestName: res?.guestName || "?",
        roomName: room?.name || "?",
      });
    },
    [reservations, rooms],
  );

  const confirmDeleteAction = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await deleteReservation(confirmDelete.id);
      showToast("🗑️ " + t.deleted);
    } catch (err) {
      showToast("❌ " + (err.message || "Error"));
    }
    setConfirmDelete(null);
  }, [confirmDelete, deleteReservation, showToast, t]);

  const handleDelete = requestDelete;

  /* ── Payment cycle with toast ──────────────────────────────── */
  const handleCyclePayment = useCallback(
    async (id) => {
      try {
        const newStatus = await cyclePayment(id);
        if (newStatus) {
          showToast(`💳 ${t[newStatus.toLowerCase()] ?? newStatus}`);
        }
      } catch (err) {
        showToast("❌ " + (err.message || "Error"));
      }
    },
    [cyclePayment, showToast, t],
  );

  /* ── Reservations filter (for ReservationsView) ────────────── */
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("dateDesc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFilter, setTimeFilter] = useState("all"); // 'all' | 'active' | 'past'

  const filteredRes = useMemo(() => {
    let list = [...reservations];

    // Time filter (active = checkOut >= today, past = checkOut < today)
    if (timeFilter === "active") list = list.filter((r) => r.checkOut >= today);
    if (timeFilter === "past") list = list.filter((r) => r.checkOut < today);

    // Payment status filter
    if (filterStatus !== "All")
      list = list.filter((r) => r.paymentStatus === filterStatus);

    // Date range filter
    if (dateFrom) list = list.filter((r) => r.checkIn >= dateFrom);
    if (dateTo) list = list.filter((r) => r.checkIn <= dateTo);

    // Search (guest name, contact, AND room name)
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((r) => {
        const room = rooms.find((x) => x.id === r.roomId);
        return (
          r.guestName.toLowerCase().includes(q) ||
          (r.guestContact || "").toLowerCase().includes(q) ||
          (room?.name || "").toLowerCase().includes(q)
        );
      });
    }

    // Sort
    switch (sortBy) {
      case "dateAsc":
        list.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        break;
      case "guest":
        list.sort((a, b) => a.guestName.localeCompare(b.guestName));
        break;
      case "price":
        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case "room":
        list.sort((a, b) => {
          const ra = rooms.find((x) => x.id === a.roomId)?.name || "";
          const rb = rooms.find((x) => x.id === b.roomId)?.name || "";
          return ra.localeCompare(rb);
        });
        break;
      default: // dateDesc
        list.sort((a, b) => b.checkIn.localeCompare(a.checkIn));
    }

    return list;
  }, [
    reservations,
    filterStatus,
    search,
    sortBy,
    dateFrom,
    dateTo,
    timeFilter,
    rooms,
    today,
  ]);

  /* ── Calendar state ────────────────────────────────────────── */
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const calPrev = useCallback(
    () =>
      setCalMonth((p) => {
        const d = new Date(p.year, p.month - 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),
    [],
  );

  const calNext = useCallback(
    () =>
      setCalMonth((p) => {
        const d = new Date(p.year, p.month + 1);
        return { year: d.getFullYear(), month: d.getMonth() };
      }),
    [],
  );

  /* ── Export ─────────────────────────────────────────────────── */
  const handleExport = useCallback(() => {
    const lines = [
      `${t.exportTitle} ${t.appName}`,
      `${t.exportGenerated}: ${new Date().toLocaleDateString()}`,
      `${t.totalRes}: ${filteredRes.length}`,
      "─".repeat(62),
      ...filteredRes.map((r) => {
        const room = rooms.find((x) => x.id === r.roomId);
        const n = nightsBetween(r.checkIn, r.checkOut);
        return `${room?.name ?? "?"} | ${r.guestName} | ${formatLong(r.checkIn, t.months)} → ${formatLong(r.checkOut, t.months)} (${n} ${n === 1 ? t.night : t.nights}) | ${r.price} лв | ${t[r.paymentStatus.toLowerCase()] ?? r.paymentStatus}`;
      }),
      "─".repeat(62),
      `${t.allTime}: ${totalRevenue} лв`,
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezervacii_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📄 " + t.exportBtn);
  }, [filteredRes, t, totalRevenue, showToast, rooms]);

  /* ── Render ────────────────────────────────────────────────── */
  const loading = roomsLoading || resLoading;

  return (
    <>
      <div className="app">
        <Sidebar
          t={t}
          lang={lang}
          setLang={setLang}
          view={view}
          setView={(v) => {
            setView(v);
            closeSidebar();
          }}
          rooms={rooms}
          open={sidebarOpen}
          onClose={closeSidebar}
          arrivals={arrivals.length}
          freeCount={freeCount}
          activeResCount={
            reservations.filter((r) => r.checkOut >= today).length
          }
          onLogout={onLogout}
        />
        {sidebarOpen && (
          <div
            className="sb-overlay"
            onClick={closeSidebar}
            onKeyDown={closeSidebar}
            role="presentation"
          />
        )}

        <div className="main">
          <Topbar
            t={t}
            view={view}
            lang={lang}
            onNewBooking={() => openAdd()}
            onToggleSidebar={toggleSidebar}
            freeCount={freeCount}
            occupiedCount={occupiedIds.size}
            arrivalsCount={arrivals.length}
          />

          <div className="content" key={view}>
            {loading ? (
              <div
                className="card"
                style={{ textAlign: "center", padding: 60 }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
                <div>{t.loading}</div>
              </div>
            ) : (
              <>
                {view === "dashboard" && (
                  <Dashboard
                    t={t}
                    rooms={rooms}
                    reservations={reservations}
                    today={today}
                    occupiedIds={occupiedIds}
                    freeCount={freeCount}
                    occupancyPct={occupancyPct}
                    arrivals={arrivals}
                    departures={departures}
                    upcoming={upcoming}
                    monthRevenue={monthRevenue}
                    totalRevenue={totalRevenue}
                    calMonth={calMonth}
                    calPrev={calPrev}
                    calNext={calNext}
                    setCalMonth={setCalMonth}
                    reservationsOnDate={reservationsOnDate}
                    arrivalsOnDate={arrivalsOnDate}
                    departuresOnDate={departuresOnDate}
                    getReservationsForDate={getReservationsForDate}
                    onOpenAdd={openAdd}
                    onOpenEdit={openEdit}
                    onDelete={handleDelete}
                    onCyclePayment={handleCyclePayment}
                    onViewChange={setView}
                  />
                )}

                {view === "rooms" && (
                  <RoomsView
                    t={t}
                    rooms={rooms}
                    reservations={reservations}
                    today={today}
                    occupiedIds={occupiedIds}
                    freeCount={freeCount}
                    occupancyPct={occupancyPct}
                    onOpenAdd={openAdd}
                    onOpenEdit={openEdit}
                    onDelete={handleDelete}
                    onCyclePayment={handleCyclePayment}
                  />
                )}

                {view === "reservations" && (
                  <ReservationsView
                    t={t}
                    rooms={rooms}
                    reservations={reservations}
                    filteredRes={filteredRes}
                    search={search}
                    setSearch={setSearch}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    dateFrom={dateFrom}
                    setDateFrom={setDateFrom}
                    dateTo={dateTo}
                    setDateTo={setDateTo}
                    timeFilter={timeFilter}
                    setTimeFilter={setTimeFilter}
                    today={today}
                    totalRevenue={totalRevenue}
                    calMonth={calMonth}
                    onOpenAdd={openAdd}
                    onOpenEdit={openEdit}
                    onDelete={handleDelete}
                    onCyclePayment={handleCyclePayment}
                    onExport={handleExport}
                  />
                )}

                {view === "calendar" && (
                  <CalendarView
                    t={t}
                    rooms={rooms}
                    reservations={reservations}
                    today={today}
                    calMonth={calMonth}
                    calPrev={calPrev}
                    calNext={calNext}
                    setCalMonth={setCalMonth}
                    reservationsOnDate={reservationsOnDate}
                    arrivalsOnDate={arrivalsOnDate}
                    departuresOnDate={departuresOnDate}
                    getReservationsForDate={getReservationsForDate}
                    onOpenAdd={openAdd}
                    onOpenEdit={openEdit}
                    onDelete={handleDelete}
                    onCyclePayment={handleCyclePayment}
                  />
                )}

                {view === "settings" && (
                  <RoomManagement
                    t={t}
                    rooms={rooms}
                    onAdd={addRoom}
                    onUpdate={updateRoomApi}
                    onDelete={deleteRoomApi}
                    showToast={showToast}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && editRes && (
        <BookingModal
          t={t}
          rooms={rooms}
          modal={modal}
          editRes={editRes}
          setEditRes={setEditRes}
          reservations={reservations}
          onSave={saveRes}
          onClose={closeModal}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button className="toast-close" onClick={dismissToast}>
            ✕
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <ConfirmDialog
          t={t}
          title={t.confirmDeleteTitle}
          message={t.confirmDeleteMsg}
          detail={t.confirmDeleteGuestInfo
            .replace("{guest}", confirmDelete.guestName)
            .replace("{room}", confirmDelete.roomName)}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
