# Backend en Cloudflare — rama cloud

Esta rama cambia el runtime a Workers, la base a D1 (SQLite) y los archivos a R2 privado. Conserva las rutas /api, los roles y las cookies firmadas. No se desplegó infraestructura ni se importó la base MySQL.

## Preparar localmente

1. Instalar con pnpm install --frozen-lockfile.
2. Copiar .dev.vars.example a .dev.vars y reemplazar COOKIE_SECRET por un secreto aleatorio. No copiar el secreto de ejemplo a producción.
3. Ejecutar pnpm orm:generate y pnpm db:local. Esto crea solamente la base emulada de Wrangler.
4. pnpm dev inicia la API en http://localhost:4000, manteniendo el contrato del frontend.
5. pnpm test:cloud prueba D1/R2 en almacenamiento efímero aislado. Las suites anteriores MySQL son históricas y no deben apuntarse a D1 ni a una base real.

## Preparar la cuenta Cloudflare (no ejecutado automáticamente)

- Crear una base D1 y un bucket R2. Reemplazar database_id y bucket_name en wrangler.jsonc.
- Mantener el bucket privado: los documentos de identidad y las fotos de perfil requieren autorización de la API. No activar r2.dev ni un dominio público para este bucket.
- Configurar APP_PUBLIC_URL y APP_ORIGINS con el origen HTTPS del frontend. La configuración de ejemplo no es un dominio real.
- Guardar COOKIE_SECRET con wrangler secret put COOKIE_SECRET. OAuth requiere también GOOGLE_ID y GOOGLE_SECRET como secretos, y configurar el callback de Google en el dominio de la API.
- Servir /api mediante un proxy del mismo origen del frontend para conservar las cookies SameSite=Lax. El proxy de desarrollo de Vite no configura el despliegue de producción.
- workers_dev está desactivado: agregar una ruta o dominio del Worker antes del despliegue público.
- Aplicar pnpm db:remote únicamente sobre la D1 vacía prevista para esta rama. Después pnpm deploy.

## Datos y archivos existentes

Las migraciones MySQL y su esquema original se conservan en prisma/mysql/. No ejecutar ese SQL en D1. migrations/d1/ contiene una inicial SQLite para una base nueva; no convierte datos MySQL.

La migración de datos reales requiere exportación, transformación de fechas/booleanos y validación de recuentos y claves foráneas. Conservar IDs, roles y hashes Argon2id. Las coordenadas usan Float y los precios conservan Decimal en Prisma, sobre la afinidad numérica de SQLite; revisar los importes al importar.

Los objetos R2 conservan prefijos: publicos/, privados/, privado/perfiles/, publico/eventos/ y publico/demo/. Las URI de la API no cambian. La asociación de recurso publicado y la pertenencia de documentos se verifican antes de servir objetos. No migrar documentos privados a un bucket público.

Los scripts auto/ históricos dependen del runtime anterior: no ejecutarlos contra esta rama para poblar D1. Tampoco ejecutar auto/install.js: modifica una instalación de Discord y no forma parte del backend. El catálogo se puede preparar con scripts/cloud-seed.mjs sin crear cuentas de demostración.

## Contraseñas, atomicidad y correo

Argon2id usa @noble/hashes (JavaScript portable), conserva el formato PHC compatible con @node-rs/argon2 y parámetros m=19456,t=2,p=1. Requiere presupuesto CPU: wrangler configura 30 segundos; usar un plan que soporte ese límite y proteger login y registro en el proxy. Verificación limitada a hashes Argon2id v19 con parámetros acotados.

El cliente Prisma se crea por request y se libera con waitUntil. Los bindings y secretos se aíslan con AsyncLocalStorage; no se escriben en process.env. Las escrituras relacionadas usan batch D1 atómico: recuperación, registro con documentos, recursos y edición de localidades. No usar Prisma.$transaction: el adaptador D1 no brinda transacciones interactivas.

La recuperación usa Cloudflare Email Service opcional: habilitar un dominio remitente verificado, agregar send_email: [{name: "EMAIL"}] a wrangler.jsonc y MAIL_FROM. No se incluye un dominio ficticio ni se envían correos de prueba a personas. Sin esas opciones, la API devuelve 503. El envío se registra en waitUntil; una cola persistente sería necesaria para reintentos garantizados. Gmail/Nodemailer por SMTP no forma parte del Worker.

## Verificar sin publicar

pnpm check:types, pnpm test:cloud y pnpm build. build genera el cliente Prisma, comprueba tipos y ejecuta wrangler deploy --dry-run --outdir dist. El dry-run no publica el Worker.

Fuentes: https://www.prisma.io/docs/guides/v7/deployment/cloudflare-d1 ; https://developers.cloudflare.com/d1/worker-api/d1-database/ ; https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ ; https://developers.cloudflare.com/email-service/api/send-emails/workers-api/

## Resultado de validación local — 01/11/2026

Cliente Prisma generado para runtime cloudflare; esquema SQLite validado; TypeScript sin errores; diez pruebas aprobadas con D1/R2 aislados, incluida ejecución del bundle en workerd; Wrangler dry-run aprobado; lockfile frozen validado. No se desplegó ni se migraron datos reales.
