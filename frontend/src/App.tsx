import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type User = {
  id: number;
  name: string;
  email: string;
  level: number;
  skill_score: number;
};

type Court = {
  id: number;
  club_id: number;
  name: string;
  surface: string;
};

type Club = {
  id: number;
  name: string;
  city: string;
  courts: Court[];
};

type Match = {
  id: number;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  level_min: number;
  level_max: number;
  club_name: string;
  court_name: string;
  host_name: string;
  current_players: number;
};

type Reservation = {
  id: number;
  starts_at: string;
  duration_minutes: number;
  created_at: string;
  club_name: string;
  club_city: string;
  court_name: string;
  court_surface: string;
};

type Toast = {
  message: string;
  kind: "success" | "error";
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const quizQuestions = [
  "¿Controlas la dirección y profundidad en tus golpes habituales?",
  "¿Dominas la técnica de volea y bandeja?",
  "¿Ejecutas correctamente el saque y el segundo saque?",
  "¿Utilizas efectivos golpes de ataque (vibora, bandeja, remate)?",
  "¿Organizas tácticamente con tu pareja en dobles?",
  "¿Mantienes concentración y nivel bajo presión?",
  "¿Anticipas y cubres posiciones de forma consistente?",
  "¿Jugas movimientos coordinados desde el fondo de pista?",
];

function toDatetimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const defaultReservationStart = toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000));

function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [levelWindow, setLevelWindow] = useState(1);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    quizAnswers: Array(quizQuestions.length).fill(0) as number[],
  });

  const [createMatchForm, setCreateMatchForm] = useState({
    clubId: 0,
    courtId: 0,
    scheduledAt: "",
    durationMinutes: 90,
    levelMin: 1,
    levelMax: 3,
    title: "Partida abierta",
  });

  const [reservationForm, setReservationForm] = useState({
    clubId: 0,
    courtId: 0,
    startsAt: defaultReservationStart,
    durationMinutes: 90,
  });

  const availableCourtsForMatch = useMemo(() => {
    return clubs.find((club) => club.id === Number(createMatchForm.clubId))?.courts ?? [];
  }, [clubs, createMatchForm.clubId]);

  const availableCourtsForReservation = useMemo(() => {
    return clubs.find((club) => club.id === Number(reservationForm.clubId))?.courts ?? [];
  }, [clubs, reservationForm.clubId]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    void loadProfile();
    void loadClubs();
    void loadMatches(levelWindow);
    void loadReservations();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadMatches(levelWindow);
  }, [levelWindow]);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message ?? "Ha ocurrido un error");
    }

    return data as T;
  }

  async function loadProfile() {
    try {
      const data = await apiRequest<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("token");
      setToken("");
    }
  }

  async function loadClubs() {
    try {
      const data = await apiRequest<{ clubs: Club[] }>("/clubs");
      setClubs(data.clubs);

      if (data.clubs.length > 0) {
        setCreateMatchForm((prev) => ({
          ...prev,
          clubId: prev.clubId || data.clubs[0].id,
          courtId: prev.courtId || data.clubs[0].courts[0]?.id || 0,
        }));
        setReservationForm((prev) => ({
          ...prev,
          clubId: prev.clubId || data.clubs[0].id,
          courtId: prev.courtId || data.clubs[0].courts[0]?.id || 0,
        }));
      }
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadMatches(windowLevel = levelWindow) {
    try {
      const data = await apiRequest<{ matches: Match[] }>(`/matches/open?levelWindow=${windowLevel}`);
      setMatches(data.matches);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function loadReservations() {
    try {
      const data = await apiRequest<{ reservations: Reservation[] }>("/reservations");
      setReservations(data.reservations);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  function showToast(messageText: string, kind: Toast["kind"] = "success") {
    setToast({ message: messageText, kind });
  }

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest<{ token: string; user: User }>("/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage(`Registro correcto. Tu nivel inicial es ${data.user.level}.`);
      showToast("Registro completado con éxito");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const data = await apiRequest<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm),
      });
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage("Bienvenido de nuevo.");
      showToast("Sesión iniciada con éxito");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function joinMatch(matchId: number) {
    try {
      await apiRequest(`/matches/${matchId}/join`, { method: "POST" });
      setMessage("Te has apuntado a la partida.");
      showToast("Te has unido a la partida con éxito");
      await loadMatches();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function createMatch(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest("/matches", {
        method: "POST",
        body: JSON.stringify({
          ...createMatchForm,
          clubId: Number(createMatchForm.clubId),
          courtId: Number(createMatchForm.courtId),
          levelMin: Number(createMatchForm.levelMin),
          levelMax: Number(createMatchForm.levelMax),
          durationMinutes: Number(createMatchForm.durationMinutes),
          scheduledAt: new Date(createMatchForm.scheduledAt).toISOString(),
        }),
      });
      setMessage("Partida creada correctamente.");
      showToast("Partida creada con éxito");
      await loadMatches();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function createReservation(event: FormEvent) {
    event.preventDefault();
    try {
      await apiRequest("/reservations", {
        method: "POST",
        body: JSON.stringify({
          ...reservationForm,
          clubId: Number(reservationForm.clubId),
          courtId: Number(reservationForm.courtId),
          durationMinutes: Number(reservationForm.durationMinutes),
          startsAt: new Date(reservationForm.startsAt).toISOString(),
        }),
      });
      setMessage("Reserva creada correctamente.");
      showToast("Reserva realizada con éxito");
      await loadReservations();
    } catch (error) {
      const errorMessage = (error as Error).message;
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    }
  }

  async function cancelReservation(reservationId: number) {
    const confirmed = window.confirm("¿Quieres cancelar esta reserva?");
    if (!confirmed) return;

    try {
      await apiRequest(`/reservations/${reservationId}`, { method: "DELETE" });
      setMessage("Reserva cancelada correctamente.");
      showToast("Reserva cancelada con éxito");
      await loadReservations();
    } catch (error) {
      const errorMessage = (error as Error).message;
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    }
  }

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setMessage("Sesión cerrada.");
  }

  return (
    <div className={`app-shell ${!token ? 'auth-mode' : ''}`}>
      {toast && (
        <div className={`toast toast-${toast.kind}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      <header className="topbar">
        <div>
          <p className="brand-tag">AppPadel</p>
          <h1>Reserva, juega y encuentra tu partida</h1>
        </div>
        {user && (
          <button className="ghost-btn" onClick={logout}>
            Cerrar sesión
          </button>
        )}
      </header>

      {!token ? (
        <section className="auth-card">
          <div className="auth-tabs">
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Iniciar sesión
            </button>
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => setAuthMode("register")}
            >
              Registrarse
            </button>
          </div>

          {authMode === "login" ? (
            <form className="panel" onSubmit={handleLogin}>
              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </label>
              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          ) : (
            <form className="panel register-form" onSubmit={handleRegister}>
              <label>
                Nombre
                <input
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
              </label>

              <div className="quiz-grid">
                {quizQuestions.map((question, index) => (
                  <label key={question}>
                    {question}
                    <select
                      value={registerForm.quizAnswers[index]}
                      onChange={(e) => {
                        const next = [...registerForm.quizAnswers];
                        next[index] = Number(e.target.value);
                        setRegisterForm({ ...registerForm, quizAnswers: next });
                      }}
                    >
                      <option value={0}>0 - Nunca</option>
                      <option value={1}>1 - A veces</option>
                      <option value={2}>2 - Frecuente</option>
                      <option value={3}>3 - Casi siempre</option>
                    </select>
                  </label>
                ))}
              </div>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? "Creando cuenta..." : "Crear cuenta y calcular nivel"}
              </button>
            </form>
          )}
        </section>
      ) : (
        <main className="dashboard">
          <section className="panel profile-panel">
            <h2>Tu perfil de juego</h2>
            <p>
              Jugador: <strong>{user?.name}</strong>
            </p>
            <p>
              Nivel asignado: <strong>{user?.level}</strong> / 6
            </p>
            <p>
              Puntuación quiz: <strong>{user?.skill_score}</strong>
            </p>
            <label>
              Búsqueda por nivel similar (+/-)
              <input
                type="number"
                min={0}
                max={3}
                value={levelWindow}
                onChange={(e) => setLevelWindow(Number(e.target.value))}
              />
            </label>
          </section>

          <section className="panel">
            <h2>Partidas abiertas</h2>
            <div className="cards-grid">
              {matches.length === 0 && <p>No hay partidas abiertas para tu nivel ahora mismo.</p>}
              {matches.map((match) => (
                <article key={match.id} className="match-card">
                  <h3>{match.title}</h3>
                  <p>
                    {match.club_name} · {match.court_name}
                  </p>
                  <p>{formatDateTime(match.scheduled_at)}</p>
                  <p>
                    Nivel {match.level_min} - {match.level_max}
                  </p>
                  <p>
                    Jugadores: {match.current_players}/4 · Host: {match.host_name}
                  </p>
                  <button className="primary-btn" onClick={() => joinMatch(match.id)}>
                    Unirme
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel two-col">
            <form onSubmit={createMatch}>
              <h2>Crear partida</h2>
              <label>
                Título
                <input
                  value={createMatchForm.title}
                  onChange={(e) => setCreateMatchForm({ ...createMatchForm, title: e.target.value })}
                  required
                />
              </label>
              <label>
                Club
                <select
                  value={createMatchForm.clubId}
                  onChange={(e) =>
                    setCreateMatchForm({
                      ...createMatchForm,
                      clubId: Number(e.target.value),
                      courtId:
                        clubs.find((club) => club.id === Number(e.target.value))?.courts[0]?.id || 0,
                    })
                  }
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.city})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pista
                <select
                  value={createMatchForm.courtId}
                  onChange={(e) =>
                    setCreateMatchForm({ ...createMatchForm, courtId: Number(e.target.value) })
                  }
                >
                  {availableCourtsForMatch.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name} ({court.surface})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Día y hora
                <input
                  type="datetime-local"
                  value={createMatchForm.scheduledAt}
                  onChange={(e) =>
                    setCreateMatchForm({ ...createMatchForm, scheduledAt: e.target.value })
                  }
                  required
                />
              </label>
              <div className="inline-fields">
                <label>
                  Nivel mínimo
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={createMatchForm.levelMin}
                    onChange={(e) =>
                      setCreateMatchForm({ ...createMatchForm, levelMin: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  Nivel máximo
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={createMatchForm.levelMax}
                    onChange={(e) =>
                      setCreateMatchForm({ ...createMatchForm, levelMax: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <button className="primary-btn" type="submit">
                Publicar partida
              </button>
            </form>

            <form onSubmit={createReservation}>
              <h2>Reservar pista</h2>
              <label>
                Club
                <select
                  value={reservationForm.clubId}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      clubId: Number(e.target.value),
                      courtId:
                        clubs.find((club) => club.id === Number(e.target.value))?.courts[0]?.id || 0,
                    })
                  }
                >
                  {clubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.city})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Pista
                <select
                  value={reservationForm.courtId}
                  onChange={(e) =>
                    setReservationForm({ ...reservationForm, courtId: Number(e.target.value) })
                  }
                >
                  {availableCourtsForReservation.map((court) => (
                    <option key={court.id} value={court.id}>
                      {court.name} ({court.surface})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Día y hora
                <input
                  type="datetime-local"
                  value={reservationForm.startsAt}
                  onChange={(e) =>
                    setReservationForm({ ...reservationForm, startsAt: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Duración (minutos)
                <input
                  type="number"
                  min={60}
                  max={180}
                  step={30}
                  value={reservationForm.durationMinutes}
                  onChange={(e) =>
                    setReservationForm({
                      ...reservationForm,
                      durationMinutes: Number(e.target.value),
                    })
                  }
                />
              </label>
              <button className="primary-btn" type="submit">
                Confirmar reserva
              </button>
            </form>
          </section>

          <section className="panel">
            <h2>Pistas reservadas</h2>
            <div className="cards-grid">
              {reservations.length === 0 && <p>No tienes reservas hechas todavía.</p>}
              {reservations.map((reservation) => (
                <article key={reservation.id} className="match-card">
                  <h3>{reservation.club_name}</h3>
                  <p>
                    {reservation.court_name} · {reservation.court_surface}
                  </p>
                  <p>{reservation.club_city}</p>
                  <p>{formatDateTime(reservation.starts_at)}</p>
                  <p>Duración: {reservation.duration_minutes} minutos</p>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => cancelReservation(reservation.id)}
                  >
                    🗑 Cancelar reserva
                  </button>
                </article>
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;
