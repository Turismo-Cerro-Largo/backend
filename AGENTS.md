# Cerro Largo 360 · Backend

## Alcance y desarrollo local

Esta guía incluye el contexto de `loca`. En `cloud`, seguí primero `docs/cloudflare.md` y usá Wrangler, D1 y Cloudflare Email Service. La API usa Node.js, Hono, TypeScript ESM, Zod, Prisma con el adaptador MariaDB, Argon2 y Nodemailer. El frontend SvelteKit vive en el repositorio hermano.

- Instalá con `pnpm install` y copiá `.env.example` a `.env`. `DATABASE_URL` y `DATABASE_*` deben apuntar a la misma base MySQL o MariaDB.
- `pnpm dev` inicia `src/index.ts` en el puerto 4000. `pnpm build` compila y `pnpm start` ejecuta el resultado.
- `pnpm orm:generate --config prisma7.config.ts` genera el cliente. `pnpm orm:deploy --config prisma7.config.ts` aplica las migraciones pendientes.
- `pnpm test` ejecuta Vitest. Para revisar tipos sin compilar, usá `pnpm exec tsc --noEmit`. `pnpm check` y los scripts `format:*` escriben en los archivos. `orm:pereza` reinicia la base y borra sus datos.

## Organización y rutas

| Área | Ubicación y responsabilidad |
| --- | --- |
| Arranque | `src/index.ts` inicia el servidor. `src/app.ts` configura Hono. `src/app/app-router.ts` monta los módulos bajo `/api`. |
| Autenticación | `src/app/auth/` gestiona login, registro, Google OAuth, sesión, verificación de correo y recuperación. |
| Administración | `src/app/admin/` sirve el resumen y la gestión de eventos, ubicaciones, localidades, usuarios, organizadores y moderación. `/api/moderacion-valoraciones` conserva un alias histórico. |
| Organizador | `src/app/organizador/` gestiona perfil y eventos propios. La gestión de eventos exige aprobación. |
| Turista | `src/app/turista/` gestiona perfil, foto, favoritos, lugares y valoraciones del usuario. |
| Catálogo público | `src/app/publico/publico-router.ts` monta lugares, localidades, categorías, eventos, ubicaciones, archivos, transporte y horarios. Algunas mutaciones viven en esos módulos y tienen autorización propia. |
| Infraestructura | `src/configuracion/` centraliza entorno, Prisma, errores y middleware global. `src/middleware/` contiene sesión, orígenes, Turnstile, límites y archivos. |
| Datos y contenido | `prisma/` contiene esquema, migraciones y seed de categorías. `scripts/` tiene utilidades locales, datos de demostración y transporte. `auto/` conserva imágenes y sus fuentes. |

Al cambiar un endpoint, revisá sus consumidores en el frontend y mantené las URLs, el formato del cuerpo, los estados y las respuestas que usan los llamadores existentes. Reutilizá los esquemas, servicios y repositorios del módulo. Comprobá el rol y la propiedad del recurso en la API.

## Cuentas, correo y seguridad

- `Session.ts` maneja la cookie firmada `session`, con `HttpOnly`, `SameSite=Lax` y `Secure` en producción. `GET /api/auth/check` reconstruye la cuenta para el frontend.
- El registro por contraseña crea una cuenta pendiente de verificar. El RUT/RUC del organizador es opcional. La verificación y el reenvío pasan por `/api/auth/verificacion/confirmar` y `/api/auth/verificacion/reenviar`. El código vence a los 15 minutos y se consume al verificar. El registro y la verificación no crean sesión. El organizador sigue pendiente de aprobación.
- `POST /api/auth/recuperacion/solicitar` recibe JSON con `email` y `turnstileToken`. Mantiene una respuesta genérica para cuentas con y sin coincidencia. `/api/auth/recuperacion/confirmar` recibe el token del enlace y la nueva contraseña. El token se guarda como hash y es de un solo uso.
- El middleware valida Turnstile en login, registros y solicitud de recuperación. Las acciones `login`, `register`, `register-organizador` y `recuperar-contrasena` deben coincidir con el frontend. Configurá `TURNSTILE_SECRET_KEY` y, si corresponde, `TURNSTILE_HOSTNAME`.
- `correo.ts` comparte el transporte de Gmail para verificación y recuperación. Configurá `MAIL_MODE=gmail`, `GMAIL_USER`, `GMAIL_APP_PASSWORD` y, opcionalmente, `MAIL_FROM_NAME`. `APP_PUBLIC_URL` fija el origen del frontend para los enlaces. Para Google, revisá `Google.ts`, `GOOGLE_ID`, `GOOGLE_SECRET` y el callback autorizado en la consola.
- `APP_ORIGINS` autoriza los orígenes del frontend. CORS permite credenciales y la API verifica el origen de las mutaciones, incluido JSON. No registres contraseñas, tokens, códigos ni secretos.

## Base de datos, archivos y pruebas

- La fuente del esquema es `prisma/schema.prisma`. El cliente se genera en `src/configuracion/generated/prisma`. Revisá la historia de migraciones antes de aplicar cambios a una base existente. `cambios-pendientes.sql` contiene cambios que también pueden estar en la migración inicial según el checkout. Comprobá el esquema aplicado antes de ejecutar ese SQL.
- Los archivos públicos y los documentos privados se manejan por separado con `Archivos.ts` y `src/services/archivos.service.ts`. Las fotos de perfil usan `TURISTA_PHOTO_DIR` cuando está configurado. Conservá controles de formato, tamaño, acceso y limpieza de cargas fallidas.
- `tests/` cubre rutas, catálogo, turista, registro, CSRF, correo, recuperación y Turnstile. Las pruebas de recuperación que escriben datos requieren que `TURISTA_TEST_DB` coincida con una base aislada admitida por la suite. El modo de correo local está restringido a pruebas aisladas.
- Para contexto histórico consultá `docs/arquitectura-backend.md`, `docs/base-de-datos.md` y `docs/transporte-y-mapa.md`. Contrastá siempre con los routers y esquemas actuales.

## Rama cloud y skills

- `cloud` usa Cloudflare Workers, Wrangler, D1 con binding `DB` y Supabase Storage. Revisá allí `wrangler.jsonc`, `migrations/`, `.dev.vars.example` y los scripts de `package.json`. `pnpm db:remote`, `pnpm seed:full:remote` y `pnpm deploy` operan sobre recursos remotos. Los cambios de `loca` deben revisarse y adaptarse al runtime y al esquema de esa rama.
- Las skills de Prisma están registradas en `skills-lock.json`. Usá la skill del área que corresponda y actualizá el lock con la CLI de skills.
