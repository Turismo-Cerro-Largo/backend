import { beforeEach, expect, it, vi } from 'vitest';
const repo = vi.hoisted(() => ({ listarPublicadas: vi.fn(), limitesPublicados: vi.fn() }));
vi.mock('../src/app/localidades/localidades.repository.js', () => repo);
import { listar } from '../src/app/localidades/localidades.service.js';
beforeEach(() => vi.resetAllMocks());
const localidad = { id: 1, nombre: 'Melo', slug: 'Melo', descripcion: null, icono: null };

it('usa lugares publicados para encuadrar una localidad sin centro', async () => {
    repo.listarPublicadas.mockResolvedValue([{ ...localidad, latitud: null, longitud: null }]);
    repo.limitesPublicados.mockResolvedValue([{ localidad: 'Melo', _min: { latitud: -32.4, longitud: -54.2 }, _max: { latitud: -32.3, longitud: -54.1 } }]);
    const [resultado] = await listar();
    expect(resultado?.limites).toEqual([[-54.2, -32.4], [-54.1, -32.3]]);
    expect(repo.limitesPublicados).toHaveBeenCalledWith(['Melo']);
});

it('conserva el centro configurado sin consultar lugares', async () => {
    repo.listarPublicadas.mockResolvedValue([{ ...localidad, latitud: -32.37, longitud: -54.17 }]);
    const [resultado] = await listar();
    expect(resultado?.latitud).toBe(-32.37);
    expect(resultado?.longitud).toBe(-54.17);
    expect(repo.limitesPublicados).not.toHaveBeenCalled();
});
