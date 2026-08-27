"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { madridADateUTC } from "@/lib/fecha-madrid";

async function registrarAuditoria(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  actorEmail: string | undefined,
  accion: string,
  entidadId: string,
  despues: Record<string, unknown>,
) {
  await supabase.from("auditoria").insert({
    actor: "humano",
    actor_id: actorEmail ?? "desconocido",
    accion,
    entidad: "solicitudes_prospeccion",
    entidad_id: entidadId,
    despues,
  });
}

/**
 * Pide que se prospecte una tanda ahora mismo. No busca nada por sí misma —
 * sólo dejar la solicitud en `pendiente` para que el motor (skill en Claude)
 * la recoja la próxima vez que se ejecute (CLAUDE.md §1).
 */
export async function solicitarProspeccionInmediata(numeroLeads: number) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("solicitudes_prospeccion")
    .insert({
      tipo: "inmediata",
      numero_leads: numeroLeads,
      solicitado_por: user?.email ?? "desconocido",
    })
    .select("id")
    .single();

  if (!error && data) {
    await registrarAuditoria(supabase, user?.email, "solicitar_prospeccion_inmediata", data.id, {
      numero_leads: numeroLeads,
    });
  }

  revalidatePath("/campanas");
}

/** Programa una tanda para una fecha y hora que elige la propia persona — nunca una fecha fija de cron. */
export async function solicitarProspeccionProgramada(formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const numeroLeads = Number(formData.get("numero_leads") ?? 10);
  const fechaHoraLocal = fecha && hora ? `${fecha}T${hora}` : "";

  if (!fechaHoraLocal) return;

  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const paraCuando = madridADateUTC(fechaHoraLocal);

  const { data, error } = await supabase
    .from("solicitudes_prospeccion")
    .insert({
      tipo: "programada",
      numero_leads: numeroLeads,
      para_cuando: paraCuando.toISOString(),
      solicitado_por: user?.email ?? "desconocido",
    })
    .select("id")
    .single();

  if (!error && data) {
    await registrarAuditoria(supabase, user?.email, "solicitar_prospeccion_programada", data.id, {
      numero_leads: numeroLeads,
      para_cuando: paraCuando.toISOString(),
    });
  }

  revalidatePath("/campanas");
}

/** Cancela una solicitud que todavía no se ha atendido. */
export async function cancelarSolicitudProspeccion(solicitudId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("solicitudes_prospeccion")
    .update({ estado: "cancelada" })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");

  if (!error) {
    await registrarAuditoria(supabase, user?.email, "cancelar_solicitud_prospeccion", solicitudId, {});
  }

  revalidatePath("/campanas");
}
