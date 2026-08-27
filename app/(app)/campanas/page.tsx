import { crearClienteServidor } from "@/lib/supabase/server";
import {
  solicitarProspeccionInmediata,
  solicitarProspeccionProgramada,
  cancelarSolicitudProspeccion,
} from "@/lib/actions/prospeccion";

const NUMERO_LEADS_POR_DEFECTO = 10;

export default async function PaginaCampanas() {
  const supabase = await crearClienteServidor();

  const { data: solicitudes } = await supabase
    .from("solicitudes_prospeccion")
    .select("*")
    .in("estado", ["pendiente", "en_proceso"])
    .order("creado_en", { ascending: false });

  const { data: ejecuciones } = await supabase
    .from("ejecuciones")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl text-tierra">Campañas</h2>
        <p className="mt-1 text-sm text-tierra/60">
          Pide una tanda de prospección — ahora mismo o para cuando tú decidas. Esta página no
          busca leads por sí sola: el motor recoge la petición la próxima vez que se ejecuta.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Prospectar ahora */}
        <section className="rounded-lg border-2 border-tierra bg-white p-5">
          <h3 className="mb-2 font-medium text-tierra">Prospectar ahora</h3>
          <p className="mb-4 text-sm text-tierra/60">
            Pide una tanda de {NUMERO_LEADS_POR_DEFECTO} leads nuevos, para atender cuanto antes.
          </p>
          <form action={solicitarProspeccionInmediata.bind(null, NUMERO_LEADS_POR_DEFECTO)}>
            <button className="w-full rounded bg-tierra py-3 text-base font-semibold text-arena transition hover:opacity-90">
              Prospectar {NUMERO_LEADS_POR_DEFECTO} leads ahora
            </button>
          </form>
        </section>

        {/* Programar */}
        <section className="rounded-lg border border-tierra/15 bg-white p-5">
          <h3 className="mb-2 font-medium text-tierra">Programar para más tarde</h3>
          <p className="mb-4 text-sm text-tierra/60">
            Elige tú la fecha y hora — no hay un día fijo de la semana.
          </p>
          <form action={solicitarProspeccionProgramada} className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-sm text-tierra/70">
                Fecha
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
              <label className="flex flex-col text-sm text-tierra/70">
                Nº de leads
                <input
                  type="number"
                  name="numero_leads"
                  min={1}
                  max={50}
                  defaultValue={NUMERO_LEADS_POR_DEFECTO}
                  className="mt-1 w-20 rounded border border-tierra/20 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <button className="rounded border border-tierra/30 px-4 py-2 text-sm text-tierra hover:bg-arena">
              Programar prospección
            </button>
          </form>
        </section>
      </div>

      {/* Solicitudes pendientes */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-3 font-medium text-tierra">Solicitudes pendientes</h3>
        {solicitudes && solicitudes.length > 0 ? (
          <div className="space-y-2">
            {solicitudes.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded border border-tierra/10 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium text-tierra">
                    {s.numero_leads} leads · {s.tipo === "inmediata" ? "inmediata" : "programada"}
                  </span>
                  {s.para_cuando ? (
                    <span className="ml-2 text-tierra/60">
                      para el{" "}
                      {new Date(s.para_cuando).toLocaleString("es-ES", {
                        timeZone: "Europe/Madrid",
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : null}
                  <span className="ml-2 text-xs text-tierra/40">
                    pedida por {s.solicitado_por} ·{" "}
                    {new Date(s.creado_en).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                  </span>
                </div>
                {s.estado === "pendiente" ? (
                  <form action={cancelarSolicitudProspeccion.bind(null, s.id)}>
                    <button className="text-xs text-tierra/50 underline hover:text-red-700">
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <span className="rounded-full bg-arena px-2 py-0.5 text-xs text-tierra/70">
                    en proceso
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-tierra/40">No hay solicitudes pendientes.</p>
        )}
      </section>

      {/* Historial de ejecuciones */}
      <section className="rounded-lg border border-tierra/15 bg-white p-5">
        <h3 className="mb-3 font-medium text-tierra">Últimas ejecuciones del motor</h3>
        {ejecuciones && ejecuciones.length > 0 ? (
          <div className="space-y-2">
            {ejecuciones.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between rounded border border-tierra/10 px-4 py-3 text-sm"
              >
                <span className="capitalize text-tierra">{e.tipo}</span>
                <span className="text-tierra/60">
                  {e.leads_nuevos} nuevos · {e.leads_duplicados} duplicados
                  {e.coste_estimado ? ` · ${e.coste_estimado} €` : ""}
                </span>
                <span className="text-xs text-tierra/40">
                  {new Date(e.creado_en).toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-tierra/40">Todavía no se ha ejecutado ninguna tanda.</p>
        )}
      </section>
    </div>
  );
}
