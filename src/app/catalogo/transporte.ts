import type { Context } from 'hono';
import { prisma } from '../../configuracion/db.js';
import { BadRequestError } from '../../configuracion/AppError.js';
export const consultarHorarios = async (c: Context) => {
    const origen = (c.req.query('origen') || '').trim();
    const destino = (c.req.query('destino') || '').trim();
    const pagina = Number(c.req.query('pagina') || 1);
    if (origen.length > 120 || destino.length > 120 || !Number.isSafeInteger(pagina) || pagina < 1 || pagina > 10000) throw new BadRequestError();
    const where = { estado: 'PUBLICADO' as const, ...(origen ? {origen} : {}), ...(destino ? {destino} : {}) };
    const [horarios,total,rutas] = await Promise.all([
        prisma.horarioOmnibus.findMany({where,skip:(pagina-1)*12,take:12,orderBy:[{hora_salida:'asc'},{id:'asc'}],select:{id:true,origen:true,destino:true,hora_salida:true,hora_llegada:true,dias:true,tipo_servicio:true,precio:true,empresa:{select:{nombre:true,telefono:true,sitio_web:true}}}}),
        prisma.horarioOmnibus.count({where}),
        prisma.horarioOmnibus.findMany({where:{estado:'PUBLICADO'},distinct:['origen','destino'],select:{origen:true,destino:true}}),
    ]);
    return c.json({horarios:horarios.map(h=>({...h,hora_salida:h.hora_salida.toISOString().slice(11,16),hora_llegada:h.hora_llegada?.toISOString().slice(11,16) || null})),total,pagina,porPagina:12,
        origenes:[...new Set(rutas.map(r=>r.origen))].sort(),destinos:[...new Set(rutas.map(r=>r.destino))].sort()});
};
