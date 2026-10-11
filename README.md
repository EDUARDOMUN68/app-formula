# APP FORMULA

Aplicación web en español para consultar la temporada de Fórmula 1, con dos pestañas: **Calendario** y **Campeonato**. Todos los horarios se muestran en hora de España peninsular (`Europe/Madrid`), con cambio de verano e invierno automático.

El calendario incluye cada gran premio y sus sesiones: libres, clasificación, clasificación sprint, sprint y carrera, según el formato oficial. Cada sesión presenta su horario y, cuando están publicados, sus resultados. Los resultados de clasificación y sprint se pueden consultar aunque la carrera siga pendiente. No hay seguimiento en directo.

Campeonato contiene las clasificaciones oficiales de pilotos y constructores. Los puntos se importan de la fuente y no se calculan a partir de las carreras, de modo que se conservan las decisiones y correcciones oficiales.

## Datos y actualización

La única fuente del importador es [formula1.com](https://www.formula1.com/en/racing/2026). El calendario se obtiene de sus eventos estructurados y los resultados y campeonatos de sus tablas públicas. No utiliza una API de terceros ni datos ficticios. Cada tabla incluye un enlace a su publicación original.

`python scripts/update_data.py` actualiza `data/season.json`. No necesita paquetes externos. Por defecto utiliza el año UTC actual; `F1_SEASON` permite seleccionar otra temporada. Una importación incompleta falla sin reemplazar el archivo anterior. Las sesiones recientes se vuelven a consultar durante siete días para recoger correcciones; los resultados antiguos se conservan si ya están importados. Borrar la copia de datos permite reimportar todo el histórico de la temporada.

GitHub Actions está preparado para importar cada hora, además de permitir una ejecución manual. Los trabajos programados pueden retrasarse; la aplicación muestra la fecha y hora de la última importación. El botón Actualizar descarga la última copia publicada: no ejecuta el importador. La actualización automática solo funciona después de publicar y activar los workflows en GitHub.

## Desarrollo y publicación

Ejecutar `python -m http.server 8002` y abrir `http://localhost:8002`. No requiere compilación. Para verificar la lógica: `node --test tests/logic.test.mjs` y `python -m unittest discover -s tests`.

El workflow de GitHub Pages publica únicamente los archivos de la aplicación y `data/`; no incluye scripts de desarrollo ni documentación interna. Configurar Pages con GitHub Actions como origen. La instalación como aplicación requiere HTTPS o localhost y un navegador compatible con PWA. Una copia local permite consultar datos guardados cuando falla la red; se indica expresamente su antigüedad.

La importación depende de la estructura pública de Formula 1. Si cambia, el workflow fallará y será necesario adaptar el importador. Esta aplicación es independiente de Formula 1 y de la FIA.

Consultar [arquitectura](docs/ARQUITECTURA.md) y [cambios](CHANGELOG.md).
