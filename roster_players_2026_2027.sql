-- Buyuyus Basket Manager · Plantilla activa 2026–2027
--
-- Script idempotente: actualiza por DNI los perfiles existentes y crea los
-- que no estén presentes. No escribe en playerCharges, playerPayments,
-- feePlans ni feeInstallments; por tanto no crea pagos, cuotas o deudas.
--
-- Los dorsales 1 de Jesús Piño y Álvaro Proy se conservan tal como fueron
-- facilitados. La aplicación no impone unicidad de dorsal.

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS import_roster_players;

CREATE TEMPORARY TABLE import_roster_players (
  dni VARCHAR(32) NOT NULL PRIMARY KEY,
  fullName VARCHAR(160) NOT NULL,
  shortName VARCHAR(80) NOT NULL,
  jerseyNumber INT NULL,
  dateOfBirth DATETIME NOT NULL,
  jerseySize VARCHAR(16) NULL,
  phone VARCHAR(40) NULL
);

INSERT INTO import_roster_players (
  dni,
  fullName,
  shortName,
  jerseyNumber,
  dateOfBirth,
  jerseySize,
  phone
)
VALUES
  ('77811000E', 'RODRÍGUEZ BENITEZ, ÁNGEL ANTONIO', 'Ángel', 9,  '1986-09-29 12:00:00', NULL,   NULL),
  ('77809594L', 'BLANCO GUZMÁN, JUAN LUIS', 'Juanlu', 22,  '1985-10-16 12:00:00', 'XXXL', '655432612'),
  ('47000450L', 'FERNÁNDEZ DIEGUEZ, PABLO', 'Wio', 15,  '1978-05-15 12:00:00', 'M',    '625503636'),
  ('75756469N', 'GARCÍA BARROSO, JESÚS', 'Jesús Piño', 1,  '1983-04-07 12:00:00', 'XL',   '625441796'),
  ('75763562K', 'MALINE ALARCÓN, ALEJANDRO', 'Alex Maline', 32,  '1981-10-10 12:00:00', 'XXXL', '619362944'),
  ('52318322S', 'MARTÍN ARROYO, DANIEL', 'Dani', 6,  '1980-07-02 12:00:00', 'XL',   '658565444'),
  ('09033976J', 'SÁNCHEZ PICHARDO, JAIME ANTONIO', 'Jaime JASP', 14,  '1982-09-14 12:00:00', 'XL',   '699801342'),
  ('52229799L', 'REINA PROY, ÁLVARO', 'Álvaro Proy', 1,  '1988-07-30 12:00:00', 'L',    '603553439'),
  ('30225780P', 'SUÁREZ RUFO, ALBERTO', 'Rufo', 8,  '1983-11-06 12:00:00', 'XL',   '637856064'),
  ('28788723Z', 'BAYO SÁNCHEZ, MIGUEL ÁNGEL', 'Atalaga', 10,  '1985-03-19 12:00:00', 'XXL',  '610903676'),
  ('30261990Q', 'JIMENEZ LOPEZ REY ALVARO', 'Álvaro Clivelan', NULL,  '1992-02-08 12:00:00', NULL,  '670839606'),
  ('53586711T', 'GARCÍA LINARES, JAIME', 'Jaime 2H', 3,  '1996-06-09 12:00:00', 'XL',   '615207439'),
  ('44608954V', 'CERVANTES VARGAS, SANTIAGO', 'Santi', 0,  '1983-09-16 12:00:00', 'XL',   '675739125'),
  ('48963178L', 'GOTOR CRESPILLO, ÁLVARO', 'Gotor', 0,  '1986-09-12 12:00:00', 'XXL',  '600710566'),
  ('30234654G', 'JIMÉNEZ GIL, ADRIÁN', 'Adri', 17,  '1993-01-03 12:00:00', 'XL',   '662154354');

-- Primero actualiza cualquier ficha que ya tenga el mismo DNI. No toca userId,
-- fotografía, posición, correo de contacto, notas ni otros datos no aportados.
UPDATE playerProfiles p
JOIN import_roster_players source
  ON UPPER(TRIM(p.dni)) = source.dni
SET
  p.fullName = source.fullName,
  p.shortName = source.shortName,
  p.jerseyNumber = source.jerseyNumber,
  p.dateOfBirth = source.dateOfBirth,
  p.jerseySize = source.jerseySize,
  p.phone = source.phone,
  p.status = 'active',
  p.isActiveCurrentSeason = 1;

-- Después crea solamente los DNI que aún no existan.
INSERT INTO playerProfiles (
  fullName,
  shortName,
  jerseyNumber,
  dateOfBirth,
  jerseySize,
  dni,
  phone,
  status,
  isActiveCurrentSeason
)
SELECT
  source.fullName,
  source.shortName,
  source.jerseyNumber,
  source.dateOfBirth,
  source.jerseySize,
  source.dni,
  source.phone,
  'active',
  1
FROM import_roster_players source
WHERE NOT EXISTS (
  SELECT 1
  FROM playerProfiles existing
  WHERE UPPER(TRIM(existing.dni)) = source.dni
);

COMMIT;

-- Verificación de plantilla: debe devolver 15 perfiles activos.
SELECT
  p.jerseyNumber AS dorsal,
  p.shortName AS apodo,
  p.fullName AS nombre_completo,
  p.dni,
  DATE(p.dateOfBirth) AS fecha_nacimiento,
  p.jerseySize AS talla,
  p.phone AS telefono,
  p.status AS estado,
  p.isActiveCurrentSeason AS activo_temporada_actual
FROM playerProfiles p
JOIN import_roster_players source
  ON UPPER(TRIM(p.dni)) = source.dni
ORDER BY p.jerseyNumber IS NULL, p.jerseyNumber, p.fullName;

-- Verificación de seguridad: este script no crea movimientos individuales.
SELECT
  (SELECT COUNT(*) FROM playerProfiles p JOIN import_roster_players source ON UPPER(TRIM(p.dni)) = source.dni) AS jugadores_importados,
  (SELECT COUNT(*) FROM playerCharges pc JOIN playerProfiles p ON p.id = pc.playerId JOIN import_roster_players source ON UPPER(TRIM(p.dni)) = source.dni) AS cargos_existentes,
  (SELECT COUNT(*) FROM playerPayments pp JOIN playerProfiles p ON p.id = pp.playerId JOIN import_roster_players source ON UPPER(TRIM(p.dni)) = source.dni) AS pagos_existentes;

DROP TEMPORARY TABLE IF EXISTS import_roster_players;
