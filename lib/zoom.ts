let tokenCache: { valor: string; expiraEn: number } | null = null;

async function obtenerTokenAcceso(): Promise<string> {
  if (tokenCache && tokenCache.expiraEn > Date.now()) return tokenCache.valor;

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Faltan ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID o ZOOM_CLIENT_SECRET.");
  }

  const credenciales = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const respuesta = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    { method: "POST", headers: { Authorization: `Basic ${credenciales}` } },
  );

  if (!respuesta.ok) {
    throw new Error(`Zoom no ha dado token de acceso: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  tokenCache = { valor: datos.access_token, expiraEn: Date.now() + (datos.expires_in - 60) * 1000 };
  return tokenCache.valor;
}

/**
 * Crea una reunión de Zoom de máximo 15 minutos (el formato del primer
 * contacto, CLAUDE.md §6). Lanza si Zoom rechaza la petición.
 */
export async function crearReunionZoom({
  tema,
  inicio,
  duracionMinutos = 15,
}: {
  tema: string;
  inicio: Date;
  duracionMinutos?: number;
}): Promise<{ zoomUrl: string; zoomMeetingId: string }> {
  const token = await obtenerTokenAcceso();

  const respuesta = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: tema,
      type: 2, // reunión programada, hora fija
      start_time: inicio.toISOString(),
      duration: duracionMinutos,
      timezone: "Europe/Madrid",
      settings: { join_before_host: true, waiting_room: false },
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Zoom no ha creado la reunión: ${await respuesta.text()}`);
  }

  const datos = await respuesta.json();
  return { zoomUrl: datos.join_url, zoomMeetingId: String(datos.id) };
}
