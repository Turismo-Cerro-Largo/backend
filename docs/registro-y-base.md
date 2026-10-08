# Registro de cuentas y MySQL

En el esquema actual de Prisma hay dos tablas de cuentas:

- `usuario`: guarda turistas (`rol = TURISTA`) y administradores (`rol = ADMINISTRADOR`).
- `organizador`: guarda las organizaciones y su estado (`PENDIENTE_REVISION`, `APROBADO` o `RECHAZADO`).
- `documento_organizador`: guarda las referencias a los documentos adjuntos de los organizadores.

No hace falta agregar el valor `ORGANIZADOR` al enum `Rol`: es otra tabla.
Un administrador no se puede registrar desde el formulario público. Su cuenta debe ser creada por un procedimiento administrativo autorizado.

## Revisar la base local (sin cambiar datos)

Desde PowerShell, en la carpeta `backend`:

```powershell
pnpm install
pnpm orm:generate
pnpm db:check
```

El comando comprueba conexión, tablas, columnas y valores de roles. No agrega ni elimina registros. También podés ver la diferencia con el esquema:

```powershell
pnpm exec prisma migrate status --config prisma7.config.ts
```

La migración inicial `20261007235553_inicial` está incluida para **bases nuevas vacías**.

### Si la base ya tiene tablas o usuarios

**No ejecutes** `prisma migrate reset`, `prisma db push --force-reset` ni apliques ciegamente una migración inicial sobre tablas existentes.

Primero hacé un respaldo de MySQL y revisá el resultado de `pnpm db:check`. Si hay una estructura anterior, hay que planificar una migración de datos y registrar el estado de migraciones, no recrear tablas.

### Si la base es nueva y está vacía

Con la conexión correcta en `.env`, podés ejecutar la migración inicial:

```powershell
pnpm exec prisma migrate deploy --config prisma7.config.ts
pnpm orm:generate
pnpm db:check
```

## Verificar inicio de sesión

Arrancá el backend con `pnpm dev` y comprobá:

`http://localhost:4000/api/health`

La respuesta `{"api":"ok","database":"ok"}` comprueba acceso al servidor MySQL, pero **no** que estén creadas las tablas. Para eso usá `pnpm db:check`.

Las contraseñas de turistas, administradores y organizadores deben almacenarse como hash Argon2. El login revisa el correo en ambas tablas y devuelve el rol correspondiente.
