import { argon2idAsync } from "@noble/hashes/argon2.js";
import { timingSafeEqual } from "node:crypto";
const b64 = (v: Uint8Array) => Buffer.from(v).toString("base64").replace(/=+$/, "");
export async function hash(
	password: string,
	options: { memoryCost?: number; timeCost?: number; parallelism?: number } = {},
) {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const m = options.memoryCost ?? 19456,
		t = options.timeCost ?? 2,
		p = options.parallelism ?? 1;
	const result = await argon2idAsync(password, salt, { m, t, p, dkLen: 32 });
	return "$argon2id$v=19$m=" + m + ",t=" + t + ",p=" + p + "$" + b64(salt) + "$" + b64(result);
}
export async function verify(encoded: string, password: string) {
	const match =
		/^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(encoded);
	if (!match) return false;
	const m = Number(match[1]),
		t = Number(match[2]),
		p = Number(match[3]);
	if (m < 8 * p || m > 65536 || t < 1 || t > 10 || p < 1 || p > 4) return false;
	const salt = Buffer.from(match[4]!, "base64"),
		expected = Buffer.from(match[5]!, "base64");
	if (salt.length < 8 || salt.length > 64 || expected.length !== 32) return false;
	const actual = await argon2idAsync(password, salt, { m, t, p, dkLen: expected.length });
	return timingSafeEqual(actual, expected);
}
