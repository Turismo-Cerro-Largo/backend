import { Hono } from "hono";
import { crear_sesion } from "../src/middleware/Session.js";
import 'dotenv/config';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { app } from '../src/app.js';
import { prisma } from '../src/configuracion/db.js';

const aislada = process.env.TURISTA_TEST_DB === process.env.DATABASE_NAME && /^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || '');
describe.skipIf(!aislada)('catálogo público: fechas, navegación y medios', () => {
  const marca = randomUUID();
  let org: number, cat: number, evento: number, oculto: number, lugar: number, video: number, privado: number;
  const archivo = `publico/demo/${marca}.mp4`;
  beforeAll(async () => {
    cat = (await prisma.categoria.create({ data: { nombre: marca } })).id;
    org = (await prisma.organizador.create({ data: { nombre_organizacion: marca, email: `${marca}@example.invalid`, rut_ruc: marca.slice(0,30), telefono: 'prueba', passhash: 'inutilizable' } })).id;
    const datos = { titulo: marca, descripcion: 'Prueba de calendario', inicio: new Date('2030-11-12T00:00:00-03:00'), fin: new Date('2030-11-15T23:59:59-03:00'), id_categoria: cat, id_organizador: org };
    evento = (await prisma.evento.create({data: {...datos, estado:'PUBLICADO'}})).id;
    oculto = (await prisma.evento.create({data: {...datos, estado:'BORRADOR'}})).id;
    lugar = (await prisma.ubicacion.create({data:{nombre:marca, descripcion:'Prueba', localidad:marca, latitud:0,longitud:0,id_categoria:cat,estado:'PUBLICADO'}})).id;
    await mkdir('publico/demo',{recursive:true});
    await writeFile(archivo, Buffer.from('0123456789'));
    video = (await prisma.recurso.create({data:{uri:`/${archivo}`,tipo:'VIDEO',id_evento:evento}})).id;
    privado = (await prisma.recurso.create({data:{uri:`/${archivo}`,tipo:'VIDEO',id_evento:oculto}})).id;
  });
  afterAll(async () => {
    const ids = [evento, oculto].filter(Number.isInteger);
    if (ids.length) {
      await prisma.recurso.deleteMany({where:{id_evento:{in:ids}}});
      await prisma.evento.deleteMany({where:{id:{in:ids}}});
    }
    if (lugar) {
      await prisma.recurso.deleteMany({where:{id_ubicacion:lugar}});
      await prisma.ubicacion.deleteMany({where:{id:lugar}});
    }
    if (org) await prisma.organizador.deleteMany({where:{id:org}});
    if (cat) await prisma.categoria.deleteMany({where:{id:cat}});
    await unlink(archivo).catch(()=>{});
    await prisma.$disconnect();
  });
  it('incluye un evento que comenzó antes del rango pero continúa', async()=>{
    const r=await app.request(`/api/eventos?desde=2030-11-14&hasta=2030-11-14&buscar=${marca}`);
    expect(r.status).toBe(200); expect((await r.json()).map((e:any)=>e.id)).toEqual([evento]);
  });
  it('incluye el último día en Uruguay y excluye el siguiente', async()=>{
    for(const [dia,cantidad] of [['15',1],['16',0]] as const){
      const r=await app.request(`/api/eventos?desde=2030-11-${dia}&hasta=2030-11-${dia}&buscar=${marca}`);
      expect(await r.json()).toHaveLength(cantidad);
    }
  });
  it('rechaza fechas imposibles y rangos invertidos',async()=>{
    for(const q of ['desde=2030-02-30','desde=2030-11-15&hasta=2030-11-12','desde=ayer','pagina=1.5']) expect((await app.request(`/api/eventos?${q}`)).status).toBe(400);
  });
  it('solo permite abrir detalles publicados',async()=>{
    expect((await app.request(`/api/eventos/${evento}`)).status).toBe(200);
    expect((await app.request(`/api/eventos/${oculto}`)).status).toBe(404);
    expect((await app.request('/api/eventos/no-valido')).status).toBe(404);
  });
  it('filtra localidad exacta y la combina con búsqueda',async()=>{
    const r=await app.request(`/api/lugares?localidad=${marca}&buscar=${marca}`);
    expect((await r.json()).lugares.map((l:any)=>l.id)).toEqual([lugar]);
    const vacio=await app.request(`/api/lugares?localidad=${marca}&buscar=no-coincide`);
    expect((await vacio.json()).total).toBe(0);
  });
  it('sirve rangos de video para reproducción y búsqueda',async()=>{
    const r=await app.request(`/api/recursos/${video}`,{headers:{range:'bytes=2-5'}});
    expect(r.status).toBe(206);expect(r.headers.get('content-range')).toBe('bytes 2-5/10');expect(await r.text()).toBe('2345');
  });
  it('acepta rangos sufijo y rechaza rangos fuera del archivo',async()=>{
    const r=await app.request(`/api/recursos/${video}`,{headers:{range:'bytes=-3'}});expect(await r.text()).toBe('789');
    for(const range of ['bytes=100-','bytes=8-2','bytes=-0','bytes=0-2,4-5']) expect((await app.request(`/api/recursos/${video}`,{headers:{range}})).status).toBe(416);
  });
  it('ocultar el padre retira también su video',async()=>{
    expect((await app.request(`/api/recursos/${privado}`)).status).toBe(404);
  });
  it('el mapa busca lugares publicados y retira los ocultos',async()=>{
    const r=await app.request(`/api/mapa/lugares?buscar=${marca}`);
    expect((await r.json()).lugares.map((l:any)=>l.id)).toEqual([lugar]);
    await prisma.ubicacion.update({where:{id:lugar},data:{estado:'OCULTADO'}});
    try { const ocultos=await app.request(`/api/mapa/lugares?buscar=${marca}`);expect((await ocultos.json()).lugares).toHaveLength(0); }
    finally {await prisma.ubicacion.update({where:{id:lugar},data:{estado:'PUBLICADO'}});}
  });
  it('transporte filtra recorridos, conserva horas y excluye horarios ocultos',async()=>{
    const empresa=await prisma.empresaTransporte.create({data:{nombre:`Test ${marca}`}});
    try {
      const h=await prisma.horarioOmnibus.create({data:{origen:marca,destino:'Destino de prueba',hora_salida:new Date('1970-01-01T08:15:00Z'),hora_llegada:new Date('1970-01-01T09:45:00Z'),dias:'Lunes a viernes',tipo_servicio:'DEPARTAMENTAL',id_empresa:empresa.id,estado:'PUBLICADO'}});
      const r=await app.request(`/api/horarios-omnibus?origen=${marca}&destino=Destino%20de%20prueba`);
      const d=await r.json();expect(d.total).toBe(1);expect(d.horarios[0].hora_salida).toBe('08:15');expect(d.horarios[0].hora_llegada).toBe('09:45');
      const vacio=await app.request(`/api/horarios-omnibus?origen=${marca}&destino=Otro`);expect((await vacio.json()).total).toBe(0);
      await prisma.horarioOmnibus.update({where:{id:h.id},data:{estado:'OCULTADO'}});
      const ocultos=await app.request(`/api/horarios-omnibus?origen=${marca}`);const o=await ocultos.json();expect(o.total).toBe(0);expect(o.origenes).not.toContain(marca);
      expect((await app.request('/api/horarios-omnibus?pagina=-1')).status).toBe(400);
    } finally {await prisma.empresaTransporte.delete({where:{id:empresa.id}});}
  });
  it('permite la vista previa privada al organizador dueño y la niega al público',async()=>{
    const helper=new Hono();helper.get('/',async c=>{await crear_sesion(c,{id:org,tipo:'organizador',rol:'ORGANIZADOR'});return c.text('ok');});
    const cookie=(await helper.request('/')).headers.get('set-cookie')!.split(';')[0]!;
    expect((await app.request(`/api/recursos/${privado}`)).status).toBe(404);
    expect((await app.request(`/api/recursos/${privado}`,{headers:{cookie}})).status).toBe(200);
  });

});
