-- CreateTable
CREATE TABLE "usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departamento" TEXT,
    "localidad" TEXT,
    "foto_perfil" TEXT,
    "fecha_nacimiento" DATETIME,
    "telefono" TEXT,
    "genero" TEXT,
    "cedula" TEXT,
    "passhash" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'TURISTA',
    "sub" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "organizador" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre_organizacion" TEXT NOT NULL,
    "rut_ruc" TEXT,
    "departamento" TEXT,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "sitio_web" TEXT,
    "passhash" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "motivo_rechazo" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acepta_terminos" BOOLEAN NOT NULL DEFAULT false,
    "acepta_privacidad" BOOLEAN NOT NULL DEFAULT false,
    "version_documentos" TEXT,
    "aceptado_en" DATETIME
);

-- CreateTable
CREATE TABLE "documento_organizador" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uri" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_organizador" INTEGER NOT NULL,
    CONSTRAINT "documento_organizador_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT
);

-- CreateTable
CREATE TABLE "localidad" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "latitud" REAL,
    "longitud" REAL,
    "icono" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PUBLICADO',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ubicacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "direccion" TEXT,
    "localidad" TEXT NOT NULL,
    "telefono" TEXT,
    "sitio_web" TEXT,
    "horario" TEXT,
    "latitud" REAL NOT NULL,
    "longitud" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PUBLICADO',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_categoria" INTEGER NOT NULL,
    CONSTRAINT "ubicacion_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recurso" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uri" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'IMAGEN',
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "id_ubicacion" INTEGER,
    "id_evento" INTEGER,
    "id_comentario" INTEGER,
    CONSTRAINT "recurso_id_comentario_fkey" FOREIGN KEY ("id_comentario") REFERENCES "comentario" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurso_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "recurso_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "comentario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "texto" TEXT,
    "calificacion" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_ubicacion" INTEGER NOT NULL,
    CONSTRAINT "comentario_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "comentario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorito" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_ubicacion" INTEGER NOT NULL,
    CONSTRAINT "favorito_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorito_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME,
    "lugar_evento" TEXT,
    "latitud" REAL,
    "longitud" REAL,
    "es_gratuito" BOOLEAN NOT NULL DEFAULT false,
    "precio" DECIMAL,
    "contacto" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'BORRADOR',
    "motivo_rechazo" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" DATETIME NOT NULL,
    "id_organizador" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,
    CONSTRAINT "evento_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "evento_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "solicitud_recuperacion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" DATETIME NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "id_usuario" INTEGER,
    "id_organizador" INTEGER,
    CONSTRAINT "solicitud_recuperacion_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "solicitud_recuperacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "empresa_transporte" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "sitio_web" TEXT
);

-- CreateTable
CREATE TABLE "horario_omnibus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "origen" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "hora_salida" DATETIME NOT NULL,
    "hora_llegada" DATETIME,
    "dias" TEXT NOT NULL,
    "tipo_servicio" TEXT NOT NULL,
    "precio" DECIMAL,
    "estado" TEXT NOT NULL DEFAULT 'PUBLICADO',
    "id_empresa" INTEGER NOT NULL,
    CONSTRAINT "horario_omnibus_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa_transporte" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cedula_key" ON "usuario"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_sub_key" ON "usuario"("sub");

-- CreateIndex
CREATE INDEX "usuario_email_idx" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_departamento_idx" ON "usuario"("departamento");

-- CreateIndex
CREATE UNIQUE INDEX "organizador_rut_ruc_key" ON "organizador"("rut_ruc");

-- CreateIndex
CREATE UNIQUE INDEX "organizador_email_key" ON "organizador"("email");

-- CreateIndex
CREATE INDEX "organizador_email_idx" ON "organizador"("email");

-- CreateIndex
CREATE INDEX "organizador_estado_idx" ON "organizador"("estado");

-- CreateIndex
CREATE INDEX "documento_organizador_id_organizador_idx" ON "documento_organizador"("id_organizador");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_key" ON "categoria"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "localidad_slug_key" ON "localidad"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "localidad_nombre_key" ON "localidad"("nombre");

-- CreateIndex
CREATE INDEX "localidad_estado_nombre_idx" ON "localidad"("estado", "nombre");

-- CreateIndex
CREATE INDEX "ubicacion_nombre_idx" ON "ubicacion"("nombre");

-- CreateIndex
CREATE INDEX "ubicacion_localidad_idx" ON "ubicacion"("localidad");

-- CreateIndex
CREATE INDEX "ubicacion_id_categoria_estado_idx" ON "ubicacion"("id_categoria", "estado");

-- CreateIndex
CREATE INDEX "recurso_id_ubicacion_idx" ON "recurso"("id_ubicacion");

-- CreateIndex
CREATE INDEX "recurso_id_evento_idx" ON "recurso"("id_evento");

-- CreateIndex
CREATE INDEX "recurso_id_comentario_idx" ON "recurso"("id_comentario");

-- CreateIndex
CREATE INDEX "comentario_id_ubicacion_estado_idx" ON "comentario"("id_ubicacion", "estado");

-- CreateIndex
CREATE INDEX "comentario_id_usuario_idx" ON "comentario"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "comentario_id_usuario_id_ubicacion_key" ON "comentario"("id_usuario", "id_ubicacion");

-- CreateIndex
CREATE INDEX "favorito_id_usuario_idx" ON "favorito"("id_usuario");

-- CreateIndex
CREATE INDEX "favorito_id_ubicacion_idx" ON "favorito"("id_ubicacion");

-- CreateIndex
CREATE UNIQUE INDEX "favorito_id_usuario_id_ubicacion_key" ON "favorito"("id_usuario", "id_ubicacion");

-- CreateIndex
CREATE INDEX "evento_estado_inicio_idx" ON "evento"("estado", "inicio");

-- CreateIndex
CREATE INDEX "evento_id_organizador_idx" ON "evento"("id_organizador");

-- CreateIndex
CREATE INDEX "evento_id_categoria_idx" ON "evento"("id_categoria");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_recuperacion_token_key" ON "solicitud_recuperacion"("token");

-- CreateIndex
CREATE INDEX "solicitud_recuperacion_fecha_expiracion_idx" ON "solicitud_recuperacion"("fecha_expiracion");

-- CreateIndex
CREATE INDEX "solicitud_recuperacion_id_usuario_idx" ON "solicitud_recuperacion"("id_usuario");

-- CreateIndex
CREATE INDEX "solicitud_recuperacion_id_organizador_idx" ON "solicitud_recuperacion"("id_organizador");

-- CreateIndex
CREATE UNIQUE INDEX "empresa_transporte_nombre_key" ON "empresa_transporte"("nombre");

-- CreateIndex
CREATE INDEX "horario_omnibus_origen_destino_idx" ON "horario_omnibus"("origen", "destino");

-- CreateIndex
CREATE INDEX "horario_omnibus_id_empresa_idx" ON "horario_omnibus"("id_empresa");

-- CreateIndex
CREATE INDEX "horario_omnibus_tipo_servicio_idx" ON "horario_omnibus"("tipo_servicio");

-- CreateIndex
CREATE INDEX "horario_omnibus_estado_idx" ON "horario_omnibus"("estado");
