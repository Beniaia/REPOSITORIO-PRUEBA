async function obtenerTokenAcceso(): Promise<string> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Faltan GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET o GOOGLE_CALENDAR_REFRESH_TOKEN.",
    );
  }

  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Google no ha dado token de acceso: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  return datos.access_token;
}

/**
 * Crea el evento en el calendario de Baladre e invita al contacto del lead.
 * Lanza si Google Calendar rechaza la petición.
 */
export async function crearEventoCalendar({
  titulo,
  descripcion,
  inicio,
  duracionMinutos = 15,
  invitadoEmail,
}: {
  titulo: string;
  descripcion: string;
  inicio: Date;
  duracionMinutos?: number;
  invitadoEmail?: string;
}): Promise<{ calendarEventId: string; enlace: string }> {
  const token = await obtenerTokenAcceso();
  const fin = new Date(inicio.getTime() + duracionMinutos * 60 * 1000);

  const respuesta = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: titulo,
        description: descripcion,
        start: { dateTime: inicio.toISOString(), timeZone: "Europe/Madrid" },
        end: { dateTime: fin.toISOString(), timeZone: "Europe/Madrid" },
        attendees: invitadoEmail ? [{ email: invitadoEmail }] : undefined,
      }),
    },
  );

  if (!respuesta.ok) {
    throw new Error(`Google Calendar no ha creado el evento: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  return { calendarEventId: datos.id, enlace: datos.htmlLink };
}
