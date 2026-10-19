import "dotenv/config";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { app } from "../src/app.js";
import { prisma } from "../src/configuracion/db.js";
import { crear_sesion } from "../src/middleware/Session.js";
import { borrarFoto } from "../src/app/turista/fotos.js";

// Nunca ejecutar esta suite sobre la base compartida o de producción.
const aislada =
	process.env.TURISTA_TEST_DB === process.env.DATABASE_NAME &&
	/^cerrolargo_turista_test_[a-z0-9]+$/.test(process.env.DATABASE_NAME || "");
describe.skipIf(!aislada)("panel de turista: integración con MySQL", () => {
	const marca = randomUUID().slice(0, 8);
	const email = `turista.${marca}@gmail.com`;
	let usuarioId: number,
		otroId: number,
		adminId: number,
		categoriaId: number,
		lugarId: number,
		ocultoId: number,
		comentarioId: number;
	let cookie = "",
		otraCookie = "",
		adminCookie = "",
		orgCookie = "";
	const origin = (process.env.TURISTA_ORIGINS || "http://localhost:5173").split(",")[0];
	async function sesion(id: number, rol = "TURISTA", tipo = "usuario") {
		const generador = new Hono();
		generador.get("/", async (c) => {
			await crear_sesion(c, { id, rol, tipo });
			return c.text("ok");
		});
		return (await generador.request("/")).headers.get("set-cookie")!.split(";")[0];
	}
	function req(ruta: string, method = "GET", datos?: unknown, auth = cookie, origen = origin) {
		return app.request(`/api/${ruta}`, {
			method,
			headers: {
				cookie: auth,
				origin: origen,
				...(datos instanceof FormData ? {} : datos ? { "content-type": "application/json" } : {}),
			},
			body: datos instanceof FormData ? datos : datos ? JSON.stringify(datos) : undefined,
		});
	}
	const perfil = {
		nombres: "Turista",
		apellidos: "Prueba",
		telefono: "099123456",
		departamento: "Cerro Largo",
		localidad: "Melo",
	};
	beforeAll(async () => {
		usuarioId = (
			await prisma.usuario.create({
				data: {
					nombres: "Turista",
					apellidos: "Prueba",
					email,
					passhash: await hash("PruebaTurista2026"),
					cedula: null,
                    fecha_nacimiento: new Date("1995-06-15T00:00:00Z"),
                    genero: "otro",
				},
			})
		).id;
		otroId = (
			await prisma.usuario.create({
				data: { nombres: "Otro", apellidos: "Turista", email: `otro.${marca}@gmail.com` },
			})
		).id;
		adminId = (
			await prisma.usuario.create({
				data: {
					nombres: "Admin",
					apellidos: "Prueba",
					email: `admin.${marca}@gmail.com`,
					rol: "ADMINISTRADOR",
				},
			})
		).id;
		categoriaId = (await prisma.categoria.create({ data: { nombre: `Prueba turista ${marca}` } }))
			.id;
		const lugar = {
			nombre: `Museo prueba ${marca}`,
			descripcion: "Lugar de prueba aislada",
			localidad: "Melo",
			latitud: -32.37,
			longitud: -54.17,
			id_categoria: categoriaId,
		};
		lugarId = (await prisma.ubicacion.create({ data: lugar })).id;
		ocultoId = (
			await prisma.ubicacion.create({ data: { ...lugar, nombre: "Oculto", estado: "OCULTADO" } })
		).id;
		cookie = await sesion(usuarioId);
		otraCookie = await sesion(otroId);
		adminCookie = await sesion(adminId);
		orgCookie = await sesion(usuarioId, "ORGANIZADOR", "organizador");
	}, 30000);
	afterAll(async () => {
		if (usuarioId) {
			const u = await prisma.usuario.findUnique({
				where: { id: usuarioId },
				select: { foto_perfil: true },
			});
			await borrarFoto(u?.foto_perfil || null);
		}
		await prisma.usuario.deleteMany({
			where: { id: { in: [usuarioId, otroId, adminId].filter(Boolean) } },
		});
		if (categoriaId) {
			await prisma.ubicacion.deleteMany({ where: { id_categoria: categoriaId } });
			await prisma.categoria.delete({ where: { id: categoriaId } });
		}
		await prisma.$disconnect();
	});
	it("las categorías públicas excluyen lugares ocultos", async () => {
        const res = await app.request(`/api/ubicaciones?categoria=${encodeURIComponent(`Prueba turista ${marca}`)}`);
        expect(res.status).toBe(200);
        const lugares = await res.json();
        expect(lugares.map((l: { id: number }) => l.id)).toEqual([lugarId]);
        expect((await app.request('/api/ubicaciones')).status).toBe(400);
    });
    it("las imágenes privadas o con rutas arbitrarias no son públicas", async () => {
        for (const id_ubicacion of [lugarId, ocultoId]) {
            const recurso = await prisma.recurso.create({ data: { id_ubicacion, uri: '/privados/cedula.jpg', tipo: 'IMAGEN' } });
            expect((await app.request(`/api/recursos/${recurso.id}`)).status).toBe(404);
        }
        expect((await app.request('/api/recursos/invalid')).status).toBe(404);
    });
    it("solo lista eventos publicados y no expone datos de organizadores", async () => {
        const organizador = await prisma.organizador.create({ data: {
            nombre_organizacion: 'Prueba', rut_ruc: marca, email: `org.${marca}@gmail.com`, telefono: '099123456', passhash: 'prueba'
        }});
        try {
            for (const estado of ['PUBLICADO', 'BORRADOR', 'PENDIENTE_REVISION', 'RECHAZADO', 'CANCELADO'] as const) {
                await prisma.evento.create({data: {titulo: marca, descripcion: 'Prueba', inicio: new Date(), estado, id_categoria: categoriaId, id_organizador: organizador.id}});
            }
            const res = await app.request('/api/eventos?limit=100');
            expect(res.status).toBe(200);
            const eventos = (await res.json()).filter((e: {titulo: string}) => e.titulo === marca);
            expect(eventos).toHaveLength(1);
            expect(eventos[0]).not.toHaveProperty('organizador');
            expect(eventos[0]).not.toHaveProperty('motivo_rechazo');
            expect((await app.request('/api/eventos?limit=-1')).status).toBe(400);
        } finally {
            await prisma.evento.deleteMany({where: {id_organizador: organizador.id}});
            await prisma.organizador.delete({where: {id: organizador.id}});
        }
    });
	it("el login existente emite una sesión válida de turista", async () => {
		const form = new FormData();
		form.set("email", email);
		form.set("password", "PruebaTurista2026");
		const res = await app.request("/api/auth/login", { method: "POST", body: form });
		expect(res.status).toBe(200);
		expect(res.headers.get("set-cookie")).toContain("session=");
	});
	it("rechaza acceso anónimo", async () => {
		expect((await req("turista/perfil", "GET", undefined, "")).status).toBe(401);
	});
	it("rechaza una cuenta organizador aunque coincida el id", async () => {
		expect((await req("turista/perfil", "GET", undefined, orgCookie)).status).toBe(403);
	});
	it("revalida el rol en base de datos", async () => {
		expect((await req("turista/perfil", "GET", undefined, await sesion(adminId))).status).toBe(403);
	});
	it("el perfil no expone cédula, hash, sub ni rol", async () => {
		const res = await req("turista/perfil");
		expect(res.status).toBe(200);
		const datos = await res.json();
		for (const campo of ["cedula", "passhash", "sub", "rol", "foto_perfil"])
			expect(datos).not.toHaveProperty(campo);
	});
    it("devuelve nacimiento y género del registro sin permitir cambiarlos", async () => {
        const perfil = await (await req('turista/perfil')).json();
        expect(perfil.fecha_nacimiento).toBe('1995-06-15T00:00:00.000Z');
        expect(perfil.genero).toBe('otro');
    });
    it("solo el autor puede borrar una valoración pendiente y volver a valorar", async () => {
        const nueva = await prisma.comentario.create({data:{id_usuario:otroId,id_ubicacion:lugarId,calificacion:3,estado:'PENDIENTE_REVISION'}});
        expect((await req(`turista/valoraciones/${nueva.id}`, 'DELETE')).status).toBe(409);
        expect((await req(`turista/valoraciones/${nueva.id}`, 'DELETE', undefined, otraCookie, 'https://otro.test')).status).toBe(403);
        expect((await req(`turista/valoraciones/${nueva.id}`, 'DELETE', undefined, otraCookie)).status).toBe(200);
        expect(await prisma.comentario.findUnique({where:{id:nueva.id}})).toBeNull();
        const reemplazo = await req(`turista/lugares/${lugarId}/valoracion`, 'POST', {calificacion:4}, otraCookie);
        expect(reemplazo.status).toBe(201);
        await prisma.comentario.deleteMany({where:{id_usuario:otroId}});
    });
    it("completa los datos ausentes una vez y bloquea escrituras concurrentes", async () => {
        const respuestas = await Promise.all([
            req('turista/perfil', 'PUT', {...perfil, fecha_nacimiento:'1998-02-20'}, otraCookie),
            req('turista/perfil', 'PUT', {...perfil, fecha_nacimiento:'1999-03-21'}, otraCookie),
        ]);
        expect(respuestas.map(r => r.status).sort()).toEqual([200,409]);
        expect((await req('turista/perfil', 'PUT', {...perfil, genero:'otro'}, otraCookie)).status).toBe(200);
        expect((await req('turista/perfil', 'PUT', {...perfil, genero:'femenino'}, otraCookie)).status).toBe(409);
        // Mantener intacto el escenario de contacto de las demás pruebas.
        await prisma.usuario.update({where:{id:otroId},data:{localidad:null}});
    });
    it("protege los datos ya establecidos en el registro", async () => {
        for (const campo of [{genero:'masculino'}, {fecha_nacimiento:'2000-01-01'}]) {
            expect((await req('turista/perfil', 'PUT', {...perfil,...campo})).status).toBe(409);
        }
        const actual = await (await req('turista/perfil')).json();
        expect(actual.genero).toBe('otro');
        expect(actual.fecha_nacimiento).toBe('1995-06-15T00:00:00.000Z');
    });
    it("rechaza fechas imposibles, futuras y vacías", async () => {
        for (const fecha_nacimiento of ['2023-02-29', '2999-01-01', '1800-01-01', '']) {
            expect((await req('turista/perfil', 'PUT', {...perfil,fecha_nacimiento})).status).toBe(400);
        }
    });
	it("guarda localidad y contacto, sin cambiar otra cuenta", async () => {
		expect((await req("turista/perfil", "PUT", perfil)).status).toBe(200);
		expect((await (await req("turista/perfil")).json()).localidad).toBe("Melo");
		expect(
			(await (await req("turista/perfil", "GET", undefined, otraCookie)).json()).localidad,
		).toBeNull();
	});
	it.each(["cedula", "email", "rol", "id", "passhash", "fecha_nacimiento", "genero"])(
		"rechaza editar el campo protegido %s",
		async (campo) => {
			expect((await req("turista/perfil", "PUT", { ...perfil, [campo]: "alterado" })).status).toBe(
				400,
			);
		},
	);
	it("rechaza una mutación desde otro origen", async () => {
		expect(
			(await req("turista/perfil", "PUT", perfil, cookie, "https://otro.invalid")).status,
		).toBe(403);
	});
	it("guarda favoritos sin duplicados y aislados por cuenta", async () => {
		for (let n = 0; n < 2; n++)
			expect((await req(`turista/favoritos/${lugarId}`, "PUT")).status).toBe(200);
		expect((await (await req("turista/favoritos")).json()).favoritos).toHaveLength(1);
		expect(
			(await (await req("turista/favoritos", "GET", undefined, otraCookie)).json()).favoritos,
		).toHaveLength(0);
	});
	it("no permite guardar lugares ocultos", async () => {
		expect((await req(`turista/favoritos/${ocultoId}`, "PUT")).status).toBe(404);
	});
	it("no muestra lugares ocultos en lectura pública", async () => {
		expect((await req(`lugares/${ocultoId}`, "GET", undefined, "")).status).toBe(404);
		const listado = await (await req(`lugares?buscar=${marca}`, "GET", undefined, "")).json();
		expect(listado.lugares.every((l: { id: number }) => l.id !== ocultoId)).toBe(true);
	});
	it.each([0, 6, 2.5, "5"])("rechaza calificación inválida %s", async (calificacion) => {
		expect(
			(await req(`turista/lugares/${lugarId}/valoracion`, "POST", { calificacion })).status,
		).toBe(400);
	});
	it("guarda una valoración pendiente y no la publica ni la cuenta en promedio", async () => {
		const res = await req(`turista/lugares/${lugarId}/valoracion`, "POST", {
			calificacion: 5,
			texto: "Excelente experiencia",
		});
		expect(res.status).toBe(201);
		const datos = await res.json();
		comentarioId = datos.valoracion.id;
		expect(datos.valoracion.estado).toBe("PENDIENTE_REVISION");
		const publico = await (await req(`lugares/${lugarId}`)).json();
		expect(publico.comentarios).toHaveLength(0);
		expect(publico.promedio).toBeNull();
		expect((await (await req("turista/valoraciones")).json()).valoraciones).toHaveLength(1);
	});
	it("rechaza una segunda valoración del mismo usuario y lugar", async () => {
		expect(
			(await req(`turista/lugares/${lugarId}/valoracion`, "POST", { calificacion: 3 })).status,
		).toBe(409);
	});
	it("no permite que un turista se apruebe su comentario", async () => {
		expect(
			(await req(`moderacion-valoraciones/${comentarioId}`, "PATCH", { estado: "PUBLICADO" }))
				.status,
		).toBe(403);
	});
	it("el administrador aprueba y el promedio público se actualiza", async () => {
		expect(
			(
				await req(
					`moderacion-valoraciones/${comentarioId}`,
					"PATCH",
					{ estado: "PUBLICADO" },
					adminCookie,
				)
			).status,
		).toBe(200);
		const publico = await (await req(`lugares/${lugarId}`)).json();
		expect(publico.comentarios).toHaveLength(1);
		expect(publico.promedio).toBe(5);
		expect(publico.comentarios[0].usuario).toEqual({ nombres: "Turista" });
	});
    it("no elimina una valoración ya aprobada", async () => {
        expect((await req(`turista/valoraciones/${comentarioId}`, 'DELETE')).status).toBe(409);
        expect((await prisma.comentario.findUnique({where:{id:comentarioId}}))?.estado).toBe('PUBLICADO');
    });
	it("ocultar una valoración la retira del promedio y de la vista pública", async () => {
		expect(
			(
				await req(
					`moderacion-valoraciones/${comentarioId}`,
					"PATCH",
					{ estado: "OCULTADO" },
					adminCookie,
				)
			).status,
		).toBe(200);
		const publico = await (await req(`lugares/${lugarId}`)).json();
		expect(publico.comentarios).toHaveLength(0);
		expect(publico.promedio).toBeNull();
	});
	it("al ocultar un lugar no filtra su contenido por favoritos y permite quitarlo", async () => {
		await prisma.ubicacion.update({ where: { id: lugarId }, data: { estado: "OCULTADO" } });
		expect((await (await req("turista/favoritos")).json()).favoritos[0].lugar).toBeNull();
		expect((await req(`turista/favoritos/${lugarId}`, "DELETE")).status).toBe(200);
		expect((await (await req("turista/favoritos")).json()).favoritos).toHaveLength(0);
	});
	it("rechaza archivos falsos y de más de 3 MB", async () => {
		for (const file of [
			new File(["esto no es una imagen válida"], "foto.png", { type: "image/png" }),
			new File([new Uint8Array(3 * 1024 * 1024 + 1)], "foto.png", { type: "image/png" }),
		]) {
			const form = new FormData();
			form.set("foto", file);
			expect((await req("turista/foto", "PUT", form)).status).toBe(400);
		}
	});
	it("sube, reemplaza y elimina una foto; no la comparte con otras cuentas", async () => {
		const png = Buffer.from(
			"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
			"base64",
		);
		let anterior = "";
		for (let n = 0; n < 2; n++) {
			const form = new FormData();
			form.set("foto", new File([png], "foto.png", { type: "image/png" }));
			const res = await req("turista/foto", "PUT", form);
			expect(res.status).toBe(200);
			const perfil = await res.json();
			expect(perfil.foto).not.toBe(anterior);
			anterior = perfil.foto;
		}
		expect((await req("turista/foto")).headers.get("content-type")).toBe("image/png");
		expect((await req("turista/foto", "GET", undefined, otraCookie)).status).toBe(404);
		expect((await req("turista/foto", "DELETE")).status).toBe(200);
		expect((await req("turista/foto")).status).toBe(404);
	});
});
