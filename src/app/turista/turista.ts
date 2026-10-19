import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { prisma } from "../../configuracion/db.js";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
	UnauthorizedError,
} from "../../configuracion/AppError.js";
import { VerificarSession } from "../../middleware/Session.js";
import { idValido, perfilSchema, valoracionSchema } from "./turista.schema.js";
import { guardarFoto, borrarFoto, leerFoto } from "./fotos.js";
import { camposLugar } from "./lugares.js";

const perfilSelect = {
	id: true,
	nombres: true,
	apellidos: true,
	email: true,
	fecha_nacimiento: true,
	genero: true,
	telefono: true,
	departamento: true,
	localidad: true,
	foto_perfil: true,
	creado_en: true,
} as const;
type Perfil = Awaited<ReturnType<typeof obtenerPerfil>>;
async function obtenerPerfil(id: number) {
	return prisma.usuario.findUniqueOrThrow({ where: { id }, select: perfilSelect });
}
function respuestaPerfil(perfil: Perfil) {
	const { foto_perfil, ...datos } = perfil;
	return {
		...datos,
		foto: foto_perfil ? `/api/turista/foto?v=${encodeURIComponent(foto_perfil)}` : null,
	};
}

const app = new Hono<{
	Variables: { turistaId: number; sesion: { tipo: string; id: string; rol: string } };
}>();
app.use("*", VerificarSession);
app.use("*", async (c, next) => {
	c.header("Cache-Control", "private, no-store");
	const sesion = c.get("sesion");
	const id = idValido(sesion.id);
	if (sesion.tipo !== "usuario" || !id) throw new ForbiddenError();
	const usuario = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } });
	if (!usuario) throw new UnauthorizedError();
	if (usuario.rol !== "TURISTA") throw new ForbiddenError();
	c.set("turistaId", id);
	if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
		const permitidos = (
			process.env.TURISTA_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173"
		)
			.split(",")
			.map((s) => s.trim());
		const origen = c.req.header("origin");
		if (!origen || !permitidos.includes(origen)) throw new ForbiddenError("Origen no autorizado.");
	}
	await next();
});
app.use(
	"*",
	bodyLimit({
		maxSize: 4 * 1024 * 1024,
		onError: (c) => c.json({ message: "El archivo es demasiado grande." }, 413),
	}),
);

app.get("/perfil", async (c) => c.json(respuestaPerfil(await obtenerPerfil(c.get("turistaId")))));
app.put("/perfil", async (c) => {
	const datos = perfilSchema.safeParse(await c.req.json().catch(() => null));
	if (!datos.success)
		throw new BadRequestError("Revisá los datos del perfil. Solo se admiten los campos editables.");
	const resultado = await prisma.usuario.updateMany({
		where: { id: c.get("turistaId"),
			...(datos.data.genero !== undefined ? { genero: null } : {}),
			...(datos.data.fecha_nacimiento !== undefined ? { fecha_nacimiento: null } : {}),
		},
		data: datos.data,
	});
	if (!resultado.count) throw new ConflictError("La fecha de nacimiento o el género ya están registrados. Recargá el perfil; estos datos solo se pueden completar una vez.");
	return c.json(respuestaPerfil(await obtenerPerfil(c.get("turistaId"))));
});

app.get("/foto", async (c) => {
	const { foto_perfil } = await obtenerPerfil(c.get("turistaId"));
	const { bytes, tipo } = await leerFoto(foto_perfil);
	c.header("Content-Type", tipo);
	c.header("X-Content-Type-Options", "nosniff");
	return c.body(new Uint8Array(bytes));
});
app.put("/foto", async (c) => {
	const previo = await obtenerPerfil(c.get("turistaId"));
	const body = await c.req.parseBody();
	const nombre = await guardarFoto(body.foto);
	try {
		const cambio = await prisma.usuario.updateMany({
			where: { id: previo.id, foto_perfil: previo.foto_perfil },
			data: { foto_perfil: nombre },
		});
		if (cambio.count !== 1)
			throw new ConflictError("La foto cambió en otra pestaña. Recargá e intentá nuevamente.");
	} catch (error) {
		await borrarFoto(nombre);
		throw error;
	}
	await borrarFoto(previo.foto_perfil);
	return c.json(respuestaPerfil(await obtenerPerfil(previo.id)));
});
app.delete("/foto", async (c) => {
	const previo = await obtenerPerfil(c.get("turistaId"));
	const cambio = await prisma.usuario.updateMany({
		where: { id: previo.id, foto_perfil: previo.foto_perfil },
		data: { foto_perfil: null },
	});
	if (cambio.count !== 1)
		throw new ConflictError("La foto cambió en otra pestaña. Recargá e intentá nuevamente.");
	await borrarFoto(previo.foto_perfil);
	return c.json(respuestaPerfil(await obtenerPerfil(previo.id)));
});

app.get("/favoritos", async (c) => {
	const favoritos = await prisma.favorito.findMany({
		where: { id_usuario: c.get("turistaId") },
		orderBy: [{ creado_en: "desc" }, { id: "desc" }],
		select: {
			id_ubicacion: true,
			creado_en: true,
			ubicacion: { select: { ...camposLugar, estado: true } },
		},
	});
	return c.json({
		favoritos: favoritos.map((f) => ({
			id_ubicacion: f.id_ubicacion,
			creado_en: f.creado_en,
			lugar: f.ubicacion.estado === "PUBLICADO" ? f.ubicacion : null,
		})),
	});
});

async function lugarPublicado(id: number) {
	if (
		!(await prisma.ubicacion.findFirst({
			where: { id, estado: "PUBLICADO" },
			select: { id: true },
		}))
	)
		throw new NotFoundError("Este lugar no está disponible.");
}
app.put("/favoritos/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	await lugarPublicado(id);
	const data = { id_usuario: c.get("turistaId"), id_ubicacion: id };
	try {
		await prisma.favorito.upsert({
			where: { id_usuario_id_ubicacion: data },
			create: data,
			update: {},
		});
	} catch (error) {
		if ((error as { code?: string }).code !== "P2002") throw error;
	}
	return c.json({ guardado: true });
});
app.delete("/favoritos/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	await prisma.favorito.deleteMany({ where: { id_usuario: c.get("turistaId"), id_ubicacion: id } });
	return c.json({ guardado: false });
});

app.get("/valoraciones", async (c) => {
	const valoraciones = await prisma.comentario.findMany({
		where: { id_usuario: c.get("turistaId") },
		orderBy: [{ creado_en: "desc" }, { id: "desc" }],
		select: {
			id: true,
			id_ubicacion: true,
			texto: true,
			calificacion: true,
			estado: true,
			creado_en: true,
			ubicacion: { select: { id: true, nombre: true, estado: true } },
		},
	});
	return c.json({
		valoraciones: valoraciones.map((v) => ({
			...v,
			ubicacion: v.ubicacion.estado === "PUBLICADO" ? v.ubicacion : null,
		})),
	});
});
app.delete("/valoraciones/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	// Una sola operación evita borrar una valoración aprobada entre la consulta y el borrado.
	const resultado = await prisma.comentario.deleteMany({
		where: { id, id_usuario: c.get("turistaId"), estado: "PENDIENTE_REVISION" },
	});
	if (!resultado.count) throw new ConflictError("Solo podés eliminar tus valoraciones pendientes. Actualizá la página para ver su estado.");
	return c.json({ eliminado: true });
});

app.get("/lugares/:id", async (c) => {
	const id = idValido(c.req.param("id"));
	if (!id) throw new BadRequestError();
	await lugarPublicado(id);
	const where = { id_usuario_id_ubicacion: { id_usuario: c.get("turistaId"), id_ubicacion: id } };
	const [favorito, valoracion] = await Promise.all([
		prisma.favorito.findUnique({ where, select: { id: true } }),
		prisma.comentario.findUnique({
			where,
			select: { id: true, texto: true, calificacion: true, estado: true },
		}),
	]);
	return c.json({ favorito: Boolean(favorito), valoracion });
});
app.post("/lugares/:id/valoracion", async (c) => {
	const id = idValido(c.req.param("id"));
	const datos = valoracionSchema.safeParse(await c.req.json().catch(() => null));
	if (!id || !datos.success)
		throw new BadRequestError("Elegí de 1 a 5 estrellas y un comentario de hasta 2000 caracteres.");
	await lugarPublicado(id);
	try {
		const valoracion = await prisma.comentario.create({
			data: {
				...datos.data,
				id_usuario: c.get("turistaId"),
				id_ubicacion: id,
				estado: "PENDIENTE_REVISION",
			},
			select: { id: true, texto: true, calificacion: true, estado: true },
		});
		return c.json({ valoracion }, 201);
	} catch (error) {
		if ((error as { code?: string }).code === "P2002")
			throw new ConflictError("Ya enviaste una valoración para este lugar.");
		throw error;
	}
});

export { app as TuristaRoute };
