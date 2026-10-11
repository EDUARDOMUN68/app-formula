# Arquitectura

La interfaz es HTML, CSS y JavaScript sin dependencias de compilación. `app.js` presenta el calendario, el detalle de sesiones y las clasificaciones. `logic.js` centraliza los estados por sesión y la conversión a `Europe/Madrid`. El service worker guarda los archivos de interfaz; los datos usan una petición de red sin caché y una copia en almacenamiento local como respaldo.

`scripts/update_data.py`, escrito con la biblioteca estándar de Python, obtiene exclusivamente publicaciones de Formula 1. Descubre los grandes premios desde el calendario oficial, identifica las rutas de resultados mediante el índice oficial y recoge las sesiones desde JSON-LD. No supone horarios ni que todos los grandes premios tengan sprint. Las tablas se analizan con HTMLParser, eliminando los códigos de piloto duplicados para móvil.

El archivo JSON contiene temporada, fecha de importación, carreras ordenadas, horarios UTC originales, resultados por sesión, campeonatos y enlaces a las fuentes. La escritura es atómica y sucede únicamente cuando la importación completa es válida. La fecha de importación describe la descarga; no implica que la fuente ya haya publicado los resultados de una sesión.

El workflow de actualización guarda cambios en `main`. Pages publica en cada cambio y también tras la ejecución satisfactoria del importador, ya que los commits de GITHUB_TOKEN no disparan otros workflows de push. No se necesitan credenciales de Formula 1 ni secretos de aplicación.
