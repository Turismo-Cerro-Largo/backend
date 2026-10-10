import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { app } from '../src/app.js';
import { prisma } from '../src/configuracion/db.js';

if (process.env.DATABASE_NAME !== 'cerrolargo360_admin_dev') throw Error('Prueba permitida solamente en la base local del panel.');
const credentials = JSON.parse(readFileSync('.admin-local-credentials.json', 'utf8'));
const marker = 'Verificación ' + Date.now();
let categoryId: number | undefined;
let placeId: number | undefined;
let eventId: number | undefined;
let orgId: number | undefined;
let cookie = '';
let checks = 0;
async function request(path: string, method = 'GET', data?: unknown, authenticated = true, origin = 'http://localhost:5173') {
    return app.request('/api' + path, { method, headers: { ...(authenticated ? {cookie} : {}), origin, ...(data ? {'content-type':'application/json'} : {}) }, body: data ? JSON.stringify(data) : undefined });
}
async function expect(response: Response, status: number) { assert.equal(response.status, status, await response.text()); checks++; }
try {
    await expect(await request('/admin/datos','GET',undefined,false),401);
    const form = new FormData(); form.set('email',credentials.email); form.set('password',credentials.password);
    const login = await app.request('/api/auth/login',{method:'POST',body:form});
    cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
    await expect(login,200); assert.ok(cookie);
    const snapshot = await request('/admin/datos'); assert.equal(snapshot.status,200);
    const initial = await snapshot.json(); assert.equal(initial.records.categorias.length >= 5,true); checks++;
    await expect(await request('/admin/categorias','POST',{nombre:marker},true,'https://untrusted.example'),403);
    await expect(await request('/admin/categorias','POST',{nombre:marker}),201);
    categoryId = (await prisma.categoria.findUniqueOrThrow({where:{nombre:marker}})).id;
    const place = {nombre:marker,detalle:marker,extra:'Melo',descripcion:'Lugar temporal de prueba',latitud:-32.37,longitud:-54.17,estado:'Publicado'};
    await expect(await request('/admin/lugares','POST',place),201);
    placeId = (await prisma.ubicacion.findFirstOrThrow({where:{nombre:marker}})).id;
    assert.ok((await (await request('/contenido/lugares')).json()).some((p: any)=>p.id===placeId)); checks++;
    await expect(await request('/admin/lugares/L-'+placeId,'PUT',{...place,estado:'Oculto'}),200);
    assert.ok(!(await (await request('/contenido/lugares')).json()).some((p: any)=>p.id===placeId)); checks++;
    const event = {nombre:marker,descripcion:'Evento temporal de prueba',categoria:'C-'+categoryId,organizador:'',inicio:'2026-12-01T10:00',fin:'2026-12-01T12:00',lugar:'Melo',latitud:-32.37,longitud:-54.17,entrada:'Gratuita',precio:0};
    await expect(await request('/admin/eventos','POST',event),201);
    eventId = (await prisma.evento.findFirstOrThrow({where:{titulo:marker}})).id;
    const saved = await prisma.evento.findUniqueOrThrow({where:{id:eventId}});
    assert.equal(saved.id_organizador,null); assert.ok(saved.id_administrador); checks++;
    const admin = await prisma.usuario.findUniqueOrThrow({where:{email:credentials.email}});
    const org = await prisma.organizador.create({data:{nombre_organizacion:marker,rut_ruc:String(Date.now()),email:Date.now()+'@test.invalid',telefono:'099000000',passhash:admin.passhash!}}); orgId=org.id;
    const orgForm = new FormData(); orgForm.set('email',org.email); orgForm.set('password',credentials.password);
    const orgLogin = await app.request('/api/auth/login',{method:'POST',body:orgForm});
    assert.equal(orgLogin.status,200);
    const orgCookie = orgLogin.headers.get('set-cookie')!.split(';')[0];
    await expect(await app.request('/api/admin/datos',{headers:{cookie:orgCookie}}),403);
    await expect(await app.request('/api/organizador/eventos',{method:'POST',headers:{cookie:orgCookie,origin:'http://localhost:5173','content-type':'application/json'},body:JSON.stringify(event)}),403);
    await expect(await request('/admin/decisiones/organizadores/O-'+orgId,'POST',{estado:'Aprobado'}),200);
    assert.equal((await prisma.organizador.findUniqueOrThrow({where:{id:orgId}})).estado,'APROBADO'); checks++;
    await expect(await request('/admin/decisiones/organizadores/O-'+orgId,'POST',{estado:'Rechazado'}),409);
    await prisma.evento.update({where:{id:eventId},data:{id_organizador:orgId,id_administrador:null,estado:'PENDIENTE_REVISION'}});
    await expect(await request('/admin/decisiones/eventos/E-'+eventId,'POST',{estado:'Rechazado',motivo:'Corregir fecha'}),200);
    assert.equal((await prisma.evento.findUniqueOrThrow({where:{id:eventId}})).motivo_rechazo,'Corregir fecha'); checks++;
    await expect(await request('/admin/documentos/1','GET',undefined,false),401);
    const upload = new FormData(); upload.set('nombre',marker); upload.set('descripcion',marker); upload.set('destino','lugares:L-'+placeId);
    upload.set('archivo',new File(['invalid'], 'fake.png', {type:'image/png'}));
    await expect(await app.request('/api/admin/multimedia',{method:'POST',headers:{cookie,origin:'http://localhost:5173'},body:upload}),400);
    await expect(await request('/admin/eventos/E-'+eventId,'DELETE'),200); eventId=undefined;
    await expect(await request('/admin/lugares/L-'+placeId,'DELETE'),200); placeId=undefined;
    console.log(`${checks} comprobaciones de integración correctas; datos temporales eliminados.`);
} finally {
    if(eventId) await prisma.evento.deleteMany({where:{id:eventId}});
    if(placeId) await prisma.ubicacion.deleteMany({where:{id:placeId}});
    if(orgId) await prisma.organizador.deleteMany({where:{id:orgId}});
    if(categoryId) await prisma.categoria.deleteMany({where:{id:categoryId}});
    await prisma.$disconnect();
}
