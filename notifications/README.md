# Servicio de avisos de APP FORMULA

Worker independiente para recordatorios de sesiones. Requiere Node.js, npm y una cuenta Cloudflare con Workers y Durable Objects SQLite disponibles. La interfaz sigue publicada en GitHub Pages.

1. Ejecutar `npm ci` en esta carpeta y `npm test`.
2. Conectar Wrangler a la cuenta correspondiente y revisar `wrangler.jsonc`.
3. Desplegar con `npm run deploy`.
4. Generar un par VAPID propio con web-push y configurar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` mediante `wrangler secret put`. Introducir valores por stdin o el prompt, nunca por argumentos ni archivos seguidos. Conservar las claves existentes en las siguientes publicaciones; rotarlas invalidaría las suscripciones.
5. Verificar que push-config.js usa el subdominio realmente publicado y que /config responde ready:true desde el origen autorizado.
6. Publicar la interfaz, activar desde el móvil y comprobar una notificación real con la ventana cerrada.

El cron se declara en la configuración. La programación usa alarmas persistentes, pero el proveedor push y el teléfono pueden introducir retrasos. No usar el resultado de un envío aceptado como prueba de recepción física. El código valida el endpoint de cada suscripción y no expone listas de dispositivos.
