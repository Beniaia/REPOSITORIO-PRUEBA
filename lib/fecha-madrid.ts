/**
 * Convierte una fecha/hora tal como la escribe una persona en un input
 * `datetime-local` (ej. "2026-08-25T10:00", sin zona horaria) a un instante
 * UTC correcto, interpretándola siempre como hora de Europe/Madrid —
 * el servidor corre en UTC, así que no basta con `new Date(valor)`.
 */
export function madridADateUTC(fechaHoraLocal: string): Date {
  const comoUTC = new Date(`${fechaHoraLocal}:00Z`);
  const enMadrid = new Date(comoUTC.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const diferenciaMs = comoUTC.getTime() - enMadrid.getTime();
  return new Date(comoUTC.getTime() + diferenciaMs);
}
