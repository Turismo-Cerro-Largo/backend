# Despliegue de cloud-2

Esta rama parte de `loca` y usa PostgreSQL y Storage de un proyecto Supabase nuevo. La API se ejecuta en el Worker `cerro-largo-api-cloud-2` y el frontend se publica en un proyecto Vercel nuevo con `cloud-2` como rama de producción.

## Supabase

1. Creá un proyecto nuevo y un bucket **privado** llamado `cerro-largo-files`. El Worker controla el acceso de lectura a documentos, fotos de perfil y recursos.
2. En el backend, guardá en `.env` la URL directa de PostgreSQL en `DIRECT_URL`. Si tu red no tiene IPv6, usá el pooler en modo sesión, puerto 5432. Activá TLS y codificá los caracteres especiales de la contraseña.
3. Instalá dependencias y ejecutá `pnpm db:deploy`. La migración inicial prepara todas las tablas. La base empieza vacía. Una importación de datos de MySQL o archivos existentes se hace por separado.
4. Si importás datos existentes, conservá los IDs y ajustá las secuencias. En Storage, conservá las rutas de los objetos `publicos/`, `privados/`, `privado/perfiles/`, `publico/eventos/` y `publico/demo/`. Para archivos del catálogo inicial, mantené el prefijo `publicos/seed/`.

## Cloudflare Workers

Revisá el dominio nuevo de Vercel en `APP_PUBLIC_URL`, `APP_ORIGINS` y `GOOGLE_REDIRECT_URI` en `wrangler.jsonc`. Si Google OAuth está habilitado, agregá ese callback en Google Cloud.

El Worker desplegado se conecta a PostgreSQL con el binding `HYPERDRIVE`. Configurá Hyperdrive con el host directo de Supabase, `verify-full` y el certificado raíz de Supabase. Mantené desactivada la caché de consultas para que los cambios de la aplicación se vean de inmediato.

Ejecutá cada comando desde el backend y pegá el valor cuando Wrangler lo pida.

```cmd
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put DATABASE_CA_CERT < prod-ca-2021.crt
pnpm exec wrangler secret put COOKIE_SECRET
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_SECRET_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put GMAIL_USER
pnpm exec wrangler secret put GMAIL_APP_PASSWORD
```

- `DATABASE_URL` apunta al pooler de Supabase en modo transacción, puerto 6543. Si cargás el certificado raíz de Supabase en `DATABASE_CA_CERT`, omití `sslmode` de esa URL para que el Worker valide TLS con ese certificado. Usá `DIRECT_URL` para migraciones.
- `SUPABASE_SECRET_KEY` es la clave privada `sb_secret_` del proyecto nuevo. Cargala solo en el backend.
- `COOKIE_SECRET` debe ser nuevo, aleatorio y de al menos 32 caracteres.
- Configurá `TURNSTILE_HOSTNAME` con el dominio del frontend y autorizá ese dominio en el widget. Si activás Google, cargá `GOOGLE_ID` y `GOOGLE_SECRET` de la misma forma.
- Nodemailer usa SMTP de Gmail con TLS en el puerto 465 y `nodejs_compat`. Verificá el envío de los correos de registro y recuperación después del deploy.
- Argon2 conserva los hashes de las cuentas. Las operaciones de contraseña pueden requerir el plan Workers Paid debido al presupuesto de CPU.

Ejecutá `pnpm deploy:check` y después `pnpm deploy`. Para probar localmente el Worker, copiá `.dev.vars.example` a `.dev.vars` y ejecutá `pnpm dev:worker`.

## Vercel

Importá el frontend en un proyecto nuevo y seleccioná `cloud-2` como rama de producción. Cargá `API_URL` sin `/api`, `PUBLIC_MAPBOX_TOKEN` y `PUBLIC_TURNSTILE_SITE_KEY`. `API_URL` y el destino de `vercel.json` deben apuntar al Worker nuevo.

Para autocompletar direcciones en el panel, cargá `GEOCODING_REVERSE_URL` con un servicio compatible con Nominatim y apto para las instancias de Vercel. La dirección y la localidad se pueden seguir ingresando manualmente.
