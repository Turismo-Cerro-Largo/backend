/*
  Warnings:

  - You are about to drop the `recurso_evento` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `recurso_lugar` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `id_categoria` to the `evento` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `documento_organizador` DROP FOREIGN KEY `documento_organizador_id_solicitud_fkey`;

-- DropForeignKey
ALTER TABLE `recurso_evento` DROP FOREIGN KEY `recurso_evento_id_evento_fkey`;

-- DropForeignKey
ALTER TABLE `recurso_lugar` DROP FOREIGN KEY `recurso_lugar_id_lugar_fkey`;

-- AlterTable
ALTER TABLE `evento` ADD COLUMN `id_categoria` INTEGER NOT NULL;

-- DropTable
DROP TABLE `recurso_evento`;

-- DropTable
DROP TABLE `recurso_lugar`;

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

-- CreateIndex
CREATE INDEX `evento_id_categoria_idx` ON `evento`(`id_categoria`);

-- AddForeignKey
ALTER TABLE `documento_organizador` ADD CONSTRAINT `documento_organizador_id_solicitud_organizador_fkey` FOREIGN KEY (`id_solicitud_organizador`) REFERENCES `solicitud_organizador`(`id_solicitud_organizador`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_lugar_fkey` FOREIGN KEY (`id_lugar`) REFERENCES `lugar`(`id_lugar`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurso` ADD CONSTRAINT `recurso_id_resena_fkey` FOREIGN KEY (`id_resena`) REFERENCES `resena`(`id_resena`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `evento` ADD CONSTRAINT `evento_id_categoria_fkey` FOREIGN KEY (`id_categoria`) REFERENCES `categoria`(`id_categoria`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `documento_organizador` RENAME INDEX `documento_organizador_id_solicitud_idx` TO `documento_organizador_id_solicitud_organizador_idx`;
