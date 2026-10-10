// src/app/organizador/organizador.consts.ts
export const departamentos = [
    "Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno",
    "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo",
    "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto",
    "San José", "Soriano", "Tacuarembó", "Treinta y Tres"
] as const;

export const camposPerfil = {
    id: true,
    nombre_organizacion: true,
    email: true,
    rut_ruc: true,
    departamento: true,
    telefono: true,
    sitio_web: true,
    estado: true,
    creado_en: true
} as const;