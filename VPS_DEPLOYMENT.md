# Despliegue de Buyuyus Basket Manager en VPS

Esta aplicación se ejecuta como un servicio **Node.js** con una base de datos compatible con **MySQL 8**. La configuración indicada a continuación está pensada para un servidor con Plesk, acceso SSH y Node.js 23.11.1, como el servidor previsto para `buyuyus.blancoguzman.es`.

> En Plesk, las fotos, los documentos y los PDFs se guardan en disco local y no requieren claves de Manus/Forge. El almacenamiento gestionado de Forge solo se usa cuando la aplicación sí se ejecuta dentro de WebDev y sus credenciales están disponibles.

## 1. Preparar el subdominio y la base de datos

En Plesk, cree el subdominio `buyuyus.blancoguzman.es` y active un certificado TLS. Cree una base de datos MySQL llamada, por ejemplo, `buyuyus_basket`, además de un usuario de base de datos con contraseña robusta y permisos únicamente sobre dicha base.

| Parámetro | Valor recomendado |
|---|---|
| Dominio | `buyuyus.blancoguzman.es` |
| Runtime | Node.js 23.11.1 |
| Base de datos | MySQL 8 o compatible |
| Modo | `production` |
| Proceso | Una instancia Node.js administrada por Plesk |

## 2. Copiar el proyecto y configurar el entorno

Desde el directorio de la aplicación en el VPS, copie el código fuente y configure `DATABASE_URL` y `JWT_SECRET` como **variables de entorno del sistema/proceso Node.js en Plesk**. No es necesario crear un archivo `.env`. Las claves de almacenamiento Forge no son necesarias para guardar archivos en disco local ni para leer actas IMD y calendarios PDF reconocidos con texto seleccionable.

El valor de `JWT_SECRET` debe generarse de forma aleatoria y mantenerse privado. Para la conexión MySQL, emplee una URL con el formato `mysql://usuario:contraseña@127.0.0.1:3306/buyuyus_basket`.

Para el alta directa de usuarios por correo, configure también las variables SMTP siguientes. La aplicación comprueba la conectividad SMTP antes de habilitar el envío de credenciales.

| Variable | Finalidad |
|---|---|
| `SMTP_HOST` | Nombre del servidor SMTP del remitente. |
| `SMTP_PORT` | Puerto SMTP; normalmente `465` para SSL o `587` para STARTTLS. |
| `SMTP_USER` | Cuenta autenticada para el envío. |
| `SMTP_PASS` | Contraseña o contraseña de aplicación del remitente. |
| `SMTP_FROM` | Remitente visible, por ejemplo `Buyuyus Basket <equipo@dominio.es>`. |

Desde **Administración → Crear usuario y enviar acceso**, el administrador define nombre, correo, usuario, contraseña temporal, rol y ficha opcional. El correo se entrega por SMTP y la aplicación obliga a cambiar esa contraseña en el primer acceso.

## 3. Instalar dependencias, crear el esquema y compilar

Ejecute los siguientes comandos mediante SSH desde la raíz del proyecto. La migración crea las tablas de jugadores, cuentas, pagos, temporadas, competiciones, calendario, avisos e importaciones.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm drizzle-kit migrate
pnpm build
```

Antes de exponer el servicio, compruebe que la compilación termina correctamente.

```bash
pnpm check
pnpm test
```

## 4. Configurar la aplicación en Plesk

En el panel de Node.js de Plesk, indique el directorio raíz del proyecto y configure `dist/index.js` como archivo de inicio. Use `NODE_ENV=production` y deje que Plesk asigne el puerto mediante la variable `PORT`; la aplicación no debe llevar un puerto fijo configurado.

Los archivos subidos se guardan por defecto en `storage/uploads/`, dentro del directorio del proyecto y fuera de `dist/public`. El servidor crea las carpetas necesarias al recibir la primera subida. Si el directorio del proyecto no es escribible por el usuario Node.js de Plesk, defina `FILE_STORAGE_DIR` en Plesk con una ruta absoluta privada y escribible; no use `httpdocs`, `public` ni otra ruta que exponga el contenido directamente. Las descargas se sirven a través de la aplicación con sesión y permisos.

El comando equivalente si se gestiona el proceso por SSH es el siguiente:

```bash
NODE_ENV=production pnpm start
```

Después de reiniciar la aplicación desde Plesk, compruebe que `https://buyuyus.blancoguzman.es` responde y que funciona el acceso con usuario y contraseña local. El equipo no necesita iniciar sesión con una cuenta Manus.

## 5. Operación y copias de seguridad

La base de datos contiene información de equipo y movimientos económicos. Programe una copia diaria de MySQL desde Plesk y conserve varias versiones. Las fotografías, justificantes y documentos se almacenan fuera de la base de datos; deben mantenerse disponibles en el servicio de almacenamiento configurado.

| Elemento | Qué conservar |
|---|---|
| MySQL | Copia diaria y prueba periódica de restauración |
| Variables de entorno de Plesk | Copia cifrada de la configuración, fuera del repositorio |
| Almacenamiento de archivos | El directorio `storage/uploads/` o la ruta `FILE_STORAGE_DIR` configurada en Plesk |
| Código | Repositorio privado o archivo de versión firmado |

## 6. Actualizar la aplicación

Para publicar una versión posterior, active mantenimiento si fuese necesario, haga una copia de la base de datos, copie el nuevo código, ejecute las migraciones y compile de nuevo.

```bash
pnpm install --frozen-lockfile
pnpm drizzle-kit migrate
pnpm build
pnpm check
pnpm test
```

Finalmente, reinicie la aplicación desde Plesk. La pantalla **Administración** muestra la versión y la fecha de compilación para facilitar la comprobación visual de cada actualización.

## 7. Operación de cuotas, cajas y temporadas

Las cuotas periódicas se generan al consultar Cuentas cuando llega su vencimiento; no requieren procesos permanentes ni tareas cron en el VPS. Para cada nueva temporada, configure los vencimientos desde **Cuentas → Cuota programada**. Los pagos solo se incorporan al saldo tras la confirmación del administrador y la asignación de una caja.

El archivo `historical_import_template.tsv` define la plantilla validable para importar históricos. Sus columnas obligatorias son fecha, concepto, dirección, importe, caja y temporada; jugador y método se informan cuando el movimiento es un cobro individual. Antes de una carga masiva, realice una copia de MySQL y contraste el saldo final de cada caja.

Para abrir un nuevo curso, utilice **Cuentas → Cerrar temporada**. La operación archiva el contexto de la temporada activa, abre la nueva sin cargos ni pagos heredados y conserva los saldos de las cajas. Revise la vista previa de cargos abiertos y cajas antes de confirmar.

Los entrenamientos se programan desde **Entrenamientos** y se sincronizan automáticamente con **Calendario** y el resumen. Cada actividad puede incluir lugar, fecha, hora y hora de convocatoria. Los jugadores pueden responder *Voy*, *Quizá* o *No voy*; el recuento queda visible para el equipo.

## 8. Actas y capturas semanales: importación revisable

En **Importación**, selecciona **Acta del partido** y sube el PDF. Las actas IMD con texto reconocible se procesan localmente: rival, marcadores, fecha, hora, pista, fase, distrito, grupo, jornada y jugadores de Buyuyus con faltas P/T/U. No necesitan claves de IA. Los jugadores listados cuentan como participantes, aunque no tengan una marca de entrada.

La subida conserva el documento y crea un borrador. En el historial puedes **Abrir borrador** después de recargar la página y **Ver documento original**. Un error de extracción no equivale a una subida física fallida: si el servidor indica que el documento se guardó, el archivo sigue disponible desde el historial.

Antes de confirmar, selecciona el partido y su temporada, verifica ambos marcadores y vincula cada fila a su ficha. Se propone únicamente una coincidencia inequívoca por nombre completo; **no se asignan estadísticas por dorsal**, porque puede cambiar entre partidos. Una fila desconocida bloquea la confirmación hasta identificarla o excluirla explícitamente. Si necesitas un jugador nuevo, crea su ficha en Plantilla y vuelve al borrador. El botón **Confirmar acta y actualizar estadísticas** aplica el marcador, las participaciones, las faltas y la aprobación del borrador en una misma transacción. Reimportar y confirmar una corrección reemplaza las estadísticas de ese partido; no las suma una segunda vez. Aplicar un acta no reconstruye la tabla de liga a partir de partidos de Buyuyus, por lo que no borra la clasificación oficial capturada semanalmente.

Para capturas semanales, selecciona **Clasificación y resultados**. Incluye cabeceras y tablas completas en una imagen legible. El análisis visual en VPS necesita que el administrador configure en Plesk, como variables del sistema/proceso Node.js, una `OPENAI_API_KEY` propia y una `OPENAI_MODEL` que esté habilitada en esa cuenta y admita visión y respuesta estructurada JSON Schema. La aplicación verifica que el identificador del modelo exista en el catálogo de esa cuenta antes de enviar la captura. La API key nunca llega al navegador; OpenAI puede cobrar el análisis según su cuenta y modelo. No copies claves internas de Manus ni configures las credenciales Forge de WebDev en Plesk: Forge también cambiaría la ruta de almacenamiento de archivos, que en este VPS debe seguir en disco local. En WebDev se conserva el proveedor Forge existente. Sin credenciales de IA, las actas IMD y calendarios PDF reconocidos se procesan localmente; las capturas muestran un error de configuración y permanecen en el historial sin borrador extraído.

Después de analizar una captura, elige competición/temporada, corrige las cifras ilegibles, marca las filas de clasificación a aplicar y asocia cada resultado elegido a su partido. **Confirmar clasificación y resultados seleccionados** actualiza solo esa selección tras la revisión; no inventa participaciones, faltas ni puntos individuales a partir de una clasificación. Si ya existen estadísticas de un acta para un partido, cambiar su marcador recalcula las victorias y derrotas de esos participantes. Una captura nueva conserva una nueva referencia en el historial y no suma los acumulados de clasificación de la semana anterior.

Esta corrección de importación no cambia el esquema MySQL. Para actualizar desde el código anterior, ejecuta en la raíz del proyecto:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
```

Reinicia la aplicación Node.js en Plesk y vuelve a probar el acta. No necesitas migración SQL por estos cambios. El archivo generado `client/src/build-info.ts` sigue ignorado por Git para evitar bloqueos recurrentes en `git pull`.
