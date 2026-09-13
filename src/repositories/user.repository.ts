import { prisma } from "../configuracion/db.js";

export const userRepository = {
    findMany() {
        return prisma.usuario.findMany();
    },
    findById(id: number) {
        return prisma.usuario.findUnique({ where: { id } });
    },
    create(data: { username: string; email: string }) {
        return prisma.usuario.create({ data });
    }
};