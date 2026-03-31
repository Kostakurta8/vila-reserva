/* ── API client for Express backend ──────────────────────────── */

const BASE = "/api";

function getToken() {
  return localStorage.getItem("auth_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    window.dispatchEvent(new Event("auth:logout"));
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "API error");
  }
  return res.json();
}

/* ── Auth ────────────────────────────────────────────────────── */
export const apiLogin = async (password) => {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error || "Login failed");
  }
  const data = await res.json();
  localStorage.setItem("auth_token", data.token);
  return data;
};

export const apiVerifyToken = async () => {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${BASE}/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const apiLogout = () => {
  localStorage.removeItem("auth_token");
};

/* ── Rooms ───────────────────────────────────────────────────── */
export const fetchRooms = () => request("/rooms");

export const apiCreateRoom = (room) =>
  request("/rooms", { method: "POST", body: JSON.stringify(room) });

export const apiUpdateRoom = (id, data) =>
  request(`/rooms/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const apiDeleteRoom = (id) =>
  request(`/rooms/${id}`, { method: "DELETE" });

/* ── Reservations ────────────────────────────────────────────── */
export const fetchReservations = () => request("/reservations");

export const apiCreateReservation = (res) =>
  request("/reservations", { method: "POST", body: JSON.stringify(res) });

export const apiUpdateReservation = (id, data) =>
  request(`/reservations/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const apiDeleteReservation = (id) =>
  request(`/reservations/${id}`, { method: "DELETE" });

export const apiCyclePayment = (id) =>
  request(`/reservations/${id}/payment`, { method: "PATCH" });
