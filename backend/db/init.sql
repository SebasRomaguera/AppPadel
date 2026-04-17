CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  level INT NOT NULL CHECK (level BETWEEN 0 AND 6),
  skill_score INT NOT NULL DEFAULT 0,
  is_fake BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clubs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS courts (
  id SERIAL PRIMARY KEY,
  club_id INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  surface VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  host_user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 90,
  level_min INT NOT NULL CHECK (level_min BETWEEN 0 AND 6),
  level_max INT NOT NULL CHECK (level_max BETWEEN 0 AND 6),
  title VARCHAR(120) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'closed'))
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id INT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id INT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_id INT NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO clubs (name, city)
SELECT 'Club Son Racket', 'Palma'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE name = 'Club Son Racket');

INSERT INTO clubs (name, city)
SELECT 'Arena Padel Center', 'Marratxi'
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE name = 'Arena Padel Center');

INSERT INTO courts (club_id, name, surface)
SELECT c.id, 'Pista 1', 'Cristal'
FROM clubs c
WHERE c.name = 'Club Son Racket'
  AND NOT EXISTS (
    SELECT 1 FROM courts ct WHERE ct.club_id = c.id AND ct.name = 'Pista 1'
  );

INSERT INTO courts (club_id, name, surface)
SELECT c.id, 'Pista 2', 'Muro'
FROM clubs c
WHERE c.name = 'Club Son Racket'
  AND NOT EXISTS (
    SELECT 1 FROM courts ct WHERE ct.club_id = c.id AND ct.name = 'Pista 2'
  );

INSERT INTO courts (club_id, name, surface)
SELECT c.id, 'Central 1', 'Cristal'
FROM clubs c
WHERE c.name = 'Arena Padel Center'
  AND NOT EXISTS (
    SELECT 1 FROM courts ct WHERE ct.club_id = c.id AND ct.name = 'Central 1'
  );

INSERT INTO courts (club_id, name, surface)
SELECT c.id, 'Central 2', 'Cristal'
FROM clubs c
WHERE c.name = 'Arena Padel Center'
  AND NOT EXISTS (
    SELECT 1 FROM courts ct WHERE ct.club_id = c.id AND ct.name = 'Central 2'
  );

INSERT INTO users (name, email, password_hash, level, skill_score, is_fake)
SELECT 'Carlos Falso', 'carlos.fake@apppadel.local', 'FAKE_USER', 2, 10, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'carlos.fake@apppadel.local');

INSERT INTO users (name, email, password_hash, level, skill_score, is_fake)
SELECT 'Marta Falsa', 'marta.fake@apppadel.local', 'FAKE_USER', 3, 14, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'marta.fake@apppadel.local');

INSERT INTO users (name, email, password_hash, level, skill_score, is_fake)
SELECT 'Jorge Falso', 'jorge.fake@apppadel.local', 'FAKE_USER', 4, 18, TRUE
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'jorge.fake@apppadel.local');

INSERT INTO matches (host_user_id, club_id, court_id, scheduled_at, duration_minutes, level_min, level_max, title, status)
SELECT u.id, c.id, ct.id, NOW() + INTERVAL '1 day', 90, 2, 3, 'Partida abierta tarde', 'open'
FROM users u
JOIN clubs c ON c.name = 'Club Son Racket'
JOIN courts ct ON ct.club_id = c.id AND ct.name = 'Pista 1'
WHERE u.email = 'carlos.fake@apppadel.local'
  AND NOT EXISTS (SELECT 1 FROM matches WHERE title = 'Partida abierta tarde');

INSERT INTO matches (host_user_id, club_id, court_id, scheduled_at, duration_minutes, level_min, level_max, title, status)
SELECT u.id, c.id, ct.id, NOW() + INTERVAL '2 day', 90, 3, 4, 'Partida abierta noche', 'open'
FROM users u
JOIN clubs c ON c.name = 'Arena Padel Center'
JOIN courts ct ON ct.club_id = c.id AND ct.name = 'Central 1'
WHERE u.email = 'marta.fake@apppadel.local'
  AND NOT EXISTS (SELECT 1 FROM matches WHERE title = 'Partida abierta noche');

INSERT INTO match_players (match_id, user_id)
SELECT m.id, m.host_user_id
FROM matches m
WHERE NOT EXISTS (
  SELECT 1 FROM match_players mp WHERE mp.match_id = m.id AND mp.user_id = m.host_user_id
);
