# Notas de importación histórica

Las capturas del libro anterior muestran una estructura compatible con la nueva contabilidad: fecha, concepto, persona, tipo, importe, saldo acumulado y comentarios. Se ha podido verificar que existían dos cuotas de liga de **60,00 €**, identificadas como *Primer Pago Cuota* y *Segundo Pago Cuota*.

La primera captura contiene movimientos fechados desde septiembre de 2025 hasta abril de 2026. Entre los conceptos legibles aparecen alquiler de pista de entrenamiento, alquiler de pista de liga, inscripción de liga y arbitraje. El saldo mostrado al final de la hoja es **471,50 €**, pero debe validarse contra el libro fuente completo antes de tratarlo como saldo de apertura de las cajas.

La segunda captura confirma que la plantilla activa usaba dos columnas de seguimiento de cuota de 60 €, y que había algunos segundos pagos pendientes. La migración real se hará con una hoja exportable o el archivo Excel original para conservar fecha, responsable y caja de cada movimiento. No se crearán datos supuestos a partir de las imágenes.

> Pendiente: recibir el Excel original o una exportación CSV para cargar todos los ingresos, gastos y saldos de caja como histórico de la temporada anterior.

## Resultado de la carga validada

La carga se ha ejecutado con **15 jugadores**, **30 cargos históricos** y **26 pagos identificados**. La temporada 2026–2027 se ha creado como temporada activa sin cargos ni pagos propios. Se configuraron dos vencimientos de 60,00 € para el 1 de septiembre de 2026 y el 1 de febrero de 2027.

El saldo calculado de Caja Juanlu es **98,33 €**, coincidente con el saldo neto del extracto. Se registró por separado un ingreso de 60,00 € del 7 de mayo de 2026 sin jugador asignado porque el origen no estaba identificado en la fuente. Este movimiento queda documentado como pendiente de asociar si se recupera la información.

## Datos federativos visibles

La hoja de plantilla histórica confirma que el libro guardaba estado de actividad, dorsal, DNI, fecha de nacimiento y talla de camiseta. Estos datos son adecuados para completar fichas desde administración, pero no permiten deducir partidos, resultados ni clasificación de 2025–2026.

## Partidos deportivos verificados

Las capturas de resultados muestran partidos de la fase regular 2025–2026. Se pueden leer de forma verificable, entre otros, los siguientes resultados de C.B. Buyuyus: visitante ante Desfase Forastero, **50–52** el 1 de febrero de 2026; local ante Cartuja City Camino Vivos, **33–43** el 22 de febrero de 2026; visitante ante Al Paso C B Careba, **40–21** el 14 de marzo de 2026; visitante ante C.B. Macasta Azul, **39–37** el 12 de abril de 2026. Las capturas no contienen todas las jornadas ni una clasificación final completa, por lo que se cargarán únicamente resultados legibles y se conservará la clasificación como pendiente de fuente completa.

La clasificación visible de la jornada 17 sitúa a **C.B. Buyuyus en 4.ª posición**, con 17 partidos jugados, 10 ganados, 0 empatados, 7 perdidos, 617 tantos a favor, 589 en contra y 27 puntos. La competición se identifica como *XLI Juegos Deportivos Municipales 2025–2026*, baloncesto sénior mixto, distrito Cerro Amate, grupo 1ª02. Esta clasificación se puede cargar como resultado histórico de cierre aportado por la fuente.
