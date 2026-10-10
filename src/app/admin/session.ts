import type { Context } from 'hono';
import { getSignedCookie } from 'hono/cookie';
import { prisma } from '../../configuracion/db.js';
import { env } from '../../configuracion/env.js';
import { ForbiddenError, UnauthorizedError } from '../../configuracion/AppError.js';

export function sessionValue(tipo: string, id: number, rol: string) {
    return `${tipo}:${id}:${rol}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
}
export async function account(c: Context) {
    const cookie = await getSignedCookie(c, env.COOKIE_SECRET, 'session');
    if (!cookie) throw new UnauthorizedError('Iniciá sesión para continuar.');
    const [tipo, rawId, , expiry] = cookie.split(':');
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1 || !expiry || !Number.isFinite(Number(expiry)) || Number(expiry) <= Date.now()) throw new UnauthorizedError('La sesión venció. Volvé a ingresar.');
    if (tipo === 'usuario') {
        const user = await prisma.usuario.findUnique({ where: { id }, select: { id: true, rol: true, nombres: true } });
        if (user) return { id, rol: user.rol as string, nombre: user.nombres, tipo };
    } else if (tipo === 'organizador') {
        const org = await prisma.organizador.findUnique({ where: { id }, select: { id: true, nombre_organizacion: true, estado: true } });
        if (org) return { id, rol: 'ORGANIZADOR', nombre: org.nombre_organizacion, estado: org.estado, tipo };
    }
    throw new UnauthorizedError('La cuenta ya no está disponible.');
}
export async function administrator(c: Context) {
    const user = await account(c);
    if (user.tipo !== 'usuario' || user.rol !== 'ADMINISTRADOR') throw new ForbiddenError('Se requieren permisos de administrador.');
    return user;
}
export function verifyOrigin(c: Context) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) return;
    const allowed = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim());
    if (!allowed.includes(c.req.header('origin') ?? '')) throw new ForbiddenError('Origen no autorizado.');
}
