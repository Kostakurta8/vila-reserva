# Villa Reservation App — Project Instructions

> Bulgarian-first bilingual (BG/EN) hotel/villa reservation management system.
> React 18 SPA + Express 5 REST API + SQLite persistent storage.
> Single-user local desktop app — no authentication, no deployment.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:5173)                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  React 18.3.1 SPA (Vite 6.x dev server)               │  │
│  │  No router — view switching via state in App.jsx       │  │
│  │  No CSS framework — custom CSS in styles.css           │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ fetch(/api/*)                     │
│                          │ Vite proxy → localhost:3001       │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  Express 5.2.1 REST API (port 3001)                    │  │
│  │  CORS enabled · JSON body parser                       │  │
│  │  Input validation on POST routes                       │  │
│  │  try-catch on all route handlers                       │  │
│  └───────────────────────┬────────────────────────────────┘  │
│                          │ better-sqlite3 (synchronous)      │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │  SQLite Database (data/villa.db)                       │  │
│  │  WAL mode · Foreign keys ON · ON DELETE CASCADE        │  │
│  │  Auto-created on first run · 30 rooms seeded           │  │
│  │  Expired reservations cleaned up each server start     │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

Dev runner: `concurrently` starts both servers via `npm run dev`
Windows:    `start.bat` checks Node, installs deps, opens browser
```

---

## 2. Project Structure (every file explained)

```
reservation-app/
├── package.json            # "type": "module" — ESM only, no CommonJS
├── vite.config.js          # React plugin + /api proxy → localhost:3001
├── index.html              # SPA entry point, mounts #root
├── start.bat               # Windows launcher: Node check, npm install, open browser
├── copilot-instructions.md # This file
│
├── server/
│   ├── index.js            # Express app: 10 REST routes, validation, error handling
│   └── db.js               # SQLite schema, seed logic, exported query functions
│
├── data/
│   └── villa.db            # SQLite database file (auto-created, gitignored)
│
└── src/
    ├── main.jsx            # ReactDOM.createRoot → <App />
    ├── App.jsx             # Root component: ALL state, ALL handlers, view routing
    ├── styles.css          # Complete CSS — no framework, no preprocessor
    │
    ├── components/
    │   ├── Dashboard.jsx       # Main view: 4 stat cards, room overview, upcoming events,
    │   │                       #   mini calendar, revenue summary, day popup
    │   ├── RoomsView.jsx       # Room grid: type/status filters, occupancy badges,
    │   │                       #   active bookings list
    │   ├── ReservationsView.jsx# Searchable reservation list: payment filters, print,
    │   │                       #   text export
    │   ├── CalendarView.jsx    # Full calendar page: arrival/departure indicators,
    │   │                       #   month reservation list, day popup
    │   ├── BookingModal.jsx    # Add/Edit modal: date-first flow, live availability panel,
    │   │                       #   conflict detection, auto-price, grouped room select
    │   ├── RoomManagement.jsx  # Settings page: room CRUD form, rooms grouped by type,
    │   │                       #   edit/delete per room
    │   ├── DayPopup.jsx        # Overlay popup: shows reservations for a clicked calendar day,
    │   │                       #   pay badge cycling, quick-add button
    │   ├── ResRow.jsx          # Reusable reservation row: room badge, guest info, dates,
    │   │                       #   price, pay badge, edit/delete/excel actions
    │   ├── PayBadge.jsx        # Clickable payment status badge (Unpaid → Partial → Paid)
    │   ├── Sidebar.jsx         # Left navigation: 5 views, BG/EN toggle, room count,
    │   │                       #   hamburger menu on mobile (<768px)
    │   └── Topbar.jsx          # Top bar: view title, greeting + date, "+ New Booking" button,
    │                           #   hamburger trigger
    │
    ├── hooks/
    │   ├── useReservations.js  # Central hook: CRUD, derived stats (occupancy, arrivals,
    │   │                       #   departures, upcoming, revenue), toast system
    │   ├── useRooms.js         # Room hook: CRUD + refresh
    │   └── useApi.js           # Thin fetch wrapper: base path /api, throws on non-OK,
    │                           #   Content-Type: application/json
    │
    ├── data/
    │   ├── rooms.js            # ROOM_TYPES array, TYPE_ICONS emoji map, TYPE_COLORS map
    │   ├── theme.js            # PAY_CYCLE array, PAY_COLORS map (bg/text/border per status)
    │   └── translations.js     # LANG object: ~100 keys each for bg & en
    │
    └── utils/
        ├── dateHelpers.js      # todayStr, addDays, toDate, nightsBetween, formatLong,
        │                       #   formatShort, generateId, getGreeting
        ├── validation.js       # checkBookingConflict (overlap detection), validateBooking
        └── excelExport.js      # downloadReservationExcel — per-reservation .xlsx via SheetJS
```

---

## 3. Database Schema

```sql
CREATE TABLE rooms (
  id        TEXT PRIMARY KEY,            -- e.g. 'r1', 'r2', 'rm_id_abc123'
  name      TEXT NOT NULL,               -- e.g. 'Стая 1'
  type      TEXT NOT NULL                -- constrained: 'Single'|'Double'|'Suite'|'Family'
            CHECK(type IN ('Single','Double','Suite','Family')),
  basePrice REAL NOT NULL DEFAULT 0,     -- price per night in лв (BGN)
  sortOrder INTEGER NOT NULL DEFAULT 0   -- display order (auto-increment on creation)
);

CREATE TABLE reservations (
  id            TEXT PRIMARY KEY,        -- client-generated via generateId()
  roomId        TEXT NOT NULL,           -- FK → rooms.id
  guestName     TEXT NOT NULL,
  guestContact  TEXT DEFAULT '',         -- phone or email
  checkIn       TEXT NOT NULL,           -- 'YYYY-MM-DD'
  checkOut      TEXT NOT NULL,           -- 'YYYY-MM-DD'
  price         REAL DEFAULT 0,          -- total price in лв
  paymentStatus TEXT DEFAULT 'Unpaid'    -- constrained: 'Unpaid'|'Partial'|'Paid'
                CHECK(paymentStatus IN ('Unpaid','Partial','Paid')),
  notes         TEXT DEFAULT '',
  createdAt     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
);
```

### Seed Data (30 rooms on first run)
| Type   | Count | IDs     | Base Price |
|--------|-------|---------|------------|
| Single | 8     | r1–r8   | 60 лв      |
| Double | 10    | r9–r18  | 90 лв      |
| Suite  | 6     | r19–r24 | 140 лв     |
| Family | 6     | r25–r30 | 120 лв     |

### Database Behaviors
- **WAL mode** — concurrent reads during writes
- **Foreign keys ON** — enforced at runtime
- **ON DELETE CASCADE** — deleting a room deletes all its reservations
- **Expired cleanup** — on each server start, reservations with `checkOut < today` (local timezone) are deleted
- **No migrations** — schema created via `CREATE TABLE IF NOT EXISTS`
- **File location** — `data/villa.db` (directory auto-created)

---

## 4. REST API Reference

All endpoints are prefixed with `/api`. Request/response bodies are JSON.

### Rooms

| Method | Path | Description | Required Fields | Response |
|--------|------|-------------|-----------------|----------|
| `GET` | `/api/rooms` | List all rooms (sorted by sortOrder) | — | `Room[]` |
| `POST` | `/api/rooms` | Create a room | `id`, `name`, `type`, `basePrice` | `Room` (201) |
| `PUT` | `/api/rooms/:id` | Update a room | `name`, `type`, `basePrice` | `Room` |
| `DELETE` | `/api/rooms/:id` | Delete room + cascade reservations | — | `{ success: true }` |

### Reservations

| Method | Path | Description | Required Fields | Response |
|--------|------|-------------|-----------------|----------|
| `GET` | `/api/reservations` | List all (sorted by checkIn DESC) | — | `Reservation[]` |
| `POST` | `/api/reservations` | Create a reservation | `id`, `roomId`, `guestName`, `checkIn`, `checkOut` | `Reservation` (201) |
| `PUT` | `/api/reservations/:id` | Update a reservation | All reservation fields | `Reservation` |
| `DELETE` | `/api/reservations/:id` | Delete a reservation | — | `{ success: true }` |
| `PATCH` | `/api/reservations/:id/payment` | Cycle: Unpaid → Partial → Paid → Unpaid | — | `Reservation` |

### Validation Rules (server-side)
- `POST /api/rooms` — rejects if `id`, `name`, `type`, or `basePrice` is missing
- `POST /api/reservations` — rejects if `id`, `roomId`, `guestName`, `checkIn`, or `checkOut` is missing; rejects if `checkIn >= checkOut`
- All routes return `{ error: "message" }` on failure with appropriate HTTP status (400/404/500)

### Error Response Shape
```json
{ "error": "Missing required fields: id, roomId, guestName, checkIn, checkOut" }
```

---

## 5. Frontend Architecture

### State Management Pattern
```
App.jsx (root)
  ├── useReservations(rooms) → reservations, derived stats, CRUD, toast
  ├── useRooms() → rooms, CRUD
  ├── modal state (null | 'add' | 'edit')
  ├── editRes state (form data object)
  ├── view state ('dashboard' | 'rooms' | 'reservations' | 'calendar' | 'settings')
  ├── lang state ('bg' | 'en')
  ├── filter/search state for ReservationsView
  ├── calMonth state { year, month } for calendar navigation
  └── sidebarOpen state (mobile hamburger)
```

**All state lives in App.jsx.** No Context API, no Redux, no Zustand. Props are drilled to child components. This is intentional for a small single-page app.

### View Routing (no react-router)
```jsx
// App.jsx - view switching via state
const [view, setView] = useState('dashboard');
// Renders: Dashboard | RoomsView | ReservationsView | CalendarView | RoomManagement
```

### Component Props Contract (key components)

**Dashboard** — receives everything: `t, rooms, reservations, today, occupiedIds, freeCount, occupancyPct, arrivals, departures, upcoming, monthRevenue, totalRevenue, calMonth, calPrev, calNext, setCalMonth, reservationsOnDate, arrivalsOnDate, departuresOnDate, getReservationsForDate, onOpenAdd, onOpenEdit, onDelete, onCyclePayment, onViewChange`

**BookingModal** — receives: `t, rooms, modal ('add'|'edit'), editRes, setEditRes, reservations, onSave, onClose`

**ResRow** — receives: `res, t, rooms, onEdit, onDelete, onCyclePayment, showActions (default true)`

**RoomManagement** — receives: `t, rooms, onAdd, onUpdate, onDelete, showToast`

### Hooks

**`useReservations(rooms)`** returns:
- Data: `reservations`, `loading`, `today`
- Derived: `occupiedIds` (Set), `freeCount`, `occupancyPct`, `arrivals`, `departures`, `upcoming`, `monthRevenue`, `totalRevenue`
- CRUD: `addReservation(data)`, `updateReservation(data)`, `deleteReservation(id)`, `cyclePayment(id)`
- Query: `reservationsOnDate(dateStr)` → count, `arrivalsOnDate(dateStr)` → count, `departuresOnDate(dateStr)` → count, `getReservationsForDate(dateStr)` → Reservation[]
- Toast: `toast`, `showToast(msg)`

**`useRooms()`** returns:
- `rooms`, `loading`, `addRoom(data)`, `updateRoom(id, data)`, `deleteRoom(id)`, `refreshRooms()`

**`useApi.js`** — thin wrapper:
```javascript
const BASE = '/api';
async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) throw new Error(err.error || 'API error');
  return res.json();
}
```

### Modal Flow
1. User clicks "+ New Booking" or a room's "Book" button → `openAdd(roomId?, checkInDate?)`
2. `editRes` is initialized with defaults (empty or pre-filled roomId/date)
3. User fills form in BookingModal → dates first, then availability panel shows, then room select
4. `saveRes()` validates → checks conflicts → calls `addReservation` or `updateReservation` → closes modal → shows toast
5. Editing: User clicks ✏️ on ResRow → `openEdit(res)` → same modal with pre-filled data

### Availability Panel (BookingModal)
When both check-in and check-out dates are selected and valid:
- Groups all rooms by type (Single/Double/Suite/Family)
- Shows available vs. total count per type
- Renders clickable chips for each room — green if available, red ⛔ if booked
- Clicking a chip selects that room
- Updates in real-time as dates change

### Conflict Detection (validation.js)
```
Two date ranges [A, B) and [C, D) overlap iff A < D AND C < B
```
- Used in BookingModal for live conflict warning banner
- Used in `saveRes()` to prevent double-booking
- When editing, the current reservation is excluded from conflict check via `excludeId`

---

## 6. Date Handling — Critical Rules

### ALWAYS use local timezone, NEVER use UTC
```javascript
// ✅ CORRECT — local timezone
todayStr() → manual formatting with getFullYear/getMonth/getDate

// ❌ WRONG — UTC can give wrong date near midnight in Bulgaria (UTC+2/3)
new Date().toISOString().slice(0, 10)
```

### Date Functions (dateHelpers.js)
| Function | Purpose | Note |
|----------|---------|------|
| `todayStr()` | Today as `YYYY-MM-DD` | Local timezone |
| `addDays(dateStr, n)` | Add n days | Returns `YYYY-MM-DD`, local |
| `toDate(dateStr)` | Parse to Date object | Parses at `T12:00:00` to avoid DST edge cases |
| `nightsBetween(checkIn, checkOut)` | Number of nights | `Math.round(diff / 86400000)` |
| `formatLong(dateStr, months)` | `"05 Март 2026"` | Uses translation month names |
| `formatShort(dateStr, months)` | `"05 Март"` | No year |
| `generateId()` | Unique ID | `'id_' + random + timestamp` (base36) |
| `getGreeting(t)` | Time-based greeting | morning/afternoon/evening with emoji |

### Calendar Convention
- **Weeks start on Monday** (ISO 8601 / Bulgarian standard)
- Day offset: `(new Date(year, month, 1).getDay() + 6) % 7`
- `t.days` array: `['Пон','Вт','Ср','Чет','Пет','Съб','Нед']` / `['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`
- Calendar has arrival (↓) and departure (↑) indicators on each day

---

## 7. Translation System

### Structure
```javascript
// translations.js
const LANG = {
  bg: { appName: 'Вила Резерва', nav: { dashboard: 'Табло', ... }, ... },
  en: { appName: 'Vila Reserva', nav: { dashboard: 'Dashboard', ... }, ... },
};
```

### Usage Pattern
```jsx
const [lang, setLang] = useState('bg');
const t = LANG[lang];
// In JSX:
<div>{t.appName}</div>
<div>{t.nav.dashboard}</div>
<div>{t.roomType.Single}</div>      // 'Единична' in BG
<div>{t[status.toLowerCase()]}</div> // dynamic key: t.unpaid, t.partial, t.paid
```

### Rules
1. **Every user-visible string** must use a translation key — no hardcoded text in components
2. **Both languages must have identical key structure** — if you add a key to `bg`, add it to `en` too
3. **Nested keys**: `nav.*`, `roomType.*`, `greet.*` — access via dot notation on `t`
4. **Dynamic keys**: Payment status uses `t[res.paymentStatus.toLowerCase()]`
5. **Month/day arrays**: `t.months[index]`, `t.days[index]` — used by date formatters
6. **Singular/plural**: Use `n === 1 ? t.night : t.nights` pattern (no i18n library)
7. **Emoji in translations**: Greeting values include emoji (e.g., `'Добро утро! ☀️'`)

### Key Categories (~100 keys per language)
- `nav.*` — 5 navigation labels
- `roomType.*` — 4 room type names (Single/Double/Suite/Family)
- `greet.*` — 3 time-of-day greetings
- Payment: `unpaid`, `partial`, `paid`
- Form labels: `guestName`, `contact`, `checkIn`, `checkOut`, `price`, `notes`, etc.
- Actions: `newBooking`, `editBooking`, `save`, `cancel`, `add`, `deleteConfirm`, etc.
- Empty states: `noRes`, `noResDesc`, `noActiveBookings`, `noUpcoming`, `noOccupied`, etc.
- Room management: `addRoom`, `editRoom`, `deleteRoom`, `saveRoom`, `confirmDeleteRoom`, etc.

---

## 8. Styling & CSS Architecture

### NO framework — pure CSS in `src/styles.css`
- Custom properties for colors: `--bg`, `--ink`, `--ink2`, `--muted`, `--border`, `--card-bg`, etc.
- Font: `'Inter', 'Segoe UI', system-ui, sans-serif` for body; `'Cormorant Garamond', serif` for headings
- Layout: CSS Grid for main layout (sidebar + content), Flexbox for components
- Responsive: `@media (max-width: 768px)` — sidebar becomes overlay, hamburger menu appears

### CSS Class Naming Convention (abbreviated)
| Prefix | Component | Examples |
|--------|-----------|---------|
| `.sb-*` | Sidebar | `.sb`, `.sb-logo`, `.sb-nav`, `.sb-lang`, `.sb-foot` |
| `.nav-*` | Navigation items | `.nav-btn`, `.nav-icon`, `.nav-btn.active` |
| `.topbar*` | Top bar | `.topbar`, `.topbar-title`, `.topbar-sub`, `.topbar-right` |
| `.sc*` | Stat cards | `.sc`, `.sc-emoji`, `.sc-lbl`, `.sc-val`, `.sc-sub`, `.sc-bar`, `.sc-fill` |
| `.sc.*` | Stat card colors | `.sc.sage`, `.sc.peach`, `.sc.sky`, `.sc.sand` |
| `.cal-*` | Calendar | `.cal-grid`, `.cal-cell`, `.cal-dl`, `.cal-hdr`, `.cal-cnt`, `.cal-legend` |
| `.cal-cell.*` | Calendar cell state | `.tod`, `.has`, `.full`, `.norm`, `.empty`, `.clickable` |
| `.rc*` | Room cards | `.rc`, `.rc.occ`, `.rc.free`, `.rc-name`, `.rc-type`, `.rc-guest`, `.rc-price` |
| `.rr*` | Reservation row | `.rr`, `.room-badge`, `.rg` (guest), `.rd` (dates), `.rp` (price), `.ra` (actions) |
| `.rm-*` | Room management | `.rm-form`, `.rm-group`, `.rm-item`, `.rm-list` |
| `.avail-*` | Availability panel | `.avail-panel`, `.avail-chip`, `.avail-chip.booked`, `.avail-chip.selected` |
| `.day-popup*` | Day popup | `.day-popup`, `.day-popup-hdr`, `.day-popup-item`, `.day-popup-list` |
| `.btn*` | Buttons | `.btn-primary`, `.btn-mint`, `.btn-outline`, `.btn-ghost`, `.btn-danger`, `.btn-sm`, `.btn-icon` |
| `.fchip` | Filter chips | `.fchip`, `.fchip.on` |
| `.pay-badge` | Payment badge | styled inline via `PAY_COLORS` |

### Color System
```
Stat cards:   sage (#f0f7e8), peach (#ffe5de), sky (#e8f4ff), sand (#fff7e6)
Room types:   Single (#e8f4ff/#5ba3d4), Double (#f0f7e8/#6aaa3a),
              Suite (#fff7e6/#d4922a), Family (#f4e8ff/#9a5ad4)
Payment:      Unpaid (#ffe5de/#c0533a), Partial (#fff3dc/#9a6200), Paid (#dcf5eb/#1a7a4a)
Calendar:     Today (#254d65), Partial (#fdeee8), Full (#e8715a)
UI accents:   Primary (#254d65), Mint (#2a9d6e), Danger (#dc3545)
```

### Responsive Breakpoints
- `≥769px` — sidebar always visible (240px width), content fills remaining space
- `≤768px` — sidebar hidden, slides in from left when hamburger is clicked, overlay backdrop

### Print Styles
- `@media print` — hides sidebar, topbar, action buttons; shows `.print-hdr`
- Used by ReservationsView's "Print" button (`window.print()`)

---

## 9. Room & Payment Type System

### Room Types (must stay in sync everywhere)
```javascript
// src/data/rooms.js — static config
ROOM_TYPES = ['Single', 'Double', 'Suite', 'Family'];

// server/db.js — SQL CHECK constraint
CHECK(type IN ('Single','Double','Suite','Family'))

// src/data/translations.js — display names
t.roomType.Single → 'Единична' / 'Single'
t.roomType.Double → 'Двойна' / 'Double'
t.roomType.Suite  → 'Апартамент' / 'Suite'
t.roomType.Family → 'Фамилна' / 'Family'
```

**If you add a new room type**, update ALL THREE locations plus `TYPE_ICONS` and `TYPE_COLORS` in rooms.js.

### Payment Status Cycle
```
Unpaid → Partial → Paid → Unpaid (wraps around)
```
- Triggered by clicking the PayBadge component
- Server-side: `PATCH /api/reservations/:id/payment` reads current status, advances, saves
- Client-side: `cyclePayment(id)` in useReservations updates local state after API call
- Colors defined in `theme.js` → `PAY_COLORS`

---

## 10. ID Generation

### Room IDs
- **Seeded rooms**: `r1` through `r30` (sequential)
- **User-created rooms**: `rm_` + `generateId()` (e.g., `rm_id_abc123def456`)

### Reservation IDs
- Always: `generateId()` → `id_` + 7 random base36 chars + timestamp base36
- Example: `id_o5apq6vmm9mnnf8`
- Generated client-side before POST

---

## 11. Error Handling Strategy

### Frontend (3 layers)
1. **useApi.js** — throws `Error` with server error message on non-OK responses
2. **Hooks** (useReservations/useRooms) — `async` CRUD functions propagate errors up
3. **App.jsx handlers** — `try-catch` wraps every user action, shows toast with emoji prefix:
   - Success: `✅ Added`, `✏️ Saved`, `🗑️ Deleted`, `💳 Paid`
   - Error: `❌ Error message`

### Backend (2 layers)
1. **Route handlers** — all wrapped in `try-catch`, return `{ error }` with 400/404/500
2. **Input validation** — POST routes check required fields before touching DB

### Toast System
- Managed in `useReservations` hook
- `showToast(msg)` sets message, auto-clears after 2700ms
- Rendered as fixed-position `.toast` div in App.jsx

---

## 12. Export Features

### Text Export (.txt)
- Triggered from ReservationsView toolbar
- Exports the currently filtered reservation list (respects search + payment filter)
- Format: header → separator → one line per reservation → separator → total
- Filename: `rezervacii_YYYY-MM-DD.txt`

### Excel Export (.xlsx)
- Per-reservation — triggered from ResRow's 📥 button
- Uses SheetJS (`xlsx` package v0.18.5)
- Single sheet with formatted fields: room, guest, contact, dates, nights, price, payment, notes
- Filename: `{GuestName}_{CheckIn}.xlsx` (sanitized, max 30 chars)

---

## 13. Build & Dev Commands

```bash
# Development (starts both servers)
npm run dev          # concurrently "node server/index.js" "vite"

# Individual servers
npm run server       # Express API only (port 3001)
npm run client       # Vite dev server only (port 5173)

# Production
npm run build        # vite build → dist/
npm run preview      # vite preview → serves dist/

# Windows quick start
start.bat            # Checks Node.js, installs deps, starts servers, opens browser
```

### Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM rendering |
| express | 5.2.1 | REST API server (v5 — async error handling) |
| better-sqlite3 | 12.6.2 | SQLite driver (synchronous, native) |
| cors | 2.8.6 | CORS middleware |
| xlsx | 0.18.5 | Excel export (SheetJS) |
| vite | 6.x | Dev server + bundler |
| @vitejs/plugin-react | 4.3.4 | React Fast Refresh |
| concurrently | 9.2.1 | Run API + Vite in parallel |

---

## 14. Critical Rules for Contributors

### DO
- Use `todayStr()` and `addDays()` from dateHelpers for all date operations
- Use translation keys (`t.keyName`) for ALL user-visible text
- Wrap all async user actions in try-catch with toast feedback
- Include dependencies in `useMemo`/`useCallback` dependency arrays
- Keep `ROOM_TYPES` in rooms.js, translations.js, and db.js CHECK constraint in sync
- Use `toDate(dateStr)` (parses at noon) instead of `new Date(dateStr)` for date math
- Test with Bulgarian timezone (UTC+2/3) — dates can shift near midnight with UTC
- Add both BG and EN translations when adding any new UI text
- Use ESM (`import`/`export`) everywhere — package.json has `"type": "module"`

### DON'T
- Don't use `new Date().toISOString().slice(0, 10)` for today's date — it's UTC
- Don't use `localStorage` — all data is persisted via SQLite through the API
- Don't add routing (react-router) — the app uses simple state-based view switching
- Don't hardcode English strings in components — always use `t.*`
- Don't create Date objects from `YYYY-MM-DD` without the `T12:00:00` suffix
- Don't store Date objects in state or DB — always use `YYYY-MM-DD` strings
- Don't forget to add `rooms` to `useMemo` dependency arrays when filtering/mapping rooms
- Don't use CommonJS (`require`/`module.exports`) — the project is ESM only
- Don't add authentication — this is a single-user local desktop app

### Currency
- Bulgarian Lev (лв / BGN) — symbol is `лв`, appended after the number
- Price field is `REAL` in SQLite, displayed as `{price} лв` in UI
- No currency formatting library — simple template literal

### Occupancy Logic
```
A room is "occupied" on a date if ANY reservation has:
  reservation.checkIn <= date AND reservation.checkOut > date

This means:
  - checkIn date = guest is IN the room (counted as occupied)
  - checkOut date = guest is LEAVING (room is NOT counted as occupied)
  - Date range is [checkIn, checkOut) — half-open interval
```

---

## 15. File-by-File Quick Reference

### server/db.js — Exported Functions
```
getAllRooms()                      → Room[]
getRoom(id)                       → Room | undefined
createRoom({id, name, type, basePrice}) → Room
updateRoom(id, {name, type, basePrice}) → Room
deleteRoom(id)                    → { changes: number }

getAllReservations()               → Reservation[]
getReservation(id)                → Reservation | undefined
createReservation(r)              → Reservation
updateReservation(id, r)          → Reservation
deleteReservation(id)             → { changes: number }
cyclePaymentStatus(id)            → Reservation | null
```

### src/utils/validation.js — Exported Functions
```
checkBookingConflict(roomId, checkIn, checkOut, reservations, excludeId?)
  → { hasConflict: boolean, conflicting: Reservation | null }

validateBooking(data)
  → { valid: boolean, errors: string[] }
  Checks: roomId, guestName, checkIn, checkOut, dateOrder
```

### src/data/rooms.js — Exported Constants
```
ROOM_TYPES  = ['Single', 'Double', 'Suite', 'Family']
TYPE_ICONS  = { Single: '🛏️', Double: '🛏️🛏️', Suite: '🌟', Family: '👨‍👩‍👧' }
TYPE_COLORS = { Single: {bg, accent}, Double: {bg, accent}, Suite: {bg, accent}, Family: {bg, accent} }
```

### src/data/theme.js — Exported Constants
```
PAY_CYCLE  = ['Unpaid', 'Partial', 'Paid']
PAY_COLORS = {
  Unpaid:  { bg: '#ffe5de', text: '#c0533a', border: '#f0a99a' },
  Partial: { bg: '#fff3dc', text: '#9a6200', border: '#f5cc7a' },
  Paid:    { bg: '#dcf5eb', text: '#1a7a4a', border: '#7ddaab' },
}
```

---

## 16. Known Limitations

- **No authentication** — anyone with access to the machine can use the app
- **No multi-user** — single SQLite database, no concurrency control beyond WAL
- **No backup** — the SQLite file at `data/villa.db` should be backed up manually
- **No pagination** — all rooms and reservations are loaded into memory at once
- **No server-side conflict detection** — double-booking prevention is client-side only
- **Expired reservations deleted** — reservations with `checkOut < today` are purged on server start; there is no archive/history
- **No PropTypes** — React prop validation is not enforced (ESLint warnings exist but are informational)
- **Currency hardcoded** — Bulgarian Lev (лв) only, no multi-currency support
- **No tests** — no unit, integration, or E2E tests exist
