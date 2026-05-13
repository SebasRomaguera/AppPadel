# AppPadel

Plataforma completa para gestión de reservas y partidas de pádel. Permite a jugadores registrarse, evaluar su nivel mediante un quiz interactivo, buscar partidas de nivel similar y reservar pistas.

## Stack

Frontend: React 19.2.4 + TypeScript 6.0 + Vite 8.0.4
Backend: Node.js + TypeScript 6.0 + Express 5.2.1
Base de datos: PostgreSQL 16 (Docker)
Contenedores: Docker + Docker Compose
Seguridad: JWT, bcryptjs, Helmet.js, CORS
Validación: Zod 4.3.6


## Características

- ✓ Autenticación JWT segura (7 días de validez)
- ✓ Quiz de 8 preguntas para calcular nivel (0-6)
- ✓ Búsqueda inteligente de partidas con filtrado por nivel (levelWindow: ±1 a ±3)
- ✓ Crear y unirse a partidas abiertas (máx 4 jugadores)
- ✓ Reservar pistas individuales en clubes
- ✓ Validación de datos con Zod
- ✓ Transacciones SQL para evitar race conditions
- ✓ Contraseñas hasheadas con bcrypt
- Reservar pista individual
## Estructura del Proyecto

```
.
├── backend/                    # API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/            # Variables de entorno
│   │   ├── db/                # Pool de conexión PostgreSQL
│   │   ├── middleware/        # Autenticación JWT
│   │   ├── routes/            # Endpoints (auth, clubs, matches, reservations)
│   │   ├── services/          # Lógica de negocio (quiz)
│   │   ├── types/             # TypeScript types
│   │   └── server.ts          # Entrada principal
│   ├── db/
│   │   └── init.sql           # Schema y datos iniciales
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # UI (React + TypeScript + Vite)
│   ├── src/
│   │   ├── App.tsx            # Componente principal
│   │   ├── main.tsx           # Entrada React
│   │   └── assets/
│   ├── public/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml         # Orquestación de servicios
├── API.md                      # Documentación de endpoints
├── README.md                   # Este archivo
└── memoria_proyecto.tex        # Documentación del proyecto
```

## Inicio Rápido

### Requisitos
- Docker
- Docker Compose

### Pasos
## Arranque rapido

```bash
cd /home/sebas/AppPadel
docker compose up --build
```


**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api

### Usuarios de Prueba

| Email | Contraseña | Nivel |
|-------|-----------|-------|
| user1@test.com | password1 | 0 |
| user2@test.com | password2 | 3 |
| user3@test.com | password3 | 6 |

## API

Ver documentación completa en [API.md](./API.md)

Endpoints principales:
- `POST /auth/register` - Registro
- `POST /auth/login` - Login
- `GET /auth/me` - Perfil actual
- `GET /clubs` - Listado de clubes
- `GET /matches/open` - Partidas abiertas
- `POST /matches` - Crear partida
- `POST /matches/:id/join` - Unirse a partida
- `POST /reservations` - Crear reserva
- `DELETE /reservations/:id` - Cancelar reserva

## Testing

Pruebas de usuario completas en `memoria_proyecto.tex` - Todos [PASSED]

## Seguridad

- JWT con firma HS256 (expira en 7 días)
- Contraseñas hasheadas con bcrypt (10 rondas)
- CORS restringido al frontend
- Helmet.js para headers de seguridad
- Zod para validación de datos
- Transacciones SQL para operaciones críticas
