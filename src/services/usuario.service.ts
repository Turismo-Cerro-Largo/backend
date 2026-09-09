import { usuarioRepository } from '../repositories/usuario.repository.js';

export const usuarioService = {
  async obtenerTodos() {
    return usuarioRepository.findAll();
  },

  async obtenerPorId(id: number) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw new Error('Usuario no encontrado');
    return usuario;
  },

  async crear(datos: { username: string; email: string }) {
    const existe = await usuarioRepository.findByEmail(datos.email);
    if (existe) throw new Error('Email ya registrado');
    return usuarioRepository.create(datos);
  },

  async limpiar() {
    const limpiar = await usuarioRepository.limpiar();
    return limpiar
  }
};