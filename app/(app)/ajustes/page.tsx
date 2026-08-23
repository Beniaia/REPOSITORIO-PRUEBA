import { crearClienteServidor } from "@/lib/supabase/server";

export default async function PaginaAjustes() {
  const supabase = await crearClienteServidor();
  const { data: config } = await supabase.from("config_icp").select("*").order("clave");

  return (
    <div>
      <h2 className="font-serif text-2xl text-tierra">Ajustes — pesos del ICP</h2>
      <p className="mt-1 text-sm text-tierra/60">
        Vista de sólo lectura por ahora. La edición desde aquí llega en F1.
      </p>
      <div className="mt-6 space-y-4">
        {(config ?? []).map((c) => (
          <div key={c.clave} className="rounded-lg border border-tierra/15 bg-white p-4">
            <p className="text-sm font-medium text-tierra">{c.clave}</p>
            <p className="mb-2 text-xs text-tierra/50">{c.descripcion}</p>
            <pre className="overflow-x-auto rounded bg-arena p-2 text-xs text-tierra/70">
              {JSON.stringify(c.valor, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
