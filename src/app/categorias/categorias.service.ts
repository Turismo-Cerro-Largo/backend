import { BadRequestError, ConflictError, NotFoundError } from "../../configuracion/AppError.js";
import * as repository from "./categorias.repository.js";
import { categoria_scheme } from "./categorias.scheme.js";

export function validarId(valor: string) {
	const id = Number(valor);
	if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestError();
	return id;
}

function validarDatos(body: unknown) {
	const resultado = categoria_scheme.safeParse(body);
	if (!resultado.success) throw new BadRequestError();
	return { nombre: resultado.data.nombre, descripcion: resultado.data.descripcion };
}

export async function listar() {
	const categorias = await repository.listar();
	return { categorias, total: categorias.length };
}

export async function buscar(id: number) {
	const categoria = await repository.buscar(id);
	if (!categoria) throw new NotFoundError();
	return categoria;
}

export async function crear(body: unknown) {
	const datos = validarDatos(body);
	if (await repository.buscarPorNombre(datos.nombre)) throw new ConflictError();
	return repository.crear(datos);
}

export async function editar(id: number, body: unknown) {
	const datos = validarDatos(body);
	await buscar(id);
	const existente = await repository.buscarPorNombre(datos.nombre);
	if (existente && existente.id !== id) throw new ConflictError();
	return repository.editar(id, datos);
}

export async function eliminar(id: number) {
	const { _count } = await buscar(id);
	if (_count.eventos || _count.ubicaciones) throw new ConflictError();
	await repository.eliminar(id);
}
