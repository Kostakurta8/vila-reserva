import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set! Check Render environment variables.");
  console.error(
    "Available env keys:",
    Object.keys(process.env)
      .filter(
        (k) =>
          k.includes("DATABASE") || k.includes("DB") || k.includes("POSTGRES"),
      )
      .join(", ") || "(none found)",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

/* ── Initialize schema + seed ────────────────────────────────── */
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Single','Double','Suite','Family')),
      "basePrice" REAL NOT NULL DEFAULT 0,
      "sortOrder" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      "roomId" TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      "guestName" TEXT NOT NULL,
      "guestContact" TEXT DEFAULT '',
      "checkIn" TEXT NOT NULL,
      "checkOut" TEXT NOT NULL,
      price REAL DEFAULT 0,
      "paymentStatus" TEXT DEFAULT 'Unpaid' CHECK("paymentStatus" IN ('Unpaid','Partial','Paid')),
      notes TEXT DEFAULT '',
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  /* Seed default rooms if empty */
  const { rows } = await pool.query("SELECT COUNT(*) as count FROM rooms");
  if (parseInt(rows[0].count) === 0) {
    const ROOM_CONFIGS = [
      { count: 8, type: "Single", basePrice: 60 },
      { count: 10, type: "Double", basePrice: 90 },
      { count: 6, type: "Suite", basePrice: 140 },
      { count: 6, type: "Family", basePrice: 120 },
    ];

    let seq = 1;
    for (const cfg of ROOM_CONFIGS) {
      for (let i = 0; i < cfg.count; i++) {
        await pool.query(
          'INSERT INTO rooms (id, name, type, "basePrice", "sortOrder") VALUES ($1, $2, $3, $4, $5)',
          [`r${seq}`, `Стая ${seq}`, cfg.type, cfg.basePrice, seq],
        );
        seq++;
      }
    }
    console.log("  [DB] Seeded 30 default rooms.");
  }
}

/* ── Room queries ────────────────────────────────────────────── */
export const getAllRooms = async () => {
  const { rows } = await pool.query(
    'SELECT id, name, type, "basePrice", "sortOrder" FROM rooms ORDER BY "sortOrder", id',
  );
  return rows;
};

export const getRoom = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, type, "basePrice", "sortOrder" FROM rooms WHERE id = $1',
    [id],
  );
  return rows[0] || null;
};

export const createRoom = async ({ id, name, type, basePrice }) => {
  const { rows } = await pool.query(
    'SELECT COALESCE(MAX("sortOrder"),0) as m FROM rooms',
  );
  await pool.query(
    'INSERT INTO rooms (id, name, type, "basePrice", "sortOrder") VALUES ($1, $2, $3, $4, $5)',
    [id, name, type, basePrice, parseInt(rows[0].m) + 1],
  );
  return getRoom(id);
};

export const updateRoom = async (id, { name, type, basePrice }) => {
  await pool.query(
    'UPDATE rooms SET name = $1, type = $2, "basePrice" = $3 WHERE id = $4',
    [name, type, basePrice, id],
  );
  return getRoom(id);
};

export const deleteRoom = async (id) => {
  const result = await pool.query("DELETE FROM rooms WHERE id = $1", [id]);
  return { changes: result.rowCount };
};

/* ── Reservation queries ─────────────────────────────────────── */
export const getAllReservations = async () => {
  const { rows } = await pool.query(
    'SELECT id, "roomId", "guestName", "guestContact", "checkIn", "checkOut", price, "paymentStatus", notes, "createdAt" FROM reservations ORDER BY "checkIn" DESC',
  );
  return rows;
};

export const getReservation = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, "roomId", "guestName", "guestContact", "checkIn", "checkOut", price, "paymentStatus", notes, "createdAt" FROM reservations WHERE id = $1',
    [id],
  );
  return rows[0] || null;
};

export const createReservation = async (r) => {
  await pool.query(
    `INSERT INTO reservations (id, "roomId", "guestName", "guestContact", "checkIn", "checkOut", price, "paymentStatus", notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      r.id,
      r.roomId,
      r.guestName,
      r.guestContact || "",
      r.checkIn,
      r.checkOut,
      r.price || 0,
      r.paymentStatus || "Unpaid",
      r.notes || "",
    ],
  );
  return getReservation(r.id);
};

export const updateReservation = async (id, r) => {
  await pool.query(
    `UPDATE reservations
     SET "roomId" = $1, "guestName" = $2, "guestContact" = $3, "checkIn" = $4, "checkOut" = $5,
         price = $6, "paymentStatus" = $7, notes = $8
     WHERE id = $9`,
    [
      r.roomId,
      r.guestName,
      r.guestContact || "",
      r.checkIn,
      r.checkOut,
      r.price || 0,
      r.paymentStatus || "Unpaid",
      r.notes || "",
      id,
    ],
  );
  return getReservation(id);
};

export const deleteReservation = async (id) => {
  const result = await pool.query("DELETE FROM reservations WHERE id = $1", [
    id,
  ]);
  return { changes: result.rowCount };
};

export const cyclePaymentStatus = async (id) => {
  const res = await getReservation(id);
  if (!res) return null;
  const cycle = ["Unpaid", "Partial", "Paid"];
  const next = cycle[(cycle.indexOf(res.paymentStatus) + 1) % cycle.length];
  await pool.query(
    'UPDATE reservations SET "paymentStatus" = $1 WHERE id = $2',
    [next, id],
  );
  return { ...res, paymentStatus: next };
};

export default pool;
