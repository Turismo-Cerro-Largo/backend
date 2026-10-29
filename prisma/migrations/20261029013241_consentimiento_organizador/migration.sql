-- AlterTable
ALTER TABLE `organizador` ADD COLUMN `acepta_privacidad` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `acepta_terminos` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aceptado_en` DATETIME(3) NULL,
    ADD COLUMN `version_documentos` VARCHAR(40) NULL;
