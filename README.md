# AppPadel

Aplicacion fullstack para gestion de reservas de pistas y partidas de padel.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Base de datos: PostgreSQL
- Contenedores: Docker + Docker Compose

## Funcionalidades actuales

- Registro e inicio de sesion con JWT
- Quiz inicial para calcular nivel de juego (0 a 6)
- Busqueda de partidas abiertas por nivel similar
- Unirse a partidas abiertas
- Crear partidas abiertas
- Reservar pista individual

## Arranque rapido

```bash
cd /home/sebas/AppPadel
docker compose up --build
```

Frontend: http://localhost:5173

Backend: http://localhost:4000/api
