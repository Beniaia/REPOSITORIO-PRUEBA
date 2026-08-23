import { NextResponse } from "next/server";
import { crearClienteServicio } from "@/lib/supabase/server";
import { bajaSchema } from "@/lib/schemas/baja";

export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const analizado = bajaSchema.safeParse(cuerpo);

  if (!analizado.success) {
    return NextResponse.json({ error: "Correo no válido." }, { status: 400 });
  }

  const supabase = crearClienteServicio();
  const { email } = analizado.data;

  const { error } = await supabase
    .from("bajas")
    .upsert({ email: email.toLowerCase(), origen: "pagina_baja" }, { onConflict: "email" });

  if (error) {
    return NextResponse.json({ error: "No se ha podido registrar la baja." }, { status: 500 });
  }

  await supabase.from("auditoria").insert({
    actor: "sistema",
    actor_id: "pagina_baja",
    accion: "alta_baja",
    entidad: "bajas",
    despues: { email: email.toLowerCase() },
  });

  return NextResponse.json({ ok: true });
}
