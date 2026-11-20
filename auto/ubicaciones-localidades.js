// Coordenadas de las fichas de Google Maps consultadas el 30/10/2026.
// Fotografías verificadas y créditos en auto/FUENTES-IMAGENES.md.
// Los enlaces usan el identificador de la ficha observada, no el centro del mapa.
const ficha = (id) => `https://www.google.com/maps?cid=${BigInt(id).toString()}`;
const lugar = (nombre, localidad, categoria, latitud, longitud, direccion, descripcion, placeId) => ({
    nombre, localidad, categoria, latitud, longitud, direccion, descripcion,
    telefono: null,
    horario: null,
    sitio_web: ficha(placeId),
    estado: 'PUBLICADO',
});

export const ubicacionesLocalidades = [
    lugar('Puente Barón de Mauá', 'Río Branco', 'Cultura', -32.5723241, -53.3769019,
        'Puente Internacional Barón de Mauá, Río Branco, Cerro Largo, Uruguay',
        'Puente internacional sobre el río Yaguarón que conecta Río Branco con Jaguarão, Brasil. Punto de referencia del paisaje fronterizo; respetar las normas de tránsito y de cruce internacional.',
        '0xca984237350c5b38'),
    lugar('Plaza General Artigas', 'Río Branco', 'Parques / Naturaleza', -32.5891895, -53.377987,
        'Plaza General Artigas, Río Branco, Cerro Largo, Uruguay',
        'Plaza urbana de Río Branco para una pausa y un paseo por el entorno de la ciudad.',
        '0xd1d0909c2e19a203'),
    lugar('Playa de la Laguna Merín', 'Laguna Merín', 'Parques / Naturaleza', -32.7424578, -53.2572439,
        'Calle 28, Lago Merín, Cerro Largo, Uruguay',
        'Sector de playa del balneario Lago Merín, sobre la costa de la laguna. Consultar la habilitación de baño, el estado del agua y los servicios disponibles antes de visitar.',
        '0x319a8acfb2ab2f97'),
    lugar('Neutral Free Shop - Aceguá', 'Aceguá', 'Compras', -31.8691253, -54.1653927,
        'Av. Internacional, 37001 Aceguá, Cerro Largo, Uruguay',
        'Tienda libre de impuestos de Neutral en Aceguá, del lado uruguayo de la frontera. Consultar directamente las condiciones de compra y los horarios antes de visitar.',
        '0x3210ccde54a06ffd'),
    lugar('Zona deportiva Tupambaé', 'Tupambaé', 'Parques / Naturaleza', -32.8370341, -54.7626007,
        '567P+5XJ, Tupambaé, Cerro Largo, Uruguay',
        'Espacio deportivo de Tupambaé. Consultar al municipio las actividades y condiciones de uso de sus instalaciones.',
        '0x6304ef7fc32392a7'),
    lugar('Sociedad Rural 25 de Mayo', 'Arévalo', 'Cultura', -32.6365049, -55.0755171,
        '9W7F+9QX, Arévalo, Cerro Largo, Uruguay',
        'Club y punto de encuentro social de Arévalo. La Intendencia identifica al Club 25 de Mayo como dirección del municipio. Consultar la programación y el acceso antes de visitar.',
        '0x805ddf63d51e37c4'),
    lugar('Comercio Arévalo', 'Arévalo', 'Cultura', -32.6367015, -55.0781109,
        '9W7C+8Q6, Arévalo, Cerro Largo, Uruguay',
        'Comercio local identificado en Google Maps como Comercio Arévalo. Punto de referencia del recorrido por el pueblo; no se presenta como museo ni se garantiza acceso turístico.',
        '0xc895b3256e422803'),
    lugar('Plaza Comisaría', 'Isidoro Noblía', 'Parques / Naturaleza', -31.9566617, -54.1239014,
        'Plaza Comisaría, Isidoro Noblía, Cerro Largo, Uruguay',
        'Espacio público de Isidoro Noblía identificado en Google Maps como Plaza Comisaría, para una pausa en el recorrido de la localidad.',
        '0x429305ffe72724ca'),
    lugar('Plaza La Alegría', 'Isidoro Noblía', 'Parques / Naturaleza', -31.962922, -54.1211756,
        'Plaza La Alegría, Isidoro Noblía, Cerro Largo, Uruguay',
        'Plaza y espacio de encuentro de Isidoro Noblía. El programa de espacios públicos de OPP la identifica como un proyecto cultural, recreativo y deportivo.',
        '0x87fc8fa5faeef7c6'),
    lugar('Playita Plácido Rosas', 'Plácido Rosas', 'Parques / Naturaleza', -32.7632387, -53.7193941,
        'Playita Plácido Rosas, costa del río Tacuarí, Cerro Largo, Uruguay',
        'Balneario de Plácido Rosas junto al río Tacuarí. Consultar la habilitación de baño, las condiciones del río y los servicios antes de concurrir.',
        '0x69e79e49289c33e6'),
    lugar('Cabañas Tacuari', 'Plácido Rosas', 'Alojamiento', -32.7627371, -53.7197766,
        '67PJ+W35, Plácido Rosas, Cerro Largo, Uruguay',
        'Alojamiento identificado en Google Maps como Cabañas Tacuari, en el entorno del balneario de Plácido Rosas. Consultar directamente disponibilidad, tarifas y servicios.',
        '0xbe18ced279f05a5c'),
    lugar('Tinambú - Paso Centurión Tours', 'Centurión', 'Parques / Naturaleza', -32.1394636, -53.762922,
        'Paso Centurión, Cerro Largo, Uruguay',
        'Emprendimiento de turismo de naturaleza y guiado local en Paso Centurión, también referenciado por el Ministerio de Ambiente. Coordinar previamente las visitas y el acceso a predios privados.',
        '0x2fb56a5ef91c475c'),
    lugar('Letras de Centurión', 'Centurión', 'Cultura', -32.1450432, -53.8056332,
        'Letras de Centurión, Centurión, Cerro Largo, Uruguay',
        'Cartel de letras de Centurión, punto de referencia para reconocer la localidad y realizar una parada fotográfica sin obstaculizar el tránsito.',
        '0xe972f1276841300e'),
];

/** Comprueba el mínimo sobre el catálogo del seed antes de escribir en la base. */
export function validarCoberturaLocalidades(localidades, ubicaciones) {
    const pendientes = localidades.map(([, nombre]) => {
        const nombres = new Set(ubicaciones.filter((u) => u.localidad === nombre && u.estado === 'PUBLICADO').map((u) => u.nombre));
        return { localidad: nombre, cantidad: nombres.size };
    }).filter((resumen) => resumen.cantidad < 2);
    if (pendientes.length) throw new Error(`Faltan ubicaciones: ${JSON.stringify(pendientes)}`);
}

// Fotos pendientes: copiar los archivos JPEG con estos nombres en backend/auto/.
const fotografias = {
    'Plaza General Artigas': { imagen: 'plaza-artigas-rio-branco.jpg' },
    'Neutral Free Shop - Aceguá': { imagen: 'neutral-free-shop-acegua.jpg' },
    'Zona deportiva Tupambaé': { imagen: 'zona-deportiva-tupambae.jpg' },
    'Sociedad Rural 25 de Mayo': { imagen: 'sociedad-rural-25-mayo-arevalo.jpg' },
    'Comercio Arévalo': { imagen: 'comercio-arevalo.jpg' },
    'Plaza Comisaría': { imagen: 'plaza-comisaria-noblia.jpg' },
    'Plaza La Alegría': { imagen: 'plaza-alegria-noblia.jpg' },
    'Playita Plácido Rosas': { imagen: 'playita-placido-rosas.jpg' },
    'Cabañas Tacuari': { imagen: 'cabanas-tacuari.jpg' },
    'Tinambú - Paso Centurión Tours': { imagen: 'tinambu-centurion.jpg' },
    'Letras de Centurión': { imagen: 'letras-centurion.jpg' },
    'Puente Barón de Mauá': {
        imagen: 'puente-maua.jpg',
        creditoImagen: 'Richard A. Garcia Taño / Wikimedia Commons. CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/ . Redimensionada a 1280 px.',
    },
    'Playa de la Laguna Merín': {
        imagen: 'playa-laguna-merin.jpg',
        creditoImagen: 'Vista de Laguna Merín. Mb vargas / Wikimedia Commons. CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/ . Redimensionada a 1280 px.',
    },
};
for (const ubicacion of ubicacionesLocalidades) {
    Object.assign(ubicacion, fotografias[ubicacion.nombre] ?? {});
}