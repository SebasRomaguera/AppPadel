import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

router.get("/clubs", async (_req, res) => {
  try {
    const clubsResult = await pool.query("SELECT id, name, city FROM clubs ORDER BY name ASC");
    const courtsResult = await pool.query(
      "SELECT id, club_id, name, surface FROM courts ORDER BY club_id, name"
    );

    const clubs = clubsResult.rows.map((club) => ({
      ...club,
      courts: courtsResult.rows.filter((court) => court.club_id === club.id),
    }));

    return res.json({ clubs });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar clubes" });
  }
});

export default router;
