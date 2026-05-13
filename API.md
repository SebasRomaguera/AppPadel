# AppPadel API Reference

## Base URL
```
http://localhost:4000/api
```

## Autenticación

Todos los endpoints excepto `/auth/register` y `/auth/login` requieren un token JWT en el header:

```
Authorization: Bearer <token>
```

El token se obtiene tras registrarse o hacer login y tiene validez de 7 días.

---

## Endpoints de Autenticación

### POST /auth/register
Crear una nueva cuenta de usuario.

**Request Body:**
```json
{
  "name": "Diego Quiroga",
  "email": "diego@example.com",
  "password": "SecurePass123",
  "quizAnswers": [2, 2, 1, 2, 2, 1, 2, 2]
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Diego Quiroga",
    "email": "diego@example.com",
    "level": 3,
    "skill_score": 14
  }
}
```

**Errores:**
- 400: Datos de registro inválidos
- 409: Email ya registrado

---

### POST /auth/login
Iniciar sesión con credenciales existentes.

**Request Body:**
```json
{
  "email": "diego@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Diego Quiroga",
    "email": "diego@example.com",
    "level": 3,
    "skill_score": 14
  }
}
```

**Errores:**
- 401: Email o contraseña incorrectos

---

### GET /auth/me
Obtener información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "Diego Quiroga",
    "email": "diego@example.com",
    "level": 3,
    "skill_score": 14
  }
}
```

**Errores:**
- 401: Token inválido o no presente
- 404: Usuario no encontrado

---

## Endpoints de Clubes y Pistas

### GET /clubs
Obtener listado de todos los clubes disponibles con sus pistas.

**Response (200):**
```json
{
  "clubs": [
    {
      "id": 1,
      "name": "Club Son Racket",
      "city": "Palma",
      "courts": [
        {
          "id": 1,
          "club_id": 1,
          "name": "Pista 1",
          "surface": "Cristal"
        },
        {
          "id": 2,
          "club_id": 1,
          "name": "Pista 2",
          "surface": "Muro"
        }
      ]
    }
  ]
}
```

---

## Endpoints de Partidas

### GET /matches/open?levelWindow=1
Obtener partidas abiertas filtradas por nivel del usuario.

**Query Parameters:**
- `levelWindow` (optional, default: 1): Rango de búsqueda (±1 a ±3) alrededor del nivel del usuario

**Response (200):**
```json
{
  "matches": [
    {
      "id": 1,
      "title": "Partida abierta tarde",
      "scheduled_at": "2026-05-13T17:34:18.007Z",
      "duration_minutes": 90,
      "level_min": 2,
      "level_max": 3,
      "club_name": "Club Son Racket",
      "court_name": "Pista 1",
      "host_name": "Carlos Ruiz",
      "current_players": 2
    }
  ]
}
```

**Errores:**
- 401: No autorizado

---

### POST /matches
Crear una nueva partida abierta.

**Request Body:**
```json
{
  "clubId": 1,
  "courtId": 1,
  "scheduledAt": "2026-05-14T18:00:00Z",
  "durationMinutes": 90,
  "levelMin": 2,
  "levelMax": 4,
  "title": "Partida de Prueba - Test QA"
}
```

**Response (201):**
```json
{
  "message": "Partida creada",
  "matchId": 8
}
```

**Errores:**
- 400: Datos de partida inválidos
- 409: La pista ya está ocupada en ese horario

---

### POST /matches/:id/join
Unirse a una partida existente.

**Path Parameters:**
- `id`: ID de la partida

**Response (200):**
```json
{
  "message": "Te has unido a la partida"
}
```

**Errores:**
- 404: Partida no encontrada
- 409: La partida no está abierta, el usuario ya está apuntado, o la partida está completa

---

## Endpoints de Reservas

### GET /reservations
Obtener todas las reservas del usuario autenticado.

**Response (200):**
```json
{
  "reservations": [
    {
      "id": 1,
      "starts_at": "2026-05-14T16:00:00Z",
      "duration_minutes": 90,
      "created_at": "2026-05-13T14:35:00Z",
      "club_name": "Arena Padel Center",
      "club_city": "Marratxi",
      "court_name": "Central 1",
      "court_surface": "Cristal"
    }
  ]
}
```

---

### POST /reservations
Crear una nueva reserva de pista.

**Request Body:**
```json
{
  "clubId": 1,
  "courtId": 1,
  "startsAt": "2026-05-14T16:00:00Z",
  "durationMinutes": 90
}
```

**Response (201):**
```json
{
  "message": "Reserva creada",
  "reservationId": 15
}
```

**Errores:**
- 400: Datos de reserva inválidos
- 409: La pista ya está reservada en ese horario

---

### DELETE /reservations/:id
Cancelar una reserva.

**Path Parameters:**
- `id`: ID de la reserva

**Response (200):**
```json
{
  "message": "Reserva cancelada"
}
```

**Errores:**
- 404: Reserva no encontrada

---

## Lógica de Filtrado de Partidas

El endpoint `GET /matches/open` implementa un filtrado inteligente basado en el nivel del usuario:

**Ejemplo:**
- Usuario nivel: 3
- levelWindow: 1
- Rango visible: [3-1, 3+1] = [2, 4]

Solo se mostrarán partidas con `level_min` y `level_max` dentro del rango [2, 4].

Esto permite que usuarios de nivel similar encuentren partidas apropiadas sin ser abrumados por demasiadas opciones.

---

## Códigos de Error Comunes

| Código | Significado |
|--------|------------|
| 200 | Éxito |
| 201 | Recurso creado |
| 400 | Solicitud inválida (validación fallida) |
| 401 | No autorizado (token inválido o ausente) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (ej: recurso duplicado, horario ocupado) |
| 500 | Error interno del servidor |

---

## Consideraciones de Seguridad

1. **Contraseñas**: Hasheadas con bcrypt (10 rondas)
2. **JWT**: Firmado con HS256, expira en 7 días
3. **CORS**: Configurado para aceptar solo origen del frontend
4. **Headers de seguridad**: Helmet.js activo
