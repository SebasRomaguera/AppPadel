import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

const reservationSchema = z.object({
  clubId: z.number().int().positive(),
  courtId: z.number().int().positive(),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(60).max(180),
});

router.post("/reservations", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = reservationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos de reserva invalidos" });
  }

  const data = parsed.data;

  try {
    const conflictWithReservation = await pool.query(
      `SELECT id FROM reservations
       WHERE court_id = $1
         AND tstzrange(starts_at, starts_at + (duration_minutes || ' minutes')::interval, '[)')
             && tstzrange($2::timestamptz, $2::timestamptz + ($3 || ' minutes')::interval, '[)')`,
      [data.courtId, data.startsAt, data.durationMinutes]
    );

    const conflictWithMatch = await pool.query(
      `SELECT id FROM matches
       WHERE court_id = $1
         AND status IN ('open', 'full')
         AND tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval, '[)')
             && tstzrange($2::timestamptz, $2::timestamptz + ($3 || ' minutes')::interval, '[)')`,
      [data.courtId, data.startsAt, data.durationMinutes]
    );

    if (conflictWithReservation.rowCount || conflictWithMatch.rowCount) {
      return res.status(409).json({ message: "La pista no esta disponible en ese horario" });
    }

    await pool.query(
      `INSERT INTO reservations (user_id, club_id, court_id, starts_at, duration_minutes)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.userId, data.clubId, data.courtId, data.startsAt, data.durationMinutes]
    );

    return res.status(201).json({ message: "Reserva creada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear reserva" });
  }
});

router.get("/reservations", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT
          r.id,
          r.starts_at,
          r.duration_minutes,
          r.created_at,
          c.name AS club_name,
          c.city AS club_city,
          ct.name AS court_name,
          ct.surface AS court_surface
       FROM reservations r
       JOIN clubs c ON c.id = r.club_id
       JOIN courts ct ON ct.id = r.court_id
       WHERE r.user_id = $1
       ORDER BY r.starts_at ASC`,
      [req.userId]
    );

    return res.json({ reservations: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar reservas" });
  }
});

router.delete("/reservations/:id", authMiddleware, async (req: AuthRequest, res) => {
  const reservationId = Number(req.params.id);

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ message: "ID de reserva invalido" });
  }

  try {
    const result = await pool.query(
      "DELETE FROM reservations WHERE id = $1 AND user_id = $2 RETURNING id",
      [reservationId, req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Reserva no encontrada" });
    }

    return res.json({ message: "Reserva cancelada correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cancelar reserva" });
  }
});

export default router;
