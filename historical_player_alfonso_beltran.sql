-- Ficha histórica de Alfonso Carlos Beltrán Galán.
-- No crea un usuario, no crea deudas y no lo activa para la plantilla actual.

INSERT INTO playerProfiles (
  fullName,
  shortName,
  jerseyNumber,
  status,
  isActiveCurrentSeason,
  leftAt,
  notes
)
SELECT
  'BELTRÁN GALÁN, ALFONSO CARLOS',
  'Alfonso',
  28,
  'inactive',
  0,
  '2026-06-30 23:59:59',
  'Ficha histórica creada para vincular actas de la temporada 2025–2026.'
WHERE NOT EXISTS (
  SELECT 1
  FROM playerProfiles
  WHERE fullName = 'BELTRÁN GALÁN, ALFONSO CARLOS'
);

SELECT id, fullName, shortName, jerseyNumber, status, isActiveCurrentSeason, leftAt, notes
FROM playerProfiles
WHERE fullName = 'BELTRÁN GALÁN, ALFONSO CARLOS';
