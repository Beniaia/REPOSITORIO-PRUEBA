import { NextResponse } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/server";
import { buscarRespuestaGmail } from "@/lib/gmail";
import { registrarRespuestaDetectada } from "@/lib/respuestas/registrar-respuesta";

/**
 * Cron diario de Vercel (P-15): recorre los primeros emails ya enviados sin
 * respuesta registrada, busca en Gmail si el contacto ha respondido, y
 * registra lo que encuentra. Nunca confirma fecha de reunión ni envía nada
 * (D-18) — sólo deja el lead listo para que una persona lo haga.
 */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = crearClienteServicio();

  const { data: pendientes, error } = await supabase
    .from("mensajes")
    .select("id, enviado_en, leads(contactos(email))")
    .eq("tipo", "email_1")
    .eq("estado", "enviado")
    .is("respondido_en", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let revisados = 0;
  let encontradas = 0;
  const errores: string[] = [];

  for (const mensaje of pendientes ?? []) {
    const lead = mensaje.leads as unknown as { contactos: { email: string | null } | null } | null;
    const contactoEmail = lead?.contactos?.email;
    if (!contactoEmail || !mensaje.enviado_en) continue;

    revisados++;
    try {
      const resultado = await buscarRespuestaGmail({
        contactoEmail,
        desde: new Date(mensaje.enviado_en),
      });

      if (resultado.encontrada) {
        await registrarRespuestaDetectada(supabase, {
          mensajeId: mensaje.id,
          extracto: resultado.extracto ?? "",
          actor: "cron_deteccion_respuestas",
          actorTipo: "agente",
        });
        encontradas++;
      }
    } catch (errorBusqueda) {
      errores.push(errorBusqueda instanceof Error ? errorBusqueda.message : "Error desconocido.");
    }
  }

  return NextResponse.json({ revisados, encontradas, errores });
}
