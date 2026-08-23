import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";

const ESTILO_NIVEL: Record<string, string> = {
  A: "bg-tierra text-arena",
  B: "bg-terracota/80 text-tierra",
  C: "bg-tierra/10 text-tierra",
  descartado: "bg-gray-200 text-gray-600",
};

export default async function PaginaBandeja() {
  const supabase = await crearClienteServidor();
  const { data: leads, error } = await supabase
    .from("v_bandeja")
    .select("*")
    .order("puntuacion", { ascending: false, nullsFirst: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl text-tierra">¿A quién escribo hoy?</h2>
        <p className="text-sm text-tierra/60">
          Leads ordenados por score. Los de baja no se pueden contactar nunca.
        </p>
      </div>

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
              </tr>
            ))}
            {leads && leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-tierra/50">
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
