-- Buyuyus Basket Manager · Resultados definitivos y clasificación 2025–2026
--
-- Fuente: PDF de JJ.DD.MM. de Sevilla aportado por el equipo y clasificación
-- final de la jornada 17. Este script es idempotente: actualiza los partidos
-- que ya existan por competición y fecha, y crea solo los que falten.
--
-- Se cargan los 17 partidos computados en la clasificación final. La jornada 18
-- figura en el PDF como posterior y sin marcador definitivo, por lo que queda
-- fuera de este cierre histórico.

START TRANSACTION;

INSERT INTO seasons (name, startsAt, endsAt, isCurrent, description)
VALUES (
  'Temporada 2025–2026',
  '2025-09-01 00:00:00',
  '2026-06-30 23:59:59',
  0,
  'Histórico deportivo y contable de la temporada 2025–2026.'
)
ON DUPLICATE KEY UPDATE
  startsAt = VALUES(startsAt),
  endsAt = VALUES(endsAt),
  isCurrent = VALUES(isCurrent);

SET @season_2025_2026 := (
  SELECT id FROM seasons WHERE name = 'Temporada 2025–2026' LIMIT 1
);

INSERT INTO competitions (seasonId, name, phase, status, description)
SELECT
  @season_2025_2026,
  'XLI Juegos Deportivos Municipales 2025–2026',
  'Fase regular · Grupo 1ªA02',
  'finished',
  'Baloncesto sénior mixto · Distrito Cerro Amate · resultados definitivos hasta la jornada 17.'
WHERE NOT EXISTS (
  SELECT 1
  FROM competitions c
  WHERE c.seasonId = @season_2025_2026
    AND c.name = 'XLI Juegos Deportivos Municipales 2025–2026'
);

SET @competition_2025_2026 := (
  SELECT id
  FROM competitions
  WHERE seasonId = @season_2025_2026
    AND name = 'XLI Juegos Deportivos Municipales 2025–2026'
  ORDER BY id
  LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS import_buyuyus_results;

CREATE TEMPORARY TABLE import_buyuyus_results (
  matchday INT NOT NULL,
  startsAt DATETIME NOT NULL PRIMARY KEY,
  opponent VARCHAR(140) NOT NULL,
  venue ENUM('home', 'away') NOT NULL,
  ownScore INT NOT NULL,
  opponentScore INT NOT NULL,
  location VARCHAR(220) NOT NULL
);

INSERT INTO import_buyuyus_results (
  matchday, startsAt, opponent, venue, ownScore, opponentScore, location
)
VALUES
  (1,  '2025-11-09 10:30:00', 'Desfase Forastero', 'home', 26, 25, 'C.D. Hytasa · Nave BC/VB'),
  (2,  '2025-11-16 13:00:00', 'C.D. Peña la Keka', 'away', 31, 38, 'C.D. Mendigorria · Pista 3'),
  (3,  '2025-11-23 12:30:00', 'FAFA BC', 'away', 46, 31, 'C.D. Mar del Plata · Pista 2'),
  (4,  '2025-11-30 10:30:00', 'Cartuja City Camino Vivos', 'home', 43, 26, 'C.D. Hytasa · Nave BC/VB'),
  (5,  '2025-12-14 11:00:00', 'D Bar N Bar', 'away', 37, 27, 'C.D. Mar del Plata · Pista 2'),
  (6,  '2025-12-21 10:30:00', 'Al Paso C B Careba', 'home', 50, 36, 'C.D. Hytasa · Nave BC/VB'),
  (7,  '2026-01-11 10:30:00', 'CB Flama', 'away', 41, 30, 'C.D. Hytasa · Nave BC/VB'),
  (8,  '2026-01-18 10:30:00', 'CB Macasta Azul', 'home', 33, 37, 'C.D. Hytasa · Nave BC/VB'),
  (9,  '2026-01-25 11:00:00', 'CD Dabrowa', 'away', 27, 39, 'C.D. Mar del Plata · Pista 2'),
  (10, '2026-02-01 12:30:00', 'Desfase Forastero', 'away', 52, 40, 'C.D. Mar del Plata · Pista 2'),
  (11, '2026-02-08 10:30:00', 'C.D. Peña la Keka', 'home', 21, 49, 'C.D. Hytasa · Nave BC/VB'),
  (12, '2026-02-15 10:30:00', 'FAFA BC', 'home', 23, 28, 'C.D. Hytasa · Nave BC/VB'),
  (13, '2026-02-22 09:30:00', 'Cartuja City Camino Vivos', 'away', 43, 33, 'C.D. Mar del Plata · Pista 2'),
  (14, '2026-03-08 10:30:00', 'D Bar N Bar', 'home', 37, 50, 'C.D. Hytasa · Nave BC/VB'),
  (15, '2026-03-14 16:00:00', 'Al Paso C B Careba', 'away', 40, 21, 'C.D. Hytasa · Nave BC/VB'),
  (16, '2026-03-22 10:30:00', 'CB Flama', 'home', 28, 42, 'C.D. Hytasa · Nave BC/VB'),
  (17, '2026-04-12 09:30:00', 'CB Macasta Azul', 'away', 39, 37, 'C.D. Mar del Plata · Pista 2');

-- Corrige los cinco eventos ya cargados y cualquier coincidencia existente.
UPDATE teamEvents e
JOIN import_buyuyus_results source
  ON source.startsAt = e.startsAt
SET
  e.seasonId = @season_2025_2026,
  e.competitionId = @competition_2025_2026,
  e.type = 'match',
  e.title = IF(source.venue = 'home', CONCAT('C.B. Buyuyus · ', source.opponent), CONCAT(source.opponent, ' · C.B. Buyuyus')),
  e.location = source.location,
  e.description = CONCAT('Resultado definitivo importado desde JJ.DD.MM. · Jornada ', source.matchday),
  e.attendanceEnabled = 0
WHERE e.competitionId = @competition_2025_2026
  AND e.type = 'match';

-- Crea únicamente los 12 eventos de partido que faltan.
INSERT INTO teamEvents (
  seasonId, competitionId, type, title, startsAt, location, description, attendanceEnabled
)
SELECT
  @season_2025_2026,
  @competition_2025_2026,
  'match',
  IF(source.venue = 'home', CONCAT('C.B. Buyuyus · ', source.opponent), CONCAT(source.opponent, ' · C.B. Buyuyus')),
  source.startsAt,
  source.location,
  CONCAT('Resultado definitivo importado desde JJ.DD.MM. · Jornada ', source.matchday),
  0
FROM import_buyuyus_results source
WHERE NOT EXISTS (
  SELECT 1
  FROM teamEvents existing
  WHERE existing.competitionId = @competition_2025_2026
    AND existing.type = 'match'
    AND existing.startsAt = source.startsAt
);

-- Actualiza el marcador de las coincidencias existentes.
UPDATE matches m
JOIN teamEvents e ON e.id = m.eventId
JOIN import_buyuyus_results source
  ON source.startsAt = e.startsAt
SET
  m.competitionId = @competition_2025_2026,
  m.opponent = source.opponent,
  m.venue = source.venue,
  m.ownScore = source.ownScore,
  m.opponentScore = source.opponentScore,
  m.status = 'completed',
  m.notes = CONCAT('Jornada ', source.matchday, ' · Resultado definitivo')
WHERE e.competitionId = @competition_2025_2026
  AND e.type = 'match';

-- Crea el registro deportivo asociado a cada evento que todavía no lo tenga.
INSERT INTO matches (
  eventId, competitionId, opponent, venue, ownScore, opponentScore, status, notes
)
SELECT
  e.id,
  @competition_2025_2026,
  source.opponent,
  source.venue,
  source.ownScore,
  source.opponentScore,
  'completed',
  CONCAT('Jornada ', source.matchday, ' · Resultado definitivo')
FROM teamEvents e
JOIN import_buyuyus_results source
  ON source.startsAt = e.startsAt
LEFT JOIN matches existing ON existing.eventId = e.id
WHERE e.competitionId = @competition_2025_2026
  AND e.type = 'match'
  AND existing.id IS NULL;

-- Clasificación final visible al cierre de la jornada 17.
INSERT INTO competitionStandings (
  competitionId, teamName, position, played, won, drawn, lost, forfeits, pointsFor, pointsAgainst, points
)
VALUES
  (@competition_2025_2026, 'CD Dabrowa', 1, 17, 15, 0, 2, 0, 816, 561, 32),
  (@competition_2025_2026, 'CB Macasta Azul', 2, 17, 14, 0, 3, 0, 807, 594, 31),
  (@competition_2025_2026, 'C.D. Peña la Keka', 3, 17, 12, 0, 5, 0, 792, 561, 29),
  (@competition_2025_2026, 'C.B. Buyuyus', 4, 17, 10, 0, 7, 0, 617, 589, 27),
  (@competition_2025_2026, 'Desfase Forastero', 5, 17, 8, 0, 9, 0, 713, 672, 25),
  (@competition_2025_2026, 'CB Flama', 6, 17, 8, 0, 9, 0, 640, 641, 25),
  (@competition_2025_2026, 'FAFA BC', 7, 17, 6, 0, 11, 0, 619, 725, 23),
  (@competition_2025_2026, 'D Bar N Bar', 8, 17, 5, 0, 11, 1, 577, 723, 21),
  (@competition_2025_2026, 'Al Paso C B Careba', 9, 17, 4, 0, 13, 0, 468, 691, 21),
  (@competition_2025_2026, 'Cartuja City Camino Vivos', 10, 17, 3, 0, 14, 0, 506, 798, 20)
ON DUPLICATE KEY UPDATE
  position = VALUES(position),
  played = VALUES(played),
  won = VALUES(won),
  drawn = VALUES(drawn),
  lost = VALUES(lost),
  forfeits = VALUES(forfeits),
  pointsFor = VALUES(pointsFor),
  pointsAgainst = VALUES(pointsAgainst),
  points = VALUES(points);

COMMIT;

-- Verificación esperada: 17 partidos completos, 10 victorias, 7 derrotas,
-- 617 puntos a favor, 589 en contra, y posición 4 con 27 puntos.
SELECT
  COUNT(*) AS partidos,
  SUM(CASE WHEN m.ownScore > m.opponentScore THEN 1 ELSE 0 END) AS victorias,
  SUM(CASE WHEN m.ownScore < m.opponentScore THEN 1 ELSE 0 END) AS derrotas,
  SUM(m.ownScore) AS puntos_a_favor,
  SUM(m.opponentScore) AS puntos_en_contra
FROM matches m
JOIN teamEvents e ON e.id = m.eventId
WHERE e.competitionId = @competition_2025_2026
  AND m.status = 'completed';

SELECT
  position, teamName, played, won, drawn, lost, forfeits, pointsFor, pointsAgainst, points
FROM competitionStandings
WHERE competitionId = @competition_2025_2026
ORDER BY position;

DROP TEMPORARY TABLE IF EXISTS import_buyuyus_results;
