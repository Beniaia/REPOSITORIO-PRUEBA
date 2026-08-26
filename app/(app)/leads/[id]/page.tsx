import Link from "next/link";
import { notFound } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import {
  confirmarPermisoLlamada,
  aprobarMensaje,
  rechazarMensaje,
  marcarContactado,
  registrarRespuestaLead,
  confirmarFechaReunion,
} from "@/lib/actions/leads";

export default async function PaginaFichaLead({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      `*, empresas(*), contactos(*), mensajes(*, senales(titulo, url, fecha)), reuniones(*)`,
    )
    .eq("id", id)
    .single();

  if (!lead) return notFound();

  const { data: ultimoScore } = await supabase
    .from("scores")
    .select("*")
    .eq("empresa_id", lead.empresa_id)
    .order("calculado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: senales } = await supabase
    .from("senales")
    .select("*")
    .eq("empresa_id", lead.empresa_id)
    .order("fecha", { ascending: false });

  const { data: bajaExistente } = await supabase
    .from("bajas")
    .select("id")
    .or(
      `email.eq.${lead.contactos?.email ?? "__ninguno__"},dominio.eq.${lead.empresas?.dominio ?? "__ninguno__"}`,
    )
    .maybeSingle();

  const mensajePrimerContacto = (lead.mensajes ?? []).find(
    (m: { tipo: string }) => m.tipo === "email_1",
  );

  const reunion = (lead.reuniones ?? [])[0] as
    | {
        id: string;
        fecha_hora: string | null;
        zoom_url: string | null;
        estado: string;
      }
    | undefined;

  const puedeContactar =
    !bajaExistente &&
    !!lead.permiso_llamada_en &&
    (mensajePrimerContacto?.estado === "aprobado" ||
      mensajePrimerContacto?.estado === "error");

  return (
    <div className="space-y-6">
      <Link href="/leads" className="text-sm text-tierra/60 hover:text-terracota">
        ← Volver a la bandeja
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-serif text-2xl text-tierra">{lead.empresas?.nombre}</h2>
          <p className="text-sm text-tierra/60">
            {lead.empresas?.segmento} · {lead.empresas?.provincia}{" "}
            {lead.empresas?.web ? (
              <>
                ·{" "}
                <a
                  href={lead.empresas.web}
                  target="_blank"
                  className="underline hover:text-terracota"
                >
                  web
                </a>
              </>
            ) : null}
          </p>
        </div>
        {bajaExistente ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
            De baja — no contactar nunca
          </span>
        ) : null}
      </div>

      {/* Contacto */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-3 font-medium text-tierra">Decisor</h3>
        {lead.contactos ? (
          <div className="text-sm text-tierra/80">
            <p className="font-medium text-tierra">
              {lead.contactos.nombre} {lead.contactos.apellidos}
            </p>
            <p>{lead.contactos.cargo}</p>
            <p>
              {lead.contactos.email}{" "}
              <span className="text-xs text-tierra/50">({lead.contactos.email_estado})</span>
            </p>
            {lead.contactos.fuente_url ? (
              <a
                href={lead.contactos.fuente_url}
                target="_blank"
                className="text-xs text-tierra/50 underline hover:text-terracota"
              >
                fuente del dato
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-tierra/40">Sin decisor identificado todavía.</p>
        )}
      </section>

      {/* Score */}
      {ultimoScore ? (
        <section className="rounded-lg border border-tierra/15 bg-white p-5">
          <h3 className="mb-3 font-medium text-tierra">
            Score: {ultimoScore.puntuacion} · Nivel {ultimoScore.nivel}
          </h3>
          <p className="mb-3 text-sm text-tierra/70">{ultimoScore.motivo}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(ultimoScore.desglose ?? {}).map(([bloque, valor]) => (
              <span
                key={bloque}
                className="rounded-full bg-arena px-2 py-1 capitalize text-tierra/70"
              >
                {bloque}: {String(valor)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Señales */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-3 font-medium text-tierra">Señal — por qué escribir ahora</h3>
        {senales && senales.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {senales.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  className="font-medium text-tierra underline hover:text-terracota"
                >
                  {s.titulo}
                </a>
                <span className="text-tierra/50"> · {s.fecha ?? "sin fecha"}</span>
                {s.resumen ? <p className="text-tierra/70">{s.resumen}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tierra/40">Sin señal verificable todavía.</p>
        )}
      </section>

      {/* Permiso de llamada */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-2 font-medium text-tierra">Permiso telefónico</h3>
        {lead.permiso_llamada_en ? (
          <p className="text-sm text-green-700">
            ✓ Confirmado por {lead.permiso_llamada_por} el{" "}
            {new Date(lead.permiso_llamada_en).toLocaleString("es-ES", {
              timeZone: "Europe/Madrid",
            })}
          </p>
        ) : (
          <div>
            <p className="mb-3 text-sm text-tierra/70">
              Antes de escribir hay que llamar y pedir permiso — es un requisito legal, no
              opcional. Confirma aquí sólo después de haber hecho la llamada.
            </p>
            <form action={confirmarPermisoLlamada.bind(null, lead.id)}>
              <button className="rounded border border-tierra/30 px-4 py-2 text-sm text-tierra hover:bg-arena">
                He llamado y tengo permiso
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Mensajes */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-3 font-medium text-tierra">Emails</h3>
        <div className="space-y-4">
          {(lead.mensajes ?? []).map(
            (m: {
              id: string;
              tipo: string;
              asunto: string;
              cuerpo: string;
              estado: string;
              enviado_automaticamente: boolean;
            }) => (
              <div key={m.id} className="rounded border border-tierra/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-tierra/50">
                    {m.tipo.replace(/_/g, " ")}
                    {m.enviado_automaticamente ? " · automático" : ""}
                  </span>
                  <span className="rounded-full bg-arena px-2 py-0.5 text-xs capitalize text-tierra/70">
                    {m.estado}
                  </span>
                </div>
                <p className="mb-1 font-medium text-tierra">{m.asunto}</p>
                <p className="whitespace-pre-wrap text-sm text-tierra/80">{m.cuerpo}</p>

                {m.estado === "error" ? (
                  <p className="mt-2 text-sm text-red-700">
                    No se ha podido enviar este email. Puedes volver a pulsar
                    &quot;Contactar&quot; para intentarlo de nuevo.
                  </p>
                ) : null}

                {m.estado === "borrador" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={aprobarMensaje.bind(null, m.id, lead.id)}>
                      <button className="rounded bg-tierra px-4 py-1.5 text-sm font-medium text-arena hover:opacity-90">
                        Aprobar
                      </button>
                    </form>
                    <form action={rechazarMensaje.bind(null, m.id, lead.id)}>
                      <button className="rounded border border-tierra/20 px-4 py-1.5 text-sm text-tierra/60 hover:bg-arena">
                        Rechazar
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            ),
          )}
          {(lead.mensajes ?? []).length === 0 ? (
            <p className="text-sm text-tierra/40">Todavía no hay borrador de email.</p>
          ) : null}
        </div>
      </section>

      {/* Botón Contactar */}
      <section className="rounded-lg border-2 border-tierra bg-white p-5">
        {mensajePrimerContacto ? (
          <form action={marcarContactado.bind(null, mensajePrimerContacto.id, lead.id)}>
            <button
              disabled={!puedeContactar}
              className="w-full rounded bg-tierra py-3 text-base font-semibold text-arena transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              Contactar
            </button>
            {!puedeContactar ? (
              <p className="mt-2 text-center text-xs text-tierra/50">
                {bajaExistente
                  ? "Este contacto está en la lista de bajas."
                  : !lead.permiso_llamada_en
                    ? "Confirma antes el permiso telefónico."
                    : "El primer email todavía no está aprobado."}
              </p>
            ) : mensajePrimerContacto?.estado === "error" ? (
              <p className="mt-2 text-center text-xs text-tierra/50">
                El intento anterior falló. Al pulsar aquí se vuelve a intentar el envío real.
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-tierra/50">
                Hasta que no pulses aquí, nunca se contacta a este lead. Al pulsar, se envía un
                email real e irreversible al contacto.
              </p>
            )}
          </form>
        ) : (
          <p className="text-center text-sm text-tierra/40">
            Sin email de primer contacto todavía.
          </p>
        )}
      </section>

      {/* Reunión: respuesta del lead → confirmar fecha → Zoom + Calendar automático */}
      {mensajePrimerContacto?.estado === "enviado" ? (
        <section className="rounded-lg border border-tierra/15 bg-white p-5">
          <h3 className="mb-3 font-medium text-tierra">Reunión</h3>

          {reunion?.estado === "confirmada" ? (
            <div className="text-sm text-green-700">
              <p>
                ✓ Reunión confirmada para el{" "}
                {reunion.fecha_hora
                  ? new Date(reunion.fecha_hora).toLocaleString("es-ES", {
                      timeZone: "Europe/Madrid",
                      dateStyle: "long",
                      timeStyle: "short",
                    })
                  : "—"}
              </p>
              {reunion.zoom_url ? (
                <a
                  href={reunion.zoom_url}
                  target="_blank"
                  className="underline hover:text-terracota"
                >
                  Enlace de Zoom
                </a>
              ) : null}
            </div>
          ) : reunion ? (
            <div>
              <p className="mb-3 text-sm text-tierra/70">
                El lead ha respondido. Lee su respuesta y confirma la fecha: se creará la
                reunión de Zoom, el evento de Calendar y se enviará la invitación
                automáticamente, sin aprobación adicional (excepción D-17 de CLAUDE.md).
              </p>
              <form
                action={confirmarFechaReunion.bind(null, lead.id)}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="flex flex-col text-sm text-tierra/70">
                  Fecha (España)
                  <input
                    type="date"
                    name="fecha"
                    required
                    className="mt-1 rounded border border-tierra/20 px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex flex-col text-sm text-tierra/70">
                  Hora
                  <input
                    type="time"
                    name="hora"
                    required
                    className="mt-1 rounded border border-tierra/20 px-3 py-2 text-sm"
                  />
                </label>
                <button className="rounded bg-tierra px-4 py-2 text-sm font-medium text-arena hover:opacity-90">
                  Confirmar reunión
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-tierra/70">
                Si el lead ha respondido al primer contacto, registra un extracto breve de su
                respuesta para poder confirmar después la fecha de la videollamada.
              </p>
              <form
                action={registrarRespuestaLead.bind(null, mensajePrimerContacto.id, lead.id)}
                className="space-y-3"
              >
                <textarea
                  name="extracto"
                  rows={3}
                  placeholder="Ej.: «Sí, me interesa. ¿Podemos el jueves a las 10?»"
                  className="w-full rounded border border-tierra/20 px-3 py-2 text-sm"
                />
                <button className="rounded border border-tierra/30 px-4 py-2 text-sm text-tierra hover:bg-arena">
                  Registrar respuesta del lead
                </button>
              </form>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
