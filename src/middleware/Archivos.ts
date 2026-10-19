// src/middleware/Archivos.ts
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createMiddleware } from "hono/factory";
import { BadRequestError } from "../configuracion/AppError.js";

async function validarImagen(file: File, maxMB: number) {
 const ext=path.extname(file.name).toLowerCase();
 if(file.size<12 || file.size>maxMB*1024*1024)throw new BadRequestError('Imagen inválida o demasiado grande.');
 const bytes=Buffer.from(await file.slice(0,12).arrayBuffer());
 const valido=((ext==='.jpg'||ext==='.jpeg')&&file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
 ||(ext==='.png'&&file.type==='image/png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
 ||(ext==='.webp'&&file.type==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
 if(!valido)throw new BadRequestError('Solo se admiten imágenes JPG, PNG o WebP válidas.');
}

// Archivos generales

const ArchivosPublicos = (
    formatos: string[],
    tamanioMB: number
) => {
    return createMiddleware<{
        Variables: { recursos: string[] }
    }>(async (c, next) => {

        const body = await c.req.parseBody({ all: true });
        const archivos = body.recursos;

        const recursos = archivos === undefined
            ? []
            : Array.isArray(archivos)
                ? archivos
                : [archivos];

        if (!Number.isFinite(tamanioMB) || tamanioMB <= 0) {
            throw new Error("Tamaño máximo inválido");
        }

        const permitidos = formatos.map(f =>
            f.replace(/^\./, "").toLowerCase()
        );

        const ruta = path.join(process.cwd(), "publicos");
        const guardados: string[] = [];

        try {
            for (const recurso of recursos) {
                if (!(recurso instanceof File)) {
                    throw new BadRequestError();
                }

                await validarImagen(recurso, tamanioMB);
                const extension = path.extname(recurso.name)
                    .slice(1)
                    .toLowerCase();

                if (!permitidos.includes(extension)) {
                    throw new BadRequestError();
                }

                if (recurso.size > tamanioMB * 1024 * 1024) {
                    throw new BadRequestError();
                }
            }

            await mkdir(ruta, { recursive: true });

            for (const recurso of recursos as File[]) {
                const extension = path.extname(recurso.name)
                    .toLowerCase();

                const nombre = `${randomUUID()}${extension}`;

                await writeFile(
                    path.join(ruta, nombre),
                    Buffer.from(await recurso.arrayBuffer()),
                    { flag: "wx" }
                );

                guardados.push(nombre);
            }

            c.set("recursos", guardados);

            await next();

            if (c.res.status >= 400) {
                await borrar_publicos(guardados);
            }
        } catch (error) {
            await borrar_publicos(guardados);
            throw error;
        }
    });
};


// Archivos privados
const ArchivosPrivados = () => createMiddleware<{Variables:{fotoCedulaFrente:string;fotoCedulaDorso:string}}>(async(c,next)=>{
 const body=await c.req.parseBody({all:true});
 const imagenes=[body.fotoCedulaFrente,body.fotoCedulaDorso];
 for(const file of imagenes){if(!(file instanceof File))throw new BadRequestError();await validarImagen(file,8);}
 const dir=path.join(process.cwd(),'privados'),guardados:string[]=[];
 await mkdir(dir,{recursive:true});
 try {
  for(const file of imagenes as File[]){const nombre=randomUUID()+path.extname(file.name).toLowerCase();await writeFile(path.join(dir,nombre),Buffer.from(await file.arrayBuffer()),{flag:'wx',mode:0o600});guardados.push(nombre);}
  c.set('fotoCedulaFrente',guardados[0]!);c.set('fotoCedulaDorso',guardados[1]!);
  await next();
  if(c.res.status>=400)await Promise.all(guardados.map(n=>unlink(path.join(dir,n)).catch(()=>undefined)));
 } catch(error){await Promise.all(guardados.map(n=>unlink(path.join(dir,n)).catch(()=>undefined)));throw error;}
});

const borrar_publicos = (nombres: string[]) =>
    Promise.all(nombres.map((n) => unlink(path.join(process.cwd(), "publicos", n)).catch(() => undefined)));


export { ArchivosPrivados, ArchivosPublicos, borrar_publicos };