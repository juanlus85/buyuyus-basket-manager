-- Buyuyus Basket Manager
-- Movimientos habituales reutilizables. No crea movimientos, cuotas, pagos ni deudas.
-- Ejecútalo en la base de datos MySQL del VPS desde phpMyAdmin o consola.

START TRANSACTION;

-- Categorías que alimentan los movimientos habituales.
INSERT INTO teamFinancialCategories (name, direction, defaultAmountCents, isActive) VALUES
  ('Cuotas', 'income', 6000, 1),
  ('Invitados de entrenamiento', 'income', 300, 1),
  ('Alquiler de pista', 'expense', NULL, 1),
  ('Arbitraje', 'expense', 1600, 1),
  ('Inscripción de liga', 'expense', NULL, 1)
ON DUPLICATE KEY UPDATE
  defaultAmountCents = VALUES(defaultAmountCents),
  isActive = 1;

-- Caja operativa preferida. Si Caja Juanlu no existe, las plantillas se crean
-- igualmente sin una caja preseleccionada.
SET @caja_juanlu_id := (
  SELECT id
  FROM teamAccounts
  WHERE name = 'Caja Juanlu'
  LIMIT 1
);

-- Conceptos reutilizables que se muestran en Cuentas > Movimientos habituales.
INSERT INTO financeTemplates (
  name,
  direction,
  categoryId,
  defaultAccountId,
  defaultConcept,
  defaultAmountCents,
  isActive,
  notes
) VALUES
  (
    'Cuota de jugador',
    'income',
    (SELECT id FROM teamFinancialCategories WHERE name = 'Cuotas' AND direction = 'income' LIMIT 1),
    @caja_juanlu_id,
    'Cuota de liga',
    6000,
    1,
    'Cobro de cuota: requiere seleccionar jugador y cuota abierta o crear cuota individual.'
  ),
  (
    'Invitado Entreno',
    'income',
    (SELECT id FROM teamFinancialCategories WHERE name = 'Invitados de entrenamiento' AND direction = 'income' LIMIT 1),
    @caja_juanlu_id,
    'Invitado Entreno',
    300,
    1,
    'Ingreso de 3,00 €. El nombre del invitado es obligatorio.'
  ),
  (
    'Pago de pista',
    'expense',
    (SELECT id FROM teamFinancialCategories WHERE name = 'Alquiler de pista' AND direction = 'expense' LIMIT 1),
    @caja_juanlu_id,
    'Alquiler de pista',
    NULL,
    1,
    'Usar para entrenamientos o partidos. Indicar importe, instalación y comentario.'
  ),
  (
    'Arbitraje',
    'expense',
    (SELECT id FROM teamFinancialCategories WHERE name = 'Arbitraje' AND direction = 'expense' LIMIT 1),
    @caja_juanlu_id,
    'Arbitraje',
    1600,
    1,
    'Importe habitual 16,00 €. Indicar en el comentario el rival o partido.'
  ),
  (
    'Inscripción de liga',
    'expense',
    (SELECT id FROM teamFinancialCategories WHERE name = 'Inscripción de liga' AND direction = 'expense' LIMIT 1),
    @caja_juanlu_id,
    'Inscripción de liga',
    NULL,
    1,
    'Usar para inscripción, renovación o tasas de competición. Indicar importe y competición.'
  )
ON DUPLICATE KEY UPDATE
  categoryId = VALUES(categoryId),
  defaultAccountId = VALUES(defaultAccountId),
  defaultConcept = VALUES(defaultConcept),
  defaultAmountCents = VALUES(defaultAmountCents),
  isActive = 1,
  notes = VALUES(notes);

COMMIT;

-- Comprobación: deben aparecer exactamente los cinco conceptos activos.
SELECT
  ft.id,
  ft.name,
  ft.direction,
  ft.defaultConcept,
  ft.defaultAmountCents / 100 AS importe_euros,
  COALESCE(ta.name, 'Sin caja preseleccionada') AS caja_preseleccionada,
  ft.notes
FROM financeTemplates ft
LEFT JOIN teamAccounts ta ON ta.id = ft.defaultAccountId
WHERE ft.name IN ('Cuota de jugador', 'Invitado Entreno', 'Pago de pista', 'Arbitraje', 'Inscripción de liga')
ORDER BY FIELD(ft.name, 'Cuota de jugador', 'Invitado Entreno', 'Pago de pista', 'Arbitraje', 'Inscripción de liga');
