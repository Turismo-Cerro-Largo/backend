import { randomBytes, timingSafeEqual } from "node:crypto";
import { argon2id } from "@noble/hashes/argon2.js";

type Costos = { memoryCost: number; timeCost: number; parallelism: number };

export async function hash(password: string, costos: Costos) {
	const { memoryCost: m, timeCost: t, parallelism: p } = costos;
	const sal = randomBytes(16);
	const clave = argon2id(password, sal, { m, t, p, dkLen: 32 });
	return `$argon2id$v=19$m=${m},t=${t},p=${p}$${sal.toString("base64").replace(/=+$/, "")}$${Buffer.from(clave).toString("base64").replace(/=+$/, "")}`;
}

export async function verify(phc: string, password: string) {
	const partes = /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(phc);
	if (!partes) return false;
	const [m, t, p] = partes.slice(1, 4).map(Number);
	const sal = Buffer.from(partes[4], "base64");
	const esperada = Buffer.from(partes[5], "base64");
	if (m < 8 * p || m > 65536 || t < 1 || t > 4 || p < 1 || p > 4 || sal.length < 8 || esperada.length !== 32)
		return false;
	const calculada = argon2id(password, sal, { m, t, p, dkLen: esperada.length });
	return timingSafeEqual(calculada, esperada);
}
