-- Cambio incremental: conserva las cuentas y el historial de migraciones existente.
ALTER TABLE `usuario`
  ADD COLUMN `localidad` VARCHAR(120) NULL,
  ADD COLUMN `foto_perfil` VARCHAR(255) NULL;
