# Verificación visual

La revisión final de las pantallas de **Comunicación interna** y **Competición** confirma que la navegación lateral, la jerarquía tipográfica editorial, los controles administrativos y los estados vacíos se presentan correctamente en el entorno de vista previa de escritorio. La marca de Buyuyus Basket Club, la paleta marfil y azul marino, y los botones de acción se mantienen de forma coherente entre ambas áreas.

La pantalla de competición identifica de forma explícita que la clasificación se recalcula a partir de resultados confirmados. La pantalla de comunicación muestra un estado vacío orientado a la acción para administración, evitando una vista genérica o ambigua al comenzar sin avisos.

## Cierre 2025–2026 y apertura 2026–2027

La importación histórica se ha contrastado contra el extracto recibido. **Caja Juanlu** conserva un saldo de **98,33 €**, mientras que Caja Maline comienza en 0,00 €. La temporada 2025–2026 contiene 30 cargos y 26 pagos históricos; la temporada 2026–2027 queda activa, sin cargos ni pagos heredados, con dos cuotas programadas de 60,00 € para el 1 de septiembre de 2026 y el 1 de febrero de 2027.

La vista final de Cuentas presenta la temporada activa, las dos cajas de responsables, los vencimientos actuales y un histórico de movimientos filtrable por caja, temporada y tipo. Los filtros utilizan etiquetas explícitas de “Todas las cajas” y “Todas las temporadas” cuando no se restringe la consulta.

La pantalla de Plantilla muestra la plantilla activa con 15 jugadores, controles de edición por ficha y el acceso administrativo a la exportación PDF. La edición concentra datos deportivos, federativos y el check de actividad para la temporada actual.

## Resumen responsive

La revisión del resumen con tarjetas vacías confirma una composición estable en escritorio y en un viewport móvil de 375 × 812 px. Las tarjetas **Siguiente partido** y **Próximo entrenamiento** conservan una altura mínima uniforme, texto centrado verticalmente y una separación visible respecto a las métricas inferiores; no se solapan ni se tocan entre filas.

## Cobros asignados e invitados de entrenamiento

El formulario **Registrar cobro** exige un jugador y una caja. Si el jugador ya tiene una cuota abierta, el cobro se vincula a ella; si todavía no existe un vencimiento abierto, se habilita la creación explícita de una cuota individual con concepto e importe antes de confirmar el cobro. En la temporada activa no había cuotas abiertas con las que ejecutar un movimiento financiero real, por lo que no se introdujo ninguna transacción de prueba en las cajas del equipo.

Las pruebas automatizadas verifican la creación del cargo individual, la aplicación del pago contra el cargo y su trazabilidad en el historial. Para **Invitado Entreno**, el sistema exige un nombre, lo almacena como `Invitado: <nombre>` y lo recupera en el historial de Cuentas.

El usuario ha confirmado que el flujo de **Invitado Entreno** funciona correctamente en datos reales.

## Acceso de Cuota de jugador

La verificación visual de **Cuentas** confirma que el movimiento habitual **Cuota de jugador** abre el formulario **Registrar cobro**. El primer campo visible es **Quién paga**; la cuota se elige después y, si no existen cuotas abiertas, se muestra la alternativa de crear una cuota individual mediante su concepto.

La comprobación se realizó en la ruta `/cuentas?modo=cobro`, donde el selector **Quién paga** queda visible antes del selector **Cuota o cargo pendiente**.

El usuario confirmó después la prueba persistida: al seleccionar el jugador, el concepto e importe de la cuota individual se conservaron y el cobro pudo registrarse correctamente en el flujo real.
