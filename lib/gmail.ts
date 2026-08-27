import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

/**
 * Lectura de sólo lectura de la bandeja piloto de Gmail por IMAP (P-15), para
 * detectar si un lead ha respondido al primer email. Usa la misma cuenta y
 * contraseña de aplicación que ya usa el envío por SMTP (`lib/email/enviar.ts`,
 * D-22) — deliberadamente por IMAP y no por la API de Gmail: la API exige
 * habilitarla en un proyecto de Google Cloud, que a su vez pide vincular una
 * cuenta de facturación con tarjeta (aunque el uso siga siendo gratuito).
 * IMAP con contraseña de aplicación evita ese paso por completo.
 */
export async function buscarRespuestaGmail({
  contactoEmail,
  desde,
}: {
  contactoEmail: string;
  desde: Date;
}): Promise<{ encontrada: boolean; extracto: string | null }> {
  const usuario = process.env.GMAIL_USER;
  const contrasena = process.env.GMAIL_APP_PASSWORD;

  if (!usuario || !contrasena) {
    throw new Error("Faltan GMAIL_USER o GMAIL_APP_PASSWORD en las variables de entorno.");
  }

  const cliente = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: usuario, pass: contrasena },
    logger: false,
  });

  await cliente.connect();

  try {
    const bloqueo = await cliente.getMailboxLock("INBOX");
    try {
      for await (const mensaje of cliente.fetch(
        { from: contactoEmail, since: desde },
        { envelope: true, source: true },
      )) {
        const fechaMensaje = mensaje.envelope?.date ? new Date(mensaje.envelope.date) : null;
        if (!fechaMensaje || fechaMensaje.getTime() <= desde.getTime()) continue;

        const remitente = mensaje.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
        if (remitente.includes("mailer-daemon")) continue;

        const analizado = mensaje.source ? await simpleParser(mensaje.source) : null;
        const extracto = (analizado?.text ?? "").trim().slice(0, 500);
        return { encontrada: true, extracto };
      }

      return { encontrada: false, extracto: null };
    } finally {
      bloqueo.release();
    }
  } finally {
    await cliente.logout();
  }
}
