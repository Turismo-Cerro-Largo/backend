import { auth_usuario_register_scheem } from "../auth/auth.schema.js";

export const administradorSchema = auth_usuario_register_scheem
	.pick({
		nombres: true,
		apellidos: true,
		email: true,
		password: true,
	})
	.strict();
