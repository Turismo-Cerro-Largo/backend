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
