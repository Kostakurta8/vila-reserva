/* ─── Date & formatting helpers ──────────────────────────────────────────── */

/** Parse a YYYY-MM-DD string into a Date at noon (avoids timezone pitfalls). */
export const toDate = (dateStr) => new Date(dateStr + 'T12:00:00');

/** Return today as YYYY-MM-DD (local timezone, NOT UTC). */
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Add `n` days to a date string, return YYYY-MM-DD (local timezone). */
export const addDays = (dateStr, n) => {
  const d = toDate(dateStr);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Number of nights between two date strings. */
export const nightsBetween = (checkIn, checkOut) =>
  Math.max(0, Math.round((toDate(checkOut) - toDate(checkIn)) / 86_400_000));

/** "05 Март 2026" */
export const formatLong = (dateStr, months) => {
  const d = toDate(dateStr);
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/** "05 Март" */
export const formatShort = (dateStr, months) => {
  const d = toDate(dateStr);
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}`;
};

/** Collision-resistant ID. */
export const generateId = () =>
  'id_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/** Time-of-day greeting. */
export const getGreeting = (t) => {
  const h = new Date().getHours();
  if (h < 12) return t.greet.morning;
  if (h < 18) return t.greet.afternoon;
  return t.greet.evening;
};
