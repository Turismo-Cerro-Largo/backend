import { Hono } from 'hono';
import { prisma } from '../../configuracion/db.js';
import { fileResponse } from './files.js';
import { identifier } from './schemas.js';
const app=new Hono();
app.get('/lugares',async(c)=>{
    const items=await prisma.ubicacion.findMany({where:{estado:'PUBLICADO'},include:{categoria:true,recursos:{select:{id:true,tipo:true,descripcion:true}},comentarios:{where:{estado:'PUBLICADO'},select:{id:true,texto:true,calificacion:true,creado_en:true}}},orderBy:{nombre:'asc'}});
    return c.json(items.map((item)=>({...item,promedio:item.comentarios.length?item.comentarios.reduce((sum,r)=>sum+r.calificacion,0)/item.comentarios.length:null})));
});
app.get('/eventos',async(c)=>c.json(await prisma.evento.findMany({where:{estado:'PUBLICADO'},include:{categoria:true,organizador:{select:{nombre_organizacion:true}},recursos:{select:{id:true,tipo:true,descripcion:true}}},orderBy:{inicio:'asc'}})));
app.get('/transporte',async(c)=>c.json(await prisma.horarioOmnibus.findMany({where:{estado:'PUBLICADO'},include:{empresa:true},orderBy:{origen:'asc'}})));
app.get('/archivos/:id',async(c)=>{
    const id=Number(c.req.param('id')); if(!Number.isSafeInteger(id)||id<1)return c.notFound();
    const resource=await prisma.recurso.findFirst({where:{id,OR:[{ubicacion:{estado:'PUBLICADO'}},{evento:{estado:'PUBLICADO'}},{comentario:{estado:'PUBLICADO',ubicacion:{estado:'PUBLICADO'}}}]}});
    if(!resource)return c.notFound(); return fileResponse(resource.uri);
});
export {app as PublicContentRoute};
