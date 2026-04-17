import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool";
import { calculateSkill } from "../services/quiz";
import { env } from "../config/env";
import { authMiddleware, type AuthRequest } from "../middleware/auth";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(6).max(100),
  quizAnswers: z.array(z.number()).min(6).max(12),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(100),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Datos de registro invalidos" });
  }

  const { name, email, password, quizAnswers } = parsed.data;
  const { score, level } = calculateSkill(quizAnswers);

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount) {
      return res.status(409).json({ message: "Este correo ya esta registrado" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, level, skill_score)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, level, skill_score`,
      [name, email, passwordHash, level, score]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: "7d" });

    return res.status(201).json({ token, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al registrar usuario" });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Credenciales invalidas" });
  }

  const { email, password } = parsed.data;

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, level, skill_score FROM users WHERE email = $1 AND is_fake = false",
      [email]
    );

    if (!result.rowCount) {
      return res.status(401).json({ message: "Email o password incorrectos" });
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({ message: "Email o password incorrectos" });
    }

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: "7d" });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level,
        skill_score: user.skill_score,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al iniciar sesion" });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, level, skill_score FROM users WHERE id = $1",
      [req.userId]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error al cargar perfil" });
  }
});

export default router;
