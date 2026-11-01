// Explicit command only; never invoked by build or deploy.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const mode = process.argv[2];
if (!["--local", "--remote"].includes(mode))
	throw Error("Indicar --local o --remote explícitamente");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "wrangler.jsonc"), "utf8"));
const bucket = config.r2_buckets[0].bucket_name;
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
for (const dir of ["publicos", "privados", "privado/perfiles", "publico/eventos", "publico/demo"])
	walk(path.join(root, dir), dir);
for (const [key, file] of files) {
	const r = spawnSync(
		process.execPath,
		[
			path.join(root, "node_modules/wrangler/bin/wrangler.js"),
			"r2",
			"object",
			"put",
			bucket + "/" + key,
			"--file",
			file,
			"--content-type",
			mime[path.extname(file).slice(1).toLowerCase()],
			mode,
		],
		{ cwd: root, stdio: "inherit" },
	);
	if (r.status !== 0) throw Error("Falló carga: " + key);
}
console.log(files.size + " objetos procesados. Mantener el bucket privado.");
