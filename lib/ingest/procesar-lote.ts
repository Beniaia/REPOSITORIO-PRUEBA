import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadIngest, LoteIngest } from "@/lib/schemas/ingest";

export type ResultadoLote = {
  ejecucion_id: string;
  leads_nuevos: number;
  leads_duplicados: number;
  leads_en_baja: number;
};

/**
 * Inserta un lote validado del motor. Deduplica por dominio de empresa y por
 * email de contacto, y descarta cualquier contacto presente en `bajas` antes
 * de escribir nada (regla 4, CLAUDE.md — "la lista de bajas manda").
 */
export async function procesarLote(
  supabase: SupabaseClient,
  lote: LoteIngest,
): Promise<ResultadoLote> {
  const { data: ejecucion, error: errorEjecucion } = await supabase
    .from("ejecuciones")
    .insert({
      tipo: lote.ejecucion?.tipo ?? "manual",
      parametros: lote.ejecucion?.parametros ?? null,
      coste_estimado: lote.ejecucion?.coste_estimado ?? null,
    })
    .select("id")
    .single();

  if (errorEjecucion || !ejecucion) {
    throw new Error(`No se ha podido registrar la ejecución: ${errorEjecucion?.message}`);
  }

  let nuevos = 0;
  let duplicados = 0;
  let enBaja = 0;

  for (const item of lote.leads) {
    const resultado = await procesarLead(supabase, item, ejecucion.id);
    if (resultado === "en_baja") enBaja++;
    else if (resultado === "duplicado") duplicados++;
    else nuevos++;
  }

  await supabase
    .from("ejecuciones")
    .update({ leads_nuevos: nuevos, leads_duplicados: duplicados })
    .eq("id", ejecucion.id);

  return {
    ejecucion_id: ejecucion.id,
    leads_nuevos: nuevos,
    leads_duplicados: duplicados,
    leads_en_baja: enBaja,
  };
}

async function procesarLead(
  supabase: SupabaseClient,
  item: LeadIngest,
  ejecucionId: string,
): Promise<"nuevo" | "duplicado" | "en_baja"> {
  const email = item.contacto?.email?.toLowerCase();
  const dominio = item.empresa.dominio?.toLowerCase();

  // La lista de bajas manda: se consulta en la ingesta (regla 4).
  if (email || dominio) {
    const condiciones = [
      email ? `email.eq.${email}` : null,
      dominio ? `dominio.eq.${dominio}` : null,
    ]
      .filter(Boolean)
      .join(",");
    const { data: baja } = await supabase.from("bajas").select("id").or(condiciones).maybeSingle();
    if (baja) return "en_baja";
  }

  const { data: empresa, error: errorEmpresa } = await supabase
    .from("empresas")
    .upsert(
      { ...item.empresa, dominio: dominio ?? null },
      { onConflict: "dominio", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (errorEmpresa || !empresa) {
    throw new Error(`No se ha podido guardar la empresa ${item.empresa.nombre}: ${errorEmpresa?.message}`);
  }

  let contactoId: string | null = null;
  if (item.contacto) {
    const { data: contacto, error: errorContacto } = await supabase
      .from("contactos")
      .upsert(
        { ...item.contacto, email: email ?? null, empresa_id: empresa.id },
        { onConflict: "empresa_id,email", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (errorContacto) {
      throw new Error(`No se ha podido guardar el contacto: ${errorContacto.message}`);
    }
    contactoId = contacto?.id ?? null;
  }

  if (item.senales.length > 0) {
    await supabase
      .from("senales")
      .insert(item.senales.map((s) => ({ ...s, empresa_id: empresa.id })));
  }

  await supabase.from("scores").insert({ ...item.score, empresa_id: empresa.id });

  const { data: leadExistente } = await supabase
    .from("leads")
    .select("id")
    .eq("empresa_id", empresa.id)
    .eq("contacto_id", contactoId)
    .maybeSingle();

  const esDuplicado = !!leadExistente;

  const { data: lead, error: errorLead } = await supabase
    .from("leads")
    .upsert(
      {
        empresa_id: empresa.id,
        contacto_id: contactoId,
        ejecucion_id: ejecucionId,
        estado: item.mensajes.length > 0 ? "borrador_listo" : "cualificado",
      },
      { onConflict: "empresa_id,contacto_id", ignoreDuplicates: false },
    )
    .select("id")
    .single();

  if (errorLead || !lead) {
    throw new Error(`No se ha podido guardar el lead: ${errorLead?.message}`);
  }

  // El motor sólo escribe borradores. Nunca puede marcar un mensaje como
  // enviado — eso exige el botón "Contactar" desde la app (regla 1).
  if (item.mensajes.length > 0) {
    await supabase.from("mensajes").insert(
      item.mensajes.map((m) => ({ ...m, lead_id: lead.id, estado: "borrador" })),
    );
  }

  return esDuplicado ? "duplicado" : "nuevo";
}
