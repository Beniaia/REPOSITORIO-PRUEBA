import type { SupabaseClient } from "@supabase/supabase-js";

export type ResultadoRegistroRespuesta = {
  ya_registrado: boolean;
};

/**
 * Registra que un lead ha respondido al primer contacto: la misma escritura
 * tanto si la detecta una persona desde la ficha (`registrarRespuestaLead`)
 * como si la detecta la rutina automática de Gmail (P-15, endpoint
 * `/api/deteccion-respuestas`). La fecha de la reunión la sigue confirmando
 * siempre un humano (D-18) — esto sólo deja la reunión en estado `propuesta`.
 */
export async function registrarRespuestaDetectada(
  supabase: SupabaseClient,
  params: { mensajeId: string; extracto: string; actor: string; actorTipo: "humano" | "agente" },
): Promise<ResultadoRegistroRespuesta> {
  const { mensajeId, extracto, actor, actorTipo } = params;

  const { data: mensaje } = await supabase
    .from("mensajes")
    .select("lead_id, respondido_en")
    .eq("id", mensajeId)
    .single();

  if (!mensaje) {
    throw new Error("El mensaje no existe.");
  }

  if (mensaje.respondido_en) {
    return { ya_registrado: true };
  }

  const leadId = mensaje.lead_id as string;

  const { data: lead } = await supabase
    .from("leads")
    .select("contactos(email)")
    .eq("id", leadId)
    .single();
  const emailContacto = (lead?.contactos as unknown as { email: string | null } | null)?.email;

  await supabase
    .from("mensajes")
    .update({
      respondido_en: new Date().toISOString(),
      respuesta_extracto: extracto.slice(0, 500),
      respuesta_de: emailContacto,
    })
    .eq("id", mensajeId);

  await supabase.from("leads").update({ estado: "respondido" }).eq("id", leadId);

  const { data: reunionExistente } = await supabase
    .from("reuniones")
    .select("id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!reunionExistente) {
    await supabase.from("reuniones").insert({ lead_id: leadId, estado: "propuesta" });
  }

  await supabase.from("auditoria").insert({
    actor: actorTipo,
    actor_id: actor,
    accion: "registrar_respuesta_lead",
    entidad: "mensajes",
    entidad_id: mensajeId,
    despues: { lead_id: leadId },
  });

  return { ya_registrado: false };
}
