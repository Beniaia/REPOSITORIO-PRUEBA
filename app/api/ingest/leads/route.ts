import { NextResponse } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/server";
import { loteIngestSchema } from "@/lib/schemas/ingest";
import { procesarLote } from "@/lib/ingest/procesar-lote";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token || token !== process.env.INGEST_SERVICE_TOKEN) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const cuerpo = await request.json().catch(() => null);
  const analizado = loteIngestSchema.safeParse(cuerpo);

  if (!analizado.success) {
    return NextResponse.json(
      { error: "Lote inválido.", detalles: analizado.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = crearClienteServicio();

  try {
    const resultado = await procesarLote(supabase, analizado.data);
    await supabase.from("auditoria").insert({
      actor: "agente",
      actor_id: "motor_prospeccion",
      accion: "ingesta_lote",
      entidad: "ejecuciones",
      entidad_id: resultado.ejecucion_id,
      despues: resultado,
    });
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 },
    );
  }
}
