import { prisma } from '../configuracion/db.js';

export const usuarioRepository = {
    async findAll() {
        return prisma.usuario.findMany();
    },

    async findById(id: number) {
        return prisma.usuario.findUnique({ where: { id } });
    },

    async findByEmail(email: string) {
        return prisma.usuario.findUnique({ where: { email } });
    },

    async create(data: { username: string; email: string }) {
        return prisma.usuario.create({ data });
    },

    async limpiar() {
        return prisma.usuario.deleteMany({})
    }
};