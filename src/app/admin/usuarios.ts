// src/app/admin/usuarios.ts
import { Hono } from "hono";
import { prisma } from "../../configuracion/db.js";
import { BadRequestError, NotFoundError, ForbiddenError } from "../../configuracion/AppError.js";
import { VerificarSessionRol } from "../../middleware/Session.js";

const app = new Hono();
app.use("*", VerificarSessionRol(["ADMINISTRADOR"]));
// Revalidamos contra la BD: una cookie de sesión antigua no puede conservar permisos revocados.
app.use("*", async (c, next) => {
	const sesion = c.get("sesion");
	const id = Number(sesion.id);
	if (sesion.tipo !== "usuario" || !Number.isSafeInteger(id) || id <= 0) throw new ForbiddenError();
	const actual = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } });
	if (actual?.rol !== "ADMINISTRADOR") throw new ForbiddenError();
	await next();
});

const entero = (v: string | undefined, porDefecto: number, max: number) => {
	if (v === undefined) return porDefecto;
	const n = Number(v);
	if (!Number.isSafeInteger(n) || n < 0 || n > max) throw new BadRequestError();
	return n;
};
const camposLista = {
	id: true,
	nombres: true,
	apellidos: true,
	email: true,
	departamento: true,
	rol: true,
	creado_en: true,
	_count: { select: { comentarios: true, favoritos: true } },
} as const;

app.get("/", async (c) => {
	const buscar = (c.req.query("buscar") || "").trim();
	const departamento = (c.req.query("departamento") || "").trim();
	const rol = c.req.query("rol") || "";
	if (
		buscar.length > 100 ||
		departamento.length > 100 ||
		(rol && rol !== "TURISTA" && rol !== "ADMINISTRADOR")
	)
		throw new BadRequestError();
	const offset = entero(c.req.query("offset"), 0, 1000000);
	const limit = Math.max(1, entero(c.req.query("limit"), 12, 50));
	const where = {
		...(rol ? { rol: rol as "TURISTA" | "ADMINISTRADOR" } : {}),
		...(departamento ? { departamento } : {}),
		...(buscar
			? {
					OR: [
						{ nombres: { contains: buscar } },
						{ apellidos: { contains: buscar } },
						{ email: { contains: buscar } },
					],
				}
			: {}),
	};
	const [usuarios, total, turistas, administradores, recientes] = await Promise.all([
		prisma.usuario.findMany({
			where,
			orderBy: { creado_en: "desc" },
			skip: offset,
			take: limit,
			select: camposLista,
		}),
		prisma.usuario.count({ where }),
		prisma.usuario.count({ where: { rol: "TURISTA" } }),
		prisma.usuario.count({ where: { rol: "ADMINISTRADOR" } }),
		prisma.usuario.count({ where: { creado_en: { gte: new Date(Date.now() - 30 * 86400000) } } }),
	]);
	return c.json({
		usuarios,
		total,
		offset,
		limit,
		resumen: { turistas, administradores, recientes },
	});
});

app.get("/:id", async (c) => {
	const id = Number(c.req.param("id"));
	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
	const usuario = await prisma.usuario.findUnique({
		where: { id },
		select: {
			...camposLista,
			telefono: true,
			fecha_nacimiento: true,
			genero: true,
			cedula: true,
		},
	});
	if (!usuario) throw new NotFoundError();
	return c.json(usuario);
});

export { app as AdminUsuariosRoute };
