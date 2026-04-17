import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

const reservationSchema = z.object({
  clubId: z.number().int().positive(),
  courtId: z.number().int().positive(),
  startsAt: z.iso.datetime(),
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

export default router;
