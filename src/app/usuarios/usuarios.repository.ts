import { prisma } from "../../configuracion/db.js";
import type { Prisma } from "../../configuracion/generated/prisma/client.js";

export function findUnique<T extends Prisma.UsuarioFindUniqueArgs>(
	args: Prisma.SelectSubset<T, Prisma.UsuarioFindUniqueArgs>,
) {
	return prisma.usuario.findUnique(args);
}

export function count<T extends Prisma.UsuarioCountArgs>(
	args: Prisma.SelectSubset<T, Prisma.UsuarioCountArgs>,
) {
	return prisma.usuario.count(args);
}

export function findMany<T extends Prisma.UsuarioFindManyArgs>(
	args: Prisma.SelectSubset<T, Prisma.UsuarioFindManyArgs>,
) {
	return prisma.usuario.findMany(args);
}

export function create<T extends Prisma.UsuarioCreateArgs>(
	args: Prisma.SelectSubset<T, Prisma.UsuarioCreateArgs>,
) {
	return prisma.usuario.create(args);
}

export function update<T extends Prisma.UsuarioUpdateArgs>(
	args: Prisma.SelectSubset<T, Prisma.UsuarioUpdateArgs>,
) {
	return prisma.usuario.update(args);
}
