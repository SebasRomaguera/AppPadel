/**
 * AppPadel Backend Server
 * RESTful API para gestión de reservas de pistas de pádel
 * 
 * Stack: Express.js + TypeScript + PostgreSQL
 * Autenticación: JWT
 * 
 * Endpoints principales:
 * - POST /api/auth/register - Registro de usuario
 * - POST /api/auth/login - Inicio de sesión
 * - GET /api/matches/open - Listado de partidas abiertas
 * - POST /api/matches - Crear nueva partida
 * - POST /api/reservations - Crear reserva de pista
 */

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { pool } from "./db/pool";
import authRoutes from "./routes/auth";
import matchRoutes from "./routes/matches";
import reservationRoutes from "./routes/reservations";
import clubRoutes from "./routes/clubs";

const app = express();

// Middlewares de seguridad
app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());

/**
 * Health check endpoint
 * Verifica que el servidor y la base de datos estén operativos
 */
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api", clubRoutes);
app.use("/api", matchRoutes);
app.use("/api", reservationRoutes);

app.use((_req, res) => {
  return res.status(404).json({ message: "Ruta no encontrada" });
});

app.listen(env.port, () => {
  console.log(`API escuchando en puerto ${env.port}`);
});
