import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { app } from '../src/app.js'
import { prisma } from '../src/configuracion/db.js'

describe('creacion de usuarios', () => {
  const payload = {
    username: 'testuser',
    email: 'test@example.com'
  }
  const headers = new Headers({ 'content-type': 'application/json' })

  beforeAll(async () => {
    await prisma.$connect()
    await prisma.usuario.deleteMany({})
  }, 15000)

  afterAll(async () => {
    await prisma.usuario.deleteMany({})
    await prisma.$disconnect()
  }, 15000)

  it('crear usuario', async () => {
    const res = await app.request('/api/usuario', {
      method: 'post',
      headers,
      body: JSON.stringify(payload)
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.msg).toHaveProperty('id')
    expect(data.msg.email).toBe(payload.email)
  }, 15000)

  it('error al usuario duplicado', async () => {
    await app.request('/api/usuario', {
      method: 'post',
      headers,
      body: JSON.stringify(payload)
    })

    const res = await app.request('/api/usuario', {
      method: 'post',
      headers,
      body: JSON.stringify(payload)
    })

    expect(res.status).toBe(403)
    const errorData = await res.json()
    expect(errorData.msg).toBe('Usuario no creado')
  }, 15000)
})