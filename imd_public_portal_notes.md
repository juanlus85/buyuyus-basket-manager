# Portal público IMD — hallazgos iniciales

- URL examinada: `https://imd.sevilla.org/app/jjddmm_resultados/`.
- El portal permite seleccionar resultados provisionales o definitivos, competición y buscar un equipo por texto.
- La búsqueda de `BUYUYUS` devuelve una única coincidencia pública: `C.B.BUYUYUS`, baloncesto, categoría sénior mixto, distrito Cerro Amate, grupo `1ªA02` para la competición 2025–2026.
- Tras seleccionar el equipo, el portal presenta consultas de calendarios, clasificaciones, resultados, tabla cruzada y comités, además de un selector de jornadas 1–18.
- Próximo paso: inspeccionar las peticiones públicas que alimentan las pestañas de resultados y clasificación antes de elegir la estrategia de sincronización.

## Datos verificados mediante la interfaz pública

La pestaña de clasificación devuelve la tabla completa del grupo seleccionado. Para la temporada 2025–2026, C.B. Buyuyus figura en cuarta posición tras 17 partidos, con 10 victorias, 7 derrotas, 617 tantos a favor, 589 en contra y 27 puntos. La pestaña de resultados devuelve, para el mismo equipo y grupo, una tabla de 17 jornadas con local, visitante, marcador y observaciones; la jornada 18 permanece sin marcador.

El documento HTML confirma que todas las pestañas cargan contenido desde la ruta pública relativa `resultados.php` mediante una solicitud con parámetros de opción, estado provisional/definitivo, competición, distrito, texto de búsqueda, identificador de equipo y jornada. El identificador público observado de C.B. Buyuyus es `6A1D3BC0-FDF0-471A-A89A-9F61BE13303C` para la competición 2025–2026.
