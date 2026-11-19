import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), upsert: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn(), enviar: vi.fn() }));
vi.mock('../src/app/auth/verificacion.datos.repository.js', () => mocks);
vi.mock('../src/app/auth/verificacion.repository.js', () => ({}));
vi.mock('../src/app/usuarios/usuarios.repository.js', () => ({}));
vi.mock('../src/app/organizadores/organizadores.repository.js', () => ({}));
vi.mock('../src/app/auth/recuperacion.service.js', () => ({ admitirIntento: vi.fn() }));
vi.mock('../src/configuracion/env.js', () => ({ env: { COOKIE_SECRET: 'test-secret-for-verification-only' } }));
vi.mock('../src/app/auth/correo.js', () => ({ correoConfigurado: () => true, enviarCodigoRegistro: mocks.enviar }));

import { emitirCodigoRegistro } from '../src/app/auth/verificacion.service.js';

beforeEach(() => { vi.resetAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

it('conserva el código anterior si falla un reenvío', async () => {
    const anterior = { tipo: 'TURISTA', codigo_hash: 'anterior', expira_en: new Date(Date.now() + 600000), intentos: 1 };
    mocks.findUnique.mockResolvedValue(anterior);
    mocks.enviar.mockRejectedValue(new Error('SMTP'));
    await expect(emitirCodigoRegistro('test@example.com', 'TURISTA')).rejects.toThrow('SMTP');
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { email: 'test@example.com', codigo_hash: mocks.upsert.mock.calls[0][0].create.codigo_hash },
        data: anterior
    }));
    expect(mocks.deleteMany).not.toHaveBeenCalled();
});

it('retira solo el código nuevo si falla el primer envío', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.enviar.mockRejectedValue(new Error('SMTP'));
    await expect(emitirCodigoRegistro('test@example.com', 'ORGANIZADOR')).rejects.toThrow('SMTP');
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { email: 'test@example.com', codigo_hash: mocks.upsert.mock.calls[0][0].create.codigo_hash } });
});

it('mantiene el nuevo código cuando el envío funciona', async () => {
    mocks.findUnique.mockResolvedValue(null);
    await emitirCodigoRegistro('test@example.com', 'TURISTA');
    expect(mocks.enviar).toHaveBeenCalledWith('test@example.com', expect.stringMatching(/^\d{6}$/));
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
});
