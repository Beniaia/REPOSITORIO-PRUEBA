import { z } from "zod";

export const empresaSchema = z.object({
  nombre: z.string().min(1),
  segmento: z.enum([
    "arquitectura",
    "agencia",
    "grupo_comunicacion",
    "hotel",
    "restauracion",
    "joyeria",
    "otro",
  ]),
  web: z.string().url().optional(),
  dominio: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  comunidad: z.string().optional(),
  pais: z.string().optional(),
  telefono: z.string().optional(),
  email_generico: z.string().email().optional(),
  linkedin_url: z.string().url().optional(),
  instagram: z.string().optional(),
  tamano_estimado: z.string().optional(),
  fuente: z.string().min(1),
  fuente_url: z.string().url().optional(),
  notas: z.string().optional(),
});

export const contactoSchema = z.object({
  nombre: z.string().optional(),
  apellidos: z.string().optional(),
  cargo: z.string().optional(),
  rol_decision: z.enum(["decisor", "prescriptor", "gatekeeper", "desconocido"]).optional(),
  email: z.string().email().optional(),
  email_estado: z.enum(["verificado", "probable", "generico", "no_encontrado"]).optional(),
  email_fuente: z.string().optional(),
  telefono: z.string().optional(),
  linkedin_url: z.string().url().optional(),
  fuente_url: z.string().url().optional(),
});

// Sin URL no es una señal — regla dura del proyecto (CLAUDE.md regla 2).
export const senalSchema = z.object({
  tipo: z.string().min(1),
  titulo: z.string().min(1),
  resumen: z.string().optional(),
  url: z.string().url(),
  fecha: z.string().optional(),
  peso: z.number().int().min(0).max(25).optional(),
});

export const scoreSchema = z.object({
  puntuacion: z.number().int().min(0).max(100),
  nivel: z.enum(["A", "B", "C", "descartado"]),
  desglose: z.record(z.number()),
  motivo: z.string().min(1),
  modelo: z.string().optional(),
});

export const mensajeSchema = z.object({
  tipo: z.enum(["email_1", "seguimiento_1", "seguimiento_2", "invitacion_reunion", "manual"]),
  asunto: z.string().min(1),
  cuerpo: z.string().min(1),
  angulo: z.string().optional(),
});

export const leadIngestSchema = z.object({
  empresa: empresaSchema,
  contacto: contactoSchema.optional(),
  senales: z.array(senalSchema).default([]),
  score: scoreSchema,
  // El motor SÓLO puede crear borradores. Marcar como enviado exige el botón
  // "Contactar" desde la app, nunca la ingesta (CLAUDE.md regla 1).
  mensajes: z.array(mensajeSchema).default([]),
});

export const loteIngestSchema = z.object({
  ejecucion: z
    .object({
      tipo: z.enum(["semanal", "manual", "reenriquecimiento"]).default("manual"),
      parametros: z.record(z.unknown()).optional(),
      coste_estimado: z.number().optional(),
    })
    .optional(),
  leads: z.array(leadIngestSchema).min(1),
});

export type LoteIngest = z.infer<typeof loteIngestSchema>;
export type LeadIngest = z.infer<typeof leadIngestSchema>;
