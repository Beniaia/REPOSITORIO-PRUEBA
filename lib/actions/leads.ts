"use server";

import { revalidatePath } from "next/cache";
import { crearClienteServidor } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email/enviar";

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
 * como enviado y disparar el envío real. Primero se intenta el UPDATE a
 * `estado='enviado'` — ahí es donde disparan los triggers de la base de
 * datos (permiso de llamada, lista de bajas, aprobación). Sólo si esa
 * actualización tiene éxito de verdad se llama a `enviarEmail`: así nunca
 * se envía nada que la base de datos habría rechazado.
 */
export async function marcarContactado(mensajeId: string, leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead } = await supabase
    .from("leads")
    .select("contactos(email)")
    .eq("id", leadId)
    .single();

  const emailContacto = (
    lead?.contactos as unknown as { email: string | null } | null
  )?.email;

  if (!emailContacto) {
    await registrarAuditoria(supabase, user?.email, "error_envio_email", "mensajes", mensajeId, {
      lead_id: leadId,
      motivo: "El lead no tiene email de contacto.",
    });
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  const { data: mensaje, error: errorActualizacion } = await supabase
    .from("mensajes")
    .update({ estado: "enviado", enviado_en: new Date().toISOString() })
    .eq("id", mensajeId)
    .select("asunto, cuerpo")
    .single();

  if (errorActualizacion || !mensaje) {
    // Un guardarraíl de la base de datos ha rechazado el envío: nunca se llega a enviar el email.
    await registrarAuditoria(
      supabase,
      user?.email,
      "error_marcar_contactado",
      "mensajes",
      mensajeId,
      { error: errorActualizacion?.message ?? "desconocido" },
    );
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  try {
    const proveedorId = await enviarEmail({
      para: emailContacto,
      asunto: mensaje.asunto,
      cuerpo: mensaje.cuerpo,
    });

    await supabase.from("mensajes").update({ proveedor_id: proveedorId }).eq("id", mensajeId);
    await supabase.from("leads").update({ estado: "enviado" }).eq("id", leadId);
    await registrarAuditoria(supabase, user?.email, "marcar_contactado", "mensajes", mensajeId, {
      lead_id: leadId,
      proveedor_id: proveedorId,
    });
  } catch (errorEnvio) {
    // La base de datos ya decía "enviado" pero el correo no salió de verdad:
    // se corrige el estado a 'error' para que se pueda reintentar.
    const mensajeError =
      errorEnvio instanceof Error ? errorEnvio.message : "Error desconocido al enviar.";
    await supabase.from("mensajes").update({ estado: "error" }).eq("id", mensajeId);
    await registrarAuditoria(supabase, user?.email, "error_envio_email", "mensajes", mensajeId, {
      lead_id: leadId,
      error: mensajeError,
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
