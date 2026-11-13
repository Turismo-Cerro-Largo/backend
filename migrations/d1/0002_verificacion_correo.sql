ALTER TABLE "usuario" ADD COLUMN "email_verificado" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organizador" ADD COLUMN "email_verificado" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "verificacion_correo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "expira_en" DATETIME NOT NULL,
    "enviado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intentos" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "verificacion_correo_email_key" ON "verificacion_correo"("email");
CREATE INDEX "verificacion_correo_expira_en_idx" ON "verificacion_correo"("expira_en");
