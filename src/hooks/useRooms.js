import { useState, useEffect, useCallback } from 'react';
import { fetchRooms, apiCreateRoom, apiUpdateRoom, apiDeleteRoom } from './useApi';

/**
 * Manages room state via API.
 * Returns rooms array + CRUD operations.
 */
export function useRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Load rooms from API on mount ──────────────────────────── */
  useEffect(() => {
    fetchRooms()
      .then((data) => {
        setRooms(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load rooms:', err);
        setLoading(false);
      });
  }, []);

  /* ── CRUD ──────────────────────────────────────────────────── */
  const addRoom = useCallback(async (data) => {
    const saved = await apiCreateRoom(data);
    setRooms((prev) => [...prev, saved]);
    return saved;
  }, []);

  const updateRoom = useCallback(async (id, data) => {
    const saved = await apiUpdateRoom(id, data);
    setRooms((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    return saved;
  }, []);

  const deleteRoom = useCallback(async (id) => {
    await apiDeleteRoom(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const refreshRooms = useCallback(async () => {
    const data = await fetchRooms();
    setRooms(data);
  }, []);

  return { rooms, loading, addRoom, updateRoom, deleteRoom, refreshRooms };
}
