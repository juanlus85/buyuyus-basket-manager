-- Buyuyus Basket Manager · Cierre histórico global 2025–2026
--
-- Este script es idempotente: puede ejecutarse más de una vez sin duplicar
-- los movimientos identificados por temporada, caja, tipo, concepto, importe,
-- fecha y observación.
--
-- IMPORTANTE:
--   * Los 11 cobros de cuota se guardan en teamTransactions. No crea ni altera
--     playerCharges ni playerPayments, por lo que NO se asignan a jugadores.
--   * La fecha original 11/01/25 del arbitraje se normaliza a 11/01/2026 por
--     coherencia con la secuencia de la temporada 2025–2026.
--   * Antes de ejecutar, haga una copia de seguridad de la base de datos.

START TRANSACTION;

-- Temporada histórica: se crea solo si aún no existe.
INSERT INTO seasons (name, startsAt, endsAt, isCurrent, description)
VALUES (
  'Temporada 2025–2026',
  '2025-09-01 00:00:00',
  '2026-06-30 23:59:59',
  0,
  'Cierre histórico global importado desde el libro de caja anterior.'
)
ON DUPLICATE KEY UPDATE
  startsAt = VALUES(startsAt),
  endsAt = VALUES(endsAt),
  isCurrent = VALUES(isCurrent),
  description = VALUES(description);

SET @historical_season_id := (
  SELECT id FROM seasons WHERE name = 'Temporada 2025–2026' LIMIT 1
);

-- Cajas. Los 539,00 € de apertura en Caja Juanlu, más el neto de -440,67 €
-- de los movimientos siguientes, dejan el saldo histórico en 98,33 €.
INSERT INTO teamAccounts (name, holderName, type, openingBalanceCents, isActive, notes)
VALUES
  ('Caja Juanlu', 'Juanlu', 'cash', 53900, 1,
   'Caja operativa. Apertura histórica 2025–2026: 539,00 €; cierre esperado: 98,33 €.'),
  ('Caja Maline', 'Alex Maline', 'cash', 0, 1,
   'Caja operativa de Maline. Saldo inicial: 0,00 €.')
ON DUPLICATE KEY UPDATE
  holderName = VALUES(holderName),
  type = VALUES(type),
  openingBalanceCents = VALUES(openingBalanceCents),
  isActive = VALUES(isActive),
  notes = VALUES(notes);

SET @juanlu_account_id := (
  SELECT id FROM teamAccounts WHERE name = 'Caja Juanlu' LIMIT 1
);

-- Categorías necesarias para el libro de caja histórico.
INSERT INTO teamFinancialCategories (name, direction, defaultAmountCents, isActive)
VALUES
  ('Cuotas', 'income', 6000, 1),
  ('Alquiler de pista', 'expense', NULL, 1),
  ('Arbitraje', 'expense', 1600, 1),
  ('Inscripción de liga', 'expense', NULL, 1)
ON DUPLICATE KEY UPDATE
  defaultAmountCents = VALUES(defaultAmountCents),
  isActive = VALUES(isActive);

-- Los importes se guardan siempre positivos en céntimos. La dirección determina
-- si computan como ingreso o gasto. No hay playerId ni referencias a cargos.
INSERT INTO teamTransactions (
  seasonId,
  categoryId,
  accountId,
  direction,
  concept,
  amountCents,
  occurredAt,
  notes
)
SELECT
  @historical_season_id,
  c.id,
  @juanlu_account_id,
  m.direction,
  m.concept,
  m.amountCents,
  m.occurredAt,
  m.notes
FROM (
  SELECT 'expense' AS direction, 'Arbitraje' AS categoryName, 'Arbitraje' AS concept, 1600 AS amountCents, '2025-11-09 12:00:00' AS occurredAt, 'Desfase' AS notes
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2025-11-16 12:00:00', 'Peña la Keka'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2025-11-23 12:00:00', 'Fafa'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2025-11-30 12:00:00', 'Cartuja City'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2025-12-14 12:00:00', 'D Bar N Bar'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2025-12-21 12:00:00', 'Al Paso Careba'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 13800, '2026-01-11 12:00:00', 'Enero CEU'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-01-11 12:00:00', 'Flama'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-01-18 12:00:00', 'Macasta'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-01-25 12:00:00', 'Dabrowa'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-02-01 12:00:00', 'Desfase'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-02-08 12:00:00', 'Peña la Keka'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-02-15 12:00:00', 'Fafaa'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-02-22 12:00:00', 'Cartuja City'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-03-08 12:00:00', 'D Bar en Bar'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-03-15 12:00:00', 'Al Paso'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 5100, '2026-03-16 12:00:00', 'Alcosa'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-03-22 12:00:00', 'Flama'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 5100, '2026-04-01 12:00:00', 'Alcosa'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-04-12 12:00:00', 'Macasta'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-15 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-16 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 24250, '2026-04-17 12:00:00', 'Bormujos'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-17 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-18 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-19 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'expense', 'Arbitraje', 'Arbitraje', 1600, '2026-04-19 12:00:00', 'Dabrowa'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-20 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-21 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-22 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-23 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-04-24 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 1275, '2026-04-28 12:00:00', 'Alcosa'
  UNION ALL SELECT 'expense', 'Alquiler de pista', 'Alquiler Pista Entreno', 3700, '2026-05-11 12:00:00', 'Alcosa'
  UNION ALL SELECT 'expense', 'Inscripción de liga', 'Inscripcion Liga', 28042, '2026-05-12 12:00:00', 'Liga Alternativa'
  UNION ALL SELECT 'income', 'Cuotas', 'Segundo Pago Cuota', 6000, '2026-06-21 12:00:00', 'Ingreso histórico global; no asociado a jugador.'
) AS m
JOIN teamFinancialCategories c
  ON c.name = m.categoryName AND c.direction = m.direction
WHERE NOT EXISTS (
  SELECT 1
  FROM teamTransactions existing
  WHERE existing.seasonId = @historical_season_id
    AND existing.accountId = @juanlu_account_id
    AND existing.direction = m.direction
    AND existing.concept = m.concept
    AND existing.amountCents = m.amountCents
    AND existing.occurredAt = m.occurredAt
    AND COALESCE(existing.notes, '') = COALESCE(m.notes, '')
);

COMMIT;

-- Verificación esperada después de ejecutar:
-- Caja Juanlu: apertura 539,00 € + neto de movimientos -440,67 € = 98,33 €.
SELECT
  a.name AS caja,
  a.openingBalanceCents / 100.0 AS saldo_apertura_eur,
  COUNT(t.id) AS movimientos_historicos,
  COALESCE(SUM(CASE WHEN t.direction = 'income' THEN t.amountCents ELSE -t.amountCents END), 0) / 100.0 AS neto_movimientos_eur,
  (a.openingBalanceCents + COALESCE(SUM(CASE WHEN t.direction = 'income' THEN t.amountCents ELSE -t.amountCents END), 0)) / 100.0 AS saldo_calculado_eur
FROM teamAccounts a
LEFT JOIN teamTransactions t
  ON t.accountId = a.id AND t.seasonId = @historical_season_id
WHERE a.name = 'Caja Juanlu'
GROUP BY a.id, a.name, a.openingBalanceCents;

SELECT
  a.name AS caja,
  a.openingBalanceCents / 100.0 AS saldo_apertura_eur
FROM teamAccounts a
WHERE a.name = 'Caja Maline';
