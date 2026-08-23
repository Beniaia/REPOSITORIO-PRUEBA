# ESTADO.md — Dónde está el proyecto

> **Este es el documento vivo.** Se actualiza al final de cada sesión de trabajo, tanto si trabajas con Claude Code como si tocas algo a mano.
> Última actualización: **23 agosto 2026** · Fase actual: **F0 en marcha — base de datos aplicada, esqueleto de la app compilando y desplegable, falta cablear credenciales y el motor**

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
| Motor de prospección (skill) | 🟡 Existe una skill previa `prospeccion-baladre`, hay que reescribirla para este sistema |
| Pipeline de Apify | 🟡 Diseñado en `APIFY.md`, sin ejecutar todavía. Falta validar los esquemas de entrada de los actores |
| Descubrimiento con `vibe-prospecting` | ✅ Conector conectado y **cobertura verificada el 22/08/2026** con consultas reales. Recetas en `VIBE_PROSPECTING.md` |
| Tarea programada semanal | ⬜ Pendiente |
| Redacción y aprobación de emails | ⬜ Pendiente |
| Envío real (fase 4) | ⛔ Bloqueado por revisión jurídica y por el dominio |
| Migración del Google Sheets `BALADRE_LEADS` | ⬜ Pendiente |

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

## 3. Preguntas abiertas — bloquean trabajo

| # | Pregunta | Bloquea | Quién decide |
|---|---|---|---|
| P-01 | **Dominio de envío.** Baladre usa Gmail gratuito. ¿Se envía desde `baladreceramica.com` (hay que configurar SPF/DKIM/DMARC) o desde un subdominio tipo `hola.baladreceramica.com`? | Fase 4 | Nuria + Baladre |
| P-02 | **Hosting definitivo.** Vercel Hobby está restringido a uso no comercial (verificado en su documentación). ¿Se paga Pro a 20 $/mes o se busca alternativa (Railway, Render, Supabase Edge Functions)? | Despliegue | Nuria |
| P-03 | **Revisión jurídica LSSI art. 21** para el email B2B en frío | Fase 4 completa | Abogado |
| P-04 | **Directorios sectoriales**: cuáles permiten extracción automatizada según sus términos de uso | Alcance del motor | Nuria, leyendo términos |
| P-05 | **Quién aprueba de verdad**: ¿Eva, María del Mar, las dos, o Nuria en su nombre? Afecta a permisos y a la auditoría | Diseño de auth | Baladre |
| P-06 | **Migración del Sheets**: ¿se migran todos los leads históricos o sólo los activos? ¿Se conservan las bajas registradas? Las bajas **sí o sí** | F0 | Nuria |
| P-07 | **Límite de envíos diarios** una vez arranque la fase 4 | Fase 4 | Nuria |
| P-08 | **LinkedIn.** Nuria lo pidió; yo lo he dejado fuera porque sus condiciones prohíben la extracción automatizada y el riesgo recae sobre una cuenta real. Decidir entre: no usarlo, Sales Navigator de pago, o consulta manual persona a persona | Cobertura de decisores | Nuria + Baladre, con criterio jurídico |
| P-09 | **Plan de Apify.** El Free (5 $/mes de crédito) cubre las pruebas; el ritmo semanal estimado se queda justo por encima. ¿Se sube a Starter (29 $/mes) o se recorta Instagram? | Coste mensual | Nuria, tras medir la primera tanda |
| P-10 | **MCP de Apify**: ¿funciona bien como herramienta desde Claude o se llama por API HTTP? No lo he verificado | Implementación del motor | Comprobar en la primera sesión del motor |
| ~~P-11~~ | ~~Conector de `vibe-prospecting` sin instalar~~ | **RESUELTA el 22/08/2026**: conectado y validado. Ver D-14 |
| P-12 | **Coste real de `vibe-prospecting`.** Confirmado que un fetch de 5 empresas costó 5 créditos (1 por fila) y que el enriquecimiento se cobra aparte, pero no he verificado el precio del crédito ni el plan contratado. Consultar `show-pricing-plans` antes de programar la tarea semanal | Presupuesto mensual y tamaño de la tanda | Nuria |
| P-13 | **Cuenta y credenciales de Zoom** para crear reuniones por API (OAuth o Server-to-Server). No hay cuenta de desarrollador de Zoom todavía | Función de agendar reunión | Nuria |
| P-14 | **Proyecto de Google Cloud + OAuth para Google Calendar**, para crear el evento cuando se confirma la fecha de la reunión | Función de agendar reunión | Nuria |
| P-15 | **Conexión de la bandeja de Gmail de Baladre** para detectar respuestas automáticamente (RF ampliada: detección de respuestas ya no es "fase 2", se necesita ahora para disparar el email de invitación a reunión, D-17) | Motor de detección de respuestas | Nuria |

## 4. Credenciales y cuentas necesarias

| Servicio | Estado | Coste verificado (21/08/2026) |
|---|---|---|
| Supabase (proyecto nuevo) | ✅ Creado y con esquema aplicado (`ytqjhsbcnswshybhgevc`) | Free: 500 MB, se pausa tras 1 semana sin actividad. Pro desde 25 $/mes |
| Vercel (equipo) | ⬜ | Hobby gratis pero **no comercial**; Pro 20 $/mes |
| Apify (token de API) | 🟡 Cuenta ya existente; falta copiar el token a las variables de entorno del motor | Free: 5 $/mes de crédito. Starter 29 $/mes |
| Vibe Prospecting | ✅ Conector conectado y validado el 22/08/2026 | Créditos: 1 por fila en el fetch; enriquecimiento aparte. Precio del crédito sin verificar (P-12) |
| Resend (fase 4) | ⬜ | Free: 3.000 emails/mes, 100/día, 3 dominios |
| Dominio para envío | ⬜ | Depende de P-01 |
| GitHub (repo privado) | ✅ Repo creado y conectado (`github.com/Beniaia/REPOSITORIO-PRUEBA`) | Gratis |
| Zoom (API, OAuth/Server-to-Server) | ⬜ Pendiente (P-13) | Por confirmar |
| Google Cloud / Calendar API | ⬜ Pendiente (P-14) | Gratis dentro de cuota |
| Gmail de Baladre (lectura de respuestas) | ⬜ Pendiente (P-15) | Ya hay MCP de Gmail conectado a nivel de cuenta de Claude; falta confirmar que lee la bandeja correcta de Baladre |

Todas las claves van a `.env.local` y a las variables de entorno de Vercel. **Ninguna al repositorio.**

## 5. Riesgos vivos

- **Alucinación de datos.** Es el riesgo que más puede dañar la marca de Baladre: un email a un arquitecto citando un premio que no ganó. Mitigación en el diseño (sin URL no hay señal, sin señal no hay email), pero hay que comprobarlo con lotes reales antes de confiar.
- **Supabase Free se pausa** tras una semana sin actividad. Si la tarea semanal falla dos veces seguidas, el proyecto puede quedarse dormido. Vigilar en las primeras semanas.
- **Coste de tokens del motor** no medido todavía. Hasta que no haya una ejecución real no sabemos el coste por lead. Registrarlo en `ejecuciones.coste_estimado` desde el primer día.
- **Convivencia con el sistema antiguo.** Mientras Relevance AI siga activo, hay dos sitios donde se puede escribir a un lead. Riesgo real de escribir dos veces a la misma persona. Fijar fecha de apagado del sistema anterior.

## 6. Siguiente paso concreto

1. **Rellenar `.env.local`**: `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project Settings → API) e `INGEST_SERVICE_TOKEN` (inventar una cadena aleatoria larga). Sin esto, `/baja` y `/api/ingest/leads` fallan — ya verificado en local, es el único bloqueo real que queda para que la app funcione de punta a punta.
2. **Crear al menos un usuario en Supabase Auth** (Eva o María del Mar) para poder entrar en `/login` — todavía no hay ninguno.
3. Responder P-05 (quién aprueba, ahora con matiz: el email de invitación a reunión sale solo, D-17).
4. Conectar Vercel al repo de GitHub y desplegar (D-20: Hobby gratuito, con el aviso de uso no comercial sobre la mesa).
5. Migrar el Sheets `BALADRE_LEADS`, empezando por las bajas.
6. **Validar los esquemas de entrada de los actores de Apify** antes de la primera ejecución real.
7. **Resolver P-12**: coste por crédito de `vibe-prospecting`.
8. Resolver P-13/P-14/P-15 (Zoom, Google Calendar, Gmail de Baladre) antes de construir el flujo de reunión automática.
9. Escribir la skill del motor y ejecutar en modo prueba con **10 leads de Levante**.

### Lo que ya funciona hoy (23/08/2026)

- Esquema de Supabase aplicado y verificado (`npm run build`/`lint`/`typecheck` en verde).
- `/login`, `/baja` (probada en local: falla de forma controlada por falta de `SUPABASE_SERVICE_ROLE_KEY`, no por un bug), `/leads` (bandeja) y `/leads/[id]` (ficha con permiso de llamada, aprobar/rechazar mensaje y botón "Contactar" gateado).
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
