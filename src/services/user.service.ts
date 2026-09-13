import { userRepository } from "../repositories/user.repository.js";
import { NotFoundError, ConflictError } from "../errors/errors.js";
import type { CrearUsuarioInput } from "../schemas/user.schema.js";

export const userService = {

    async obtenerTodos() {
        return userRepository.findMany();
    },

    async obtenerUno(id: number) {
        const usuario = await userRepository.findById(id);
        if (!usuario) throw new NotFoundError("Usuario no encontrado");
        return usuario;
    },

    async crearUno(datos: CrearUsuarioInput) {
        try {
            return await userRepository.create({ username: datos.username, email: datos.email });
        } catch (error: any) {
            if (error.code === "P2002") throw new ConflictError("El usuario ya existe");
            throw error;
        }
    }
};