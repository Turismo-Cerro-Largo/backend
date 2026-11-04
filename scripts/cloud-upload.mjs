// Explicit command only; never invoked by build or deploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
if (mode !== "--remote") throw Error("Indicar --remote: carga en Supabase real.");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET} = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) throw Error("Completar Supabase en .dev.vars");
const base = new URL(SUPABASE_URL);
if (base.protocol !== "https:" || base.pathname !== "/" || base.username || base.password || base.search || base.hash) throw Error("SUPABASE_URL inválida");
const mime = {
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	png: "image/png",
	webp: "image/webp",
	gif: "image/gif",
	mp4: "video/mp4",
	webm: "video/webm",
};
const files = new Map();
function walk(dir, prefix) {
	if (!fs.existsSync(dir)) return;
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (e.isSymbolicLink()) continue;
		const file = path.join(dir, e.name),
			key = prefix + "/" + e.name;
		if (e.isDirectory()) walk(file, key);
		else if (mime[path.extname(e.name).slice(1).toLowerCase()]) files.set(key, file);
	}
}
walk(path.join(root, "auto"), "publicos");
for (const dir of (process.argv.includes("--include-existing") ? ["publicos", "privados", "privado/perfiles", "publico/eventos", "publico/demo"] : []))
	walk(path.join(root, dir), dir);
for (const [key, file] of files) {
 if (!/^(publicos|privados|privado\/perfiles|publico\/eventos|publico\/demo)\/(?:seed\/)?[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(key)) throw Error("Ruta inválida: " + key);
 const response = await fetch(base.origin + "/storage/v1/object/" + encodeURIComponent(SUPABASE_STORAGE_BUCKET) + "/" + key, {method: "POST", redirect: "error", signal: AbortSignal.timeout(30000), headers: {apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY, "Content-Type": mime[path.extname(file).slice(1).toLowerCase()], "x-upsert": "false"}, body: fs.readFileSync(file)});
 if (!response.ok) {
  const detail = await response.json().catch(()=>null);
  if(response.status===409 || detail?.statusCode==="409" || detail?.error==="Duplicate") { console.log("Ya existe: "+key); continue; }
  throw Error("Falló carga: " + key + " (HTTP " + response.status + ")");
 }
 await response.body?.cancel();
}
console.log(files.size + " objetos procesados. Mantener el bucket privado.");
