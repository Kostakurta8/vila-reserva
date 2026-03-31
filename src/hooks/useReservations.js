import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { todayStr, addDays } from '../utils/dateHelpers';
import {
  fetchReservations,
  apiCreateReservation,
  apiUpdateReservation,
  apiDeleteReservation,
  apiCyclePayment,
} from './useApi';

/**
 * Central reservation state: CRUD, derived stats, toast.
 * Persists to SQLite via Express API.
 */
export function useReservations(rooms) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const today = todayStr();

  /* ── Load from API on mount ────────────────────────────────── */
  useEffect(() => {
    fetchReservations()
      .then((data) => {
        setReservations(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load reservations:', err);
        setLoading(false);
      });
  }, []);

  /* ── Toast ─────────────────────────────────────────────────── */
  const showToast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2700);
  }, []);

  const dismissToast = useCallback(() => {
    clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  /* ── Derived: occupancy ────────────────────────────────────── */
  const occupiedIds = useMemo(() => {
    const set = new Set();
    reservations.forEach((r) => {
      if (r.checkIn <= today && r.checkOut > today) set.add(r.roomId);
    });
    return set;
  }, [reservations, today]);

  const roomCount = rooms.length;
  const freeCount = roomCount - occupiedIds.size;
  const occupancyPct = roomCount > 0 ? Math.round((occupiedIds.size / roomCount) * 100) : 0;

  /* ── Derived: today's events ───────────────────────────────── */
  const arrivals = useMemo(
    () => reservations.filter((r) => r.checkIn === today),
    [reservations, today],
  );
  const departures = useMemo(
    () => reservations.filter((r) => r.checkOut === today),
    [reservations, today],
  );

  /* ── Derived: next 7 days ──────────────────────────────────── */
  const upcoming = useMemo(() => {
    const next7 = addDays(today, 7);
    return reservations
      .flatMap((r) => {
        const events = [];
        if (r.checkIn > today && r.checkIn <= next7)
          events.push({ type: 'arrive', res: r, date: r.checkIn });
        if (r.checkOut > today && r.checkOut <= next7)
          events.push({ type: 'depart', res: r, date: r.checkOut });
        return events;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [reservations, today]);

  /* ── Derived: revenue ──────────────────────────────────────── */
  const monthRevenue = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    const start = `${y}-${m}-01`;
    const end = `${y}-${m}-${String(last).padStart(2, '0')}`;
    return reservations
      .filter((r) => r.checkIn >= start && r.checkIn <= end)
      .reduce((sum, r) => sum + (+r.price || 0), 0);
  }, [reservations]);

  const totalRevenue = useMemo(
    () => reservations.reduce((sum, r) => sum + (+r.price || 0), 0),
    [reservations],
  );

  /* ── CRUD (async — calls API) ──────────────────────────────── */
  const addReservation = useCallback(async (data) => {
    const saved = await apiCreateReservation(data);
    setReservations((prev) => [...prev, saved]);
  }, []);

  const updateReservation = useCallback(async (data) => {
    const saved = await apiUpdateReservation(data.id, data);
    setReservations((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
  }, []);

  const deleteReservation = useCallback(async (id) => {
    await apiDeleteReservation(id);
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /* ── Cycle payment status (returns new status) ─────────────── */
  const cyclePayment = useCallback(async (id) => {
    const updated = await apiCyclePayment(id);
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, paymentStatus: updated.paymentStatus } : r)),
    );
    return updated.paymentStatus;
  }, []);

  /* ── Count active reservations on a given date ─────────────── */
  const reservationsOnDate = useCallback(
    (dateStr) => reservations.filter((r) => r.checkIn <= dateStr && r.checkOut > dateStr).length,
    [reservations],
  );

  /* ── Arrivals & departures on a given date ─────────────────── */
  const arrivalsOnDate = useCallback(
    (dateStr) => reservations.filter((r) => r.checkIn === dateStr).length,
    [reservations],
  );
  const departuresOnDate = useCallback(
    (dateStr) => reservations.filter((r) => r.checkOut === dateStr).length,
    [reservations],
  );

  /* ── Get actual reservation objects for a given date ────────── */
  const getReservationsForDate = useCallback(
    (dateStr) => reservations.filter((r) => r.checkIn <= dateStr && r.checkOut > dateStr),
    [reservations],
  );

  return {
    reservations,
    loading,
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
  };
}
