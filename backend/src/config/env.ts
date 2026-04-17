import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@localhost:5432/app_padel",
  jwtSecret: process.env.JWT_SECRET ?? "dev_secret",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
};
