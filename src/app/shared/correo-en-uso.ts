import * as usuarioRepository from "../usuarios/usuarios.repository.js";
import * as organizadorRepository from "../organizadores/organizadores.repository.js";

export async function correoEnUso(email: string) {
	const [usuario, organizador] = await Promise.all([
		usuarioRepository.findUnique({ where: { email }, select: { id: true } }),
		organizadorRepository.findUnique({ where: { email }, select: { id: true } }),
	]);
	return Boolean(usuario || organizador);
}
