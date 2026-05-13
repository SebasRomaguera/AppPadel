import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Interfaz extendida de Request para incluir userId después de autenticar
 */
export interface AuthRequest extends Request {
  userId?: number;
}

/**
 * Middleware de autenticación con JWT
 * 
 * Valida que la petición incluya un token Bearer válido en el header Authorization.
 * Si es válido, extrae el userId y lo adjunta a req.userId para uso posterior.
 * 
 * @param req - Request de Express (con header Authorization esperado)
 * @param res - Response de Express
 * @param next - Función next para continuar con el siguiente middleware
 * 
 * @returns 401 si no hay token o es inválido, next() si es válido
 * 
 * Ejemplo de uso en rutas:
 * router.get("/me", authMiddleware, handler)
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: number };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalido" });
  }
}
