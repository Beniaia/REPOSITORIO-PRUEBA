"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";

async function registrarAuditoria(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  actorEmail: string | undefined,
  accion: string,
  entidad: string,
  entidadId: string,
  despues: Record<string, unknown>,
) {
  await supabase.from("auditoria").insert({
    actor: "humano",
    actor_id: actorEmail ?? "desconocido",
    accion,
    entidad,
    entidad_id: entidadId,
    despues,
  });
}

/**
 * Registra que una persona ha llamado por teléfono al lead y ha pedido
 * permiso para escribirle. Requisito legal previo al primer contacto
 * (CLAUDE.md, D-19) — sin esto el trigger de la base de datos bloquea el envío.
 */
export async function confirmarPermisoLlamada(leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("leads")
    .update({
      permiso_llamada_en: new Date().toISOString(),
      permiso_llamada_por: user?.email ?? "desconocido",
    })
    .eq("id", leadId);

  if (!error) {
    await registrarAuditoria(supabase, user?.email, "confirmar_permiso_llamada", "leads", leadId, {
      permiso_llamada_por: user?.email,
    });
  }

  revalidatePath(`/leads/${leadId}`);
}

/** Aprueba un mensaje en borrador: queda listo para el botón "Contactar". */
export async function aprobarMensaje(mensajeId: string, leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("mensajes")
    .update({
      estado: "aprobado",
      aprobado_por: user?.email ?? "desconocido",
      aprobado_en: new Date().toISOString(),
    })
    .eq("id", mensajeId);

  if (!error) {
    await registrarAuditoria(supabase, user?.email, "aprobar_mensaje", "mensajes", mensajeId, {
      aprobado_por: user?.email,
    });
  }

  revalidatePath(`/leads/${leadId}`);
}

export async function rechazarMensaje(mensajeId: string, leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("mensajes")
    .update({ estado: "rechazado" })
    .eq("id", mensajeId);

  if (!error) {
    await registrarAuditoria(supabase, user?.email, "rechazar_mensaje", "mensajes", mensajeId, {});
  }

  revalidatePath(`/leads/${leadId}`);
}

/**
 * Botón "Contactar": el único punto del sistema que puede marcar un mensaje
 * como enviado para el primer contacto. Exige mensaje ya aprobado y permiso
 * de llamada registrado — ambos comprobados también por triggers en la BD.
 *
 * El envío real (Resend) todavía no está conectado (fase 4, P-01 pendiente):
 * esto registra la acción y la auditoría, no dispara un email real todavía.
 */
export async function marcarContactado(mensajeId: string, leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("mensajes")
    .update({ estado: "enviado", enviado_en: new Date().toISOString() })
    .eq("id", mensajeId);

  if (!error) {
    await supabase.from("leads").update({ estado: "enviado" }).eq("id", leadId);
    await registrarAuditoria(supabase, user?.email, "marcar_contactado", "mensajes", mensajeId, {
      lead_id: leadId,
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
