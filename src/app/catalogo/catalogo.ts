import { recursoVisible } from "./acceso-recursos.js";
import { type Context, Hono } from "hono";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError } from "../../configuracion/AppError.js";
import { idValido } from "../turista/turista.schema.js";

const app = new Hono();
app.get('/mapa/lugares', async c => {
  const buscar = (c.req.query('buscar') || '').trim();
  if (buscar.length > 100) throw new BadRequestError();
  const lugares = await prisma.ubicacion.findMany({
    where: {estado:'PUBLICADO', ...(buscar ? {OR:[{nombre:{contains:buscar}},{localidad:{contains:buscar}},{categoria:{is:{nombre:{contains:buscar}}}}]} : {})},
    select:{id:true,nombre:true,localidad:true,latitud:true,longitud:true,categoria:{select:{nombre:true}}},
    orderBy:[{nombre:'asc'},{id:'asc'}],take:501,
  });
  return c.json({lugares:lugares.slice(0,500),limitado:lugares.length>500});
});
const seleccionEvento = {
  id: true, titulo: true, descripcion: true, inicio: true, fin: true, categoria: true,
  lugar_evento: true, latitud: true, longitud: true, es_gratuito: true,
  precio: true, contacto: true,
  recursos: { orderBy: { orden: "asc" as const }, select: { id: true, tipo: true, descripcion: true } },
} as const;
export function fechaFiltro(valor: string | undefined, fin = false) {
  if (!valor) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestError("Fecha inválida.");
  const dia = new Date(valor + "T00:00:00Z");
  if (!Number.isFinite(dia.getTime()) || dia.toISOString().slice(0, 10) !== valor) throw new BadRequestError("Fecha inválida.");
  // Los filtros corresponden a días completos de Uruguay (UTC-3).
  return new Date(valor + (fin ? "T23:59:59.999-03:00" : "T00:00:00-03:00"));
}
function serializarEvento<T extends { recursos: { id: number; tipo: string; descripcion: string | null }[] }>(e: T) {
  return { ...e, recursos: e.recursos.map(r => ({ ...r, uri: `/api/recursos/${r.id}` })) };
}

export const listarEventos = async (c: Context) => {
  const limit = Number(c.req.query("limit") || 50);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestError();
  const categorias = (c.req.queries("categoria") || []).flatMap(v=>v.split(",")).map(Number);
  const offset = c.req.query("offset") === undefined ? undefined : Number(c.req.query("offset"));
  if (categorias.some(n=>!Number.isSafeInteger(n)||n<1) || (offset !== undefined && (!Number.isSafeInteger(offset)||offset<0||offset>1000000))) throw new BadRequestError();
  const desde = fechaFiltro(c.req.query("desde"));
  const hasta = fechaFiltro(c.req.query("hasta"), true);
  const buscar = (c.req.query("buscar") || "").trim();
  if (buscar.length > 100 || (desde && hasta && desde > hasta)) throw new BadRequestError("Revisá el rango de fechas.");
  const pagina = Number(c.req.query("pagina") || 1);
  if (!Number.isInteger(pagina) || pagina < 1 || pagina > 10000) throw new BadRequestError();
  const eventos = await prisma.evento.findMany({
    where: { estado: "PUBLICADO", ...(categorias.length ? {id_categoria:{in:categorias}} : {}), AND: [
      ...(hasta ? [{ inicio: { lte: hasta } }] : []),
      ...(desde ? [{ OR: [{ fin: { gte: desde } }, { fin: null, inicio: { gte: desde } }] }] : []),
      ...(buscar ? [{ OR: [{ titulo: { contains: buscar } }, { lugar_evento: { contains: buscar } }] }] : []),
    ] },
    take: limit,
    skip: offset ?? (pagina - 1) * limit,
    orderBy: [{ inicio: "asc" }, { id: "asc" }],
    select: seleccionEvento,
  });
  return c.json(eventos.map(serializarEvento));
};

export const detalleEvento = async (c: Context) => {
  const id = idValido(c.req.param("id") || "");
  if (!id) throw new NotFoundError();
  const evento = await prisma.evento.findFirst({ where: { id, estado: "PUBLICADO" }, select: seleccionEvento });
  if (!evento) throw new NotFoundError("Evento no disponible.");
  return c.json(serializarEvento(evento));
};

// Resolver únicamente imágenes registradas y asociadas a contenido publicado.
// Nunca aceptar rutas de archivos proporcionadas por la petición.
app.get("/recursos/:id", async (c) => {
  const id = idValido(c.req.param("id") || "");
  if (!id) throw new NotFoundError();
  const recurso = await recursoVisible(c, {id});
  if (!recurso) throw new NotFoundError();
  const evento = /^\/api\/organizador\/eventos\/media\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/.exec(recurso.uri);
  const publico = /^(?:\/api\/archivos)?\/publicos\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp))$/.exec(recurso.uri);
  const demo = /^\/publico\/demo\/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|mp4))$/.exec(recurso.uri);
  const archivo = evento ? path.join(process.cwd(), "publico", "eventos", evento[1])
    : publico ? path.join(process.cwd(), "publicos", publico[1])
    : demo ? path.join(process.cwd(), "publico", "demo", demo[1]) : null;
  if (!archivo) throw new NotFoundError();
  if (archivo.endsWith(".mp4")) {
    if (recurso.tipo !== "VIDEO") throw new NotFoundError();
    const info = await stat(archivo).catch(() => null);
    if (!info?.isFile()) throw new NotFoundError();
    const headers = new Headers({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    let inicio = 0, fin = info.size - 1;
    const range = c.req.header("range");
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!m || (!m[1] && !m[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      inicio = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
      fin = m[1] && m[2] ? Math.min(Number(m[2]), fin) : fin;
      if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fin) || inicio > fin || inicio >= info.size || (!m[1] && Number(m[2]) === 0)) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${info.size}` } });
      headers.set("Content-Range", `bytes ${inicio}-${fin}/${info.size}`);
    }
    headers.set("Content-Length", String(fin - inicio + 1));
    return new Response(c.req.method === "HEAD" ? null : Readable.toWeb(createReadStream(archivo, { start: inicio, end: fin })) as ReadableStream, { status: range ? 206 : 200, headers });
  }
  if (recurso.tipo !== "IMAGEN") throw new NotFoundError();
  let bytes: Buffer;
  try { bytes = await readFile(archivo); } catch { throw new NotFoundError(); }
  const tipo = archivo.endsWith(".png") ? "image/png" : archivo.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(new Uint8Array(bytes), { headers: {
    "Content-Type": tipo, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store"
  }});
});

export { app as PublicoRoute };
