import {it,expect} from "vitest";
import {readFile, mkdtemp, unlink, mkdir} from "node:fs/promises";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {Miniflare} from "miniflare";
import {verify} from "@node-rs/argon2";
function statements(sql:string) {
 const result:string[]=[];let start=0,quoted=false;
 for(let i=0;i<sql.length;i++) {
  if(sql[i]==="'") {if(quoted&&sql[i+1]==="'")i++;else quoted=!quoted;}
  if(sql[i]===";"&&!quoted){const s=sql.slice(start,i).trim();if(s)result.push(s);start=i+1;}
 }
 return result;
}
it("carga el seed completo dos veces conservando cuentas y referencias",async()=>{
 const result=spawnSync(process.execPath,["scripts/cloud-seed-full.mjs"],{encoding:"utf8",env:{...process.env,SEED_ADMIN_PASSWORD:"TestLocalAdmin123!",SEED_USUARIO_PASSWORD:"TestLocalUsuario123!",SEED_ORGANIZADOR_PASSWORD:"TestLocalOrganizador123!"}});
 expect(result.status,result.stderr).toBe(0);
 await mkdir(".wrangler",{recursive:true});
 const dir=await mkdtemp(path.resolve(".wrangler/seed-validation-"));
 const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("ok")}}',compatibilityDate:"2026-07-01",d1Databases:["DB"],d1Persist:dir});
 try {
 const db=await mf.getD1Database("DB");
 await db.batch(statements(await readFile("migrations/d1/0001_initial.sql","utf8")).map(s=>db.prepare(s)));
 const sql=statements(await readFile("seed/completo.sql","utf8"));
 await db.batch(sql.map(s=>db.prepare(s)));
 const tables=["categoria","localidad","ubicacion","usuario","organizador","evento","recurso","empresa_transporte","horario_omnibus"];
 const counts=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,await db.prepare("SELECT count(*) AS n FROM "+t).first("n")])));
 const first=await counts();
 expect(first).toMatchObject({categoria:6,localidad:10,ubicacion:25,usuario:2,organizador:1,evento:5,empresa_transporte:3,horario_omnibus:12});
 const hash=await db.prepare("SELECT passhash FROM usuario WHERE rol='ADMINISTRADOR'").first<string>("passhash");
 expect(await verify(hash!,"TestLocalAdmin123!")).toBe(true);
 await db.prepare("UPDATE usuario SET nombres='Conservado' WHERE rol='ADMINISTRADOR'").run();
 await db.batch(sql.map(s=>db.prepare(s)));
 expect(await counts()).toEqual(first);
 expect(await db.prepare("SELECT nombres FROM usuario WHERE rol='ADMINISTRADOR'").first("nombres")).toBe("Conservado");
 expect(await db.prepare("SELECT passhash FROM usuario WHERE rol='ADMINISTRADOR'").first("passhash")).toBe(hash);
 expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toHaveLength(0);
 console.log("Seed completo validado:",first);
 } finally {await mf.dispose();await unlink("seed/completo.sql").catch(()=>{});}
});
