# Diseño de la base de datos - Cerro Largo 360

## Fuentes utilizadas

Este diseño consolida dos fuentes del proyecto:

1. El **MER.drawio**, que define el núcleo relacional.
2. La **documentación funcional vigente**, que agrega requisitos posteriores al MER,
   principalmente el flujo de registro y verificación de organizadores.

La implementación se realizó para **MySQL/MariaDB con Prisma ORM 7**.

## Entidades principales

| Entidad | Propósito |
|---|---|
| `rol` | Roles de usuario: usuario, organizador y administrador. |
| `localidad` | Localidades del departamento y su departamento asociado. |
| `usuario` | Datos de registro, autenticación y perfil. |
| `autenticacion_google` | Vinculación opcional de una cuenta con Google OAuth. |
| `solicitud_recuperacion` | Tokens de restablecimiento de contraseña. |
| `solicitud_organizador` | Solicitud de habilitación como organizador. |
| `documento_organizador` | Documentación adjunta a la verificación del organizador. |
| `categoria` | Categorías de lugares turísticos. |
| `lugar` | Lugares, servicios y atractivos turísticos. |
| `recurso_lugar` | Imágenes y videos de un lugar. |
| `resena` | Comentario, calificación y estado de moderación. |
| `favorito` | Lugares guardados por usuarios. |
| `evento` | Eventos creados por organizadores y administradores. |
| `recurso_evento` | Imágenes y videos de un evento. |
| `empresa_transporte` | Empresas que brindan servicios de ómnibus. |
| `horario_omnibus` | Horarios, origen, destino, días, precio y tipo de servicio. |

## Relaciones

- Un `rol` tiene muchos `usuario`.
- Una `localidad` tiene muchos `usuario`, `lugar` y `evento`.
- Una `categoria` tiene muchos `lugar`.
- Un `usuario` puede tener una vinculación con Google y muchas solicitudes de recuperación.
- Un `usuario` crea muchos `evento`.
- Un `usuario` realiza muchas `resena` y guarda muchos `favorito`.
- Un `lugar` tiene muchos recursos, reseñas y favoritos.
- Un `evento` tiene muchos recursos.
- Una `empresa_transporte` tiene muchos `horario_omnibus`.
- Un usuario puede presentar varias `solicitud_organizador`; cada solicitud puede tener
  varios documentos y puede ser revisada por un administrador.

## Diferencia entre el MER y la documentación actual

El MER del 7 de septiembre contiene el núcleo de usuarios, lugares, eventos, reseñas,
favoritos, multimedia, autenticación y transporte. La documentación fue actualizada después
e incluye los RF de **registro de organizador, RUT/RUC, documentación de identidad,
aprobación, rechazo y motivo de rechazo**. Por eso se añadieron:

- `solicitud_organizador`
- `documento_organizador`

De esta forma, la base respeta el MER y también los requerimientos más recientes.

## Integridad y normalización

El modelo aplica claves primarias y foráneas, índices para búsquedas frecuentes y
restricciones de unicidad en correo, cédula, Google ID y favoritos.

La calificación de una reseña se restringe a valores de **1 a 5** en la migración SQL.
Los estados de lugares, reseñas, eventos y solicitudes de organizador se implementan
como enumeraciones controladas.

Los datos multimedia se separan de lugares y eventos para evitar columnas repetidas y
permitir múltiples imágenes o videos por registro.

## Datos base incluidos

La migración carga inicialmente:

- Roles: `USUARIO`, `ORGANIZADOR`, `ADMINISTRADOR`.
- Categorías: Alojamiento, Restaurantes, Parques/Naturaleza y Cultura.
- Localidades: Melo, Río Branco, Laguna Merín, Fraile Muerto, Isidoro Noblía, Aceguá,
  Tupambaé, Arévalo y Plácido Rosas.

## Nota sobre la migración anterior

La migración original del backend creaba una tabla `usuario` mínima con
`id`, `username` y `email`. La nueva migración elimina esa tabla de prototipo y crea la
estructura completa. Antes de aplicarla sobre una base que ya tenga datos reales, se debe
hacer un respaldo.
