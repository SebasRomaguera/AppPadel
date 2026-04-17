import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

const createMatchSchema = z.object({
  clubId: z.number().int().positive(),
  courtId: z.number().int().positive(),
  scheduledAt: z.iso.datetime(),
  durationMinutes: z.number().int().min(60).max(180),
  levelMin: z.number().int().min(0).max(6),
  levelMax: z.number().int().min(0).max(6),
  title: z.string().min(3).max(120),
});

router.get("/matches/open", authMiddleware, async (req: AuthRequest, res) => {
  const levelWindow = Number(req.query.levelWindow ?? 1);

  try {
    const userResult = await pool.query("SELECT level FROM users WHERE id = $1", [req.userId]);
    const userLevel = userResult.rows[0]?.level;

    if (typeof userLevel !== "number") {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const result = await pool.query(
      `SELECT
          m.id,
          m.title,
          m.scheduled_at,
          m.duration_minutes,
          m.level_min,
          m.level_max,
          c.name AS club_name,
          ct.name AS court_name,
          u.name AS host_name,
          COUNT(mp.user_id)::int AS current_players
       FROM matches m
       JOIN clubs c ON c.id = m.club_id
       JOIN courts ct ON ct.id = m.court_id
       JOIN users u ON u.id = m.host_user_id
       LEFT JOIN match_players mp ON mp.match_id = m.id
       WHERE m.status = 'open'
         AND m.scheduled_at >= NOW()
         AND ($1 BETWEEN m.level_min - $2 AND m.level_max + $2)
       GROUP BY m.id, c.name, ct.name, u.name
       ORDER BY m.scheduled_at ASC`,
      [userLevel, levelWindow]
    );

    return res.json({ matches: result.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar partidas" });
  }
});

router.post("/matches", authMiddleware, async (req: AuthRequest, res) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos de partida invalidos" });
  }

  const data = parsed.data;
  if (data.levelMin > data.levelMax) {
    return res.status(400).json({ message: "Rango de nivel invalido" });
  }

  try {
    const conflictResult = await pool.query(
      `SELECT id FROM matches
       WHERE court_id = $1
         AND status IN ('open', 'full')
         AND tstzrange(scheduled_at, scheduled_at + (duration_minutes || ' minutes')::interval, '[)')
             && tstzrange($2::timestamptz, $2::timestamptz + ($3 || ' minutes')::interval, '[)')`,
      [data.courtId, data.scheduledAt, data.durationMinutes]
    );

    if (conflictResult.rowCount) {
      return res.status(409).json({ message: "La pista ya esta ocupada en ese horario" });
    }

    const insertResult = await pool.query(
      `INSERT INTO matches (host_user_id, club_id, court_id, scheduled_at, duration_minutes, level_min, level_max, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        req.userId,
        data.clubId,
        data.courtId,
        data.scheduledAt,
        data.durationMinutes,
        data.levelMin,
        data.levelMax,
        data.title,
      ]
    );

    const matchId = insertResult.rows[0].id;
    await pool.query("INSERT INTO match_players (match_id, user_id) VALUES ($1, $2)", [
      matchId,
      req.userId,
    ]);

    return res.status(201).json({ message: "Partida creada", matchId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al crear partida" });
  }
});

router.post("/matches/:id/join", authMiddleware, async (req: AuthRequest, res) => {
  const matchId = Number(req.params.id);
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return res.status(400).json({ message: "ID de partida invalido" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query("SELECT level FROM users WHERE id = $1", [req.userId]);
    const userLevel = userResult.rows[0]?.level;

    const matchResult = await client.query(
      `SELECT m.id, m.level_min, m.level_max, m.status, m.scheduled_at,
              COUNT(mp.user_id)::int AS players
       FROM matches m
       LEFT JOIN match_players mp ON mp.match_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [matchId]
    );

    if (!matchResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Partida no encontrada" });
    }

    const match = matchResult.rows[0];

    if (match.status !== "open") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "La partida ya no esta abierta" });
    }

    if (new Date(match.scheduled_at).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "La partida ya ha comenzado" });
    }

    if (userLevel < match.level_min - 1 || userLevel > match.level_max + 1) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "Tu nivel esta fuera del rango permitido para esta partida" });
    }

    const alreadyJoined = await client.query(
      "SELECT 1 FROM match_players WHERE match_id = $1 AND user_id = $2",
      [matchId, req.userId]
    );

    if (alreadyJoined.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Ya estas apuntado a esta partida" });
    }

    if (match.players >= 4) {
      await client.query("UPDATE matches SET status = 'full' WHERE id = $1", [matchId]);
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "La partida ya esta completa" });
    }

    await client.query("INSERT INTO match_players (match_id, user_id) VALUES ($1, $2)", [
      matchId,
      req.userId,
    ]);

    const updatedPlayers = match.players + 1;
    if (updatedPlayers >= 4) {
      await client.query("UPDATE matches SET status = 'full' WHERE id = $1", [matchId]);
    }

    await client.query("COMMIT");
    return res.json({ message: "Te has unido a la partida" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ message: "Error al unirse a la partida" });
  } finally {
    client.release();
  }
});

export default router;
