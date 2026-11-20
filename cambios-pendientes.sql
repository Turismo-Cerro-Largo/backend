-- AlterTable
ALTER TABLE `organizador` ADD COLUMN `email_verificado` BOOLEAN NOT NULL DEFAULT true,
    MODIFY `rut_ruc` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `email_verificado` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `verificacion_correo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(254) NOT NULL,
    `tipo` ENUM('TURISTA', 'ORGANIZADOR') NOT NULL,
    `codigo_hash` VARCHAR(64) NOT NULL,
    `expira_en` DATETIME(3) NOT NULL,
    `enviado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `intentos` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `verificacion_correo_email_key`(`email`),
    INDEX `verificacion_correo_expira_en_idx`(`expira_en`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
