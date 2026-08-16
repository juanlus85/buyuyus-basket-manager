START TRANSACTION;

INSERT INTO seasons (name, startsAt, endsAt, isCurrent, description)
VALUES ('Temporada 2025–2026', '2025-09-01 00:00:00', '2026-06-30 23:59:59', false, 'Histórico importado desde el libro de caja anterior.');
SET @historical_season_id = LAST_INSERT_ID();

INSERT INTO seasons (name, startsAt, endsAt, isCurrent, description)
VALUES ('Temporada 2026–2027', '2026-09-01 00:00:00', '2027-06-30 23:59:59', true, 'Nueva temporada. Los cargos se generan únicamente desde sus vencimientos.');
SET @current_season_id = LAST_INSERT_ID();

INSERT INTO teamAccounts (name, holderName, type, openingBalanceCents, notes)
VALUES ('Caja Juanlu', 'Juanlu', 'cash', 0, 'Caja histórica y operativa. El saldo acumulado de la temporada anterior se conserva aquí.');
SET @juanlu_account_id = LAST_INSERT_ID();

INSERT INTO teamAccounts (name, holderName, type, openingBalanceCents, notes)
VALUES ('Caja Maline', 'Alex Maline', 'cash', 0, 'Caja operativa de Maline; comienza sin saldo heredado.');

INSERT INTO playerProfiles (fullName, shortName, status, joinedAt)
VALUES
('Juanlu', 'Juanlu', 'active', '2025-09-01'), ('Alex Maline', 'Alex Maline', 'active', '2025-09-01'),
('Dani', 'Dani', 'active', '2025-09-01'), ('Rufo', 'Rufo', 'active', '2025-09-01'),
('Atalaga', 'Atalaga', 'active', '2025-09-01'), ('Jaime 2H', 'Jaime 2H', 'active', '2025-09-01'),
('Santi', 'Santi', 'active', '2025-09-01'), ('Adri', 'Adri', 'active', '2025-09-01'),
('Jaime JASP', 'Jaime JASP', 'active', '2025-09-01'), ('Wio', 'Wio', 'active', '2025-09-01'),
('Gotor', 'Gotor', 'active', '2025-09-01'), ('Jesús Piño', 'Jesús Piño', 'active', '2025-09-01'),
('Álvaro Proy', 'Álvaro Proy', 'active', '2025-09-01'), ('Ángel', 'Ángel', 'active', '2025-09-01'),
('Álvaro Clivelan', 'Álvaro Clivelan', 'active', '2025-09-01');

INSERT INTO teamFinancialCategories (name, direction, defaultAmountCents) VALUES
('Cuotas', 'income', 6000), ('Alquiler de pista', 'expense', NULL), ('Arbitraje', 'expense', 1600), ('Inscripción de liga', 'expense', NULL);

INSERT INTO financeTemplates (name, direction, categoryId, defaultAccountId, defaultConcept, defaultAmountCents, notes)
VALUES
('Cuota de jugador', 'income', (SELECT id FROM teamFinancialCategories WHERE name = 'Cuotas' AND direction = 'income'), @juanlu_account_id, 'Cuota de liga', 6000, 'Plantilla reutilizable de cuota.'),
('Pago de pista', 'expense', (SELECT id FROM teamFinancialCategories WHERE name = 'Alquiler de pista' AND direction = 'expense'), @juanlu_account_id, 'Alquiler de pista', NULL, 'Usar para entrenamiento o partido.'),
('Arbitraje', 'expense', (SELECT id FROM teamFinancialCategories WHERE name = 'Arbitraje' AND direction = 'expense'), @juanlu_account_id, 'Arbitraje', 1600, 'Coste habitual de arbitraje.'),
('Inscripción de liga', 'expense', (SELECT id FROM teamFinancialCategories WHERE name = 'Inscripción de liga' AND direction = 'expense'), @juanlu_account_id, 'Inscripción de liga', NULL, 'Inscripción o renovación de competición.');

INSERT INTO feePlans (seasonId, name, concept, isActive, notes)
VALUES (@historical_season_id, 'Cuotas liga 2025–2026', 'Cuota de liga', false, 'Histórico importado.');
SET @historical_plan_id = LAST_INSERT_ID();
INSERT INTO feeInstallments (feePlanId, label, amountCents, dueAt) VALUES
(@historical_plan_id, 'Primer pago', 6000, '2025-09-01 00:00:00'), (@historical_plan_id, 'Segundo pago', 6000, '2026-02-01 00:00:00');

INSERT INTO playerCharges (playerId, seasonId, feeInstallmentId, concept, amountCents, dueAt, status)
SELECT p.id, @historical_season_id, i.id, CONCAT('Cuota de liga · ', i.label), i.amountCents, i.dueAt, 'open'
FROM playerProfiles p CROSS JOIN feeInstallments i
WHERE i.feePlanId = @historical_plan_id;

INSERT INTO playerPayments (playerId, seasonId, accountId, amountCents, paidAt, method, status, concept)
VALUES
((SELECT id FROM playerProfiles WHERE fullName='Juanlu'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Alex Maline'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Dani'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Rufo'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Atalaga'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Jaime 2H'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Santi'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Adri'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-25', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Jaime JASP'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-28', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Wio'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-28', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Gotor'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-28', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Jesús Piño'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-28', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Álvaro Proy'), @historical_season_id, @juanlu_account_id, 6000, '2025-09-28', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Ángel'), @historical_season_id, @juanlu_account_id, 6000, '2025-10-10', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Álvaro Clivelan'), @historical_season_id, @juanlu_account_id, 6000, '2025-10-10', 'cash', 'confirmed', 'Primer Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Adri'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-15', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Ángel'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-16', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Wio'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-17', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Álvaro Clivelan'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-18', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Jaime JASP'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-19', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Atalaga'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-20', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Dani'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-21', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Alex Maline'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-22', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Juanlu'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-23', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Jesús Piño'), @historical_season_id, @juanlu_account_id, 6000, '2026-04-24', 'cash', 'confirmed', 'Segundo Pago Cuota'),
((SELECT id FROM playerProfiles WHERE fullName='Álvaro Proy'), @historical_season_id, @juanlu_account_id, 6000, '2026-06-21', 'cash', 'confirmed', 'Segundo Pago Cuota');

UPDATE playerCharges pc JOIN feeInstallments fi ON pc.feeInstallmentId = fi.id
SET pc.status = 'settled'
WHERE fi.feePlanId = @historical_plan_id AND fi.label = 'Primer pago';
UPDATE playerCharges pc JOIN feeInstallments fi ON pc.feeInstallmentId = fi.id JOIN playerProfiles p ON pc.playerId = p.id
SET pc.status = 'settled'
WHERE fi.feePlanId = @historical_plan_id AND fi.label = 'Segundo pago' AND p.fullName IN ('Adri', 'Ángel', 'Wio', 'Álvaro Clivelan', 'Jaime JASP', 'Atalaga', 'Dani', 'Alex Maline', 'Juanlu', 'Jesús Piño', 'Álvaro Proy');

INSERT INTO teamTransactions (seasonId, accountId, categoryId, direction, concept, amountCents, occurredAt, notes)
VALUES
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 10800, '2025-09-25', 'Septiembre CEU'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Inscripción de liga' AND direction='expense'), 'expense', 'Inscripcion Liga', 9050, '2025-10-20', NULL),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 13000, '2025-10-20', 'Octubre CEU'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Liga', 7650, '2025-11-20', NULL),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 13800, '2026-01-11', 'Enero CEU'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 5100, '2026-03-16', 'Alcosa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 5100, '2026-04-01', 'Alcosa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 24250, '2026-04-17', 'Bormujos'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 1275, '2026-04-28', 'Alcosa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Alquiler de pista' AND direction='expense'), 'expense', 'Alquiler Pista Entreno', 3700, '2026-05-11', 'Alcosa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Inscripción de liga' AND direction='expense'), 'expense', 'Inscripcion Liga', 28042, '2026-05-12', 'Liga Alternativa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-11-09', 'Desfase'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-11-16', 'Peña la Keka'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-11-23', 'Fafa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-11-30', 'Cartuja City'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-12-14', 'D Bar N Bar'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2025-12-21', 'Al Paso Careba'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-01-11', 'Flama'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-01-18', 'Macasta'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-01-25', 'Dabrowa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-02-01', 'Desfase'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-02-08', 'Peña la Keka'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-02-15', 'Fafaa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-02-22', 'Cartuja City'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-03-08', 'D Bar en Bar'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-03-15', 'Al Paso'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-03-22', 'Flama'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-04-12', 'Macasta'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Arbitraje' AND direction='expense'), 'expense', 'Arbitraje', 1600, '2026-04-19', 'Dabrowa'),
(@historical_season_id, @juanlu_account_id, (SELECT id FROM teamFinancialCategories WHERE name='Cuotas' AND direction='income'), 'income', 'Segundo Pago Cuota', 6000, '2026-05-07', 'Cobro recibido sin jugador identificado en el libro original.');

INSERT INTO feePlans (seasonId, name, concept, isActive, notes)
VALUES (@current_season_id, 'Cuotas liga 2026–2027', 'Cuota de liga', true, 'Dos pagos de 60,00 €: 1 de septiembre y 1 de febrero.');
SET @current_plan_id = LAST_INSERT_ID();
INSERT INTO feeInstallments (feePlanId, label, amountCents, dueAt) VALUES
(@current_plan_id, 'Primer pago', 6000, '2026-09-01 00:00:00'), (@current_plan_id, 'Segundo pago', 6000, '2027-02-01 00:00:00');

COMMIT;
