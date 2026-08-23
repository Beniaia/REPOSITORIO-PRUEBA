import nodemailer, { type Transporter } from "nodemailer";

let transportador: Transporter | null = null;

function obtenerTransportador(): Transporter {
  if (transportador) return transportador;

  const usuario = process.env.GMAIL_USER;
  const contrasena = process.env.GMAIL_APP_PASSWORD;

  if (!usuario || !contrasena) {
    throw new Error(
      "Faltan GMAIL_USER o GMAIL_APP_PASSWORD en las variables de entorno.",
    );
  }

  transportador = nodemailer.createTransport({
    service: "gmail",
    auth: { user: usuario, pass: contrasena },
  });

  return transportador;
}

/**
 * Envía el texto exacto que una persona aprobó, sin convertirlo a HTML —
 * lo que sale es lo que se aprobó, sin transformaciones de por medio.
 * Lanza si el envío falla (variables ausentes, fallo SMTP, destinatario inválido).
 */
export async function enviarEmail({
  para,
  asunto,
  cuerpo,
}: {
  para: string;
  asunto: string;
  cuerpo: string;
}): Promise<string> {
  const transportador = obtenerTransportador();
  const nombreRemitente = process.env.GMAIL_FROM_NOMBRE;
  const remitente = nombreRemitente
    ? `"${nombreRemitente}" <${process.env.GMAIL_USER}>`
    : process.env.GMAIL_USER!;

  const info = await transportador.sendMail({
    from: remitente,
    to: para,
    subject: asunto,
    text: cuerpo,
  });

  return info.messageId;
}
