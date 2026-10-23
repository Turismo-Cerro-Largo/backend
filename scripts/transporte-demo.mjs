import { prisma } from '../dist/configuracion/db.js';
if (!/^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || '')) throw new Error('Solo base aislada de pruebas.');
try {
    const empresa = await prisma.empresaTransporte.upsert({where:{nombre:'Transporte de prueba (Ficticia)'},update:{},create:{nombre:'Transporte de prueba (Ficticia)'}});
    for(const [origen,destino,salida,llegada,dias] of [
        ['Melo','Río Branco','08:00','09:30','Lunes a viernes'],
        ['Melo','Río Branco','14:00','15:30','Todos los días'],
        ['Río Branco','Melo','17:00','18:30','Todos los días'],
        ['Melo','Fraile Muerto','10:00','11:00','Sábados y domingos'],
        ['Fraile Muerto','Melo','16:00','17:00','Sábados y domingos'],
        ['Melo','Aceguá','09:00','10:15','Lunes, miércoles y viernes'],
    ]) {
        const data={origen,destino,hora_salida:new Date(`1970-01-01T${salida}:00Z`),hora_llegada:new Date(`1970-01-01T${llegada}:00Z`),dias,tipo_servicio:'DEPARTAMENTAL',id_empresa:empresa.id,estado:'PUBLICADO',precio:null};
        const existente=await prisma.horarioOmnibus.findFirst({where:{id_empresa:empresa.id,origen,destino,hora_salida:data.hora_salida}});
        if(existente) await prisma.horarioOmnibus.update({where:{id:existente.id},data});
        else await prisma.horarioOmnibus.create({data});
    }
    console.log('Seis horarios ficticios disponibles en la base aislada.');
} finally { await prisma.$disconnect(); }
