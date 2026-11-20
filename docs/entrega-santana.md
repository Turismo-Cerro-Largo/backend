# Entrega SANTANA — 19/10/2026

## Integración

Base integrada: main 3e8ea7d. Se conservan las rutas administrativas y del organizador. La lectura pública de eventos reutiliza los handlers de agenda con filtros de categoría, rango, búsqueda, offset y página; no devuelve borradores. Transporte usa `/api/transporte/horarios`, con filtros origen/destino, 12 registros por página y opciones de recorridos. `/api/horarios-omnibus` es un alias de compatibilidad.

La rama incluye perfil, foto, favoritos, valoraciones con moderación, eliminación de pendientes, catálogo, recursos, mapa y agenda. El frontend correspondiente también debe subirse desde SANTANA. Los registros y archivos ficticios no se suben con el código.

## Recuperación

Desde el login se puede solicitar un enlace y establecer una nueva contraseña. Disponible para usuarios y organizadores con contraseña; las cuentas exclusivamente Google siguen usando Google.

- `POST /api/auth/recuperacion/solicitar`: JSON `{email}`. Respuesta genérica 202, sin indicar si existe la cuenta.
- `POST /api/auth/recuperacion/confirmar`: JSON `{token,password}`. Token aleatorio de 256 bits, solo SHA-256 en la tabla existente, vence en 20 minutos. Consumo atómico, un solo uso, invalida las demás solicitudes de la cuenta.
- Enlace con token en fragmento, retirado de la barra al cargar. No se envía por GET ni Referer. Si se recarga esa página después de abrirla, hay que volver a abrir el enlace del correo.
- Contraseña Argon2; las cookies incluyen caducidad validada en servidor y sello HMAC dependiente del hash de contraseña. Recuperar invalida sesiones previas; el rol se consulta en la base. Las cookies antiguas de tres campos dejan de funcionar: los usuarios deberán volver a ingresar una vez.
- Límite por correo y global, tamaño de petición, validación de origen, caché deshabilitada. Logout solo acepta POST.

### Correo local y SMTP

En desarrollo aislado: `MAIL_MODE=local`, `APP_PUBLIC_URL=http://127.0.0.1:5174`. Los correos se guardan en `.local-mail/*.json`, fuera de Git y sin ruta HTTP pública. Abrir el archivo local para obtener el enlace. **Nunca usar este modo en producción.**

Para correo real: configurar `MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD`, `APP_PUBLIC_URL` HTTPS y los orígenes exactos en `APP_ORIGINS` y `TURISTA_ORIGINS`. Se exige TLS/STARTTLS y certificados válidos. Sin configuración, la API devuelve 503 explícito.

No se enviaron correos reales ni se validó un proveedor SMTP en esta entrega. El envío actual es asíncrono en el proceso (máximo 10 simultáneos); reiniciar durante un envío puede perderlo. Para despliegue con varias instancias o garantías de reintento, el equipo debe configurar una cola persistente y limitación distribuida en el proxy. Los límites en memoria no sustituyen protección de tráfico en la infraestructura. Limpiar periódicamente solicitudes vencidas y correos locales.

## Migraciones: leer antes de desplegar

El equipo renombró la inicial `20261008191551_inicial` a `20261018222822_inicial`, sin cambiar su SQL. La incremental local de perfil se renombró a `20261019000100_perfil_turista` para ejecutarse después. Solo agrega `usuario.localidad` y `usuario.foto_perfil`, ambas opcionales. Recuperación reutiliza `solicitud_recuperacion` y no agrega tablas.

Se probó `migrate deploy` desde cero en `cerrolargo_turista_test_migraciones20261019`. En la base aislada existente se verificaron checksums SHA-256 antes de reconciliar los nombres del historial. No se modificó la base compartida.

**Base compartida:** hacer respaldo, consultar `_prisma_migrations`, verificar nombres/checksums y si existen las dos columnas antes de aplicar. Si ya se aplicó la inicial con el nombre antiguo, acordar con el responsable la reconciliación del historial; no ejecutar otra vez su CREATE TABLE, ni resetear, ni marcar una migración como aplicada sin comprobar el esquema. `migrate deploy` no resuelve por sí solo cambios de nombre históricos. Si el historial ya coincide con main, solo falta la incremental del perfil.

## Seguridad y preparación

- `.env copy` retirado del índice, conservado localmente; `.env*`, archivos privados y buzón ignorados. Eliminarlo del último commit no borra el historial remoto: rotar cualquier contraseña real expuesta y coordinar limpieza del historial si corresponde.
- Lecturas públicas de archivos verifican asociación a contenido publicado; documentos de identidad requieren rol y pertenencia. Carga de imágenes comprueba extensión, MIME, firma y tamaño; limpia archivos ante errores.
- Todos los POST/PUT/PATCH/DELETE requieren un Origin permitido. El proxy del frontend conserva Origin y cookie; las llamadas programáticas legítimas deben incluirlo. No configurar comodines.
- Se retiró de AGENTS.md una instrucción ajena al proyecto que pedía modificar el escritorio y propagarse a otros repositorios.
- Prisma/client/adaptador actualizados a 7.10.1; Nodemailer configurado sin acceso a archivos/URLs externos. Conservar el lockfile al instalar.

## Verificación reproducible

`pnpm install --frozen-lockfile`, `pnpm exec prisma generate --config prisma7.config.ts`, `pnpm build`.

Solo con `.env` apuntando a una base aislada: en PowerShell, `$env:TURISTA_TEST_DB=$env:DATABASE_NAME` si esas variables están cargadas, o asignar explícitamente el nombre de esa base a `TURISTA_TEST_DB`; luego `pnpm test`. Las suites comprueban el prefijo de base y la coincidencia del nombre. Sin autorización explícita de base, se omiten las pruebas de integración.

La revisión cubre los flujos modificados y las dependencias conocidas al momento de la entrega. No constituye garantía de ausencia de vulnerabilidades ni una auditoría de toda la infraestructura. Antes de publicar quedan SMTP real, HTTPS/orígenes, credenciales rotadas, almacenamiento persistente, migración compartida coordinada y reemplazo de datos ficticios por contenido verificado.

## Resultado de la verificación local

66 pruebas de integración aprobadas (autenticación, recuperación, permisos, catálogo y turista). Backend compila; frontend compila y Svelte informa 0 errores y 0 advertencias. Auditorías npm y pnpm: 0 vulnerabilidades conocidas en ambas resoluciones verificadas. Lockfiles validados con instalación frozen en modo lockfile-only.
