-- Datos transcritos únicamente de las capturas aportadas.
-- La clasificación corresponde a la jornada 17 y los cinco resultados son los visibles de C.B. Buyuyus.

INSERT INTO competitions (seasonId, name, phase, status, description)
VALUES (1, 'XLI Juegos Deportivos Municipales 2025–2026', 'Fase regular · Grupo 1ª02', 'finished', 'Baloncesto sénior mixto · Distrito Cerro Amate');
SET @competition_2025 := LAST_INSERT_ID();

INSERT INTO teamEvents (seasonId, competitionId, type, title, startsAt, location, description, attendanceEnabled)
VALUES
  (1, @competition_2025, 'match', 'C.B. Buyuyus · Desfase Forastero', '2025-11-09 10:30:00', 'C.D. Hytasa Nave BC', 'Resultado histórico verificado.', false),
  (1, @competition_2025, 'match', 'Desfase Forastero · C.B. Buyuyus', '2026-02-01 12:30:00', 'C.D. Mar del Plata · Pista 2', 'Resultado histórico verificado.', false),
  (1, @competition_2025, 'match', 'Cartuja City Camino Vivos · C.B. Buyuyus', '2026-02-22 16:00:00', 'C.D. Mar del Plata · Pista 2', 'Resultado histórico verificado.', false),
  (1, @competition_2025, 'match', 'Al Paso C B Careba · C.B. Buyuyus', '2026-03-14 16:00:00', 'C.D. Hytasa Nave BC', 'Resultado histórico verificado.', false),
  (1, @competition_2025, 'match', 'CB Macasta Azul · C.B. Buyuyus', '2026-04-12 09:30:00', 'C.D. Mar del Plata · Pista 2', 'Resultado histórico verificado.', false);

SET @event_1 := LAST_INSERT_ID() - 4; SET @event_2 := @event_1 + 1; SET @event_3 := @event_1 + 2; SET @event_4 := @event_1 + 3; SET @event_5 := @event_1 + 4;
INSERT INTO matches (eventId, competitionId, opponent, venue, ownScore, opponentScore, status, notes)
VALUES
  (@event_1, @competition_2025, 'Desfase Forastero', 'home', 26, 25, 'completed', 'Jornada 1'),
  (@event_2, @competition_2025, 'Desfase Forastero', 'away', 52, 40, 'completed', 'Jornada 10'),
  (@event_3, @competition_2025, 'Cartuja City Camino Vivos', 'away', 43, 33, 'completed', 'Jornada 13'),
  (@event_4, @competition_2025, 'Al Paso C B Careba', 'away', 40, 21, 'completed', 'Jornada 15'),
  (@event_5, @competition_2025, 'CB Macasta Azul', 'away', 39, 37, 'completed', 'Jornada 17');

INSERT INTO competitionStandings (competitionId, teamName, position, played, won, drawn, lost, forfeits, pointsFor, pointsAgainst, points)
VALUES
  (@competition_2025, 'CD Dabrowa', 1, 17, 15, 0, 2, 0, 816, 561, 32),
  (@competition_2025, 'CB Macasta Azul', 2, 17, 14, 0, 3, 0, 807, 594, 31),
  (@competition_2025, 'C.D. Peña la Keka', 3, 17, 12, 0, 5, 0, 792, 561, 29),
  (@competition_2025, 'C.B. Buyuyus', 4, 17, 10, 0, 7, 0, 617, 589, 27),
  (@competition_2025, 'Desfase Forastero', 5, 17, 8, 0, 9, 0, 713, 672, 25),
  (@competition_2025, 'CB Flama', 6, 17, 8, 0, 9, 0, 640, 641, 25),
  (@competition_2025, 'FAFA BC', 7, 17, 6, 0, 11, 0, 619, 725, 23),
  (@competition_2025, 'D Bar N Bar', 8, 17, 5, 0, 11, 1, 577, 723, 21),
  (@competition_2025, 'Al Paso C B Careba', 9, 17, 4, 0, 13, 0, 468, 691, 21),
  (@competition_2025, 'Cartuja City Camino Vivos', 10, 17, 3, 0, 14, 0, 506, 798, 20);

INSERT INTO seasons (name, startsAt, endsAt, isCurrent, description)
VALUES ('Temporada 2027–2028', '2027-09-01 00:00:00', '2028-06-30 23:59:59', false, 'Temporada preparada para planificación futura.');
