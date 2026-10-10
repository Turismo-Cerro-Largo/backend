import { prisma } from '../../configuracion/db.js';

export const statusLabel = (value: string) => ({ PUBLICADO:'Publicado', OCULTADO:'Oculto', APROBADO:'Aprobado', RECHAZADO:'Rechazado', PENDIENTE_REVISION:'Pendiente de revisión', BORRADOR:'Borrador', CANCELADO:'Cancelado', FINALIZADO:'Finalizado' }[value] ?? value);
export const localDate = (date: Date) => new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0,16);
const row = (id: string, nombre: string, detalle: string, extra: string, estado: string, data: Record<string,string> = {}) => ({ id, nombre, detalle, extra, estado, data });

export async function snapshot() {
    const [categories, places, events, organizers, users, comments, media, companies, schedules] = await prisma.$transaction([
        prisma.categoria.findMany({ orderBy: { nombre:'asc' } }),
        prisma.ubicacion.findMany({ include: { categoria:true }, orderBy: { id:'desc' } }),
        prisma.evento.findMany({ include: { organizador: { select: { nombre_organizacion:true } } }, orderBy: { inicio:'desc' } }),
        prisma.organizador.findMany({ select: { id:true, nombre_organizacion:true, rut_ruc:true, departamento:true, email:true, telefono:true, sitio_web:true, estado:true, motivo_rechazo:true, documentos: { select: { id:true, tipo:true } } }, orderBy: { id:'desc' } }),
        prisma.usuario.findMany({ select: { id:true, nombres:true, apellidos:true, email:true, rol:true, creado_en:true }, orderBy: { id:'desc' } }),
        prisma.comentario.findMany({ include: { ubicacion: { select: { nombre:true } }, usuario: { select: { nombres:true, apellidos:true } } }, orderBy: { id:'desc' } }),
        prisma.recurso.findMany({ orderBy: { id:'desc' } }),
        prisma.empresaTransporte.findMany({ orderBy: { nombre:'asc' } }),
        prisma.horarioOmnibus.findMany({ include: { empresa:true }, orderBy: { id:'desc' } })
    ]);
    return {
        records: {
            categorias: categories.map((c) => row('C-'+c.id,c.nombre,c.descripcion??'','','Activa',{nombre:c.nombre,descripcion:c.descripcion??''})),
            eventos: events.map((e) => row('E-'+e.id,e.titulo,e.organizador?.nombre_organizacion??'Administración',localDate(e.inicio).replace('T',' '),statusLabel(e.estado),{
                nombre:e.titulo,descripcion:e.descripcion,categoria:'C-'+e.id_categoria,organizador:e.id_organizador?'O-'+e.id_organizador:'',inicio:localDate(e.inicio),fin:e.fin?localDate(e.fin):'',lugar:e.lugar_evento??'',latitud:String(e.latitud??''),longitud:String(e.longitud??''),entrada:e.es_gratuito?'Gratuita':'Con costo',precio:String(e.precio??0),contacto:e.contacto??'',motivo:e.motivo_rechazo??''
            })),
            organizadores: organizers.map((o) => row('O-'+o.id,o.nombre_organizacion,o.email,o.departamento??'',o.estado==='PENDIENTE_REVISION'?'Pendiente de verificación':statusLabel(o.estado),{
                nombre:o.nombre_organizacion,rut:o.rut_ruc,email:o.email,telefono:o.telefono,departamento:o.departamento??'',web:o.sitio_web??'',motivo:o.motivo_rechazo??'',
                frente:o.documentos.find((d)=>d.tipo==='CEDULA_FRENTE')?'/api/admin/documentos/'+o.documentos.find((d)=>d.tipo==='CEDULA_FRENTE')!.id:'',
                dorso:o.documentos.find((d)=>d.tipo==='CEDULA_DORSO')?'/api/admin/documentos/'+o.documentos.find((d)=>d.tipo==='CEDULA_DORSO')!.id:''
            })),
            usuarios: users.map((u)=>row('U-'+u.id,u.nombres+' '+u.apellidos,u.email,u.rol==='ADMINISTRADOR'?'Administrador':'Usuario registrado','Registrado',{creado_en:u.creado_en.toISOString()})),
            comentarios: comments.map((c)=>row('R-'+c.id,c.texto||'Calificación sin comentario',c.ubicacion.nombre,c.calificacion+' de 5',statusLabel(c.estado),{autor:c.usuario.nombres+' '+c.usuario.apellidos})),
            multimedia: media.filter((m)=>m.id_ubicacion||m.id_evento).map((m)=>row('M-'+m.id,m.descripcion||'Recurso '+m.id,'',m.tipo==='IMAGEN'?'Imagen':'Video','Disponible',{
                nombre:m.descripcion||'Recurso '+m.id,descripcion:m.descripcion??'',destino:m.id_ubicacion?'lugares:L-'+m.id_ubicacion:'eventos:E-'+m.id_evento,tipo:m.tipo==='IMAGEN'?'Imagen':'Video',url:'/api/admin/multimedia/'+m.id+'/archivo',archivo:m.uri.split('/').pop()??''
            })),
            transporte: companies.map((c)=>row('T-'+c.id,c.nombre,c.telefono??'',c.sitio_web??'','Activa',{nombre:c.nombre,telefono:c.telefono??'',web:c.sitio_web??''})),
            horarios: schedules.map((s)=>row('H-'+s.id,s.origen+' → '+s.destino,s.empresa.nombre+' · '+s.dias,s.hora_salida.toISOString().slice(11,16)+' / '+(s.hora_llegada?.toISOString().slice(11,16)??''),statusLabel(s.estado),{
                empresa:'T-'+s.id_empresa,origen:s.origen,destino:s.destino,salida:s.hora_salida.toISOString().slice(11,16),llegada:s.hora_llegada?.toISOString().slice(11,16)??'',diaLlegada:s.llegada_dia_siguiente?'Día siguiente':'Mismo día',dias:s.dias,tipo:s.tipo_servicio==='DEPARTAMENTAL'?'Departamental':'Interdepartamental',precio:String(s.precio??0)
            }))
        },
        places: places.map((p)=>({id:'L-'+p.id,nombre:p.nombre,detalle:p.categoria.nombre,extra:p.localidad,estado:statusLabel(p.estado),descripcion:p.descripcion,direccion:p.direccion??'',latitud:String(p.latitud),longitud:String(p.longitud),telefono:p.telefono??'',sitioWeb:p.sitio_web??'',horario:p.horario??''}))
    };
}
