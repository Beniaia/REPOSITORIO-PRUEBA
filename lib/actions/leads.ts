"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email/enviar";
import { crearReunionZoom } from "@/lib/zoom";
import { crearEventoCalendar } from "@/lib/google-calendar";
import { madridADateUTC } from "@/lib/fecha-madrid";
import { registrarRespuestaDetectada } from "@/lib/respuestas/registrar-respuesta";

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

/**
 * Registra que el lead ha respondido al primer contacto (P-15, registrado a
 * mano hasta que exista detección automática). Deja el lead listo para que
 * una persona confirme la fecha de la reunión.
 */
export async function registrarRespuestaLead(mensajeId: string, leadId: string, formData: FormData) {
  const extracto = String(formData.get("extracto") ?? "");
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await registrarRespuestaDetectada(supabase, {
    mensajeId,
    extracto,
    actor: user?.email ?? "desconocido",
    actorTipo: "humano",
  });

  revalidatePath(`/leads/${leadId}`);
}

/**
 * Confirma la fecha de la reunión que ha propuesto una persona tras leer la
 * respuesta del lead (D-18: la fecha la lee y confirma un humano, nunca un
 * parser de texto libre). A partir de ahí todo es automático: crea la
 * reunión de Zoom, el evento de Google Calendar, y envía el email de
 * invitación sin pedir otra aprobación — es la única excepción a la regla 1
 * de CLAUDE.md, documentada como D-17.
 */
export async function confirmarFechaReunion(leadId: string, formData: FormData) {
  const fecha = String(formData.get("fecha") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const fechaHoraLocal = fecha && hora ? `${fecha}T${hora}` : "";
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorEmail = user?.email ?? "desconocido";

  const { data: lead } = await supabase
    .from("leads")
    .select("*, empresas(nombre), contactos(nombre, email)")
    .eq("id", leadId)
    .single();

  const contacto = lead?.contactos as unknown as { nombre: string | null; email: string | null } | null;
  const empresa = lead?.empresas as unknown as { nombre: string | null } | null;

  if (!lead || !contacto?.email || !fechaHoraLocal) {
    await registrarAuditoria(supabase, actorEmail, "error_confirmar_reunion", "leads", leadId, {
      motivo: !fechaHoraLocal ? "Falta la fecha." : "El lead no tiene email de contacto.",
    });
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  // Evita crear una segunda reunión (y un segundo email real) si el formulario
  // se envía dos veces seguidas — doble clic o reenvío accidental.
  const { data: reunionYaConfirmada } = await supabase
    .from("reuniones")
    .select("id")
    .eq("lead_id", leadId)
    .eq("estado", "confirmada")
    .maybeSingle();

  if (reunionYaConfirmada) {
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  const inicio = madridADateUTC(fechaHoraLocal);
  const nombreEmpresa = empresa?.nombre ?? "vuestra empresa";
  const tema = `Baladre Cerámica × ${nombreEmpresa}`;

  let zoom: { zoomUrl: string; zoomMeetingId: string };
  let calendar: { calendarEventId: string };
  try {
    zoom = await crearReunionZoom({ tema, inicio });
    calendar = await crearEventoCalendar({
      titulo: tema,
      descripcion: `Videollamada de 15 minutos entre Baladre Cerámica y ${nombreEmpresa}.\n\nEnlace de Zoom: ${zoom.zoomUrl}`,
      inicio,
      invitadoEmail: contacto.email,
    });
  } catch (error) {
    await registrarAuditoria(supabase, actorEmail, "error_confirmar_reunion", "leads", leadId, {
      error: error instanceof Error ? error.message : "Error desconocido creando Zoom/Calendar.",
    });
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  const { data: reunionExistente } = await supabase
    .from("reuniones")
    .select("id")
    .eq("lead_id", leadId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const datosReunion = {
    lead_id: leadId,
    fecha_hora: inicio.toISOString(),
    zoom_url: zoom.zoomUrl,
    zoom_meeting_id: zoom.zoomMeetingId,
    calendar_event_id: calendar.calendarEventId,
    estado: "confirmada",
    confirmado_por: actorEmail,
    confirmado_en: new Date().toISOString(),
  };

  if (reunionExistente) {
    await supabase.from("reuniones").update(datosReunion).eq("id", reunionExistente.id);
  } else {
    await supabase.from("reuniones").insert(datosReunion);
  }

  await supabase.from("leads").update({ estado: "reunion" }).eq("id", leadId);

  const fechaLegible = inicio.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
    timeStyle: "short",
  });

  const asunto = "Confirmada: vuestra videollamada con Baladre";
  const cuerpo = `Hola ${contacto.nombre ?? ""},

Confirmada la videollamada del ${fechaLegible} (hora de España).

Enlace de Zoom: ${zoom.zoomUrl}

Este correo lo envía automáticamente el asistente de IA de Baladre Cerámica en cuanto se confirma una fecha, sin revisión manual previa.

Un saludo,
Baladre Cerámica
(Si no quieres recibir más correos, respóndenos indicándolo y te damos de baja de forma permanente.)`;

  const { data: mensajeCreado } = await supabase
    .from("mensajes")
    .insert({
      lead_id: leadId,
      tipo: "invitacion_reunion",
      asunto,
      cuerpo,
      estado: "borrador",
      enviado_automaticamente: true,
    })
    .select("id")
    .single();

  if (!mensajeCreado) {
    revalidatePath(`/leads/${leadId}`);
    return;
  }

  try {
    const proveedorId = await enviarEmail({ para: contacto.email, asunto, cuerpo });
    await supabase
      .from("mensajes")
      .update({ estado: "enviado", enviado_en: new Date().toISOString(), proveedor_id: proveedorId })
      .eq("id", mensajeCreado.id);
    await registrarAuditoria(supabase, actorEmail, "confirmar_fecha_reunion", "reuniones", leadId, {
      zoom_meeting_id: zoom.zoomMeetingId,
      calendar_event_id: calendar.calendarEventId,
      proveedor_id: proveedorId,
    });
  } catch (errorEnvio) {
    await supabase.from("mensajes").update({ estado: "error" }).eq("id", mensajeCreado.id);
    await registrarAuditoria(supabase, actorEmail, "error_envio_invitacion_reunion", "mensajes", mensajeCreado.id, {
      lead_id: leadId,
      error: errorEnvio instanceof Error ? errorEnvio.message : "Error desconocido al enviar.",
    });
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}

/**
 * Elimina el lead de forma permanente (sus emails y su reunión se borran en
 * cascada, ver `on delete cascade` en el esquema). La empresa y el contacto
 * no se tocan, sólo esta línea de lead. Se audita antes de borrar, porque
 * `entidad_id` en `auditoria` no exige que la fila siga existiendo.
 */
export async function borrarLead(leadId: string) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead } = await supabase
    .from("leads")
    .select("empresas(nombre), contactos(email)")
    .eq("id", leadId)
    .single();

  const empresa = (lead?.empresas as unknown as { nombre: string | null } | null)?.nombre;
  const contactoEmail = (lead?.contactos as unknown as { email: string | null } | null)?.email;

  await registrarAuditoria(supabase, user?.email, "borrar_lead", "leads", leadId, {
    empresa,
    contacto_email: contactoEmail,
  });

  await supabase.from("leads").delete().eq("id", leadId);

  revalidatePath("/leads");
  redirect("/leads");
}
