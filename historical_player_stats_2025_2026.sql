-- Buyuyus Basket Manager · Estadísticas históricas 2025–2026
-- Fuente: 18 actas oficiales aportadas por el equipo.
-- Reglas confirmadas: jugador listado = partido disputado; P = falta personal;
-- T = técnica; U = antideportiva. La jornada 18 quedó suspendida y no se carga.
--
-- Requisito previo: ejecutar historical_sports_results_2025_2026_complete.sql,
-- para asegurar que los 17 partidos existen con las fechas y horas oficiales.
-- Este script es idempotente: actualiza una fila existente por jugador y partido.

START TRANSACTION;

-- Ficha histórica necesaria para vincular las actas de Alfonso, sin activar plantilla ni usuario.
INSERT INTO playerProfiles (fullName, shortName, jerseyNumber, status, isActiveCurrentSeason, leftAt, notes)
SELECT 'BELTRÁN GALÁN, ALFONSO CARLOS', 'Alfonso', 28, 'inactive', 0, '2026-06-30 23:59:59',
       'Ficha histórica creada para vincular actas de la temporada 2025–2026.'
WHERE NOT EXISTS (
  SELECT 1 FROM playerProfiles WHERE fullName = 'BELTRÁN GALÁN, ALFONSO CARLOS'
);

DROP TEMPORARY TABLE IF EXISTS import_buyuyus_player_stats;
CREATE TEMPORARY TABLE import_buyuyus_player_stats (
  startsAt DATETIME NOT NULL,
  sourceMatchId VARCHAR(20) NOT NULL,
  playerName VARCHAR(160) NOT NULL,
  played TINYINT NOT NULL,
  fouls INT NOT NULL,
  technicalFouls INT NOT NULL,
  unsportsmanlikeFouls INT NOT NULL,
  PRIMARY KEY (startsAt, playerName)
);

INSERT INTO import_buyuyus_player_stats (
  startsAt, sourceMatchId, playerName, played, fouls, technicalFouls, unsportsmanlikeFouls
) VALUES
  ('2025-11-09 10:30:00', '431812', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'GARCÍA LINARES, JAIME', 1, 4, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'MARTÍN ARROYO, DANIEL', 1, 2, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'JIMÉNEZ GIL, ADRIÁN', 1, 3, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'SUÁREZ RUFO, ALBERTO', 1, 1, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'GOTOR CRESPILLO, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 2, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'BLANCO GUZMÁN, JUAN LUIS', 1, 1, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2025-11-09 10:30:00', '431812', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 2, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'JIMÉNEZ GIL, ADRIÁN', 1, 4, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 0, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'BLANCO GUZMÁN, JUAN LUIS', 1, 2, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'MALINE ALARCÓN, ALEJANDRO', 1, 0, 0, 0),
  ('2025-11-16 13:00:00', '431814', 'GARCÍA BARROSO, JESÚS', 1, 1, 0, 0),
  ('2025-11-23 12:30:00', '431818', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-23 12:30:00', '431818', 'GARCÍA LINARES, JAIME', 1, 1, 0, 0),
  ('2025-11-23 12:30:00', '431818', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2025-11-23 12:30:00', '431818', 'JIMÉNEZ GIL, ADRIÁN', 1, 2, 0, 0),
  ('2025-11-23 12:30:00', '431818', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 0, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 2, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'SUÁREZ RUFO, ALBERTO', 1, 3, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'GOTOR CRESPILLO, ÁLVARO', 1, 0, 0, 0),
  ('2025-11-30 10:30:00', '431825', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 2, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'REINA PROY, ÁLVARO', 1, 2, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'GARCÍA LINARES, JAIME', 1, 3, 1, 0),
  ('2025-12-14 11:00:00', '431831', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'JIMENEZ LOPEZ REY ALVARO', 1, 2, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'BAYO SÁNCHEZ, MIGUEL ÁNGEL', 1, 0, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'GOTOR CRESPILLO, ÁLVARO', 1, 2, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 1, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'MALINE ALARCÓN, ALEJANDRO', 1, 1, 0, 0),
  ('2025-12-14 11:00:00', '431831', 'GARCÍA BARROSO, JESÚS', 1, 2, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'GARCÍA LINARES, JAIME', 1, 0, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'JIMENEZ LOPEZ REY ALVARO', 1, 5, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'MARTÍN ARROYO, DANIEL', 1, 2, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'JIMÉNEZ GIL, ADRIÁN', 1, 5, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'SUÁREZ RUFO, ALBERTO', 1, 1, 1, 0),
  ('2025-12-21 10:30:00', '431837', 'BLANCO GUZMÁN, JUAN LUIS', 1, 1, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'BELTRÁN GALÁN, ALFONSO CARLOS', 1, 0, 1, 0),
  ('2025-12-21 10:30:00', '431837', 'MALINE ALARCÓN, ALEJANDRO', 1, 4, 0, 0),
  ('2025-12-21 10:30:00', '431837', 'CERVANTES VARGAS, SANTIAGO', 1, 0, 0, 1),
  ('2026-01-11 10:30:00', '431840', 'GARCÍA LINARES, JAIME', 1, 2, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'JIMÉNEZ GIL, ADRIÁN', 1, 0, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'SUÁREZ RUFO, ALBERTO', 1, 0, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 3, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'BLANCO GUZMÁN, JUAN LUIS', 1, 2, 0, 0),
  ('2026-01-11 10:30:00', '431840', 'MALINE ALARCÓN, ALEJANDRO', 1, 1, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'GARCÍA LINARES, JAIME', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'JIMENEZ LOPEZ REY ALVARO', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'JIMÉNEZ GIL, ADRIÁN', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'BLANCO GUZMÁN, JUAN LUIS', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-01-18 10:30:00', '431846', 'CERVANTES VARGAS, SANTIAGO', 1, 0, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'GARCÍA LINARES, JAIME', 1, 1, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'MARTÍN ARROYO, DANIEL', 1, 2, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'JIMÉNEZ GIL, ADRIÁN', 1, 1, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 1, 0, 1),
  ('2026-01-25 11:00:00', '431851', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 2, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'JIMENEZ LOPEZ REY ALVARO', 1, 2, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'BLANCO GUZMÁN, JUAN LUIS', 1, 3, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'MALINE ALARCÓN, ALEJANDRO', 1, 2, 0, 0),
  ('2026-01-25 11:00:00', '431851', 'GARCÍA BARROSO, JESÚS', 1, 2, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'GARCÍA LINARES, JAIME', 1, 2, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'MARTÍN ARROYO, DANIEL', 1, 2, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'JIMÉNEZ GIL, ADRIÁN', 1, 4, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'SUÁREZ RUFO, ALBERTO', 1, 0, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 0, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 0, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'BLANCO GUZMÁN, JUAN LUIS', 1, 4, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-02-01 12:30:00', '431857', 'CERVANTES VARGAS, SANTIAGO', 1, 1, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'GARCÍA LINARES, JAIME', 1, 3, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'JIMENEZ LOPEZ REY ALVARO', 1, 1, 1, 0),
  ('2026-02-08 10:30:00', '431859', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'JIMÉNEZ GIL, ADRIÁN', 1, 1, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 1, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 1, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'MALINE ALARCÓN, ALEJANDRO', 1, 0, 0, 0),
  ('2026-02-08 10:30:00', '431859', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'REINA PROY, ÁLVARO', 1, 1, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'MARTÍN ARROYO, DANIEL', 1, 1, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'JIMÉNEZ GIL, ADRIÁN', 1, 3, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'JIMENEZ LOPEZ REY ALVARO', 1, 3, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'GARCÍA BARROSO, JESÚS', 1, 1, 0, 0),
  ('2026-02-15 10:30:00', '431863', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 1, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'REINA PROY, ÁLVARO', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'GARCÍA LINARES, JAIME', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'BAYO SÁNCHEZ, MIGUEL ÁNGEL', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'GOTOR CRESPILLO, ÁLVARO', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'BLANCO GUZMÁN, JUAN LUIS', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'BELTRÁN GALÁN, ALFONSO CARLOS', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-02-22 09:30:00', '431870', 'CERVANTES VARGAS, SANTIAGO', 1, 0, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'GARCÍA LINARES, JAIME', 1, 3, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'MARTÍN ARROYO, DANIEL', 1, 2, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'BAYO SÁNCHEZ, MIGUEL ÁNGEL', 1, 1, 1, 0),
  ('2026-03-08 10:30:00', '431876', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 1, 1, 1, 0),
  ('2026-03-08 10:30:00', '431876', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 1, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'BLANCO GUZMÁN, JUAN LUIS', 1, 2, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'MALINE ALARCÓN, ALEJANDRO', 1, 2, 0, 0),
  ('2026-03-08 10:30:00', '431876', 'GARCÍA BARROSO, JESÚS', 1, 1, 0, 0),
  ('2026-03-14 16:00:00', '431882', 'MARTÍN ARROYO, DANIEL', 1, 2, 1, 0),
  ('2026-03-14 16:00:00', '431882', 'JIMÉNEZ GIL, ADRIÁN', 1, 0, 0, 0),
  ('2026-03-14 16:00:00', '431882', 'SUÁREZ RUFO, ALBERTO', 1, 2, 0, 0),
  ('2026-03-14 16:00:00', '431882', 'GOTOR CRESPILLO, ÁLVARO', 1, 1, 1, 1),
  ('2026-03-14 16:00:00', '431882', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 0, 0, 0),
  ('2026-03-14 16:00:00', '431882', 'MALINE ALARCÓN, ALEJANDRO', 1, 0, 0, 0),
  ('2026-03-14 16:00:00', '431882', 'CERVANTES VARGAS, SANTIAGO', 1, 3, 1, 0),
  ('2026-03-22 10:30:00', '431885', 'GARCÍA LINARES, JAIME', 1, 0, 0, 0),
  ('2026-03-22 10:30:00', '431885', 'JIMENEZ LOPEZ REY ALVARO', 1, 1, 1, 0),
  ('2026-03-22 10:30:00', '431885', 'MARTÍN ARROYO, DANIEL', 1, 0, 1, 0),
  ('2026-03-22 10:30:00', '431885', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 2, 0, 0),
  ('2026-03-22 10:30:00', '431885', 'BLANCO GUZMÁN, JUAN LUIS', 1, 3, 0, 0),
  ('2026-03-22 10:30:00', '431885', 'MALINE ALARCÓN, ALEJANDRO', 1, 3, 0, 0),
  ('2026-03-22 10:30:00', '431885', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-03-22 10:30:00', '431885', 'CERVANTES VARGAS, SANTIAGO', 1, 1, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'GARCÍA BARROSO, JESÚS', 1, 0, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'MARTÍN ARROYO, DANIEL', 1, 3, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'BAYO SÁNCHEZ, MIGUEL ÁNGEL', 1, 0, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 1, 2, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'FERNÁNDEZ DIEGUEZ, PABLO', 1, 2, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'JIMENEZ LOPEZ REY ALVARO', 1, 2, 0, 0),
  ('2026-04-12 09:30:00', '431891', 'BLANCO GUZMÁN, JUAN LUIS', 1, 3, 0, 0);

-- Inserta o corrige las estadísticas oficiales de cada jugador por partido.
INSERT INTO playerMatchStats (
  matchId, playerId, played, fouls, technicalFouls, unsportsmanlikeFouls, sourceImportId, confirmedByUserId
)
SELECT
  m.id,
  p.id,
  source.played,
  source.fouls,
  source.technicalFouls,
  source.unsportsmanlikeFouls,
  NULL,
  NULL
FROM import_buyuyus_player_stats source
JOIN teamEvents e ON e.startsAt = source.startsAt AND e.type = 'match'
JOIN matches m ON m.eventId = e.id
JOIN playerProfiles p ON p.fullName = source.playerName
ON DUPLICATE KEY UPDATE
  played = VALUES(played),
  fouls = VALUES(fouls),
  technicalFouls = VALUES(technicalFouls),
  unsportsmanlikeFouls = VALUES(unsportsmanlikeFouls),
  sourceImportId = NULL,
  confirmedByUserId = NULL,
  updatedAt = NOW();

-- Debe devolver cero filas: si aparece alguna, falta el partido o la ficha indicada.
SELECT
  source.sourceMatchId,
  source.startsAt,
  source.playerName,
  source.fouls,
  source.technicalFouls,
  source.unsportsmanlikeFouls
FROM import_buyuyus_player_stats source
LEFT JOIN teamEvents e ON e.startsAt = source.startsAt AND e.type = 'match'
LEFT JOIN matches m ON m.eventId = e.id
LEFT JOIN playerProfiles p ON p.fullName = source.playerName
WHERE m.id IS NULL OR p.id IS NULL;

COMMIT;

-- Resumen de control de la temporada una vez aplicado.
SELECT
  p.shortName,
  p.fullName,
  COUNT(*) AS partidos_jugados,
  SUM(CASE WHEN m.ownScore > m.opponentScore THEN 1 ELSE 0 END) AS partidos_ganados,
  SUM(CASE WHEN m.ownScore < m.opponentScore THEN 1 ELSE 0 END) AS partidos_perdidos,
  SUM(s.fouls) AS faltas,
  SUM(s.technicalFouls) AS tecnicas,
  SUM(s.unsportsmanlikeFouls) AS antideportivas
FROM playerMatchStats s
JOIN playerProfiles p ON p.id = s.playerId
JOIN matches m ON m.id = s.matchId
JOIN teamEvents e ON e.id = m.eventId
JOIN seasons season ON season.id = e.seasonId
WHERE season.name = 'Temporada 2025–2026'
  AND s.played = 1
GROUP BY p.id, p.shortName, p.fullName
ORDER BY partidos_jugados DESC, faltas DESC, p.fullName ASC;
