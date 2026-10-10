import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestError, NotFoundError } from '../../configuracion/AppError.js';

const formats: Record<string,{extension:string; check:(buffer:Buffer)=>boolean}> = {
    'image/jpeg': {extension:'.jpg',check:(b)=>b.length>3&&b[0]===255&&b[1]===216&&b[2]===255},
    'image/png': {extension:'.png',check:(b)=>b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))},
    'image/webp': {extension:'.webp',check:(b)=>b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'},
    'video/mp4': {extension:'.mp4',check:(b)=>b.toString('ascii',4,8)==='ftyp'},
    'video/webm': {extension:'.webm',check:(b)=>b.subarray(0,4).equals(Buffer.from([26,69,223,163]))}
};
export async function storeFile(file: File) {
    const format = formats[file.type];
    if (!format || file.size < 1 || file.size > 20*1024*1024) throw new BadRequestError('Archivo no permitido. Usá JPG, PNG, WebP, MP4 o WebM de hasta 20 MB.');
    const bytes=Buffer.from(await file.arrayBuffer());
    if (!format.check(bytes)) throw new BadRequestError('El contenido del archivo no coincide con su formato.');
    await mkdir(path.resolve('publico'),{recursive:true});
    const uri='publico/admin-'+randomUUID()+format.extension;
    await writeFile(path.resolve(uri),bytes,{flag:'wx'});
    return {uri,tipo:file.type.startsWith('image/')?'IMAGEN' as const:'VIDEO' as const};
}
export async function discardFile(uri:string) { if (/^publico\/admin-[\w-]+\.(jpg|png|webp|mp4|webm)$/.test(uri)) await unlink(path.resolve(uri)).catch(()=>undefined); }
export async function fileResponse(uri:string, privateFile=false) {
    const folder=privateFile?'privado':'publico';
    if (!uri.startsWith(folder+'/') || path.basename(uri)!==uri.slice(folder.length+1)) throw new NotFoundError('Archivo no disponible.');
    const extension=path.extname(uri).toLowerCase();
    const mime=Object.entries(formats).find(([,f])=>f.extension===extension)?.[0];
    if (!mime || privateFile&&!mime.startsWith('image/')) throw new NotFoundError('Archivo no disponible.');
    try {
        const data=await readFile(path.resolve(uri));
        return new Response(data,{headers:{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':privateFile?'private, no-store':'no-cache','Content-Disposition':'inline; filename="'+path.basename(uri)+'"','Content-Security-Policy':"default-src 'none'; sandbox"}});
    } catch { throw new NotFoundError('El archivo no se encuentra en el servidor.'); }
}
