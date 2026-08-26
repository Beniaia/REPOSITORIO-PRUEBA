import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";

const ESTILO_NIVEL: Record<string, string> = {
  A: "bg-tierra text-arena",
  B: "bg-terracota/80 text-tierra",
  C: "bg-tierra/10 text-tierra",
  descartado: "bg-gray-200 text-gray-600",
};

type Filtros = {
  nivel?: string;
  permiso?: string;
  email1?: string;
  reunion?: string;
  baja?: string;
};

const ESTILO_SELECT =
  "mt-1 rounded border border-tierra/20 bg-white px-2 py-1.5 text-sm text-tierra";

export default async function PaginaBandeja({
  searchParams,
}: {
  searchParams: Promise<Filtros>;
}) {
  const filtros = await searchParams;
  const supabase = await crearClienteServidor();

  let consulta = supabase.from("v_bandeja").select("*");

  if (filtros.nivel) consulta = consulta.eq("nivel", filtros.nivel);
  if (filtros.permiso === "si") consulta = consulta.not("permiso_llamada_en", "is", null);
  if (filtros.permiso === "no") consulta = consulta.is("permiso_llamada_en", null);
  if (filtros.email1 === "sin") consulta = consulta.is("email_1_estado", null);
  else if (filtros.email1) consulta = consulta.eq("email_1_estado", filtros.email1);
  if (filtros.reunion === "sin") consulta = consulta.is("reunion_estado", null);
  else if (filtros.reunion) consulta = consulta.eq("reunion_estado", filtros.reunion);
  if (filtros.baja === "si") consulta = consulta.eq("de_baja", true);

  const { data: leads, error } = await consulta.order("puntuacion", {
    ascending: false,
    nullsFirst: false,
  });

  const hayFiltros = Object.values(filtros).some(Boolean);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl text-tierra">¿A quién escribo hoy?</h2>
        <p className="text-sm text-tierra/60">
          Leads ordenados por score. Los de baja no se pueden contactar nunca.
        </p>
      </div>

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-tierra/15 bg-white p-4">
        <div className="flex flex-col">
          <label htmlFor="nivel" className="text-xs text-tierra/60">
            Nivel
          </label>
          <select id="nivel" name="nivel" defaultValue={filtros.nivel ?? ""} className={ESTILO_SELECT}>
            <option value="">Todos</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="descartado">Descartado</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="permiso" className="text-xs text-tierra/60">
            Permiso llamada
          </label>
          <select
            id="permiso"
            name="permiso"
            defaultValue={filtros.permiso ?? ""}
            className={ESTILO_SELECT}
          >
            <option value="">Todos</option>
            <option value="si">Confirmado (ya llamé)</option>
            <option value="no">Pendiente</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="email1" className="text-xs text-tierra/60">
            Mail enviado
          </label>
          <select
            id="email1"
            name="email1"
            defaultValue={filtros.email1 ?? ""}
            className={ESTILO_SELECT}
          >
            <option value="">Todos</option>
            <option value="enviado">Enviado</option>
            <option value="error">Error al enviar</option>
            <option value="aprobado">Aprobado, sin enviar</option>
            <option value="sin">Sin enviar todavía</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="reunion" className="text-xs text-tierra/60">
            Reunión Zoom
          </label>
          <select
            id="reunion"
            name="reunion"
            defaultValue={filtros.reunion ?? ""}
            className={ESTILO_SELECT}
          >
            <option value="">Todas</option>
            <option value="confirmada">Programada</option>
            <option value="cancelada">Rechazada</option>
            <option value="realizada">Realizada</option>
            <option value="propuesta">Propuesta, sin fecha</option>
            <option value="sin">Sin reunión</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="baja" className="text-xs text-tierra/60">
            Bajas
          </label>
          <select id="baja" name="baja" defaultValue={filtros.baja ?? ""} className={ESTILO_SELECT}>
            <option value="">Todos</option>
            <option value="si">Sólo no contactar</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-tierra px-4 py-2 text-sm font-medium text-arena hover:opacity-90"
        >
          Filtrar
        </button>
        {hayFiltros ? (
          <Link href="/leads" className="text-sm text-tierra/60 underline hover:text-terracota">
            Quitar filtros
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-tierra/60">
        {leads ? `${leads.length} lead${leads.length === 1 ? "" : "s"}` : ""}
        {hayFiltros ? " con estos filtros" : ""}
      </p>

      {error ? (
        <p className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se ha podido cargar la bandeja: {error.message}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-tierra/15 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-tierra/10 text-left text-tierra/60">
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Segmento</th>
              <th className="px-4 py-3 font-medium">Nivel</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Permiso llamada</th>
              <th className="px-4 py-3 font-medium">Mail enviado</th>
              <th className="px-4 py-3 font-medium">Reunión Zoom</th>
              <th className="px-4 py-3 font-medium">Bajas</th>
            </tr>
          </thead>
          <tbody>
            {(leads ?? []).map((lead) => (
              <tr
                key={lead.lead_id}
                className="border-b border-tierra/5 last:border-0 hover:bg-arena/60"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.lead_id}`}
                    className="font-medium text-tierra hover:text-terracota hover:underline"
                  >
                    {lead.empresa}
                  </Link>
                  <div className="text-xs text-tierra/50">{lead.provincia}</div>
                </td>
                <td className="px-4 py-3">
                  {lead.contacto_nombre ?? <span className="text-tierra/40">Sin decisor</span>}
                  <div className="text-xs text-tierra/50">{lead.cargo}</div>
                </td>
                <td className="px-4 py-3 capitalize">{lead.segmento}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      ESTILO_NIVEL[lead.nivel ?? ""] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {lead.nivel ?? "—"} {lead.puntuacion != null ? `· ${lead.puntuacion}` : ""}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lead.de_baja ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                      De baja
                    </span>
                  ) : (
                    <span className="text-xs capitalize text-tierra/70">
                      {lead.estado.replace(/_/g, " ")}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {lead.permiso_llamada_en ? (
                    <span className="text-green-700">✓ Confirmado</span>
                  ) : (
                    <span className="text-tierra/40">Pendiente de llamar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {lead.email_1_estado === "enviado" ? (
                    <span className="text-green-700">✓ Enviado</span>
                  ) : lead.email_1_estado === "error" ? (
                    <span className="font-semibold text-red-700">Error al enviar</span>
                  ) : lead.email_1_estado === "aprobado" ? (
                    <span className="text-tierra/60">Aprobado, sin enviar</span>
                  ) : lead.email_1_estado === "rechazado" ? (
                    <span className="text-tierra/40">Rechazado</span>
                  ) : (
                    <span className="text-tierra/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {lead.reunion_estado === "confirmada" ? (
                    <span className="text-green-700">✓ Programada</span>
                  ) : lead.reunion_estado === "cancelada" ? (
                    <span className="font-semibold text-red-700">Rechazada</span>
                  ) : lead.reunion_estado === "realizada" ? (
                    <span className="text-tierra/60">Realizada</span>
                  ) : lead.reunion_estado === "propuesta" ? (
                    <span className="text-tierra/60">Propuesta, sin fecha</span>
                  ) : (
                    <span className="text-tierra/40">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {lead.de_baja ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">
                      No contactar
                    </span>
                  ) : (
                    <span className="text-tierra/40">—</span>
                  )}
                </td>
              </tr>
            ))}
            {leads && leads.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-tierra/50">
                  Todavía no hay leads. Entrarán con la primera ejecución del motor.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
