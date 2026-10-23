export function idValido(value: string) {
	const id = Number(value);
	return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 ? id : null;
}
