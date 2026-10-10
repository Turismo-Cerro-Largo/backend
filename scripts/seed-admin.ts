import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
import { hash } from '@node-rs/argon2';
import { prisma } from '../src/configuracion/db.js';
if(process.env.DATABASE_NAME!=='cerrolargo360_admin_dev') throw new Error('Este script solo prepara la base local del panel.');
try {
    const email='admin@cerrolargo360.test';
    const existing=await prisma.usuario.findUnique({where:{email}});
    if(!existing) {
        const password='Cl360!'+randomBytes(14).toString('base64url');
        if(existsSync('.admin-local-credentials.json'))throw Error('Ya existe un archivo de credenciales local. No se sobrescribió.');
        const passhash=await hash(password,{memoryCost:19456,timeCost:2,parallelism:1});
        await prisma.usuario.create({data:{nombres:'Administrador',apellidos:'Local',email,passhash,rol:'ADMINISTRADOR'}});
        writeFileSync('.admin-local-credentials.json',JSON.stringify({email,password},null,2),{mode:0o600,flag:'wx'});
        console.log('Cuenta creada. Credenciales en .admin-local-credentials.json (ignorado por Git).');
    } else console.log('La cuenta ya existe; no se cambió su contraseña ni su rol.');
    for(const nombre of ['Alojamiento','Restaurantes','Parques/Naturaleza','Cultura','Eventos Sociales']) await prisma.categoria.upsert({where:{nombre},update:{},create:{nombre}});
    console.log('Categorías iniciales verificadas.');
} finally {await prisma.$disconnect();}
