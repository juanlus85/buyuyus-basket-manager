# Despliegue de Buyuyus Basket Manager en VPS

Esta aplicación se ejecuta como un servicio **Node.js** con una base de datos compatible con **MySQL 8**. La configuración indicada a continuación está pensada para un servidor con Plesk, acceso SSH y Node.js 23.11.1, como el servidor previsto para `buyuyus.blancoguzman.es`.

> La aplicación utiliza autenticación OAuth y servicios de almacenamiento e importación asistida configurables mediante variables de entorno. Antes de publicar, deben sustituirse por credenciales reales y válidas del proveedor elegido. No se deben utilizar los valores de ejemplo ni copiar secretos al repositorio.

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

Desde el directorio de la aplicación en el VPS, copie el código fuente y cree el archivo `.env` a partir de `.env.production.example`. Ajuste como mínimo `DATABASE_URL`, `JWT_SECRET`, las variables de OAuth y las credenciales de almacenamiento e IA.

```bash
cp .env.production.example .env
chmod 600 .env
```

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

El comando equivalente si se gestiona el proceso por SSH es el siguiente:

```bash
NODE_ENV=production pnpm start
```

Después de reiniciar la aplicación desde Plesk, compruebe que `https://buyuyus.blancoguzman.es` responde y que la redirección de OAuth usa exactamente ese dominio HTTPS como URL autorizada.

## 5. Operación y copias de seguridad

La base de datos contiene información de equipo y movimientos económicos. Programe una copia diaria de MySQL desde Plesk y conserve varias versiones. Las fotografías, justificantes y documentos se almacenan fuera de la base de datos; deben mantenerse disponibles en el servicio de almacenamiento configurado.

| Elemento | Qué conservar |
|---|---|
| MySQL | Copia diaria y prueba periódica de restauración |
| `.env` | Copia cifrada y fuera del repositorio |
| Almacenamiento de archivos | Fotos, justificantes e importaciones |
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
