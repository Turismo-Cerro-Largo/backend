import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import dotenv from 'dotenv';
const filename='.env';
const original=fs.readFileSync(filename,'utf8');
const config=dotenv.parse(original);
if(!['localhost','127.0.0.1','::1'].includes(config.DATABASE_HOST)) throw Error('La preparación automática solo admite MySQL local.');
const mariadb=createRequire(import.meta.resolve('@prisma/adapter-mariadb'))('mariadb');
let connection;
try {
    connection=await mariadb.createConnection({host:config.DATABASE_HOST,port:Number(config.DATABASE_PORT||3306),user:config.DATABASE_USER,password:config.DATABASE_PASSWORD,allowPublicKeyRetrieval:true,connectTimeout:5000});
    const name='cerrolargo360_admin_dev';
    await connection.query('CREATE DATABASE IF NOT EXISTS `cerrolargo360_admin_dev` CHARACTER SET utf8mb4');
    const updates={DATABASE_NAME:name,DATABASE_URL:`mysql://${encodeURIComponent(config.DATABASE_USER)}:${encodeURIComponent(config.DATABASE_PASSWORD)}@127.0.0.1:${config.DATABASE_PORT||3306}/${name}`,COOKIE_SECRET:config.COOKIE_SECRET?.length>=32?config.COOKIE_SECRET:crypto.randomBytes(48).toString('hex'),FRONTEND_ORIGIN:'http://localhost:5173,http://127.0.0.1:5173'};
    let next=original;
    for(const [key,value]of Object.entries(updates)) {
        const line=key+'='+JSON.stringify(value);const regex=new RegExp('^'+key+'=.*$','m');
        next=regex.test(next)?next.replace(regex,()=>line):next+'\n'+line+'\n';
    }
    fs.writeFileSync(filename,next,{mode:0o600});
    console.log('Base cerrolargo360_admin_dev preparada. turismo no fue modificada.');
} catch(error) {
    console.error('No se preparó la conexión:',error.code??'CONFIG_ERROR'); process.exitCode=1;
} finally {if(connection)await connection.end();}
