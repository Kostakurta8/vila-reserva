/* ─── Booking validation & conflict detection ────────────────────────────── */

/**
 * Check whether booking `roomId` from `checkIn` to `checkOut` would overlap
 * with any existing reservation.
 *
 * Two date ranges [A, B) and [C, D) overlap iff A < D AND C < B.
 *
 * @param {string}      roomId
 * @param {string}      checkIn   – YYYY-MM-DD
 * @param {string}      checkOut  – YYYY-MM-DD
 * @param {Array}       reservations
 * @param {string|null} excludeId – skip this reservation (for editing)
 * @returns {{ hasConflict: boolean, conflicting: object|null }}
 */
export function checkBookingConflict(roomId, checkIn, checkOut, reservations, excludeId = null) {
  const conflict = reservations.find((r) => {
    if (r.id === excludeId) return false;
    if (r.roomId !== roomId) return false;
    return r.checkIn < checkOut && r.checkOut > checkIn;
  });

  return {
    hasConflict: !!conflict,
    conflicting: conflict ?? null,
  };
}

/**
 * Validate required fields + date order.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBooking(data) {
  const errors = [];

  if (!data.roomId) errors.push('room');
  if (!data.guestName?.trim()) errors.push('guestName');
  if (!data.checkIn) errors.push('checkIn');
  if (!data.checkOut) errors.push('checkOut');

  if (data.checkIn && data.checkOut && data.checkIn >= data.checkOut) {
    errors.push('dateOrder');
  }

  return { valid: errors.length === 0, errors };
}
