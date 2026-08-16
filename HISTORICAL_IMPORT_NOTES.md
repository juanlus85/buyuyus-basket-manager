# Notas de importación histórica

Las capturas del libro anterior muestran una estructura compatible con la nueva contabilidad: fecha, concepto, persona, tipo, importe, saldo acumulado y comentarios. Se ha podido verificar que existían dos cuotas de liga de **60,00 €**, identificadas como *Primer Pago Cuota* y *Segundo Pago Cuota*.

La primera captura contiene movimientos fechados desde septiembre de 2025 hasta abril de 2026. Entre los conceptos legibles aparecen alquiler de pista de entrenamiento, alquiler de pista de liga, inscripción de liga y arbitraje. El saldo mostrado al final de la hoja es **471,50 €**, pero debe validarse contra el libro fuente completo antes de tratarlo como saldo de apertura de las cajas.

La segunda captura confirma que la plantilla activa usaba dos columnas de seguimiento de cuota de 60 €, y que había algunos segundos pagos pendientes. La migración real se hará con una hoja exportable o el archivo Excel original para conservar fecha, responsable y caja de cada movimiento. No se crearán datos supuestos a partir de las imágenes.

> Pendiente: recibir el Excel original o una exportación CSV para cargar todos los ingresos, gastos y saldos de caja como histórico de la temporada anterior.

## Resultado de la carga validada

La carga se ha ejecutado con **15 jugadores**, **30 cargos históricos** y **26 pagos identificados**. La temporada 2026–2027 se ha creado como temporada activa sin cargos ni pagos propios. Se configuraron dos vencimientos de 60,00 € para el 1 de septiembre de 2026 y el 1 de febrero de 2027.

El saldo calculado de Caja Juanlu es **98,33 €**, coincidente con el saldo neto del extracto. Se registró por separado un ingreso de 60,00 € del 7 de mayo de 2026 sin jugador asignado porque el origen no estaba identificado en la fuente. Este movimiento queda documentado como pendiente de asociar si se recupera la información.
