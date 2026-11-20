# Arquitectura del backend por áreas

El backend conserva los contratos HTTP que usa el frontend. La raíz src/app/app-router.ts
agrupa las rutas por las áreas **autenticación**, **administración**, **organizador**,
**turista** y **lectura pública**. El prefijo común sigue siendo /api.

## Capas

| Capa | Responsabilidad | Ejemplos |
| --- | --- | --- |
| Rutas/controladores (src/app) | Método, URL, lectura de la petición, aplicación del esquema, código HTTP y JSON de respuesta. | admin/dashboard.ts, turista/turista.ts, organizador/organizador.ts |
| Esquemas (*.schema.ts, *.scheme.ts) | Reglas declarativas de entrada y tipos inferidos, sin consultas ni respuestas HTTP. | auth/recuperacion.schema.ts, transporte/transporte.schema.ts, organizador/eventos.schema.ts |
| Servicios (*.service.ts, src/services) | Reglas de negocio, cambios de estado y composición de respuestas. No conocen Context de Hono. | turista.service.ts, dashboard.service.ts, archivos.service.ts |
| Repositorios (*.repository.ts) | Consultas y escrituras Prisma con proyecciones explícitas. | turista.repository.ts, organizador.repository.ts, dashboard.repository.ts |
| Infraestructura (src/configuracion, src/middleware) | DB, configuración, errores HTTP, sesión, origen, límites de cuerpo y carga de archivos. | db.ts, Session.ts, Origen.ts, Archivos.ts |

La misma separación se aplicó a los flujos de perfil del organizador, perfil/favoritos/
valoraciones del turista y resumen del administrador. Los controladores históricos de
eventos, categorías, transporte y ubicaciones aún contienen consultas Prisma; deben
migrarse a servicios y repositorios cuando se cambie cada dominio, sin romper sus
contratos actuales.

## Endpoints por pantalla

| Área | Endpoints principales |
| --- | --- |
| Público | GET /api/lugares, /api/ubicaciones, /api/eventos, /api/categorias, /api/transporte/..., /api/mapa/lugares, /api/recursos/:id |
| Turista | /api/turista/perfil, /foto, /favoritos, /valoraciones, /lugares/:id |
| Organizador | /api/organizador (perfil), /api/organizador/eventos/... y /api/eventos/status |
| Administrador | /api/admin/dashboard, /eventos, /ubicaciones, /usuarios, /organizadores, /comentarios, /valoraciones |
| Acceso | /api/auth/... |

Se mantienen los alias que el frontend todavía consume: /api/moderacion-valoraciones,
/api/organizador/lista, /api/organizador/:id, /api/organizador/:id/estado,
las mutaciones administrativas de /api/categorias y /api/transporte, las
mutaciones de organizador de /api/eventos y /api/horarios-omnibus.
/api/healt conserva su nombre histórico. No se debe eliminar ninguno sin
actualizar el frontend y preparar una transición.

## Orden y alcance del middleware

1. En la app: registro, CORS con orígenes explícitos, verificación de Origin en
   mutaciones y cabeceras de seguridad.
2. En cada ruta privada: RequerirTurista, RequerirAdministrador o
   RequerirOrganizadorAprobado. La sesión se firma y el rol se obtiene de la
   cuenta actual en DB; los dos últimos verifican tipo/estado cuando corresponde.
3. En rutas con cuerpo: bodyLimitado antes de leer JSON o multipart.
4. En cargas: ArchivosPublicos/ArchivosPrivados/ArchivosFotoPerfil, que validan extensión, MIME,
   firma y tamaño, guardan con nombres aleatorios y limpian archivos ante errores.
   La foto del turista conserva su directorio privado y su ruta GET /api/turista/foto.

Las lecturas públicas no requieren cookie. Las comprobaciones de pertenencia
(usuario, organizador, recurso) permanecen en el servicio o consulta de cada
caso de uso: un rol por sí solo no autoriza acceder a registros ajenos.

## Verificación

node_modules/.bin/tsc.cmd --noEmit comprueba tipos en Windows. La suite
tests/layers.test.ts revisa rutas, rechazo sin sesión/origen y formatos de
archivo sin conectarse a MySQL. Las pruebas de integración antiguas requieren
una base de datos aislada disponible y configurada como indica
docs/entrega-santana.md; nunca deben ejecutarse contra la base compartida.
