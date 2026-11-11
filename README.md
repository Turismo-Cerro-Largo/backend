# Cerro Largo 360 · Backend

API del proyecto con Hono, Prisma y MySQL o MariaDB.

## Desarrollo local

1. Instalá las dependencias con `pnpm install`.
2. Copiá `.env.example` a `.env`. Completá la conexión a la base local y `COOKIE_SECRET`.
3. Prepará la base y arrancá la API.

```bash
pnpm orm:deploy --config prisma7.config.ts
pnpm orm:generate --config prisma7.config.ts
pnpm dev
```

La API escucha en `http://localhost:4000`.

## Opcional

Para usar Google, completá las variables `GOOGLE_*`. Para enviar correos de recuperación, configurá `MAIL_MODE=gmail`, `GMAIL_USER` y `GMAIL_APP_PASSWORD` con una contraseña de aplicación.

Usá `pnpm test` para las pruebas y `pnpm build` para compilar.

## Organización de las rutas

`src/app/app-router.ts` reúne las rutas bajo `/api`. Los módulos de `src/app/` agrupan los endpoints por función: `/api/auth` para el acceso y la recuperación, `/api/admin` para administración, `/api/organizador` para organizadores y `/api/turista` para turistas. `src/app/publico/` reúne las rutas públicas, como las de eventos y transporte.
