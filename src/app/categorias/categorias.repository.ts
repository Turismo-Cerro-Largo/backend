import { prisma } from "../../configuracion/db.js";

const campos = {
	id: true,
	nombre: true,
	descripcion: true,
	_count: { select: { eventos: true, ubicaciones: true } },
} as const;

export const listar = () => prisma.categoria.findMany({ orderBy: { id: "asc" }, select: campos });
export const buscar = (id: number) =>
	prisma.categoria.findUnique({ where: { id }, select: campos });
export const buscarPorNombre = (nombre: string) =>
	prisma.categoria.findUnique({ where: { nombre }, select: { id: true } });
export const crear = (data: { nombre: string; descripcion?: string }) =>
	prisma.categoria.create({ data });
export const editar = (id: number, data: { nombre: string; descripcion?: string }) =>
	prisma.categoria.update({ where: { id }, data });
export const eliminar = (id: number) => prisma.categoria.delete({ where: { id } });
