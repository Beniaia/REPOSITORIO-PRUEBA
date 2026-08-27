import { NextResponse } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/server";
import { respuestaDetectadaSchema } from "@/lib/schemas/deteccion-respuestas";
import { registrarRespuestaDetectada } from "@/lib/respuestas/registrar-respuesta";

function autorizado(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  return Boolean(token) && token === process.env.INGEST_SERVICE_TOKEN;
}

/**
 * Lista los emails de primer contacto ya enviados que siguen sin respuesta
 * registrada. La rutina de detección (P-15) los recorre y busca en Gmail una
 * respuesta del contacto posterior a `enviado_en`.
 */
export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = crearClienteServicio();
  const { data, error } = await supabase
    .from("mensajes")
    .select("id, lead_id, enviado_en, leads(contactos(email), empresas(nombre))")
    .eq("tipo", "email_1")
    .eq("estado", "enviado")
    .is("respondido_en", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pendientes = (data ?? []).map((mensaje) => {
    const lead = mensaje.leads as unknown as {
      contactos: { email: string | null } | null;
      empresas: { nombre: string | null } | null;
    } | null;

    return {
      mensaje_id: mensaje.id,
      lead_id: mensaje.lead_id,
      enviado_en: mensaje.enviado_en,
      contacto_email: lead?.contactos?.email ?? null,
      empresa_nombre: lead?.empresas?.nombre ?? null,
    };
  });

  return NextResponse.json({ pendientes });
}

/** Registra una respuesta que la rutina ha encontrado en Gmail. */
export async function POST(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const analizado = respuestaDetectadaSchema.safeParse(cuerpo);

  if (!analizado.success) {
    return NextResponse.json(
      { error: "Cuerpo inválido.", detalles: analizado.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = crearClienteServicio();

  try {
    const resultado = await registrarRespuestaDetectada(supabase, {
      mensajeId: analizado.data.mensaje_id,
      extracto: analizado.data.extracto,
      actor: "rutina_deteccion_respuestas",
      actorTipo: "agente",
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 },
    );
  }
}
