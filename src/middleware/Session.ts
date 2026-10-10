// src/middleware/Session.ts
import { getSignedCookie, setSignedCookie } from "hono/cookie"
import { every } from "hono/combine"
import { createMiddleware } from "hono/factory"
import { env } from "node:process"
import { ForbiddenError, UnauthorizedError } from "../configuracion/AppError.js"
import type { Context } from "hono"

// Funcion helper para crear la session
export const crear_sesion = (c: Context, cuenta: { tipo: string; id: number; rol: string }) =>
    setSignedCookie(c, "session", `${cuenta.tipo}:${cuenta.id}:${cuenta.rol}`, env.COOKIE_SECRET!, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    })

// src/middleware/Sessiom.ts
export const VerificarSession = createMiddleware<{ Variables: { sesion: { tipo: string; id: string; rol: string } } }>(async (c, next) => {
    // Verificar si tiene una session
    const sesion = await getSignedCookie(c, env.COOKIE_SECRET!, "session")
    if (!sesion) throw new UnauthorizedError()

    const [tipo, id, rol] = sesion.split(":")
    if (!tipo || !id || !rol) throw new UnauthorizedError()

    c.set("sesion", { tipo, id, rol })

    await next()
})

export const VerificarSessionRol = (roles: string[]) => createMiddleware<{ Variables: { sesion: { tipo: string; id: string; rol: string } } }>(async (c, next) => {
    // Verificar si tiene una session
    const sesion = await getSignedCookie(c, env.COOKIE_SECRET!, "session")
    if (!sesion) throw new UnauthorizedError()

    const [tipo, id, rol] = sesion.split(":")
    if (!tipo || !id || !rol) throw new UnauthorizedError()

    if (!roles.includes(rol)) throw new ForbiddenError()

    c.set("sesion", { tipo, id, rol })

    await next()
})