# Cerro Largo 360 · Backend

Cerro Largo 360 es un portal para descubrir lugares, eventos y servicios turísticos del departamento. Este repositorio contiene la API que usa el sitio para consultar el catálogo y los horarios de ómnibus, administrar contenido y gestionar las cuentas de turistas y organizadores.

En `cloud-2`, la API usa Hono y Prisma con PostgreSQL. Consultá [el despliegue de cloud-2](DEPLOY-CLOUD-2.md) para publicar el Worker con Supabase.

## Desarrollo local

1. Instalá las dependencias con `pnpm install`.
2. Copiá [`.dev.vars.example`](.dev.vars.example) a `.dev.vars`. Configurá `DATABASE_URL` con PostgreSQL, completá `COOKIE_SECRET` y revisá `APP_PUBLIC_URL` y `APP_ORIGINS`. Para ejecutar las migraciones, configurá `DIRECT_URL` en `.env`.
3. Para una base nueva, aplicá las migraciones, generá el cliente e iniciá el servidor.

```sh
pnpm db:deploy
pnpm orm:generate
pnpm dev
```

La API escucha en `http://localhost:4000`. Si ya tenés una base con datos, revisá el historial de migraciones antes de aplicar cambios.

Para probar login, registro y solicitud de recuperación, configurá `TURNSTILE_SECRET_KEY`. Para enviar los correos de verificación y recuperación, usá `MAIL_MODE=gmail`, `GMAIL_USER` y `GMAIL_APP_PASSWORD`. El inicio de sesión con Google tiene sus propias credenciales.

`pnpm test` ejecuta las pruebas, `pnpm build` compila la API y `pnpm dev:worker` inicia Wrangler localmente.

## Organización de las rutas

Las rutas se montan bajo `/api` desde [`src/app/app-router.ts`](src/app/app-router.ts).

| Ruta | Qué ofrece |
| --- | --- |
| `/api/auth` | Login, registro, sesión, verificación de correo y recuperación de contraseña. |
| `/api/admin` | Gestión del catálogo, usuarios, organizadores y moderación. |
| `/api/organizador` | Perfil y gestión de eventos propios. |
| `/api/turista` | Perfil, favoritos y valoraciones. |
| `/api/lugares`, `/api/localidades`, `/api/eventos` y `/api/transporte` | Consultas públicas del catálogo y del transporte. |

El esquema está en [`prisma/schema.prisma`](prisma/schema.prisma). Para detalles de trabajo, consultá [`AGENTS.md`](AGENTS.md).
