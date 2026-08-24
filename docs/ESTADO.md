# ESTADO.md — Dónde está el proyecto

> **Este es el documento vivo.** Se actualiza al final de cada sesión de trabajo, tanto si trabajas con Claude Code como si tocas algo a mano.
> Última actualización: **24 agosto 2026** · Fase actual: **F0 completa — app desplegada en Vercel con credenciales reales, falta ejecutar la primera tanda del motor**

---

## 1. Semáforo

| Bloque | Estado |
|---|---|
| Documentación (PRD, arquitectura, CLAUDE.md) | ✅ Hecho |
| Esquema de base de datos | ✅ Aplicado en Supabase (v1.1: + reuniones, permiso de llamada, guardarraíles de envío como triggers) |
| Proyecto Supabase creado | ✅ `PROSPECCION CLAUDE` (`ytqjhsbcnswshybhgevc`, eu-central-1), 11 tablas con RLS, 0 avisos de seguridad |
| Repo Next.js inicializado | ✅ Next 16 + React 19 + Tailwind + `@supabase/ssr`. `build`, `lint` y `typecheck` en verde |
| Endpoint de ingesta | ✅ `/api/ingest/leads` con validación Zod, dedup por dominio/email, consulta de bajas antes de insertar. Sólo crea borradores, nunca marca enviado |
| Consola de leads | 🟡 Bandeja (`/leads`) y ficha (`/leads/[id]`) funcionando contra Supabase real, con login. Falta pipeline/métricas/ajustes editables |
| Motor de prospección (skill) | ✅ Reescrita para este sistema en `.claude/skills/prospeccion-baladre/SKILL.md` (la versión antigua, que escribía en Sheets, sigue en `agente-prospeccion-baladre/` sin tocar). Sin ejecutar todavía: bloqueada por token de Apify y por que la app esté desplegada |
| Pipeline de Apify | 🟡 Diseñado y **esquemas de entrada validados el 23/08/2026** contra los 3 actores reales (se corrigió un error en Website Content Crawler). Sin ejecutar todavía |
| Descubrimiento con `vibe-prospecting` | ✅ Conector conectado y **cobertura verificada el 22/08/2026** con consultas reales. Recetas en `VIBE_PROSPECTING.md` |
| Tarea programada semanal | ⬜ Pendiente |
| Redacción y aprobación de emails | ⬜ Pendiente |
| Envío real (fase 4, con dominio propio y Resend) | ⛔ Bloqueado por revisión jurídica y por el dominio |
| Envío real — piloto por Gmail personal (D-22) | ✅ Probado con un envío real, funciona |
| Migración del Google Sheets `BALADRE_LEADS` | ✅ No hace falta — los datos son ficticios (confirmado 23/08/2026) |
| Despliegue en Vercel | ✅ **`repositorio-prueba-ylar`** (equipo `nuria-pruebas`), conectado a `Beniaia/REPOSITORIO-PRUEBA`, rama `main`. URL: `repositorio-prueba-ylar.vercel.app`. Con las 8 variables de entorno configuradas el 24/08/2026 tras un primer despliegue que daba error 500 (faltaban) |
| `.env.local` completo | ✅ Las 8 variables rellenas: Supabase (URL, anon, service_role), `INGEST_SERVICE_TOKEN`, Gmail (usuario, contraseña de aplicación, nombre), Apify |

## 2. Decisiones tomadas

| # | Decisión | Fecha | Nota |
|---|---|---|---|
| D-01 | Se construye desde cero; no se extiende Relevance AI + Google Sheets | 21/08/2026 | El sistema anterior sigue vivo hasta que este lo sustituya |
| D-02 | Base de datos: Supabase | 21/08/2026 | |
| D-03 | App: Next.js + Vercel, construida con Claude Code | 21/08/2026 | |
| D-04 | El motor de búsqueda vive en Claude; la app muestra y aprueba | 21/08/2026 | La tarea semanal automática se resuelve con una **tarea programada de Claude**, no con un cron de Vercel. Así se cumplen a la vez "la app sólo muestra" y "automático semanal" |
| D-05 | Operativa: automático semanal + bajo demanda | 21/08/2026 | |
| D-06 | Envío desde la app con botón de aprobar (fase 2) | 21/08/2026 | |
| D-07 | Prioridad: calidad del lead sobre volumen. Levante primero, luego resto de España | 21/08/2026 | |
| D-08 | Presupuesto tope ~50 €/mes | 21/08/2026 | |
| D-09 | Un solo cliente (Baladre). Sin multi-tenant | 21/08/2026 | El esquema no lo impide si algún día cambia |
| D-10 | **Apify es el motor de enriquecimiento** de todo lead, ejecutado desde el motor en Claude | 21/08/2026 | Playbook completo en `APIFY.md`. Cuenta ya existente. Confirmado y acotado por D-16 |
| D-11 | LinkedIn **no** entra en el pipeline automatizado | 21/08/2026 | Sus condiciones prohíben el scraping. Alternativas en `APIFY.md` §8. Si Baladre decide lo contrario, ver P-08 |
| D-12 | **Economía de contexto como requisito, no como consejo** | 21/08/2026 | Campos seleccionados en Apify, filtro con código antes del modelo, truncado de webs, scoring por lotes, investigación en subagentes. Reglas en `APIFY.md` §9 y `CLAUDE.md` §11. El prompt maestro pasa a v2: un prompt corto por hito |
| D-13 | ~~Google Maps se limita a hoteles y restauración~~ | 21/08/2026 | **Superada por D-15 al día siguiente**, cuando se pudo medir la cobertura real de `vibe-prospecting` |
| D-14 | **`vibe-prospecting` es el canal de descubrimiento** de todos los segmentos | 22/08/2026 | Conector conectado. Cobertura medida con consultas reales: 1.043 estudios pequeños en Levante; decisores **con email**: 75 en arquitectura Levante, 96 en hostelería Levante, 4.619 en agencias España. Es el único canal que da la persona, no sólo la empresa |
| D-15 | **Google Maps sale del ciclo semanal** y queda como recurso puntual | 22/08/2026 | Ya no aporta nada que la otra fuente no dé mejor, salvo la enumeración exhaustiva de negocios físicos de una ciudad. Cuándo volver a usarlo: `APIFY.md` §10 |
| D-16 | **Apify se queda como motor de enriquecimiento**, no de descubrimiento | 22/08/2026 | Contact Details, Website Content Crawler e Instagram. ≈0,89 $ por tanda de 20 leads |
| D-17 | **El email de invitación a reunión (`invitacion_reunion`) se envía automáticamente**, sin aprobación humana adicional, en cuanto el lead responde al primer contacto ya aprobado | 23/08/2026 | Única excepción a la regla 1 de `CLAUDE.md`, documentada allí explícitamente. El primer contacto sigue exigiendo aprobación humana sin excepción |
| D-18 | **La fecha de la reunión la confirma una persona** leyendo la respuesta del lead en el dashboard, no un parser automático de texto libre | 23/08/2026 | Evita agendar mal por una fecha ambigua ("el jueves que viene") o una zona horaria mal interpretada |
| D-19 | **Antes del primer contacto, llamada telefónica obligatoria** pidiendo permiso; se registra en `leads.permiso_llamada_en/por` y el botón "Contactar" no se activa sin ese registro | 23/08/2026 | Requisito legal según el negocio, más estricto que el diseño original (que se apoyaba sólo en interés legítimo). Refuerza la respuesta a P-03 |
| D-20 | **Despliegue en Vercel Hobby (gratuito)**, con el dominio `*.vercel.app` que da por defecto | 23/08/2026 | ⚠️ Vercel Hobby está documentado como **restringido a uso no comercial** (ver P-02 y `ARQUITECTURA.md` §7). Decisión tomada con esa advertencia sobre la mesa; revisar si Vercel lo cuestiona o pasar a Pro (20 $/mes) |
| D-21 | **Cada email debe indicar que lo envía un asistente de IA en nombre de Baladre**, y llevar un botón visible de baja | 23/08/2026 | Transparencia (AI Act) + refuerzo de RF-08. Actualizado en `CLAUDE.md` §6 |
| D-22 | **Piloto de envío por Gmail personal** (`nbrotonscongost@gmail.com`), sin dominio propio ni SPF/DKIM/DMARC, dirección intercambiable vía `GMAIL_USER`/`GMAIL_APP_PASSWORD` | 23/08/2026 | Respuesta interina a P-01. **Explícitamente para probar antes de entregar el proyecto al cliente** — la cuenta de Gmail de Nuria es de pruebas, no la definitiva. Se sustituirá por el buzón real de Baladre en la entrega, cambiando sólo esas dos variables de entorno. Verificación en dos pasos activada y contraseña de aplicación generada el 23/08/2026 — **probado con un envío real, funciona** |
| D-23 | **Cada tanda de prospección es de 10 leads** (bajo demanda o semanal), repartidos orientativamente 3 arquitectura / 3 agencias / 2 grupos tipo Vocento / 1 hotel / 1 restauración-joyería | 23/08/2026 | Confirmado explícitamente por Nuria. Reparto documentado en `SKILL.md`, no es una cuota rígida |
| D-24 | **P-05 resuelta: aprueba cualquier persona con acceso a la app**, sin roles diferenciados entre Eva y María del Mar | 23/08/2026 | Confirmado por Nuria. Lo que garantiza la trazabilidad no es un permiso granular, es el registro de auditoría (`aprobado_por`, `aprobado_at`), que ya existe en el esquema |
| ~~D-25~~ | ~~Despliegue en Vercel se deja para el final~~ | 23/08/2026 | **Superada por D-27 el mismo día**, minutos después: Nuria pide desplegar ya para poder hacer la primera prueba real |
| D-27 | **Se despliega en Vercel ahora**, no al final | 23/08/2026 | Sustituye a D-25. Motivo: hace falta una URL pública de `/api/ingest/leads` para que el motor pueda enviar la tanda de prueba sin depender de que el ordenador de Nuria esté encendido con `npm run dev` |
| D-28 | **Contraseña del primer usuario cambiada** por Nuria a una elegida por ella (ya no es la generada aleatoriamente) | 24/08/2026 | Sigue siendo `nbrotonscongost@gmail.com`, provisional hasta el usuario real de Baladre (P-05 histórica, ya resuelta por D-24 en cuanto a quién aprueba) |
| D-26 | **Zoom y Google Calendar del piloto usan la cuenta personal de Nuria** (`nbrotonscongost@gmail.com`), igual que el envío por Gmail (D-22) | 23/08/2026 | Confirmado por Nuria. Se sustituirá por las cuentas reales de Baladre en la entrega. Resuelve P-13/P-14 de forma interina — sigue pendiente crear la app de Zoom y el proyecto de Google Cloud sobre esa cuenta |

## 3. Preguntas abiertas — bloquean trabajo

| # | Pregunta | Bloquea | Quién decide |
|---|---|---|---|
| P-01 | **Dominio de envío.** Baladre usa Gmail gratuito. ¿Se envía desde `baladreceramica.com` (hay que configurar SPF/DKIM/DMARC) o desde un subdominio tipo `hola.baladreceramica.com`? Respuesta interina de piloto (D-22): Gmail personal, sin dominio propio configurado. La pregunta de fondo para producción sigue abierta | Fase 4 | Nuria + Baladre |
| P-02 | **Hosting definitivo.** Vercel Hobby está restringido a uso no comercial (verificado en su documentación). ¿Se paga Pro a 20 $/mes o se busca alternativa (Railway, Render, Supabase Edge Functions)? | Despliegue | Nuria |
| P-03 | **Revisión jurídica LSSI art. 21** para el email B2B en frío | Fase 4 completa | Abogado |
| P-04 | **Directorios sectoriales**: cuáles permiten extracción automatizada según sus términos de uso | Alcance del motor | Nuria, leyendo términos |
| ~~P-05~~ | ~~Quién aprueba de verdad~~ | **RESUELTA el 23/08/2026**: cualquier persona con acceso a la app. Ver D-24 |
| ~~P-06~~ | ~~Migración del Sheets~~ | **RESUELTA el 23/08/2026**: los datos de `BALADRE_LEADS` son ficticios (de pruebas), no hay nada real que migrar. No se construye ningún script de migración |
| P-07 | **Límite de envíos diarios** una vez arranque la fase 4 | Fase 4 | Nuria |
| P-08 | **LinkedIn.** Nuria lo pidió; yo lo he dejado fuera porque sus condiciones prohíben la extracción automatizada y el riesgo recae sobre una cuenta real. Decidir entre: no usarlo, Sales Navigator de pago, o consulta manual persona a persona | Cobertura de decisores | Nuria + Baladre, con criterio jurídico |
| P-09 | **Plan de Apify.** El Free (5 $/mes de crédito) cubre las pruebas; el ritmo semanal estimado se queda justo por encima. ¿Se sube a Starter (29 $/mes) o se recorta Instagram? | Coste mensual | Nuria, tras medir la primera tanda |
| P-10 | **MCP de Apify**: ¿funciona bien como herramienta desde Claude o se llama por API HTTP? No lo he verificado | Implementación del motor | Comprobar en la primera sesión del motor |
| ~~P-11~~ | ~~Conector de `vibe-prospecting` sin instalar~~ | **RESUELTA el 22/08/2026**: conectado y validado. Ver D-14 |
| P-12 | **Coste real de `vibe-prospecting`.** Confirmado que un fetch de 5 empresas costó 5 créditos (1 por fila) y que el enriquecimiento se cobra aparte, pero no he verificado el precio del crédito ni el plan contratado. Consultar `show-pricing-plans` antes de programar la tarea semanal | Presupuesto mensual y tamaño de la tanda | Nuria |
| P-13 | **Cuenta y credenciales de Zoom** para crear reuniones por API (OAuth o Server-to-Server). Interinamente sobre `nbrotonscongost@gmail.com` (D-26) — falta crear la app de Zoom sobre esa cuenta | Función de agendar reunión | Nuria |
| P-14 | **Proyecto de Google Cloud + OAuth para Google Calendar**, para crear el evento cuando se confirma la fecha de la reunión. Interinamente sobre `nbrotonscongost@gmail.com` (D-26) — falta crear el proyecto y las credenciales OAuth | Función de agendar reunión | Nuria |
| P-15 | **Conexión de la bandeja de Gmail de Baladre** para detectar respuestas automáticamente (RF ampliada: detección de respuestas ya no es "fase 2", se necesita ahora para disparar el email de invitación a reunión, D-17) | Motor de detección de respuestas | Nuria |

## 4. Credenciales y cuentas necesarias

| Servicio | Estado | Coste verificado (21/08/2026) |
|---|---|---|
| Supabase (proyecto nuevo) | ✅ Creado y con esquema aplicado (`ytqjhsbcnswshybhgevc`) | Free: 500 MB, se pausa tras 1 semana sin actividad. Pro desde 25 $/mes |
| Vercel (equipo) | ⬜ | Hobby gratis pero **no comercial**; Pro 20 $/mes |
| Apify (token de API) | ✅ Token guardado en `.env.local` (`APIFY_API_TOKEN`) | Free: 5 $/mes de crédito. Starter 29 $/mes |
| Vibe Prospecting | ✅ Conector conectado y validado el 22/08/2026 | Créditos: 1 por fila en el fetch; enriquecimiento aparte. Precio del crédito sin verificar (P-12) |
| Resend (fase 4) | ⬜ | Free: 3.000 emails/mes, 100/día, 3 dominios |
| Dominio para envío | ⬜ | Depende de P-01 |
| GitHub (repo privado) | ✅ Repo creado y conectado (`github.com/Beniaia/REPOSITORIO-PRUEBA`) | Gratis |
| Zoom (API, OAuth/Server-to-Server) | ⬜ Pendiente (P-13) | Por confirmar |
| Google Cloud / Calendar API | ⬜ Pendiente (P-14) | Gratis dentro de cuota |
| Gmail de Baladre (lectura de respuestas) | ⬜ Pendiente (P-15) | Ya hay MCP de Gmail conectado a nivel de cuenta de Claude; falta confirmar que lee la bandeja correcta de Baladre |
| Gmail (SMTP piloto, envío real) | ✅ Verificación en dos pasos activada, contraseña de aplicación generada y probada con un envío real | Gratis dentro del límite de envío de Gmail (~500/día en cuenta personal) |

Todas las claves van a `.env.local` y a las variables de entorno de Vercel. **Ninguna al repositorio.**

## 5. Riesgos vivos

- **Alucinación de datos.** Es el riesgo que más puede dañar la marca de Baladre: un email a un arquitecto citando un premio que no ganó. Mitigación en el diseño (sin URL no hay señal, sin señal no hay email), pero hay que comprobarlo con lotes reales antes de confiar.
- **Supabase Free se pausa** tras una semana sin actividad. Si la tarea semanal falla dos veces seguidas, el proyecto puede quedarse dormido. Vigilar en las primeras semanas.
- **Coste de tokens del motor** no medido todavía. Hasta que no haya una ejecución real no sabemos el coste por lead. Registrarlo en `ejecuciones.coste_estimado` desde el primer día.
- **Convivencia con el sistema antiguo.** Mientras Relevance AI siga activo, hay dos sitios donde se puede escribir a un lead. Riesgo real de escribir dos veces a la misma persona. Fijar fecha de apagado del sistema anterior.
- **Envío por Gmail personal sin dominio propio (D-22).** Sin SPF/DKIM/DMARC alineados con `baladreceramica.com`, puede caer en spam con destinatarios de política estricta, y Gmail tiene un límite diario de envío (~500). Aceptable para el piloto; no vale para escalar volumen — ahí es donde vuelve a hacer falta resolver P-01 de verdad.

## 6. Siguiente paso concreto

1. ~~Rellenar `.env.local`~~ ✅ hecho el 24/08/2026 — las 8 variables están puestas, en local y en Vercel.
2. ~~Crear al menos un usuario en Supabase Auth~~ ✅ hecho el 23/08/2026, contraseña definitiva puesta por Nuria el 24/08/2026 (D-28).
3. ~~Responder P-05~~ ✅ resuelta (D-24).
4. ~~Desplegar en Vercel~~ ✅ hecho el 24/08/2026 — `repositorio-prueba-ylar.vercel.app`.
5. ~~Migrar el Sheets~~ ✅ no hacía falta (P-06 resuelta).
6. ~~Validar los esquemas de entrada de Apify~~ ✅ hecho el 23/08/2026 (se corrigió un error real).
7. **Resolver P-12**: coste por crédito de `vibe-prospecting` — parcialmente resuelto (precios de los paquetes conocidos, ver `VIBE_PROSPECTING.md` §6), falta saber el plan/saldo actual.
8. Resolver P-13/P-14/P-15 (Zoom, Google Calendar, Gmail de Baladre) — interinos sobre la cuenta de Nuria (D-26), guía paso a paso entregada el 24/08/2026, pendiente de que Nuria cree la app de Zoom y el proyecto de Google Cloud.
9. **Siguiente paso real: ejecutar la skill del motor en modo prueba con 10 leads de Levante.** No se lanza hasta que Nuria lo confirme explícitamente.
10. Pendiente menor: hay dos proyectos de Vercel casi idénticos (`repositorio-prueba` y `repositorio-prueba-ylar`, ambos ligados al mismo repo) — decidir si se borra el que no está en uso.

### Lo que ya funciona hoy (24/08/2026)

- Esquema de Supabase aplicado y verificado (`npm run build`/`lint`/`typecheck` en verde).
- App **desplegada y en producción**: `repositorio-prueba-ylar.vercel.app`, con las 8 variables de entorno configuradas (tras un primer 500 por falta de ellas, diagnosticado con `get_runtime_errors` del MCP de Vercel y corregido).
- `/login` con usuario real (`nbrotonscongost@gmail.com`, contraseña puesta por Nuria), `/baja`, `/leads` (bandeja) y `/leads/[id]` (ficha con permiso de llamada, aprobar/rechazar mensaje y botón "Contactar" gateado).
- `/api/ingest/leads`: valida token + esquema Zod, deduplica, consulta bajas, crea sólo borradores.
- Guardarraíles de envío escritos como triggers en la propia base de datos: no se puede marcar `enviado` sin aprobación (salvo la excepción `invitacion_reunion`), sin permiso de llamada (para `email_1`), ni si el contacto está en `bajas`.

## 7. Registro de sesiones

| Fecha | Qué se hizo | Quién |
|---|---|---|
| 21/08/2026 | Lectura de la presentación estratégica, definición de arquitectura, PRD, CLAUDE.md, esquema SQL y prompt maestro. Verificación de precios de Apify, Resend, Supabase y Vercel | Nuria + Claude |
| 21/08/2026 | Apify pasa a canal principal de descubrimiento: playbook `APIFY.md` con cuatro actores, recetas por segmento y estimación de coste. LinkedIn queda fuera del pipeline (D-11, P-08) | Nuria + Claude |
| 21/08/2026 | Prompt maestro v2, orientado a ahorro de tokens: prompts cortos por hito, reglas de economía de contexto en `APIFY.md` §9 y `CLAUDE.md` §11. Verificado que la API de Apify admite `fields`, `clean` y `limit` | Nuria + Claude |
| 21/08/2026 | Revisión del papel de Google Maps: se limita a hoteles y restauración (D-13). Al intentar probar `vibe-prospecting` se descubre que su conector no está instalado (P-11) | Nuria + Claude |
| 22/08/2026 | Conector de `vibe-prospecting` conectado. **Validación empírica de la cobertura** con consultas reales al ICP de Baladre; documento `VIBE_PROSPECTING.md` con recetas, universos medidos y tres trampas técnicas. Maps sale del ciclo semanal (D-14, D-15, D-16) | Nuria + Claude |
| 23/08/2026 | Repo conectado a GitHub y estructura inicial subida. Ampliación de alcance: seguimiento por respuesta con reunión de Zoom + Google Calendar, permiso telefónico obligatorio, transparencia IA en el email (D-17 a D-21, CLAUDE.md actualizado). Esquema v1.1 aplicado en un proyecto de Supabase ya existente (`ytqjhsbcnswshybhgevc`): tabla `reuniones`, permiso de llamada, triggers de guardarraíles. App Next 16 + React 19 + Tailwind scaffolded (login, bandeja, ficha de lead, `/baja`, endpoint de ingesta); `build`/`lint`/`typecheck` en verde y probado en local. Quedan abiertas P-13/14/15 (Zoom, Calendar, Gmail) y rellenar `SUPABASE_SERVICE_ROLE_KEY` | Nuria + Claude |
| 23/08/2026 | Botón "Contactar" conectado a un envío real por SMTP de Gmail (`lib/email/enviar.ts`, D-22): piloto con el correo personal de Nuria, sin dominio propio. Se reescribe `marcarContactado` para actualizar primero la fila en `mensajes` (donde disparan los guardarraíles de la BD) y sólo enviar el email si esa actualización tiene éxito de verdad; si el envío falla después, el mensaje pasa a `estado='error'` y se puede reintentar desde la ficha. Pendiente de que el usuario active la verificación en dos pasos y genere la contraseña de aplicación de Gmail | Nuria + Claude |
| 23/08/2026 | Primer usuario de Supabase Auth creado (`nbrotonscongost@gmail.com`), insertado directamente vía SQL (`auth.users` + `auth.identities`) con el MCP de Supabase, email confirmado. Contraseña temporal generada y entregada a Nuria en el chat — pendiente de cambiar y de sustituir por el usuario real de Baladre (Eva/María del Mar, P-05) | Nuria + Claude |
| 23/08/2026 | P-05 resuelta (D-24: aprueba quien tenga acceso a la app), despliegue en Vercel pospuesto al final (D-25), Zoom/Calendar interinos sobre la cuenta personal de Nuria (D-26). **Esquemas de entrada de los 3 actores de Apify validados** contra la API real (sin entrar en la consola, con el token ya guardado): se encontró y corrigió un error real en `APIFY.md` — Website Content Crawler usaba nombres de campo que pertenecen a Contact Details Scraper. Consultados los precios reales de `vibe-prospecting` (`show-pricing-plans`) para avanzar P-12 | Nuria + Claude |
| 24/08/2026 | D-25 revertida por D-27: se despliega ya, no al final. `.env.local` completado (`INGEST_SERVICE_TOKEN` generado, `SUPABASE_SERVICE_ROLE_KEY` obtenida del dashboard por Nuria). Contraseña del primer usuario cambiada por Nuria (D-28). Intento de conectar Vercel al repo vía MCP bloqueado primero por permisos, luego por falta de acceso de la app de GitHub al repo — Nuria completó el despliegue manualmente desde el propio panel de Vercel (`repositorio-prueba-ylar`, equipo `nuria-pruebas`). Primer despliegue daba **error 500** por falta de variables de entorno; diagnosticado con `get_runtime_errors` del MCP de Vercel (`Your project's URL and Key are required to create a Supabase client!`, roto en `/middleware`). Nuria añadió las 8 variables en el panel de Vercel; redeploy lanzado con un commit de este mismo archivo para forzarlo vía git. Queda un proyecto duplicado en Vercel (`repositorio-prueba`, sin usar) por limpiar. Guía paso a paso entregada para Zoom (Server-to-Server OAuth) y Google Calendar (proyecto de Google Cloud), ambos interinos sobre la cuenta personal de Nuria — pendientes de que ella los cree | Nuria + Claude |
