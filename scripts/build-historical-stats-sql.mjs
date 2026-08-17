import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = process.argv[2];
const outputPath = process.argv[3];
if (!sourcePath || !outputPath) throw new Error("Uso: node scripts/build-historical-stats-sql.mjs <borradores.json> <salida.sql>");

const startsAtBySourceMatchId = {
  "431812": "2025-11-09 10:30:00",
  "431814": "2025-11-16 13:00:00",
  "431818": "2025-11-23 12:30:00",
  "431825": "2025-11-30 10:30:00",
  "431831": "2025-12-14 11:00:00",
  "431837": "2025-12-21 10:30:00",
  "431840": "2026-01-11 10:30:00",
  "431846": "2026-01-18 10:30:00",
  "431851": "2026-01-25 11:00:00",
  "431857": "2026-02-01 12:30:00",
  "431859": "2026-02-08 10:30:00",
  "431863": "2026-02-15 10:30:00",
  "431870": "2026-02-22 09:30:00",
  "431876": "2026-03-08 10:30:00",
  "431882": "2026-03-14 16:00:00",
  "431885": "2026-03-22 10:30:00",
  "431891": "2026-04-12 09:30:00",
};

const sql = value => `'${String(value).replaceAll("'", "''")}'`;
const drafts = JSON.parse(readFileSync(sourcePath, "utf8"));
const rows = drafts.matches
  .filter(match => match.status === "completed")
  .flatMap(match => match.players.map(player => ({
    sourceMatchId: match.sourceMatchId,
    startsAt: startsAtBySourceMatchId[match.sourceMatchId],
    playerName: player.playerName,
    played: player.played ? 1 : 0,
    fouls: player.fouls,
    technicalFouls: player.technicalFouls,
    unsportsmanlikeFouls: player.unsportsmanlikeFouls,
  })))
  .filter(row => row.startsAt && row.playerName);

const values = rows.map(row => `  (${sql(row.startsAt)}, ${sql(row.sourceMatchId)}, ${sql(row.playerName)}, ${row.played}, ${row.fouls}, ${row.technicalFouls}, ${row.unsportsmanlikeFouls})`).join(",\n");

const output = `-- Buyuyus Basket Manager · Estadísticas históricas 2025–2026
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
${values};

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
`;

writeFileSync(outputPath, output);
console.log(JSON.stringify({ rows: rows.length, matches: new Set(rows.map(row => row.sourceMatchId)).size, outputPath }, null, 2));
