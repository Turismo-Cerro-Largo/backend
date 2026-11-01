// Reads literal catalog data only. Never executes auto/auto.js or creates demo accounts.
import { parse } from "acorn";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	ubicacionesLocalidades,
	validarCoberturaLocalidades,
} from "../auto/ubicaciones-localidades.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tree = parse(fs.readFileSync(path.join(root, "auto/auto.js"), "utf8"), {
	ecmaVersion: "latest",
	sourceType: "module",
});
const data = {};
function literal(n) {
	if (n.type === "Literal") return n.value;
	if (n.type === "UnaryExpression" && n.operator === "-") return -literal(n.argument);
	if (n.type === "ArrayExpression") return n.elements.map(literal);
	if (n.type === "ObjectExpression")
		return Object.fromEntries(
			n.properties.map((p) => {
				if (p.type !== "Property" || p.computed || p.kind !== "init")
					throw Error("Sólo datos literales");
				return [p.key.name ?? p.key.value, literal(p.value)];
			}),
		);
	throw Error("Expresión no permitida en catálogo: " + n.type);
}
function visit(n) {
	if (!n || typeof n !== "object") return;
	if (
		n.type === "VariableDeclarator" &&
		["localidades", "categorias", "ubicaciones"].includes(n.id.name)
	)
		data[n.id.name] = literal(n.init);
	for (const v of Object.values(n)) {
		if (Array.isArray(v)) v.forEach(visit);
		else if (v && typeof v === "object") visit(v);
	}
}
visit(tree);
data.ubicaciones.push(...ubicacionesLocalidades);
validarCoberturaLocalidades(data.localidades, data.ubicaciones);
const q = (v) =>
	v == null
		? "NULL"
		: typeof v === "number"
			? String(v)
			: "'" + String(v).replaceAll("'", "''") + "'";
const sql = ["-- Catálogo sin cuentas, contraseñas ni documentos privados."];
for (const [nombre, descripcion] of data.categorias)
	sql.push(
		"INSERT INTO categoria(nombre,descripcion) VALUES(" +
			q(nombre) +
			"," +
			q(descripcion) +
			") ON CONFLICT(nombre) DO NOTHING;",
	);
for (const [slug, nombre] of data.localidades)
	sql.push(
		"INSERT INTO localidad(slug,nombre,actualizado_en) VALUES(" +
			q(slug) +
			"," +
			q(nombre) +
			",CURRENT_TIMESTAMP) ON CONFLICT(slug) DO NOTHING;",
	);
const df = fs.readdirSync(path.join(root, "auto")).find((f) => /^DF\.(png|jpe?g|webp)$/i.test(f));
for (const u of data.ubicaciones) {
	const { categoria, imagen, creditoImagen, ...row } = u;
	const entries = Object.entries(row).filter(([, v]) => v !== undefined);
	const where = "nombre=" + q(u.nombre) + " AND localidad=" + q(u.localidad);
	sql.push(
		"INSERT INTO ubicacion(" +
			entries.map(([k]) => k).join(",") +
			",id_categoria) SELECT " +
			entries.map(([, v]) => q(v)).join(",") +
			", (SELECT id FROM categoria WHERE nombre=" +
			q(categoria) +
			") WHERE NOT EXISTS(SELECT 1 FROM ubicacion WHERE " +
			where +
			");",
	);
	const file = imagen === "DF" ? df : imagen;
	if (file && fs.existsSync(path.join(root, "auto", file))) {
		const uri = "/api/archivos/publicos/" + file;
		sql.push(
			"INSERT INTO recurso(uri,tipo,descripcion,orden,id_ubicacion) SELECT " +
				q(uri) +
				",'IMAGEN'," +
				q(creditoImagen ?? "Imagen de " + u.nombre) +
				",0,id FROM ubicacion WHERE " +
				where +
				" AND NOT EXISTS(SELECT 1 FROM recurso WHERE uri=" +
				q(uri) +
				" AND id_ubicacion=ubicacion.id);",
		);
	}
}
fs.mkdirSync(path.join(root, "seed"), { recursive: true });
fs.writeFileSync(path.join(root, "seed/catalogo.sql"), sql.join("\n") + "\n");
console.log(
	"Catálogo D1 generado: " +
		data.ubicaciones.length +
		" ubicaciones; " +
		data.localidades.length +
		" localidades. No se escribió en ninguna base.",
);
