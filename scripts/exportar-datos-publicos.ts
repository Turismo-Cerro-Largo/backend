/**
 * Turismo Cerro Largo 360: exporta eventos y ubicaciones PUBLICADOS.
 * No exporta usuarios, documentos, contraseñas, RUT, e-mails privados de organizadores.
 * Uso: pnpm exec tsx scripts/exportar-datos-publicos.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../src/configuracion/db.js";

const archivo = "prisma/datos-publicos.json";
const esUrlExterna = (uri: string) => /^https?:\/\//i.test(uri);

async function main() {
  const [categorias, ubicaciones, eventos] = await Promise.all([
    prisma.categoria.findMany({ select: { nombre: true, descripcion: true } }),
    prisma.ubicacion.findMany({
      where: { estado: "PUBLICADO" },
      include: {
        categoria: { select: { nombre: true } },
        recursos: { select: { uri: true, tipo: true, descripcion: true, orden: true } },
      },
    }),
    prisma.evento.findMany({
      where: { estado: "PUBLICADO" },
      include: {
        categoria: { select: { nombre: true } },
        organizador: { select: { id: true, nombre_organizacion: true } },
        recursos: { select: { uri: true, tipo: true, descripcion: true, orden: true } },
      },
    }),
  ]);

  const organizadores = Array.from(
    new Map(
      eventos.map((ev) => [String(ev.organizador.id), {
        clave: String(ev.organizador.id),
        nombre: ev.organizador.nombre_organizacion,
      }]),
    ).values(),
  );

  const omitidos = ubicaciones.reduce((total, u) => total + u.recursos.filter((r) => !esUrlExterna(r.uri)).length, 0)
    + eventos.reduce((total, ev) => total + ev.recursos.filter((r) => !esUrlExterna(r.uri)).length, 0);

  const datos = {
    formato: "cerro-largo-datos-publicos-v1",
    nota: "Datos de demostración PUBLICADOS. Revisar antes de compartir: incluyen información visible públicamente, como contactos de eventos y lugares.",
    categorias,
    organizadores,
    ubicaciones: ubicaciones.map((u) => ({
      nombre: u.nombre,
      descripcion: u.descripcion,
      direccion: u.direccion,
      localidad: u.localidad,
      telefono: u.telefono,
      sitio_web: u.sitio_web,
      horario: u.horario,
      latitud: Number(u.latitud),
      longitud: Number(u.longitud),
      categoria: u.categoria.nombre,
      recursos: u.recursos.filter((r) => esUrlExterna(r.uri)),
    })),
    eventos: eventos.map((ev) => ({
      titulo: ev.titulo,
      descripcion: ev.descripcion,
      inicio: ev.inicio.toISOString(),
      fin: ev.fin?.toISOString() ?? null,
      lugar_evento: ev.lugar_evento,
      latitud: ev.latitud === null ? null : Number(ev.latitud),
      longitud: ev.longitud === null ? null : Number(ev.longitud),
      es_gratuito: ev.es_gratuito,
      precio: ev.precio === null ? null : Number(ev.precio),
      contacto: ev.contacto,
      categoria: ev.categoria.nombre,
      organizador_clave: String(ev.organizador.id),
      recursos: ev.recursos.filter((r) => esUrlExterna(r.uri)),
    })),
  };

  if (datos.eventos.length + datos.ubicaciones.length === 0) {
    throw new Error("No hay eventos ni ubicaciones PUBLICADOS para exportar. Revisá el campo estado en Prisma Studio.");
  }

  await mkdir("prisma", { recursive: true });
  await writeFile(archivo, JSON.stringify(datos, null, 2) + "\n", "utf8");
  console.log(`Exportado: ${archivo}`);
  console.log(`Categorías: ${datos.categorias.length} | organizadores demo: ${datos.organizadores.length} | ubicaciones: ${datos.ubicaciones.length} | eventos: ${datos.eventos.length}`);
  if (omitidos) console.warn(`ATENCIÓN: ${omitidos} referencias a imágenes/archivos locales NO se exportaron. Solo se incluyen URL http(s).`);
  console.log("Revisá el JSON antes de hacer git add: no debe contener información privada.");
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
