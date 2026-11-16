-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('TURISTA', 'ADMINISTRADOR');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('masculino', 'femenino', 'otro');

-- CreateEnum
CREATE TYPE "RecursoTipo" AS ENUM ('VIDEO', 'IMAGEN');

-- CreateEnum
CREATE TYPE "EstadoContenido" AS ENUM ('PUBLICADO', 'OCULTADO');

-- CreateEnum
CREATE TYPE "EstadoComentario" AS ENUM ('PENDIENTE_REVISION', 'PUBLICADO', 'OCULTADO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('BORRADOR', 'PENDIENTE_REVISION', 'PUBLICADO', 'RECHAZADO', 'CANCELADO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "EstadoOrganizador" AS ENUM ('PENDIENTE_REVISION', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "DocumentoTipo" AS ENUM ('CEDULA_FRENTE', 'CEDULA_DORSO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoServicioTransporte" AS ENUM ('DEPARTAMENTAL', 'INTERDEPARTAMENTAL');

-- CreateEnum
CREATE TYPE "TipoVerificacion" AS ENUM ('TURISTA', 'ORGANIZADOR');

-- CreateEnum
CREATE TYPE "EstadoAcceso" AS ENUM ('ACTIVO', 'BLOQUEADO', 'ELIMINADO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombres" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT true,
    "estado_acceso" "EstadoAcceso" NOT NULL DEFAULT 'ACTIVO',
    "version_sesion" INTEGER NOT NULL DEFAULT 0,
    "departamento" VARCHAR(100),
    "localidad" VARCHAR(120),
    "foto_perfil" VARCHAR(255),
    "fecha_nacimiento" DATE,
    "telefono" VARCHAR(30),
    "genero" "Genero",
    "cedula" VARCHAR(8),
    "passhash" VARCHAR(255),
    "rol" "Rol" NOT NULL DEFAULT 'TURISTA',
    "sub" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizador" (
    "id" SERIAL NOT NULL,
    "nombre_organizacion" VARCHAR(150) NOT NULL,
    "rut_ruc" VARCHAR(30),
    "departamento" VARCHAR(100),
    "email" TEXT NOT NULL,
    "email_verificado" BOOLEAN NOT NULL DEFAULT true,
    "estado_acceso" "EstadoAcceso" NOT NULL DEFAULT 'ACTIVO',
    "version_sesion" INTEGER NOT NULL DEFAULT 0,
    "telefono" VARCHAR(30) NOT NULL,
    "sitio_web" VARCHAR(500),
    "passhash" VARCHAR(255) NOT NULL,
    "estado" "EstadoOrganizador" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "motivo_rechazo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acepta_terminos" BOOLEAN NOT NULL DEFAULT false,
    "acepta_privacidad" BOOLEAN NOT NULL DEFAULT false,
    "version_documentos" VARCHAR(40),
    "aceptado_en" TIMESTAMP(3),

    CONSTRAINT "organizador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento_organizador" (
    "id" SERIAL NOT NULL,
    "uri" VARCHAR(2048) NOT NULL,
    "tipo" "DocumentoTipo" NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_organizador" INTEGER NOT NULL,

    CONSTRAINT "documento_organizador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" VARCHAR(255),

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "localidad" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(500),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "icono" VARCHAR(255),
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ubicacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "direccion" VARCHAR(255),
    "localidad" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(30),
    "sitio_web" VARCHAR(500),
    "horario" VARCHAR(255),
    "latitud" DECIMAL(10,7) NOT NULL,
    "longitud" DECIMAL(10,7) NOT NULL,
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_categoria" INTEGER NOT NULL,

    CONSTRAINT "ubicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso" (
    "id" SERIAL NOT NULL,
    "uri" VARCHAR(2048) NOT NULL,
    "tipo" "RecursoTipo" NOT NULL DEFAULT 'IMAGEN',
    "descripcion" VARCHAR(255),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "id_ubicacion" INTEGER,
    "id_evento" INTEGER,
    "id_comentario" INTEGER,

    CONSTRAINT "recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentario" (
    "id" SERIAL NOT NULL,
    "texto" TEXT,
    "calificacion" SMALLINT NOT NULL,
    "estado" "EstadoComentario" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_ubicacion" INTEGER NOT NULL,

    CONSTRAINT "comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorito" (
    "id" SERIAL NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_usuario" INTEGER NOT NULL,
    "id_ubicacion" INTEGER NOT NULL,

    CONSTRAINT "favorito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" SERIAL NOT NULL,
    "titulo" VARCHAR(180) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "lugar_evento" VARCHAR(255),
    "latitud" DECIMAL(10,7),
    "longitud" DECIMAL(10,7),
    "es_gratuito" BOOLEAN NOT NULL DEFAULT false,
    "precio" DECIMAL(10,2),
    "contacto" VARCHAR(255),
    "estado" "EstadoEvento" NOT NULL DEFAULT 'BORRADOR',
    "motivo_rechazo" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,
    "id_organizador" INTEGER NOT NULL,
    "id_categoria" INTEGER NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_recuperacion" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "id_usuario" INTEGER,
    "id_organizador" INTEGER,

    CONSTRAINT "solicitud_recuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa_transporte" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30),
    "sitio_web" VARCHAR(500),

    CONSTRAINT "empresa_transporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horario_omnibus" (
    "id" SERIAL NOT NULL,
    "origen" VARCHAR(120) NOT NULL,
    "destino" VARCHAR(120) NOT NULL,
    "hora_salida" TIME(0) NOT NULL,
    "hora_llegada" TIME(0),
    "dias" VARCHAR(100) NOT NULL,
    "tipo_servicio" "TipoServicioTransporte" NOT NULL,
    "precio" DECIMAL(10,2),
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "id_empresa" INTEGER NOT NULL,

    CONSTRAINT "horario_omnibus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificacion_correo" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "tipo" "TipoVerificacion" NOT NULL,
    "codigo_hash" VARCHAR(64) NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "enviado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intentos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "verificacion_correo_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "verificacion_correo_email_key" ON "verificacion_correo"("email");

-- CreateIndex
CREATE INDEX "verificacion_correo_expira_en_idx" ON "verificacion_correo"("expira_en");

-- AddForeignKey
ALTER TABLE "documento_organizador" ADD CONSTRAINT "documento_organizador_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ubicacion" ADD CONSTRAINT "ubicacion_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso" ADD CONSTRAINT "recurso_id_comentario_fkey" FOREIGN KEY ("id_comentario") REFERENCES "comentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso" ADD CONSTRAINT "recurso_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso" ADD CONSTRAINT "recurso_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_id_ubicacion_fkey" FOREIGN KEY ("id_ubicacion") REFERENCES "ubicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorito" ADD CONSTRAINT "favorito_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_categoria_fkey" FOREIGN KEY ("id_categoria") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento" ADD CONSTRAINT "evento_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_recuperacion" ADD CONSTRAINT "solicitud_recuperacion_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "organizador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_recuperacion" ADD CONSTRAINT "solicitud_recuperacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horario_omnibus" ADD CONSTRAINT "horario_omnibus_id_empresa_fkey" FOREIGN KEY ("id_empresa") REFERENCES "empresa_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El acceso de la aplicacion pasa por el Worker y Prisma.
ALTER TABLE public."usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."organizador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."documento_organizador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."localidad" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ubicacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."recurso" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."comentario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."favorito" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."evento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."solicitud_recuperacion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."empresa_transporte" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."horario_omnibus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."verificacion_correo" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."usuario", public."organizador", public."documento_organizador", public."categoria", public."localidad", public."ubicacion", public."recurso", public."comentario", public."favorito", public."evento", public."solicitud_recuperacion", public."empresa_transporte", public."horario_omnibus", public."verificacion_correo" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public."usuario", public."organizador", public."documento_organizador", public."categoria", public."localidad", public."ubicacion", public."recurso", public."comentario", public."favorito", public."evento", public."solicitud_recuperacion", public."empresa_transporte", public."horario_omnibus", public."verificacion_correo" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public."usuario", public."organizador", public."documento_organizador", public."categoria", public."localidad", public."ubicacion", public."recurso", public."comentario", public."favorito", public."evento", public."solicitud_recuperacion", public."empresa_transporte", public."horario_omnibus", public."verificacion_correo" FROM authenticated;
  END IF;
END $$;
