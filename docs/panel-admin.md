# API del panel administrador

Trabajo en `mauri/panel-admin`, basado en `main`. Se entrega como borrador para
revisar junto con la rama homónima del frontend, sin integrar otras ramas.

## Alcance

- `/api/admin/datos`: estadísticas y registros, sin hashes de contraseñas.
- `/api/admin`: altas y edición de categorías, lugares, eventos, empresas y horarios;
  eliminación de lugares, eventos, reseñas y recursos; moderación y decisiones.
- Documentos de identidad accesibles únicamente para administradores.
- Imágenes y videos en disco, con validación de formato y tamaño (20 MB).
- `/api/contenido`: consulta pública filtrada por estado; promedio de reseñas publicadas.
- `/api/organizador/eventos`: API de eventos propios con revisión administrativa.
  La conexión con las pantallas del organizador corresponde a la integración del equipo.
- Sesión firmada con vencimiento y rol consultado en la base en cada operación.
  Las sesiones anteriores requieren iniciar sesión nuevamente.

## Base local y migraciones: condición previa a integrar

La migración `20261008190000_admin_base` crea todas las tablas desde cero y se
probó exclusivamente sobre `cerrolargo360_admin_dev`. No debe desplegarse en una
base existente ni junto a otra migración inicial sin conciliación previa.
La base `turismo` no fue modificada durante esta implementación.

Al 10/10/2026, `origin/check-point` contiene otra migración inicial:
`20261008191551_inicial`. El equipo debe elegir una única historia de migraciones
antes de integrar ambas ramas. No ejecutar reset ni marcar migraciones como
aplicadas para eludir diferencias de esquema.

Los cambios del esquema administrativo respecto de `main` son:

- `evento.id_organizador` nullable, para eventos creados por administración.
- `evento.id_administrador` nullable y relación con `usuario`.
- `horario_omnibus.llegada_dia_siguiente`, booleano con valor inicial false.

Para una base existente: respaldar y comparar su esquema e historial, preparar
una migración incremental con esos cambios y probarla sobre una copia. Este PR
no autoriza ejecutar la migración inicial en la base compartida o en producción.

## Preparación local desde una base nueva

Configurar `.env` con las variables de `src/configuracion/env.ts` y credenciales
de MySQL local. `DATABASE_URL` y los campos `DATABASE_*` deben apuntar a la misma
base. `COOKIE_SECRET` debe tener al menos 32 caracteres; `NODE_ENV=development`.
Nunca subir `.env`, credenciales ni archivos privados al repositorio.

1. Instalar dependencias con `pnpm install`.
2. Ejecutar `node scripts/prepare-admin-dev.mjs`: crea exclusivamente la base
   `cerrolargo360_admin_dev` y actualiza la conexión en `.env`.
3. `pnpm orm:deploy` y `pnpm orm:generate` (solo para esa base nueva).
4. `pnpm admin:seed`: crea la cuenta local si no existe y las cinco categorías.
   La contraseña aleatoria queda en `.admin-local-credentials.json`, ignorado por Git.
5. `pnpm dev`: API en puerto 4000.

`FRONTEND_ORIGIN` admite una lista separada por comas; para desarrollo usar
`http://localhost:5173,http://127.0.0.1:5173`. En producción definir los orígenes
reales y almacenamiento persistente para `publico` y `privado`.

## Verificación y límites

`pnpm admin:test` ejecuta 22 comprobaciones de sesión, permisos, origen,
persistencia, visibilidad pública, decisiones y archivo inválido. Solo admite
la base local indicada; crea y elimina sus propios registros temporales.
No ejecutar las pruebas generales preexistentes sobre bases con datos reales
sin revisar su limpieza de datos.

El usuario confirmó en navegador el login, altas/edición/ocultación de lugares,
alta/edición de eventos administrativos, calendario, carga de imágenes y
persistencia al recargar (10/10/2026). Pendientes: sustitución y eliminación de
archivos, videos, documentos privados, formularios restantes y recorrido completo
con el panel del organizador y las páginas públicas.

Usuarios quedan en consulta hasta definir permisos de edición/bloqueo/eliminación.
Confirmar con el equipo el cálculo de promedios de reseñas, límites de archivos,
revisión de eventos editados por organizadores y paginación para grandes volúmenes.
