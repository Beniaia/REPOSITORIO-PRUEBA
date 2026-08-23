import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

async function iniciarSesion(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/leads");
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-arena px-4">
      <div className="w-full max-w-sm rounded-lg border border-tierra/15 bg-white p-8 shadow-sm">
        <h1 className="mb-1 font-serif text-2xl text-tierra">Baladre Cerámica</h1>
        <p className="mb-6 text-sm text-tierra/70">Prospección · acceso privado</p>

        {error ? (
          <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            No se ha podido iniciar sesión: {error}
          </p>
        ) : null}

        <form action={iniciarSesion} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-tierra/80">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border border-tierra/20 px-3 py-2 text-sm focus:border-terracota focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-tierra/80">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border border-tierra/20 px-3 py-2 text-sm focus:border-terracota focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-tierra py-2 text-sm font-medium text-arena transition hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
