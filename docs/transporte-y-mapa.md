# Transporte público y mapa

Se reutilizan EmpresaTransporte y HorarioOmnibus: no se modificó el esquema ni se agregaron migraciones.

- GET /api/horarios-omnibus: solo PUBLICADO, filtros exactos origen/destino, paginación de 12, empresa y contacto. Opciones de filtros obtenidas de recorridos publicados. Las columnas TIME se serializan como HH:mm sin convertirlas por zona horaria.
- GET /api/mapa/lugares: solo ubicaciones PUBLICADO, busca nombre/localidad/categoría, devuelve coordenadas y datos mínimos; máximo 500 con aviso para afinar búsqueda.
- Ambos endpoints son de lectura pública y no requieren cuenta. La administración de estos registros sigue siendo una responsabilidad del backend administrativo.

## Datos de prueba

Desde backend, luego de compilar: `node scripts/transporte-demo.mjs`. Solo admite bases `cerrolargo_turista_test_*`. Crea o actualiza seis servicios de la empresa `Transporte de prueba (Ficticia)` (Melo–Río Branco, Río Branco–Melo, Melo–Fraile Muerto, Fraile Muerto–Melo y Melo–Aceguá). No contiene empresas, teléfonos, tarifas ni horarios comerciales reales. El frontend identifica estos servicios como ficticios. No ejecutar en la base compartida.

## Verificación

La suite catalogo.test.ts verifica publicación/ocultamiento, filtros de recorrido y localidad, horas sin desplazamiento, búsqueda del mapa y acceso a contenido público. Junto a turista.test.ts: 48 pruebas aprobadas.

## Pendientes de contenido

El equipo debe cargar empresas, contactos, horarios, días de servicio y tarifas verificados antes de publicar el transporte real. La tabla no guarda fecha de vigencia, feriados ni desplazamiento de días de llegada; esos casos requieren acordar reglas/esquema si se necesitan. Las coordenadas de los lugares ficticios siguen siendo de demostración.
