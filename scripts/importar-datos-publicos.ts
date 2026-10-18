/**
 * Turismo Cerro Largo 360: importa datos demo a la base de datos local.
 * Requisitos: base migrada, .env local configurado y prisma/datos-publicos.json.
 * Uso: pnpm exec tsx scripts/importar-datos-publicos.ts
 * Ejecutar preferentemente sobre base de datos local de DESARROLLO.
 */
import { readFile } from "node:fs/promises";
import { prisma } from "../src/configuracion/db.js";

const archivo = "prisma/datos-publicos.json";

async function main() {
  const datos = JSON.parse(await readFile(archivo, "utf8"));
  if (datos.formato !== "cerro-largo-datos-publicos-v1") {
    throw new Error("Archivo de datos no reconocido.");
  }

  // Se conservan categorías por nombre, no por el ID de otra computadora.
  for (const c of datos.categorias) {
    await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: {},
      create: { nombre: c.nombre, descripcion: c.descripcion },
    });
  }

  const categoriaId = new Map<string, number>();
  for (const c of await prisma.categoria.findMany()) categoriaId.set(c.nombre, c.id);

  // Cada organizador exportado tiene una cuenta demo sin credenciales reales.
  // No se puede iniciar sesión con estas cuentas de muestra.
  const organizadorId = new Map<string, number>();
  for (const o of datos.organizadores) {
    const correoDemo = `org-${o.clave}@demo.cerrolargo.invalid`;
    const org = await prisma.organizador.upsert({
      where: { email: correoDemo },
      update: { nombre_organizacion: o.nombre },
      create: {
        nombre_organizacion: o.nombre,
        rut_ruc: `DEMO-CL360-${o.clave}`,
        email: correoDemo,
        telefono: "00000000",
        passhash: "CUENTA_DEMO_SIN_ACCESO",
        departamento: "Cerro Largo",
        estado: "APROBADO",
      },
    });
    organizadorId.set(o.clave, org.id);
  }

  let cuentaUbicaciones = 0;
  let cuentaEventos = 0;

  for (const u of datos.ubicaciones) {
    const idCategoria = categoriaId.get(u.categoria);
    if (!idCategoria) throw new Error(`Falta categoría: ${u.categoria}`);
    // Coincidencia para evitar duplicados si ejecutás el script dos veces.
    const existente = await prisma.ubicacion.findFirst({
      where: { nombre: u.nombre, localidad: u.localidad },
    });
    const campos = {
      nombre: u.nombre,
      descripcion: u.descripcion,
      direccion: u.direccion,
      localidad: u.localidad,
      telefono: u.telefono,
      sitio_web: u.sitio_web,
      horario: u.horario,
      latitud: u.latitud,
      longitud: u.longitud,
      id_categoria: idCategoria,
      estado: "PUBLICADO" as const,
    };
    const lugar = existente
      ? await prisma.ubicacion.update({ where: { id: existente.id }, data: campos })
      : await prisma.ubicacion.create({ data: campos });
    cuentaUbicaciones++;

    for (const r of u.recursos ?? []) {
      const repetido = await prisma.recurso.findFirst({ where: { id_ubicacion: lugar.id, uri: r.uri } });
      if (!repetido) await prisma.recurso.create({
        data: { id_ubicacion: lugar.id, uri: r.uri, tipo: r.tipo, descripcion: r.descripcion, orden: r.orden },
      });
    }
  }

  for (const ev of datos.eventos) {
    const idCategoria = categoriaId.get(ev.categoria);
    const idOrganizador = organizadorId.get(ev.organizador_clave);
    if (!idCategoria || !idOrganizador) throw new Error(`Falta categoría u organizador para: ${ev.titulo}`);
    const inicio = new Date(ev.inicio);
    const existente = await prisma.evento.findFirst({ where: { titulo: ev.titulo, inicio } });
    const campos = {
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      inicio,
      fin: ev.fin ? new Date(ev.fin) : null,
      lugar_evento: ev.lugar_evento,
      latitud: ev.latitud,
      longitud: ev.longitud,
      es_gratuito: ev.es_gratuito,
      precio: ev.precio,
      contacto: ev.contacto,
      estado: "PUBLICADO" as const,
      id_categoria: idCategoria,
      id_organizador: idOrganizador,
    };
    const evento = existente
      ? await prisma.evento.update({ where: { id: existente.id }, data: campos })
      : await prisma.evento.create({ data: campos });
    cuentaEventos++;

    for (const r of ev.recursos ?? []) {
      const repetido = await prisma.recurso.findFirst({ where: { id_evento: evento.id, uri: r.uri } });
      if (!repetido) await prisma.recurso.create({
        data: { id_evento: evento.id, uri: r.uri, tipo: r.tipo, descripcion: r.descripcion, orden: r.orden },
      });
    }
  }
  console.log(`Listo. Ubicaciones procesadas: ${cuentaUbicaciones} | Eventos procesados: ${cuentaEventos}`);
  console.log("Abrí Prisma Studio o la página para comprobar los registros. Si faltan imágenes locales, compartilas por separado.");
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
