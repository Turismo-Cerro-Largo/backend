import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { prisma } from '../../configuracion/db.js';
import { account, verifyOrigin } from './session.js';
import { AppError, ForbiddenError, NotFoundError } from '../../configuracion/AppError.js';
import { eventSchema, identifier } from './schemas.js';
const app=new Hono<{Variables:{organizerId:number;approved:boolean}}>();
app.use('*',async(c,next)=>{
    const user=await account(c); if(user.tipo!=='organizador') throw new ForbiddenError();
    c.set('organizerId',user.id);c.set('approved',user.estado==='APROBADO');verifyOrigin(c);
    if(c.req.method!=='GET'&&!c.get('approved')) throw new ForbiddenError('Tu solicitud debe estar aprobada para gestionar eventos.');
    c.header('Cache-Control','private, no-store');await next();
});
app.use('*',bodyLimit({maxSize:65536}));
app.onError((err,c)=>{
    if(err instanceof z.ZodError) return c.json({message:err.issues[0]?.message},400);
    if(err instanceof AppError) return c.json({message:err.message},err.statusCode as 400);
    return c.json({message:'No se pudo guardar. Revisá los datos.'},400);
});
app.get('/eventos',async(c)=>c.json({aprobado:c.get('approved'),eventos:await prisma.evento.findMany({where:{id_organizador:c.get('organizerId')},orderBy:{inicio:'desc'}}),categorias:await prisma.categoria.findMany({orderBy:{nombre:'asc'}})}));
app.on(['POST','PUT'],'/eventos/:id?',async(c)=>{
    const id=c.req.param('id')?identifier.parse(c.req.param('id')):undefined;
    if(id&&!await prisma.evento.findFirst({where:{id,id_organizador:c.get('organizerId')}}))throw new NotFoundError();
    const parsed=eventSchema.parse({...await c.req.json(),organizador:c.get('organizerId')});
    const data={titulo:parsed.nombre,descripcion:parsed.descripcion,inicio:new Date(parsed.inicio+'-03:00'),fin:parsed.fin?new Date(parsed.fin+'-03:00'):null,lugar_evento:parsed.lugar,latitud:parsed.latitud,longitud:parsed.longitud,es_gratuito:parsed.entrada==='Gratuita',precio:parsed.entrada==='Gratuita'?0:parsed.precio,contacto:parsed.contacto||null,id_categoria:parsed.categoria,id_organizador:c.get('organizerId'),estado:'PENDIENTE_REVISION' as const,motivo_rechazo:null};
    if(id)await prisma.evento.update({where:{id,id_organizador:c.get('organizerId')},data});else await prisma.evento.create({data});
    return c.json({message:'Evento enviado para revisión.'},id?200:201);
});
export {app as OrganizerEventsRoute};
