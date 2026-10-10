import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { prisma } from '../../configuracion/db.js';
import { AppError, BadRequestError, ConflictError, NotFoundError } from '../../configuracion/AppError.js';
import { administrator, verifyOrigin } from './session.js';
import { snapshot } from './snapshot.js';
import { identifier, placeSchema, categorySchema, companySchema, eventSchema, scheduleSchema, decisionSchema, visibilitySchema } from './schemas.js';
import { storeFile, discardFile, fileResponse } from './files.js';

const app = new Hono<{Variables:{adminId:number}}>();
app.use('*',async(c,next)=>{ const user=await administrator(c); c.set('adminId',user.id); verifyOrigin(c); c.header('Cache-Control','private, no-store'); await next(); });
app.use('*',bodyLimit({maxSize:21*1024*1024,onError:(c)=>c.json({message:'El archivo supera el límite de 20 MB.'},413)}));
app.onError((error,c)=>{
    if(error instanceof z.ZodError) return c.json({message:error.issues[0]?.message??'Revisá los datos.'},400);
    if(error instanceof SyntaxError) return c.json({message:'Los datos enviados no son válidos.'},400);
    if(error instanceof AppError) return c.json({message:error.message},error.statusCode as 400);
    const code=(error as {code?:string}).code;
    if(code==='P2002') return c.json({message:'Ya existe un registro con esos datos.'},409);
    if(code==='P2025') return c.json({message:'El registro ya no existe. Actualizá la página.'},404);
    if(code==='P2003') return c.json({message:'El registro tiene referencias o una referencia ya no existe.'},409);
    return c.json({message:'No se pudo completar la operación. Comprobá la conexión del servidor.'},500);
});
app.get('/datos',async(c)=>c.json(await snapshot()));
app.get('/documentos/:id',async(c)=>{
    const doc=await prisma.documentoOrganizador.findUnique({where:{id:identifier.parse(c.req.param('id'))}});
    if(!doc) throw new NotFoundError(); return fileResponse(doc.uri,true);
});
app.get('/multimedia/:id/archivo',async(c)=>{
    const media=await prisma.recurso.findUnique({where:{id:identifier.parse(c.req.param('id'))}});
    if(!media) throw new NotFoundError(); return fileResponse(media.uri);
});

app.post('/decisiones/:section/:id',async(c)=>{
    const id=identifier.parse(c.req.param('id')); const data=decisionSchema.parse(await c.req.json());
    const section=c.req.param('section');
    if(section==='eventos') {
        if(data.estado==='Aprobado') throw new BadRequestError();
        const event=await prisma.evento.findUnique({where:{id},include:{organizador:{select:{estado:true}}}});
        if(!event) throw new NotFoundError();
        if(data.estado==='Publicado'&&event.organizador&&event.organizador.estado!=='APROBADO') throw new ConflictError('Primero aprobá al organizador del evento.');
        const result=await prisma.evento.updateMany({where:{id,estado:'PENDIENTE_REVISION'},data:{estado:data.estado==='Publicado'?'PUBLICADO':'RECHAZADO',motivo_rechazo:data.estado==='Rechazado'?data.motivo||null:null}});
        if(!result.count) throw new ConflictError('El evento ya fue revisado. Actualizá la lista.');
    } else if(section==='organizadores') {
        if(data.estado==='Publicado') throw new BadRequestError();
        const result=await prisma.organizador.updateMany({where:{id,estado:'PENDIENTE_REVISION'},data:{estado:data.estado==='Aprobado'?'APROBADO':'RECHAZADO',motivo_rechazo:data.estado==='Rechazado'?data.motivo||null:null}});
        if(!result.count) throw new ConflictError('La solicitud ya fue revisada o no existe.');
    } else throw new NotFoundError();
    return c.json({message:'Decisión guardada.'});
});
app.patch('/comentarios/:id/estado',async(c)=>{
    const {estado}=visibilitySchema.parse(await c.req.json());
    await prisma.comentario.update({where:{id:identifier.parse(c.req.param('id'))},data:{estado:estado==='Publicado'?'PUBLICADO':'OCULTADO'}});
    return c.json({message:'Visibilidad actualizada.'});
});

app.on(['POST','PUT'],'/multimedia/:id?',async(c)=>{
    const id=c.req.param('id')?identifier.parse(c.req.param('id')):undefined;
    if(c.req.method==='PUT'&&!id || c.req.method==='POST'&&id) throw new BadRequestError();
    const form=await c.req.parseBody();
    const data=z.object({nombre:z.string().trim().min(1).max(150),descripcion:z.string().trim().min(1).max(255),destino:z.string().regex(/^(lugares:L-|eventos:E-)\d+$/)}).parse(form);
    const previous=id?await prisma.recurso.findUnique({where:{id}}):null;
    if(id&&!previous) throw new NotFoundError();
    const targetId=identifier.parse(data.destino.split(':')[1]); const place=data.destino.startsWith('lugares:');
    const target=place?await prisma.ubicacion.findUnique({where:{id:targetId},select:{id:true}}):await prisma.evento.findUnique({where:{id:targetId},select:{id:true}});
    if(!target) throw new BadRequestError('Seleccioná un lugar o evento existente.');
    const file=form.archivo;
    if(!(file instanceof File)&&!previous) throw new BadRequestError('Seleccioná un archivo.');
    const uploaded=file instanceof File&&file.size?await storeFile(file):null;
    try {
        const record={descripcion:data.descripcion,id_ubicacion:place?targetId:null,id_evento:place?null:targetId,id_comentario:null,...(uploaded??{})};
        if(id) await prisma.recurso.update({where:{id},data:record});
        else await prisma.recurso.create({data:{...record,...uploaded!}});
    } catch(error) { if(uploaded) await discardFile(uploaded.uri); throw error; }
    if(uploaded&&previous) await discardFile(previous.uri);
    return c.json({message:'Archivo guardado.'},id?200:201);
});

app.on(['POST','PUT'],'/:section/:id?',async(c)=>{
    const section=c.req.param('section'); const id=c.req.param('id')?identifier.parse(c.req.param('id')):undefined;
    if(c.req.method==='PUT'&&!id || c.req.method==='POST'&&id) throw new BadRequestError();
    const body=await c.req.json(); const input=body.data??body;
    if(section==='lugares') {
        const d=placeSchema.parse(input);
        const category=await prisma.categoria.findUnique({where:{nombre:d.detalle}});
        if(!category) throw new BadRequestError('La categoría no existe.');
        const data={nombre:d.nombre,descripcion:d.descripcion,localidad:d.extra,id_categoria:category.id,direccion:d.direccion||null,latitud:d.latitud,longitud:d.longitud,telefono:d.telefono||null,sitio_web:d.sitioWeb||null,horario:d.horario||null,estado:d.estado==='Publicado'?'PUBLICADO' as const:'OCULTADO' as const};
        if(id) await prisma.ubicacion.update({where:{id},data}); else await prisma.ubicacion.create({data});
    } else if(section==='categorias') {
        const d=categorySchema.parse(input); const data={nombre:d.nombre,descripcion:d.descripcion||null};
        if(id) await prisma.categoria.update({where:{id},data}); else await prisma.categoria.create({data});
    } else if(section==='eventos') {
        const d=eventSchema.parse(input);
        if(d.organizador) {
            const org=await prisma.organizador.findUnique({where:{id:d.organizador},select:{estado:true}});
            if(!org||org.estado!=='APROBADO') throw new BadRequestError('Seleccioná un organizador aprobado.');
        }
        const data={titulo:d.nombre,descripcion:d.descripcion,id_categoria:d.categoria,id_organizador:d.organizador||null,id_administrador:d.organizador?null:c.get('adminId'),inicio:new Date(d.inicio+'-03:00'),fin:d.fin?new Date(d.fin+'-03:00'):null,lugar_evento:d.lugar,latitud:d.latitud,longitud:d.longitud,es_gratuito:d.entrada==='Gratuita',precio:d.entrada==='Gratuita'?0:d.precio,contacto:d.contacto||null};
        if(id) await prisma.evento.update({where:{id},data}); else await prisma.evento.create({data:{...data,estado:'PUBLICADO'}});
    } else if(section==='transporte') {
        const d=companySchema.parse(input); const data={nombre:d.nombre,telefono:d.telefono||null,sitio_web:d.web||null};
        if(id) await prisma.empresaTransporte.update({where:{id},data}); else await prisma.empresaTransporte.create({data});
    } else if(section==='horarios') {
        const d=scheduleSchema.parse(input); const data={id_empresa:d.empresa,origen:d.origen,destino:d.destino,hora_salida:new Date('1970-01-01T'+d.salida+':00Z'),hora_llegada:new Date('1970-01-01T'+d.llegada+':00Z'),llegada_dia_siguiente:d.diaLlegada==='Día siguiente',dias:d.dias,tipo_servicio:d.tipo==='Departamental'?'DEPARTAMENTAL' as const:'INTERDEPARTAMENTAL' as const,precio:d.precio};
        if(id) await prisma.horarioOmnibus.update({where:{id},data}); else await prisma.horarioOmnibus.create({data});
    } else throw new NotFoundError('Operación no disponible.');
    return c.json({message:'Cambios guardados.'},id?200:201);
});

app.delete('/:section/:id',async(c)=>{
    const id=identifier.parse(c.req.param('id')); const section=c.req.param('section');
    if(section==='lugares') {
        if(await prisma.recurso.count({where:{id_ubicacion:id}})) throw new ConflictError('Retirá primero los archivos asociados al lugar.');
        await prisma.ubicacion.delete({where:{id}});
    } else if(section==='eventos') {
        if(await prisma.recurso.count({where:{id_evento:id}})) throw new ConflictError('Retirá primero los archivos asociados al evento.');
        await prisma.evento.delete({where:{id}});
    } else if(section==='comentarios') {
        if(await prisma.recurso.count({where:{id_comentario:id}})) throw new ConflictError('La reseña tiene archivos asociados.');
        await prisma.comentario.delete({where:{id}});
    } else if(section==='multimedia') {
        const record=await prisma.recurso.delete({where:{id}}); await discardFile(record.uri);
    } else throw new NotFoundError('Esta eliminación no está habilitada.');
    return c.json({message:'Registro eliminado.'});
});
export {app as AdminRoute};
