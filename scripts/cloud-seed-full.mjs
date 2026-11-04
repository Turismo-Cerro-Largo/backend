// Generates SQL only; never imports the historical script or changes a database.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {hash} from "@node-rs/argon2";
import {data} from "./cloud-seed.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const passwordNames = {ADMINISTRADOR:"SEED_ADMIN_PASSWORD",TURISTA:"SEED_USUARIO_PASSWORD",ORGANIZADOR:"SEED_ORGANIZADOR_PASSWORD"};
for (const name of Object.values(passwordNames)) {
 const value=process.env[name];
 if (!value || value.length<12 || value.length>32 || !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) throw Error("Completar " + name + " con 12 a 32 caracteres, mayúscula, minúscula y número en .dev.vars. No se cargó ningún dato.");
}
const q=v=>v==null?"NULL":typeof v==="boolean"?(v?"1":"0"):typeof v==="number"?String(v):"'"+String(v).replaceAll("'","''")+"'";
const sql=[fs.readFileSync(path.join(root,"seed/catalogo.sql"),"utf8")];
function insert(table, row, where) {
 sql.push("INSERT INTO "+table+"("+Object.keys(row).join(",")+") SELECT "+Object.values(row).join(",")+" WHERE NOT EXISTS(SELECT 1 FROM "+table+" WHERE "+where+");");
}
// Refuse ambiguous cross-table emails; never elevate or overwrite an existing account.

for (const account of data.usuarios) {
 sql.push("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM organizador WHERE email="+q(account.email)+") AND NOT EXISTS(SELECT 1 FROM usuario WHERE email="+q(account.email)+" AND rol<>"+q(account.rol)+") THEN 1 ELSE json('Conflicto de cuentas seed') END;");
}
for(const account of data.organizadores) sql.push("SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM usuario WHERE email="+q(account.email)+") THEN 1 ELSE json('Conflicto de cuentas seed') END;");

for(const {password, ...row} of data.usuarios) {
 row.passhash=await hash(process.env[passwordNames[row.rol]],{memoryCost:19456,timeCost:2,parallelism:1});
 insert("usuario",Object.fromEntries(Object.entries(row).map(([k,v])=>[k,q(v)])),"email="+q(row.email));
}
for(const {password,...row} of data.organizadores) {
 row.passhash=await hash(process.env.SEED_ORGANIZADOR_PASSWORD,{memoryCost:19456,timeCost:2,parallelism:1});
 insert("organizador",Object.fromEntries(Object.entries(row).map(([k,v])=>[k,q(v)])),"email="+q(row.email));
}
const organizer = "(SELECT id FROM organizador WHERE email="+q(data.organizadores[0].email)+")";
for(const {categoria,imagen,inicio,fin,...row} of data.eventos) {
 const where="titulo="+q(row.titulo)+" AND id_organizador="+organizer;
 insert("evento",{...Object.fromEntries(Object.entries(row).map(([k,v])=>[k,q(v)])),inicio:q(new Date(inicio).toISOString()),fin:fin?q(new Date(fin).toISOString()):"NULL",actualizado_en:"CURRENT_TIMESTAMP",id_categoria:"(SELECT id FROM categoria WHERE nombre="+q(categoria)+")",id_organizador:organizer},where);
 if(imagen) {
  if (!fs.existsSync(path.join(root,"auto",imagen))) throw Error("Falta imagen: "+imagen);
  const event="(SELECT id FROM evento WHERE "+where+" LIMIT 1)", uri=q("/api/archivos/publicos/"+imagen);
  insert("recurso",{uri,tipo:q("IMAGEN"),orden:"0",id_evento:event},"uri="+uri+" AND id_evento="+event);
 }
}
for(const name of new Set(data.viajes.map(v=>v.empresa))) insert("empresa_transporte",{nombre:q(name),sitio_web:q("https://www.urubus.com.uy/")},"nombre="+q(name));
for(const v of data.viajes) {
 const row={origen:q("Montevideo"),destino:q("Melo"),hora_salida:q("1970-01-01T"+v.salida+":00.000Z"),hora_llegada:q("1970-01-01T"+v.llegada+":00.000Z"),dias:q("Viernes"),tipo_servicio:q("INTERDEPARTAMENTAL"),precio:"NULL",estado:q("PUBLICADO"),id_empresa:"(SELECT id FROM empresa_transporte WHERE nombre="+q(v.empresa)+")"};
 const where=["origen","destino","hora_salida","hora_llegada","id_empresa"].map(k=>k+"="+row[k]).join(" AND ")+" AND dias IN ('Viernes','Viernes 23/10/2026')";
 insert("horario_omnibus",row,where);
}
fs.writeFileSync(path.join(root,"seed/completo.sql"),sql.join("\n")+"\n");
console.log("Seed completo generado: "+data.categorias.length+" categorías, "+data.localidades.length+" localidades, "+data.ubicaciones.length+" ubicaciones, "+data.eventos.length+" eventos, "+data.viajes.length+" horarios y 3 cuentas. No se modificó ninguna base.");
console.log("Cuentas: usuario@gmail.com (SEED_USUARIO_PASSWORD), admin@gmail.com (SEED_ADMIN_PASSWORD), organizador@gmail.com (SEED_ORGANIZADOR_PASSWORD). Cuentas existentes conservan su contraseña y estado.");
