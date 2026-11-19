import { beforeEach, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({
    usuario: { findUnique: vi.fn(), delete: vi.fn() },
    organizador: { findUnique: vi.fn(), delete: vi.fn() },
    evento: { deleteMany: vi.fn() },
    verificacionCorreo: { deleteMany: vi.fn() }
}));
vi.mock('../src/configuracion/db.js', () => ({
    configurarBaseLocal: () => {},
    prisma: { $transaction: (fn: (cliente: typeof tx) => unknown) => fn(tx) }
}));
import { eliminarDefinitivamente as eliminarUsuario } from '../src/app/usuarios/usuarios.repository.js';
import { eliminarDefinitivamente as eliminarOrganizador } from '../src/app/organizadores/organizadores.repository.js';

beforeEach(() => vi.resetAllMocks());

it('elimina al turista y sus códigos, incluidos los de una baja lógica anterior', async () => {
    tx.usuario.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com', rol: 'TURISTA', estado_acceso: 'ELIMINADO', foto_perfil: null, comentarios: [] });
    await eliminarUsuario(1);
    expect(tx.verificacionCorreo.deleteMany).toHaveBeenCalledWith({ where: { email: 'test@example.com', tipo: 'TURISTA' } });
    expect(tx.usuario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
});

it('no elimina administradores ni sus códigos', async () => {
    tx.usuario.findUnique.mockResolvedValue({ rol: 'ADMINISTRADOR' });
    expect(await eliminarUsuario(1)).toBeNull();
    expect(tx.usuario.delete).not.toHaveBeenCalled();
    expect(tx.verificacionCorreo.deleteMany).not.toHaveBeenCalled();
});

it('elimina eventos antes del organizador y devuelve los archivos para limpiar', async () => {
    tx.organizador.findUnique.mockResolvedValue({ email: 'org@example.com', documentos: [{ uri: 'documento.jpg' }], eventos: [{ recursos: [{ uri: 'evento.jpg' }] }] });
    expect(await eliminarOrganizador(2)).toEqual({ documentos: ['documento.jpg'], recursos: ['evento.jpg'] });
    expect(tx.evento.deleteMany).toHaveBeenCalledWith({ where: { id_organizador: 2 } });
    expect(tx.organizador.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(tx.evento.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(tx.organizador.delete.mock.invocationCallOrder[0]!);
});

it('no modifica datos cuando la cuenta no existe', async () => {
    tx.organizador.findUnique.mockResolvedValue(null);
    expect(await eliminarOrganizador(99)).toBeNull();
    expect(tx.organizador.delete).not.toHaveBeenCalled();
});
