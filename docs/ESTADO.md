# ESTADO.md — Dónde está el proyecto

> **Este es el documento vivo.** Se actualiza al final de cada sesión de trabajo, tanto si trabajas con Claude Code como si tocas algo a mano.
> Última actualización: **22 agosto 2026** · Fase actual: **F0 — documentación cerrada y fuente de datos validada, sin código todavía**

---

## 1. Semáforo

| Bloque | Estado |
|---|---|
| Documentación (PRD, arquitectura, CLAUDE.md) | ✅ Hecho |
| Esquema de base de datos | 🟡 Escrito (`supabase/schema.sql`), sin aplicar |
| Proyecto Supabase creado | ⬜ Pendiente |
| Repo Next.js inicializado | ⬜ Pendiente |
| Endpoint de ingesta | ⬜ Pendiente |
| Consola de leads | ⬜ Pendiente |
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

## 4. Credenciales y cuentas necesarias

| Servicio | Estado | Coste verificado (21/08/2026) |
|---|---|---|
| Supabase (proyecto nuevo) | ⬜ | Free: 500 MB, se pausa tras 1 semana sin actividad. Pro desde 25 $/mes |
| Vercel (equipo) | ⬜ | Hobby gratis pero **no comercial**; Pro 20 $/mes |
| Apify (token de API) | 🟡 Cuenta ya existente; falta copiar el token a las variables de entorno del motor | Free: 5 $/mes de crédito. Starter 29 $/mes |
| Vibe Prospecting | ✅ Conector conectado y validado el 22/08/2026 | Créditos: 1 por fila en el fetch; enriquecimiento aparte. Precio del crédito sin verificar (P-12) |
| Resend (fase 4) | ⬜ | Free: 3.000 emails/mes, 100/día, 3 dominios |
| Dominio para envío | ⬜ | Depende de P-01 |
| GitHub (repo privado) | ⬜ | Gratis |

Todas las claves van a `.env.local` y a las variables de entorno de Vercel. **Ninguna al repositorio.**

## 5. Riesgos vivos

- **Alucinación de datos.** Es el riesgo que más puede dañar la marca de Baladre: un email a un arquitecto citando un premio que no ganó. Mitigación en el diseño (sin URL no hay señal, sin señal no hay email), pero hay que comprobarlo con lotes reales antes de confiar.
- **Supabase Free se pausa** tras una semana sin actividad. Si la tarea semanal falla dos veces seguidas, el proyecto puede quedarse dormido. Vigilar en las primeras semanas.
- **Coste de tokens del motor** no medido todavía. Hasta que no haya una ejecución real no sabemos el coste por lead. Registrarlo en `ejecuciones.coste_estimado` desde el primer día.
- **Convivencia con el sistema antiguo.** Mientras Relevance AI siga activo, hay dos sitios donde se puede escribir a un lead. Riesgo real de escribir dos veces a la misma persona. Fijar fecha de apagado del sistema anterior.

## 6. Siguiente paso concreto

1. Responder P-02 (hosting) y P-05 (quién aprueba). Son las dos que bloquean el arranque.
2. Crear el proyecto de Supabase y aplicar `supabase/schema.sql`.
3. Lanzar el prompt maestro (`PROMPT_MAESTRO.md`) en Claude Code para levantar F0 + F1.
4. Migrar el Sheets `BALADRE_LEADS`, empezando por las bajas.
5. **Validar los esquemas de entrada de los actores de Apify** antes de la primera ejecución real (los nombres de campo de `APIFY.md` son un borrador tomado de sus páginas públicas).
6. **Resolver P-12**: mirar el plan y el coste por crédito de `vibe-prospecting` antes de programar nada recurrente.
7. Ejecutar el motor en modo prueba con **10 leads de Levante**, medir el coste real de la tanda y revisar uno por uno la calidad antes de escalar.

## 7. Registro de sesiones

| Fecha | Qué se hizo | Quién |
|---|---|---|
| 21/08/2026 | Lectura de la presentación estratégica, definición de arquitectura, PRD, CLAUDE.md, esquema SQL y prompt maestro. Verificación de precios de Apify, Resend, Supabase y Vercel | Nuria + Claude |
| 21/08/2026 | Apify pasa a canal principal de descubrimiento: playbook `APIFY.md` con cuatro actores, recetas por segmento y estimación de coste. LinkedIn queda fuera del pipeline (D-11, P-08) | Nuria + Claude |
| 21/08/2026 | Prompt maestro v2, orientado a ahorro de tokens: prompts cortos por hito, reglas de economía de contexto en `APIFY.md` §9 y `CLAUDE.md` §11. Verificado que la API de Apify admite `fields`, `clean` y `limit` | Nuria + Claude |
| 21/08/2026 | Revisión del papel de Google Maps: se limita a hoteles y restauración (D-13). Al intentar probar `vibe-prospecting` se descubre que su conector no está instalado (P-11) | Nuria + Claude |
| 22/08/2026 | Conector de `vibe-prospecting` conectado. **Validación empírica de la cobertura** con consultas reales al ICP de Baladre; documento `VIBE_PROSPECTING.md` con recetas, universos medidos y tres trampas técnicas. Maps sale del ciclo semanal (D-14, D-15, D-16) | Nuria + Claude |
