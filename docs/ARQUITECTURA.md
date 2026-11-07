# Arquitectura

La interfaz es HTML, CSS y JavaScript sin dependencias de compilación. `app.js` presenta el calendario, el detalle de sesiones y las clasificaciones. `logic.js` centraliza los estados por sesión y la conversión a `Europe/Madrid`. El service worker guarda los archivos de interfaz; los datos usan una petición de red sin caché y una copia en almacenamiento local como respaldo.

`scripts/update_data.py`, escrito con la biblioteca estándar de Python, obtiene exclusivamente publicaciones de Formula 1. Descubre los grandes premios desde el calendario oficial, identifica las rutas de resultados mediante el índice oficial y recoge las sesiones desde JSON-LD. No supone horarios ni que todos los grandes premios tengan sprint. Las tablas se analizan con HTMLParser, eliminando los códigos de piloto duplicados para móvil.

El archivo JSON contiene temporada, fecha de importación, carreras ordenadas, horarios UTC originales, resultados por sesión, campeonatos y enlaces a las fuentes. La escritura es atómica y sucede únicamente cuando la importación completa es válida. La fecha de importación describe la descarga; no implica que la fuente ya haya publicado los resultados de una sesión.

El workflow de actualización guarda cambios en `main`. Pages publica en cada cambio y también tras la ejecución satisfactoria del importador, ya que los commits de GITHUB_TOKEN no disparan otros workflows de push. No se necesitan credenciales de Formula 1 ni secretos de aplicación.


## Parrillas de salida

Cada sesión de carrera o sprint incorpora `grid` (o null) y `gridSource`. El importador obtiene `starting-grid` o `sprint-grid` desde el identificador oficial del gran premio. Valida las columnas y dorsales para rechazar las tablas de error de páginas sin resultados. Guarda tabla, notas originales, dorsales que salen desde boxes y versión de esquema. La tabla oficial puede numerar esos dorsales aunque las notas indiquen pit lane: por eso se analizan ambas publicaciones en conjunto. Las continuaciones sin apellido solo se resuelven si la frase anterior identifica a un único piloto.

`gridEntries` separa pista, boxes y filas sin puesto asignado sin mutar los datos; conserva los huecos oficiales. La interfaz usa SVG propio para los coches y CSS Grid para colocar cada puesto, sin dependencias gráficas. Los enlaces versionados de scripts y estilos y la caché 1.1.0 evitan mezclar interfaces incompatibles. El service worker consulta la red sin usar la caché HTTP intermedia para actualizar la interfaz.


Desde 1.1.1, el esquema de lectura de parrillas es 2. El importador vuelve a consultar las parrillas guardadas con otra versión de esquema aunque hayan transcurrido siete días. Reconoce las formas explícitas required to start, starts/start y will start desde pit lane. Las continuaciones He starts y Required solo se resuelven con un único piloto identificado en la frase inmediatamente anterior; los antecedentes ambiguos y las negaciones no se convierten en salidas desde boxes.


## Avisos 1.2.0

La interfaz usa push-config.js, push-client.js y push-receiver.js, importado este último por sw.js. El cliente adapta el flujo de permisos, reparación y prueba con ventana cerrada del sistema de Madridista. El receptor valida identidad, caducidad y ámbito de URL, guarda identificadores en IndexedDB y usa showNotification sin requerir una ventana abierta. Mantiene respaldo si falla el almacenamiento y permite reintentar si falla la presentación. Protocolo FORMULA_PUSH_STATUS versión 1.2.0.

El Worker independiente formula-session-notices usa Web Push/VAPID, un Durable Object SessionNotices y suscripciones privadas almacenadas en él (límite 100 dispositivos). API /config y /subscription con validación de origen, límites de cuerpo y lista permitida de proveedores push. La clave privada se configura como secreto en Cloudflare, nunca en los archivos de aplicación. No se reutilizan las claves ni los registros de Madridista.

El cron por minuto refresca data/season.json publicado; las alarmas persistentes programan el instante diez minutos anterior al inicio. Los identificadores incluyen temporada, gran premio, sesión e inicio para contemplar reprogramaciones. El servicio no reproduce avisos anteriores al alta y deduplica por dispositivo; las suscripciones caducadas se eliminan. TTL hasta el inicio, ventana de detección 90 segundos, validez de la fuente seis horas. El panel distingue registro de suscripción de recepción demostrada.

El workflow Pages publica únicamente la interfaz, los scripts push y los datos. notifications/, dependencias, claves y registros no se incluyen en el artefacto estático. El backend se despliega por separado. Las pruebas Node cubren planificación, dispositivos, receptor y cliente sin enviar notificaciones a teléfonos reales.
