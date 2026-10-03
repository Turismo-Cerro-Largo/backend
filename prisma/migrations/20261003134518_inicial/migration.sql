-- CreateTable
CREATE TABLE `usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `departamento` VARCHAR(100) NOT NULL,
    `localidad` VARCHAR(120) NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `telefono` VARCHAR(30) NOT NULL,
    `genero` ENUM('masculino', 'femenino', 'otro') NOT NULL,
    `cedula` VARCHAR(8) NOT NULL,
    `passhash` VARCHAR(255) NULL,
    `rol` ENUM('TURISTA', 'ADMINISTRADOR') NOT NULL DEFAULT 'TURISTA',
    `sub` VARCHAR(191) NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    UNIQUE INDEX `usuario_cedula_key`(`cedula`),
    UNIQUE INDEX `usuario_sub_key`(`sub`),
    INDEX `usuario_email_idx`(`email`),
    INDEX `usuario_departamento_localidad_idx`(`departamento`, `localidad`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organizador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_organizacion` VARCHAR(150) NOT NULL,
    `rut_ruc` VARCHAR(30) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(30) NOT NULL,
    `sitio_web` VARCHAR(500) NULL,
    `passhash` VARCHAR(255) NOT NULL,
    `estado` ENUM('PENDIENTE_REVISION', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE_REVISION',
    `motivo_rechazo` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `organizador_rut_ruc_key`(`rut_ruc`),
    UNIQUE INDEX `organizador_email_key`(`email`),
    INDEX `organizador_email_idx`(`email`),
    INDEX `organizador_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documento_organizador` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uri` VARCHAR(2048) NOT NULL,
    `tipo` ENUM('CEDULA_FRENTE', 'CEDULA_DORSO', 'OTRO') NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_organizador` INTEGER NOT NULL,

    INDEX `documento_organizador_id_organizador_idx`(`id_organizador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `categoria_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ubicacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `localidad` VARCHAR(120) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `sitio_web` VARCHAR(500) NULL,
    `horario` VARCHAR(255) NULL,
    `latitud` DECIMAL(10, 7) NOT NULL,
    `longitud` DECIMAL(10, 7) NOT NULL,
    `estado` ENUM('PUBLICADO', 'OCULTADO') NOT NULL DEFAULT 'PUBLICADO',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_categoria` INTEGER NOT NULL,

    INDEX `ubicacion_nombre_idx`(`nombre`),
    INDEX `ubicacion_localidad_idx`(`localidad`),
    INDEX `ubicacion_id_categoria_estado_idx`(`id_categoria`, `estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurso` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uri` VARCHAR(2048) NOT NULL,
    `tipo` ENUM('VIDEO', 'IMAGEN') NOT NULL DEFAULT 'IMAGEN',
    `descripcion` VARCHAR(255) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `id_ubicacion` INTEGER NULL,
    `id_evento` INTEGER NULL,
    `id_comentario` INTEGER NULL,

    INDEX `recurso_id_ubicacion_idx`(`id_ubicacion`),
    INDEX `recurso_id_evento_idx`(`id_evento`),
    INDEX `recurso_id_comentario_idx`(`id_comentario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comentario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `texto` TEXT NULL,
    `calificacion` TINYINT NOT NULL,
    `estado` ENUM('PENDIENTE_REVISION', 'PUBLICADO', 'OCULTADO') NOT NULL DEFAULT 'PENDIENTE_REVISION',
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario` INTEGER NOT NULL,
    `id_ubicacion` INTEGER NOT NULL,

    INDEX `comentario_id_ubicacion_estado_idx`(`id_ubicacion`, `estado`),
    INDEX `comentario_id_usuario_idx`(`id_usuario`),
    UNIQUE INDEX `comentario_id_usuario_id_ubicacion_key`(`id_usuario`, `id_ubicacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario` INTEGER NOT NULL,
    `id_ubicacion` INTEGER NOT NULL,

    INDEX `favorito_id_usuario_idx`(`id_usuario`),
    INDEX `favorito_id_ubicacion_idx`(`id_ubicacion`),
    UNIQUE INDEX `favorito_id_usuario_id_ubicacion_key`(`id_usuario`, `id_ubicacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(180) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `inicio` DATETIME(3) NOT NULL,
    `fin` DATETIME(3) NULL,
    `lugar_evento` VARCHAR(255) NULL,
    `latitud` DECIMAL(10, 7) NULL,
    `longitud` DECIMAL(10, 7) NULL,
    `es_gratuito` BOOLEAN NOT NULL DEFAULT false,
    `precio` DECIMAL(10, 2) NULL,
    `contacto` VARCHAR(255) NULL,
    `estado` ENUM('BORRADOR', 'PENDIENTE_REVISION', 'PUBLICADO', 'RECHAZADO', 'CANCELADO', 'FINALIZADO') NOT NULL DEFAULT 'BORRADOR',
    `motivo_rechazo` TEXT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actualizado_en` DATETIME(3) NOT NULL,
    `id_organizador` INTEGER NOT NULL,
    `id_categoria` INTEGER NOT NULL,

    INDEX `evento_estado_inicio_idx`(`estado`, `inicio`),
    INDEX `evento_id_organizador_idx`(`id_organizador`),
    INDEX `evento_id_categoria_idx`(`id_categoria`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitud_recuperacion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(255) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_expiracion` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `id_usuario` INTEGER NULL,
    `id_organizador` INTEGER NULL,

    UNIQUE INDEX `solicitud_recuperacion_token_key`(`token`),
    INDEX `solicitud_recuperacion_fecha_expiracion_idx`(`fecha_expiracion`),
    INDEX `solicitud_recuperacion_id_usuario_idx`(`id_usuario`),
    INDEX `solicitud_recuperacion_id_organizador_idx`(`id_organizador`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresa_transporte` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `sitio_web` VARCHAR(500) NULL,

    UNIQUE INDEX `empresa_transporte_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horario_omnibus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `origen` VARCHAR(120) NOT NULL,
    `destino` VARCHAR(120) NOT NULL,
    `hora_salida` TIME(0) NOT NULL,
    `hora_llegada` TIME(0) NULL,
    `dias` VARCHAR(100) NOT NULL,
    `tipo_servicio` ENUM('DEPARTAMENTAL', 'INTERDEPARTAMENTAL') NOT NULL,
    `precio` DECIMAL(10, 2) NULL,
    `estado` ENUM('PUBLICADO', 'OCULTADO') NOT NULL DEFAULT 'PUBLICADO',
    `id_empresa` INTEGER NOT NULL,

    INDEX `horario_omnibus_origen_destino_idx`(`origen`, `destino`),
    INDEX `horario_omnibus_id_empresa_idx`(`id_empresa`),
    INDEX `horario_omnibus_tipo_servicio_idx`(`tipo_servicio`),
    INDEX `horario_omnibus_estado_idx`(`estado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documento_organizador` ADD CONSTRAINT `documento_organizador_id_organizador_fkey` FOREIGN KEY (`id_organizador`) REFERENCES `organizador`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ubicacion` ADD CONSTRAINT `ubicacion_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_comentario_fkey` FOREIGN KEY (`id_comentario`) REFERENCES `comentario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_ubicacion_fkey` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentario` ADD CONSTRAINT `comentario_id_ubicacion_fkey` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comentario` ADD CONSTRAINT `comentario_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_ubicacion_fkey` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_organizador_fkey` FOREIGN KEY (`id_organizador`) REFERENCES `organizador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitud_recuperacion` ADD CONSTRAINT `solicitud_recuperacion_id_organizador_fkey` FOREIGN KEY (`id_organizador`) REFERENCES `organizador`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitud_recuperacion` ADD CONSTRAINT `solicitud_recuperacion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horario_omnibus` ADD CONSTRAINT `horario_omnibus_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `empresa_transporte`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
