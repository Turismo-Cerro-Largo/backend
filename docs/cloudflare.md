# Backend en Cloudflare — rama cloud

Esta rama cambia el runtime a Workers, la base a D1 (SQLite) y los archivos a Supabase Storage privado. Conserva las rutas /api, los roles y las cookies firmadas. No se desplegó infraestructura ni se importó la base MySQL.

## Preparar localmente

1. Instalar con pnpm install --frozen-lockfile.
2. Copiar .dev.vars.example a .dev.vars y reemplazar COOKIE_SECRET por un secreto aleatorio. No copiar el secreto de ejemplo a producción.
3. Ejecutar pnpm orm:generate y pnpm db:local. Esto crea solamente la base emulada de Wrangler.
4. pnpm dev inicia la API en http://localhost:4000, manteniendo el contrato del frontend.
5. pnpm test:cloud prueba D1 y Supabase simulado en almacenamiento efímero aislado. Las suites anteriores MySQL son históricas y no deben apuntarse a D1 ni a una base real.

## Preparar la cuenta Cloudflare (no ejecutado automáticamente)

- Usar la base D1 configurada en wrangler.jsonc y crear un bucket PRIVADO cerro-largo-files en Supabase. Configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY como secretos de Wrangler; SUPABASE_STORAGE_BUCKET ya está en vars.
- Mantener el bucket privado: los documentos de identidad y las fotos de perfil requieren autorización de la API. No habilitar Public bucket ni políticas de acceso anónimo. La API valida los permisos y sirve los archivos.
- Configurar APP_PUBLIC_URL y APP_ORIGINS con el origen HTTPS del frontend. La configuración de ejemplo no es un dominio real.
- Guardar COOKIE_SECRET con wrangler secret put COOKIE_SECRET. OAuth requiere también GOOGLE_ID y GOOGLE_SECRET como secretos, y configurar el callback de Google en el dominio de la API.
- Servir /api mediante un proxy del mismo origen del frontend para conservar las cookies SameSite=Lax. El proxy de desarrollo de Vite no configura el despliegue de producción.
- workers_dev está desactivado: agregar una ruta o dominio del Worker antes del despliegue público.
- Aplicar pnpm db:remote únicamente sobre la D1 vacía prevista para esta rama. Después pnpm deploy.

## Datos y archivos existentes

Las migraciones MySQL y su esquema original se conservan en prisma/mysql/. No ejecutar ese SQL en D1. migrations/d1/ contiene una inicial SQLite para una base nueva; no convierte datos MySQL.

La migración de datos reales requiere exportación, transformación de fechas/booleanos y validación de recuentos y claves foráneas. Conservar IDs, roles y hashes Argon2id. Las coordenadas usan Float y los precios conservan Decimal en Prisma, sobre la afinidad numérica de SQLite; revisar los importes al importar.

Los objetos Supabase conservan prefijos: publicos/, privados/, privado/perfiles/, publico/eventos/ y publico/demo/. Las URI de la API no cambian. La asociación de recurso publicado y la pertenencia de documentos se verifican antes de servir objetos. No migrar documentos privados a un bucket público.

Los scripts auto/ históricos dependen del runtime anterior: no ejecutarlos contra esta rama para poblar D1. Tampoco ejecutar auto/install.js: modifica una instalación de Discord y no forma parte del backend. El catálogo se puede preparar con scripts/cloud-seed.mjs sin crear cuentas de demostración.

## Contraseñas, atomicidad y correo

Argon2id usa @noble/hashes (JavaScript portable), conserva el formato PHC compatible con @node-rs/argon2 y parámetros m=19456,t=2,p=1. Requiere presupuesto CPU: wrangler configura 30 segundos; usar un plan que soporte ese límite y proteger login y registro en el proxy. Verificación limitada a hashes Argon2id v19 con parámetros acotados.

El cliente Prisma se crea por request y se libera con waitUntil. Los bindings y secretos se aíslan con AsyncLocalStorage; no se escriben en process.env. Las escrituras relacionadas usan batch D1 atómico: recuperación, registro con documentos, recursos y edición de localidades. No usar Prisma.$transaction: el adaptador D1 no brinda transacciones interactivas.

El registro y la recuperación usan Cloudflare Email Service: habilitar un dominio remitente verificado, agregar send_email: [{name: "EMAIL"}] a wrangler.jsonc y MAIL_FROM. No se incluye un dominio ficticio ni se envían correos de prueba a personas. Sin esas opciones, el registro y la recuperación devuelven 503. Configurá TURNSTILE_SECRET_KEY como secreto del Worker y PUBLIC_TURNSTILE_SITE_KEY en Vercel. Si configurás TURNSTILE_HOSTNAME, usá el host exacto del frontend. Aplicá la migración D1 de verificación antes de desplegar el Worker. El envío se registra en waitUntil; una cola persistente sería necesaria para reintentos garantizados. Si no hay binding EMAIL con MAIL_FROM, el Worker usa Nodemailer con TLS en smtp.gmail.com:465 y los secretos GMAIL_USER y GMAIL_APP_PASSWORD. Configurá estos secretos con wrangler secret put.

## Verificar sin publicar

pnpm check:types, pnpm test:cloud y pnpm build. build genera el cliente Prisma, comprueba tipos y ejecuta wrangler deploy --dry-run --outdir dist. El dry-run no publica el Worker.

Fuentes: https://www.prisma.io/docs/guides/v7/deployment/cloudflare-d1 ; https://developers.cloudflare.com/d1/worker-api/d1-database/ ; https://supabase.com/docs/guides/storage/security/access-control ; https://developers.cloudflare.com/email-service/api/send-emails/workers-api/

## Resultado de validación local — 01/11/2026

Cliente Prisma generado para runtime cloudflare; esquema SQLite validado; TypeScript sin errores; quince pruebas aprobadas con D1 aislado y Supabase simulado, incluida ejecución del bundle en workerd; Wrangler dry-run aprobado; lockfile frozen validado. Las pruebas no publican ni migran datos reales.

## Configurar Supabase Storage

1. Crear un proyecto en Supabase y un bucket **privado** llamado cerro-largo-files. No crear políticas públicas.
2. Obtener Project URL y la clave legacy service_role (no anon ni publishable). No compartir la clave ni ponerla en el frontend.
3. Para desarrollo, completar SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_STORAGE_BUCKET en .dev.vars. El desarrollo usa este bucket real; usar un proyecto/bucket separado de producción.
4. Para Workers, ejecutar pnpm exec wrangler secret put SUPABASE_URL y pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY. Los valores se ingresan en el prompt.
5. Configurar el dominio/origen y ejecutar pnpm deploy. No se necesita activar R2.

Las rutas y referencias de imágenes actuales se conservan. pnpm files:upload importa los archivos locales; no sobrescribe archivos existentes y se detiene ante errores. No ejecutar contra un bucket con archivos ya importados sin revisar duplicados. Las pruebas usan HTTP simulado y no requieren credenciales reales de Supabase.

## Frontend en Vercel

El frontend de la rama cloud usa una reescritura externa /api hacia el Worker y mantiene las cookies en su dominio. Cuando Vercel asigne el dominio estable de producción, configurar ese origen exacto en APP_PUBLIC_URL y APP_ORIGINS y desplegar el backend. CORS usa credenciales, métodos y cabeceras explícitos; no permite orígenes ajenos ni comodines *.vercel.app. La protección CSRF valida el Origin en las mutaciones incluso pasando por el proxy.

## Seed completo en producción

Completar .dev.vars con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET=cerro-largo-files y SEED_ADMIN_PASSWORD, SEED_USUARIO_PASSWORD, SEED_ORGANIZADOR_PASSWORD. Elegir claves propias de 12 a 32 caracteres con mayúscula, minúscula y número. No versionar este archivo. COOKIE_SECRET del Worker no se necesita para generar el seed.

Ejecutar pnpm seed:full:remote desde backend: genera seed/completo.sql (ignorado por Git), sube las imágenes de auto/ a Supabase y aplica los datos en la D1 configurada. No ejecuta auto/auto.js. No borra registros ni cambia contraseñas o roles de cuentas existentes. Las imágenes ya presentes se omiten. Las subidas privadas existentes sólo se incluyen al ejecutar manualmente el script de archivos con --include-existing.

Incluye 6 categorías, 10 localidades, 25 lugares, 5 eventos con sus estados originales, 3 empresas y 12 horarios de referencia de viernes, además de usuario@gmail.com (TURISTA), admin@gmail.com (ADMINISTRADOR) y organizador@gmail.com (APROBADO). Las contraseñas corresponden a las variables SEED_* locales, no a las claves públicas antiguas del seed MySQL. La recuperación por email de estas cuentas de ejemplo no es una vía de acceso prevista. Los registros existentes con esos correos no se reemplazan.

Los horarios son datos de referencia de la consulta histórica del 23/10/2026, no frecuencias actuales verificadas. Una imagen puede asociarse a varios registros. La carga es reejecutable: insertar sólo si no existe; no actualiza datos ya creados. Una importación que falle puede haber aplicado una parte; corregir la causa y volver a ejecutar conserva los registros existentes.

## Google OAuth detrás de Vercel

GOOGLE_REDIRECT_URI debe ser el callback del frontend: https://frontend-baa4tscpm.vercel.app/api/auth/google, idéntico al registrado en Google Cloud. El middleware lo usa tanto en autorización como en canje de código, conservando state y la sesión en el dominio del frontend. Se configura en wrangler.jsonc para producción y en .dev.vars para desarrollo; si no existe, se deriva de APP_PUBLIC_URL. GOOGLE_ID y GOOGLE_SECRET permanecen como secretos del Worker; no se importan archivos .env al runtime ni se exponen al navegador.
