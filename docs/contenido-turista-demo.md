# Agenda y material ilustrativo de pruebas

Se cargó contenido únicamente en `cerrolargo_turista_test_a2285f31`. No se modificó la base compartida `turismo`, ni se agregó una migración para estos registros.

Para reproducir: compilar el backend (`npm run build`) y ejecutar desde backend `node scripts/contenido-turista-demo.mjs`. Requiere los tres lugares ficticios previamente creados y una base cuyo nombre empiece por `cerrolargo_turista_test_`. El script verifica también el nombre y descripción de cada lugar; es idempotente para sus recursos y eventos. Los archivos se descargan a `publico/demo`, excluido de Git; no son parte del código. Para otro entorno se necesita un almacenamiento persistente y contenido aprobado por el equipo.

## Fotos y videos

Son ilustraciones genéricas: **no muestran los lugares ficticios de Melo/Río Branco ni avalan un comercio real**. Se muestra autor y aclaración en cada ficha. Licencia consultada: https://www.pexels.com/license/ (uso gratuito en sitios; no implica respaldo de personas o marcas).

| Lugar | Autor | Fuente |
|---|---|---|
| Parque, foto | Masood Aslami | https://www.pexels.com/photo/a-path-through-a-park-with-trees-and-grass-27251806/ |
| Parque, video | 宋 小天 | https://www.pexels.com/video/people-walking-in-the-park-4359494/ |
| Museo, foto | Laura Paredis | https://www.pexels.com/photo/interior-of-a-museum-26424630/ |
| Museo, video | Charlotte May | https://www.pexels.com/video/arts-inside-a-gallery-5824200/ |
| Restaurante, foto | Rene Terp | https://www.pexels.com/photo/luxurious-restaurant-interior-12919407/ |
| Restaurante, video | Rene Terp | https://www.pexels.com/video/chef-cooking-in-front-of-customer-1858094/ |

## Eventos del inicio

- Mega Show Internacional de Moto: 12–15 noviembre 2026, Parque Rivera, Melo. Información del afiche `https://files.catbox.moe/fjw1jn.jpg`; fecha y lugar contrastados con https://www.fetimoto.com.br/eventos/22-mega-show-internacional-de-moto-8136. No se inventaron horarios de apertura, precio ni coordenadas. Las horas 00:00/23:59 se usan para representar los días completos; la descripción aclara horario por confirmar.
- Lanzamiento Semana de Melo: 3 septiembre 2026, 11:00, Sala de Cultura, Muniz 580. Fuente: `https://files.catbox.moe/dittyx.jpg`. Es una conferencia de prensa pasada, no toda la Semana de Melo.
- Carnaval de Melo 2026: `https://files.catbox.moe/6bjjqx.jpg`. No incluye fecha completa ni lugar. El usuario confirmó que no tiene esa información. Permanece como anuncio informativo en frontend, fuera de próximos eventos y calendario. No se creó una fecha ficticia en la tabla Evento (inicio es obligatorio).

Los afiches ya formaban parte del inicio; sus derechos siguen perteneciendo a sus autores. Verificar autorización para distribución pública. El organizador técnico de estos registros es una cuenta de demostración sin contraseña utilizable; no representa a los organizadores reales.

## Comportamiento y comprobaciones

`GET /api/eventos` admite desde/hasta (días de Uruguay inclusivos), buscar (título/lugar), pagina y limit. Incluye eventos que solapan el rango. Detalle y recursos solo se sirven con padre PUBLICADO. Los videos locales admiten Range, HEAD y rangos sufijo, con 416 para rangos inválidos. Las rutas privadas no se aceptan.

`tests/catalogo.test.ts` verifica fechas, solapamiento, visibilidad, filtros de localidad y reproducción parcial. Ejecutar junto a turista.test.ts solo con TURISTA_TEST_DB igual al nombre de la base aislada.
