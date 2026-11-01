# Cerro Largo 360 — Backend Cloudflare

Rama `cloud`: API Hono sobre **Workers**, datos en **D1** y archivos en un bucket **R2 privado**.

## Desarrollo local

```powershell
pnpm install --frozen-lockfile
Copy-Item .dev.vars.example .dev.vars
# Completar COOKIE_SECRET en .dev.vars antes de iniciar.
pnpm orm:generate
pnpm db:local
pnpm dev
```

API: http://localhost:4000. El frontend conserva su contrato `/api`.

## Comprobaciones

- `pnpm check:types`: TypeScript.
- `pnpm test:cloud`: empaquetado de prueba y pruebas aisladas D1/R2, incluida ejecución real en workerd.
- `pnpm build`: generación Prisma, tipos y Wrangler dry-run. No publica.

## Catálogo y archivos locales

- `pnpm seed:generate`: genera `seed/catalogo.sql` desde datos literales sin ejecutar los scripts históricos ni crear cuentas de demostración.
- `pnpm seed:local`: aplica ese catálogo a la D1 local.
- `pnpm files:local`: carga imágenes y archivos existentes en R2 local.

## Despliegue

Configurar IDs de D1, bucket privado R2, dominio/ruta del Worker, origen del frontend y secretos. Correo de recuperación: binding opcional de Cloudflare Email Service, con remitente verificado.

Ver [guía de migración y despliegue](docs/cloudflare.md). No se migran automáticamente datos MySQL ni se publica infraestructura. El esquema y las migraciones anteriores se conservan en `prisma/mysql/`; las instrucciones históricas están en `docs/README-mysql.md`.