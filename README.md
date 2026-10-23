# Backend - Cerro Largo 360

```bash
npm install
npm run dev
```

Abrir: `http://localhost:3000`

## Base de datos

El backend utiliza **MySQL/MariaDB + Prisma ORM 7**.

El modelo completo está en:

- `prisma/schema.prisma`
- `prisma/migrations/20260923215100_base_datos_mer_documentacion/migration.sql`
- `docs/base-de-datos.md`

### Configuración

Las migraciones usan `DATABASE_URL` desde `prisma7.config.ts`.
La conexión de la aplicación usa además:

- `DATABASE_HOST`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `DATABASE_PORT`

### Aplicar migraciones

```bash
npm run orm:deploy
npm run orm:generate
```

Durante desarrollo también se puede usar:

```bash
npx prisma migrate dev
npx prisma generate
```

> Importante: la primera migración histórica del repositorio contenía solamente una tabla
> `usuario` de prueba. La migración del modelo completo reemplaza esa tabla. Si alguien
> hubiera cargado datos reales en ella, debe respaldarlos antes de aplicar la nueva migración.

## CSRF y Gmail

`APP_ORIGINS` es una lista separada por comas de orígenes del frontend (protocolo, dominio y puerto, sin rutas). Se comparte entre CORS y el middleware oficial `hono/csrf`. Se conserva la validación de origen existente para las mutaciones JSON, que el CSRF oficial no inspecciona. Los rechazos del middleware oficial mantienen su código HTTP 403.

Para el correo de recuperación con Nodemailer y una cuenta Google:

1. Activar la verificación en dos pasos y crear una contraseña de aplicación en https://myaccount.google.com/apppasswords.
2. En `.env`, definir `MAIL_MODE=gmail`, `GMAIL_USER` y `GMAIL_APP_PASSWORD` (16 caracteres, con o sin espacios). `MAIL_FROM_NAME` configura el nombre visible del remitente.
3. Configurar `APP_PUBLIC_URL` con el origen del frontend; usar HTTPS en producción.

No usar la contraseña normal de Google. Las credenciales OAuth del inicio de sesión (`GOOGLE_ID`/`GOOGLE_SECRET`) son independientes. El remitente usa la misma cuenta de `GMAIL_USER`. Las variables antiguas `SMTP_*` se reemplazan por `GMAIL_USER` y `GMAIL_APP_PASSWORD`; no se usan otros proveedores SMTP. La configuración predeterminada de `.env.example` mantiene el correo desactivado hasta completar las credenciales.

Las pruebas de `tests/correo.test.ts` simulan el transporte: no envían correos reales. `MAIL_MODE=local` se conserva únicamente para las bases aisladas de pruebas.
