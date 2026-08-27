import { z } from "zod";

/** Cuerpo que envía la rutina de detección de respuestas (P-15) al encontrar una. */
export const respuestaDetectadaSchema = z.object({
  mensaje_id: z.string().uuid(),
  extracto: z.string().min(1).max(2000),
});

export type RespuestaDetectada = z.infer<typeof respuestaDetectadaSchema>;
