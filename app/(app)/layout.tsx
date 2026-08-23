import Link from "next/link";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

async function cerrarSesion() {
  "use server";
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-arena">
      <header className="border-b border-tierra/15 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-serif text-xl text-tierra">Baladre Cerámica</h1>
            <nav className="mt-1 flex gap-4 text-sm text-tierra/70">
              <Link href="/leads" className="hover:text-terracota">
                Bandeja
              </Link>
              <Link href="/pipeline" className="hover:text-terracota">
                Pipeline
              </Link>
              <Link href="/campanas" className="hover:text-terracota">
                Campañas
              </Link>
              <Link href="/metricas" className="hover:text-terracota">
                Métricas
              </Link>
              <Link href="/ajustes" className="hover:text-terracota">
                Ajustes
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-tierra/70">
            {user?.email}
            <form action={cerrarSesion}>
              <button className="rounded border border-tierra/20 px-3 py-1 hover:bg-arena">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
