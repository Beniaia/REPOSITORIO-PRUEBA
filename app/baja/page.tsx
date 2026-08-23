"use client";

import { useState } from "react";

export default function PaginaBaja() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function darseDeBaja(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") ?? "");

    const respuesta = await fetch("/api/public/baja", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (respuesta.ok) {
      setEnviado(true);
    } else {
      const cuerpo = await respuesta.json().catch(() => ({}));
      setError(cuerpo.error ?? "No se ha podido procesar la solicitud.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-arena px-4">
      <div className="w-full max-w-md rounded-lg border border-tierra/15 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-2 font-serif text-2xl text-tierra">Baladre Cerámica</h1>

        {enviado ? (
          <p className="text-sm text-tierra/70">
            Hecho. No volverás a recibir correos nuestros. Este cambio es permanente.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-tierra/70">
              Escribe tu correo para dejar de recibir comunicaciones de Baladre. Es
              inmediato y permanente.
            </p>
            <form action={darseDeBaja} className="space-y-3">
              <input
                name="email"
                type="email"
                required
                placeholder="tu@correo.com"
                className="w-full rounded border border-tierra/20 px-3 py-2 text-sm focus:border-terracota focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded bg-tierra py-2 text-sm font-medium text-arena hover:opacity-90"
              >
                No deseo recibir más correos
              </button>
            </form>
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
