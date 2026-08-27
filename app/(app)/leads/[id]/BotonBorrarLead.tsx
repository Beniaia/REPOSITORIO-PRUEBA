"use client";

export function BotonBorrarLead({ empresa }: { empresa: string }) {
  return (
    <button
      type="submit"
      onClick={(evento) => {
        const confirmado = window.confirm(
          `¿Seguro que quieres eliminar el lead de "${empresa}"? Se borran también sus emails y su reunión. Esta acción no se puede deshacer.`,
        );
        if (!confirmado) evento.preventDefault();
      }}
      className="text-sm font-medium text-red-700 underline hover:text-red-900"
    >
      Eliminar este lead
    </button>
  );
}
