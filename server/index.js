import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { login, requireAuth } from "./auth.js";
import {
    createReservation,
    createRoom,
    cyclePaymentStatus,
    deleteReservation,
    deleteRoom,
    getAllReservations,
    getAllRooms,
    initDB,
    updateReservation,
    updateRoom,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

/* ── Serve React build in production ─────────────────────────── */
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));

/* ── Auth ────────────────────────────────────────────────────── */
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  const token = login(password);
  if (!token) return res.status(401).json({ error: "Wrong password" });

  res.json({ token });
});

app.get("/api/verify", requireAuth, (_req, res) => {
  res.json({ valid: true });
});

/* ── All API routes below require auth ───────────────────────── */
app.use("/api", requireAuth);

/* ── Rooms ───────────────────────────────────────────────────── */
app.get("/api/rooms", async (_req, res) => {
  try {
    res.json(await getAllRooms());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/rooms", async (req, res) => {
  try {
    const { id, name, type, basePrice } = req.body;
    if (!id || !name?.trim() || !type || basePrice == null) {
      return res
        .status(400)
        .json({ error: "Missing required fields: id, name, type, basePrice" });
    }
    const room = await createRoom(req.body);
    res.status(201).json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/rooms/:id", async (req, res) => {
  try {
    const room = await updateRoom(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: "Room not found" });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/rooms/:id", async (req, res) => {
  const result = await deleteRoom(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: "Room not found" });
  res.json({ success: true });
});

/* ── Reservations ────────────────────────────────────────────── */
app.get("/api/reservations", async (_req, res) => {
  try {
    res.json(await getAllReservations());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/reservations", async (req, res) => {
  try {
    const { id, roomId, guestName, checkIn, checkOut } = req.body;
    if (!id || !roomId || !guestName?.trim() || !checkIn || !checkOut) {
      return res.status(400).json({
        error:
          "Missing required fields: id, roomId, guestName, checkIn, checkOut",
      });
    }
    if (checkIn >= checkOut) {
      return res.status(400).json({ error: "checkOut must be after checkIn" });
    }
    const reservation = await createReservation(req.body);
    res.status(201).json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/reservations/:id", async (req, res) => {
  try {
    const reservation = await updateReservation(req.params.id, req.body);
    if (!reservation)
      return res.status(404).json({ error: "Reservation not found" });
    res.json(reservation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/reservations/:id", async (req, res) => {
  const result = await deleteReservation(req.params.id);
  if (result.changes === 0)
    return res.status(404).json({ error: "Reservation not found" });
  res.json({ success: true });
});

app.patch("/api/reservations/:id/payment", async (req, res) => {
  const updated = await cyclePaymentStatus(req.params.id);
  if (!updated) return res.status(404).json({ error: "Reservation not found" });
  res.json(updated);
});

/* ── SPA fallback (serve index.html for all non-API routes) ─── */
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

/* ── Start ───────────────────────────────────────────────────── */
async function start() {
  console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);

  // Retry DB connection up to 5 times (database may still be provisioning)
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await initDB();
      break;
    } catch (err) {
      console.error(`DB init attempt ${attempt}/5 failed:`, err.message);
      if (attempt === 5) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  app.listen(PORT, () => {
    console.log("");
    console.log("  =============================================");
    console.log(`    Vila Reserva running on port ${PORT}`);
    console.log("  =============================================");
    console.log("");
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
