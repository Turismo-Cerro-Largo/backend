-- CreateTable
CREATE TABLE `rol` (
    `id_rol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `rol_nombre_key`(`nombre`),
    PRIMARY KEY (`id_rol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `localidad` (
    `id_localidad` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `departamento` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `localidad_nombre_departamento_key`(`nombre`, `departamento`),
    PRIMARY KEY (`id_localidad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuario` (
    `id_usuario` INTEGER NOT NULL AUTO_INCREMENT,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `cedula` VARCHAR(20) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `genero` VARCHAR(30) NULL,
    `fecha_registro` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `id_rol` INTEGER NOT NULL,
    `id_localidad` INTEGER NOT NULL,

    UNIQUE INDEX `usuario_cedula_key`(`cedula`),
    UNIQUE INDEX `usuario_email_key`(`email`),
    INDEX `usuario_id_rol_idx`(`id_rol`),
    INDEX `usuario_id_localidad_idx`(`id_localidad`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `autenticacion_google` (
    `id_auth_google` INTEGER NOT NULL AUTO_INCREMENT,
    `proveedor` VARCHAR(30) NOT NULL DEFAULT 'google',
    `google_id` VARCHAR(191) NOT NULL,
    `email_google` VARCHAR(191) NOT NULL,
    `fecha_vinculacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario` INTEGER NOT NULL,

    UNIQUE INDEX `autenticacion_google_google_id_key`(`google_id`),
    UNIQUE INDEX `autenticacion_google_id_usuario_key`(`id_usuario`),
    PRIMARY KEY (`id_auth_google`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitud_recuperacion` (
    `id_recuperacion` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(255) NOT NULL,
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_expiracion` DATETIME(3) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `id_usuario` INTEGER NOT NULL,

    UNIQUE INDEX `solicitud_recuperacion_token_key`(`token`),
    INDEX `solicitud_recuperacion_id_usuario_idx`(`id_usuario`),
    INDEX `solicitud_recuperacion_fecha_expiracion_idx`(`fecha_expiracion`),
    PRIMARY KEY (`id_recuperacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitud_organizador` (
    `id_solicitud_organizador` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_organizacion` VARCHAR(150) NOT NULL,
    `rut_ruc` VARCHAR(30) NOT NULL,
    `estado` ENUM('PENDIENTE_VERIFICACION', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE_VERIFICACION',
    `motivo_rechazo` TEXT NULL,
    `fecha_solicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_revision` DATETIME(3) NULL,
    `id_usuario` INTEGER NOT NULL,
    `id_administrador_revisor` INTEGER NULL,

    INDEX `solicitud_organizador_id_usuario_idx`(`id_usuario`),
    INDEX `solicitud_organizador_id_administrador_revisor_idx`(`id_administrador_revisor`),
    INDEX `solicitud_organizador_rut_ruc_idx`(`rut_ruc`),
    INDEX `solicitud_organizador_estado_idx`(`estado`),
    PRIMARY KEY (`id_solicitud_organizador`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documento_organizador` (
    `id_documento` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('CEDULA_FRENTE', 'CEDULA_DORSO', 'OTRO') NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `fecha_carga` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_solicitud_organizador` INTEGER NOT NULL,

    INDEX `documento_organizador_id_solicitud_organizador_idx`(`id_solicitud_organizador`),
    PRIMARY KEY (`id_documento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categoria` (
    `id_categoria` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` VARCHAR(255) NULL,

    UNIQUE INDEX `categoria_nombre_key`(`nombre`),
    PRIMARY KEY (`id_categoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lugar` (
    `id_lugar` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `direccion` VARCHAR(255) NULL,
    `telefono_contacto` VARCHAR(30) NULL,
    `sitio_web` VARCHAR(500) NULL,
    `horario` VARCHAR(255) NULL,
    `latitud` DECIMAL(10, 7) NULL,
    `longitud` DECIMAL(10, 7) NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `id_categoria` INTEGER NOT NULL,
    `id_localidad` INTEGER NOT NULL,

    INDEX `lugar_id_categoria_idx`(`id_categoria`),
    INDEX `lugar_id_localidad_idx`(`id_localidad`),
    INDEX `lugar_estado_idx`(`estado`),
    INDEX `lugar_nombre_idx`(`nombre`),
    PRIMARY KEY (`id_lugar`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurso` (
    `id_recurso` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('IMAGEN', 'VIDEO') NOT NULL DEFAULT 'IMAGEN',
    `url` VARCHAR(2048) NOT NULL,
    `descripcion` VARCHAR(255) NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `id_lugar` INTEGER NULL,
    `id_evento` INTEGER NULL,
    `id_resena` INTEGER NULL,

    INDEX `recurso_id_lugar_idx`(`id_lugar`),
    INDEX `recurso_id_evento_idx`(`id_evento`),
    INDEX `recurso_id_resena_idx`(`id_resena`),
    PRIMARY KEY (`id_recurso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `resena` (
    `id_resena` INTEGER NOT NULL AUTO_INCREMENT,
    `comentario` TEXT NULL,
    `calificacion` TINYINT NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('PUBLICADA', 'OCULTA', 'ELIMINADA') NOT NULL DEFAULT 'PUBLICADA',
    `id_usuario` INTEGER NOT NULL,
    `id_lugar` INTEGER NOT NULL,

    INDEX `resena_id_usuario_idx`(`id_usuario`),
    INDEX `resena_id_lugar_idx`(`id_lugar`),
    INDEX `resena_estado_idx`(`estado`),
    PRIMARY KEY (`id_resena`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorito` (
    `id_favorito` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha_guardado` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `id_usuario` INTEGER NOT NULL,
    `id_lugar` INTEGER NOT NULL,

    INDEX `favorito_id_lugar_idx`(`id_lugar`),
    UNIQUE INDEX `favorito_id_usuario_id_lugar_key`(`id_usuario`, `id_lugar`),
    PRIMARY KEY (`id_favorito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `evento` (
    `id_evento` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(180) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `fecha_evento` DATE NOT NULL,
    `hora_inicio` TIME(0) NOT NULL,
    `hora_fin` TIME(0) NULL,
    `lugar_evento` VARCHAR(255) NULL,
    `latitud` DECIMAL(10, 7) NULL,
    `longitud` DECIMAL(10, 7) NULL,
    `precio` DECIMAL(10, 2) NULL,
    `entrada_gratuita` BOOLEAN NOT NULL DEFAULT false,
    `estado` ENUM('BORRADOR', 'PENDIENTE_REVISION', 'PUBLICADO', 'RECHAZADO', 'CANCELADO', 'FINALIZADO') NOT NULL DEFAULT 'BORRADOR',
    `motivo_rechazo` TEXT NULL,
    `contacto` VARCHAR(255) NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,
    `id_usuario_creador` INTEGER NOT NULL,
    `id_localidad` INTEGER NOT NULL,
    `id_categoria` INTEGER NOT NULL,

    INDEX `evento_id_usuario_creador_idx`(`id_usuario_creador`),
    INDEX `evento_id_localidad_idx`(`id_localidad`),
    INDEX `evento_id_categoria_idx`(`id_categoria`),
    INDEX `evento_estado_idx`(`estado`),
    INDEX `evento_fecha_evento_idx`(`fecha_evento`),
    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresa_transporte` (
    `id_empresa` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(30) NULL,
    `sitio_web` VARCHAR(500) NULL,

    UNIQUE INDEX `empresa_transporte_nombre_key`(`nombre`),
    PRIMARY KEY (`id_empresa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horario_omnibus` (
    `id_horario` INTEGER NOT NULL AUTO_INCREMENT,
    `origen` VARCHAR(120) NOT NULL,
    `destino` VARCHAR(120) NOT NULL,
    `hora_salida` TIME(0) NOT NULL,
    `hora_llegada` TIME(0) NULL,
    `dias` VARCHAR(100) NOT NULL,
    `tipo_servicio` VARCHAR(80) NULL,
    `precio` DECIMAL(10, 2) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `id_empresa` INTEGER NOT NULL,

    INDEX `horario_omnibus_id_empresa_idx`(`id_empresa`),
    INDEX `horario_omnibus_origen_destino_idx`(`origen`, `destino`),
    PRIMARY KEY (`id_horario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_id_rol_fkey` FOREIGN KEY (`id_rol`) REFERENCES `rol`(`id_rol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_id_localidad_fkey` FOREIGN KEY (`id_localidad`) REFERENCES `localidad`(`id_localidad`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `autenticacion_google` ADD CONSTRAINT `autenticacion_google_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitud_recuperacion` ADD CONSTRAINT `solicitud_recuperacion_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitud_organizador` ADD CONSTRAINT `solicitud_organizador_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitud_organizador` ADD CONSTRAINT `solicitud_organizador_id_administrador_revisor_fkey` FOREIGN KEY (`id_administrador_revisor`) REFERENCES `usuario`(`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documento_organizador` ADD CONSTRAINT `documento_organizador_id_solicitud_organizador_fkey` FOREIGN KEY (`id_solicitud_organizador`) REFERENCES `solicitud_organizador`(`id_solicitud_organizador`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lugar` ADD CONSTRAINT `lugar_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lugar` ADD CONSTRAINT `lugar_id_localidad_fkey` FOREIGN KEY (`id_localidad`) REFERENCES `localidad`(`id_localidad`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_lugar_fkey` FOREIGN KEY (`id_lugar`) REFERENCES `lugar`(`id_lugar`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_resena_fkey` FOREIGN KEY (`id_resena`) REFERENCES `resena`(`id_resena`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `resena` ADD CONSTRAINT `resena_id_lugar_fkey` FOREIGN KEY (`id_lugar`) REFERENCES `lugar`(`id_lugar`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_usuario_fkey` FOREIGN KEY (`id_usuario`) REFERENCES `usuario`(`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorito` ADD CONSTRAINT `favorito_id_lugar_fkey` FOREIGN KEY (`id_lugar`) REFERENCES `lugar`(`id_lugar`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_usuario_creador_fkey` FOREIGN KEY (`id_usuario_creador`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_localidad_fkey` FOREIGN KEY (`id_localidad`) REFERENCES `localidad`(`id_localidad`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `horario_omnibus` ADD CONSTRAINT `horario_omnibus_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `empresa_transporte`(`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;
