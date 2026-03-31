/* ─── Room Configuration ─────────────────────────────────────────────────────
   Static room type config. Actual room list comes from the database via API.
──────────────────────────────────────────────────────────────────────────────*/

export const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Family'];

export const TYPE_ICONS = {
  Single: '🛏️',
  Double: '🛏️🛏️',
  Suite: '🌟',
  Family: '👨‍👩‍👧',
};

export const TYPE_COLORS = {
  Single: { bg: '#e8f4ff', accent: '#5ba3d4' },
  Double: { bg: '#f0f7e8', accent: '#6aaa3a' },
  Suite:  { bg: '#fff7e6', accent: '#d4922a' },
  Family: { bg: '#f4e8ff', accent: '#9a5ad4' },
};
