# AppPadel

Plataforma completa para gestión de reservas y partidas de pádel. Permite a jugadores registrarse, evaluar su nivel mediante un quiz interactivo, buscar partidas de nivel similar y reservar pistas.

## Stack

- Frontend: React 19.2.4 + TypeScript 6.0 + Vite 8.0.4
- Backend: Node.js + TypeScript 6.0 + Express 5.2.1
- Base de datos: PostgreSQL 16 (Docker)
- Contenedores: Docker + Docker Compose
- Seguridad: JWT, bcryptjs, Helmet.js, CORS
- Validación: Zod 4.3.6

## Características

- ✓ Autenticación JWT segura (7 días de validez)
- ✓ Quiz de 8 preguntas para calcular nivel (0-6)
- ✓ Búsqueda inteligente de partidas con filtrado por nivel (levelWindow: ±1 a ±3)
- ✓ Crear y unirse a partidas abiertas (máx 4 jugadores)
- ✓ Reservar pistas individuales en clubes
- ✓ Validación de datos con Zod
- ✓ Transacciones SQL para evitar race conditions
- ✓ Contraseñas hasheadas con bcrypt
- ✓ Prevención de conflictos de horarios

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

```bash
# Clonar y navegar al proyecto
cd /home/sebas/AppPadel

# Iniciar todos los servicios
docker compose up --build

# Esperar a que PostgreSQL esté listo (~3-5 segundos)
# La base de datos se popula automáticamente con init.sql
```

**URLs:**
- Frontend: http://localhost:5173
- Backend: http://localhost:4000/api
- Base de datos: postgres:5432 (interno)

### Usuarios de Prueba (pre-seeded)

Acceso inmediato sin registro:

| Email | Contraseña | Nivel |
|-------|-----------|-------|
| user1@test.com | password1 | 0 |
| user2@test.com | password2 | 3 |
| user3@test.com | password3 | 6 |

**Nota:** También puedes registrarte con un nuevo email para crear una cuenta personalizada.

## Flujo de Usuario

1. **Registro/Login**
   - Crear cuenta: email + contraseña + quiz de 8 preguntas
   - El quiz calcula automáticamente tu nivel (0-6)
   - Genera token JWT válido 7 días

2. **Buscar Partidas**
   - Listar partidas abiertas filtradas por tu nivel
   - Control deslizante: ajustar levelWindow (±1 a ±3)
   - Ver detalles: hora, club, nivel mínimo/máximo, jugadores actuales

3. **Unirse a Partida**
   - Click en partida → confirmar → unirse
   - Máximo 4 jugadores por partida
   - Prevención automática de duplicados

4. **Crear Partida**
   - Seleccionar club, pista, hora
   - Definir nivel mínimo/máximo
   - Otros pueden unirse automáticamente

5. **Reservar Pista**
   - Reserva individual sin partida
   - Seleccionar club, pista, hora, duración
   - Gestionar tus reservas (crear/cancelar)

## API

Documentación completa en [API.md](./API.md)

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

Ejemplo de uso:
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password1"}'

# Obtener token del response y usarlo:
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."

# Buscar partidas
curl http://localhost:4000/api/matches/open?levelWindow=1 \
  -H "Authorization: Bearer $TOKEN"
```

## Desarrollo

### Backend

```bash
cd backend
npm install
npm run dev    # Modo desarrollo (watch)
npm run build  # Compilar a JavaScript
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # Vite dev server (http://localhost:5173)
npm run build  # Build de producción
```

### Base de Datos

Conectar manualmente:
```bash
# Desde dentro del contenedor
docker compose exec postgres psql -U postgres -d app_padel
```

## Testing

El proyecto incluye pruebas de usuario completas documentadas en `memoria_proyecto.tex`.

Simula un flujo realista como usuario Diego Quiroga (Nivel 3):
- Registro y autenticación
- Búsqueda de partidas
- Unirse a partidas
- Creación de partidas
- Reservas de pista

Todos los test cases: **[PASSED]**

## Seguridad

- **Autenticación:** JWT con firma HS256, expira en 7 días
- **Contraseñas:** Hasheadas con bcrypt (10 rondas)
- **CORS:** Restringido al frontend permitido
- **Headers:** Helmet.js para seguridad HTTP
- **Validación:** Zod en todos los endpoints
- **Transacciones:** SQL para operaciones críticas (join match)

## Notas Arquitectónicas

### Modelo de Nivel y Partidas

- **8 preguntas de quiz** → Cada una 0-3 puntos → 24 puntos máximo
- **Niveles:** 0-6 basado en franjas de puntuación
- **levelWindow:** Parámetro flexible para búsqueda
  - User Level 3 + levelWindow=1 → Ve partidas con rango [2-4]
  - User Level 3 + levelWindow=3 → Ve partidas con rango [0-6]

### Relaciones de Datos

- **match_players:** Tabla de unión (M:M) entre users y matches
- **Transaccionalidad:** JOIN match usa transacción SQL para evitar overselling

## Solución de Problemas

**Los puertos 5173 o 4000 ya están en uso:**
```bash
# Cambiar puerto en docker-compose.yml
# Editar ports: ["4001:4000"] para backend
```

**Base de datos no se popula:**
- Verificar que init.sql esté en `backend/db/init.sql`
- Revisar logs: `docker compose logs postgres`

**CORS errors en frontend:**
- Asegurar que `VITE_API_URL` en frontend coincide con backend
- Por defecto: `http://localhost:4000/api`

## Contribuciones

El proyecto usa git con commits significativos. Para cambios importantes, considerar crear feature branches.

## Licencia

Proyecto educativo - 2026
