# PROMPT MAESTRO — versión económica

> Versión 2.0 · 21 agosto 2026. Sustituye a la v1, que era un prompt gigante de una sola pieza.

## El principio

**Un prompt largo no es el problema; un contexto largo sí.** El prompt se lee una vez y cuesta unos pocos miles de tokens. Lo caro es la sesión entera: los archivos que el agente relee, los datasets que se traga, las respuestas que repite.

Por eso la v2 hace tres cosas:

1. **El conocimiento vive en los archivos del repo, no en el prompt.** `CLAUDE.md` se carga solo al abrir Claude Code: todo lo que esté ahí no hay que repetirlo nunca más.
2. **Un prompt corto por hito, con la sesión limpia entre uno y otro.** Siete sesiones baratas en vez de una carísima.
3. **El motor filtra con código antes de pensar con el modelo.** Es donde está el 90 % del ahorro real.

Resultado en el propio documento: de ~1.800 palabras a ~700. Pero el ahorro de verdad está en el punto 3, no aquí.

---

## PARTE A — Construir la app, hito a hito

**Preparación (una vez):** deja en la carpeta `PRD.md`, `ARQUITECTURA.md`, `APIFY.md`, `CLAUDE.md`, `ESTADO.md` y `supabase/schema.sql`. Crea el proyecto de Supabase y aplica el esquema.

**Regla de uso:** un hito por sesión. Al terminar cada uno, `/clear` antes del siguiente. Arrastrar el contexto del hito 1 hasta el hito 7 multiplica el gasto sin aportar nada: lo que hace falta recordar ya está escrito en `ESTADO.md`.

### Arranque (sólo la primera sesión)

```
Lee CLAUDE.md, ARQUITECTURA.md y ESTADO.md. El PRD sólo si necesitas justificar una
decisión de producto; APIFY.md sólo si tocas el motor.

Vas a construir la app del sistema de prospección de Baladre en siete hitos. Los tengo
listados abajo. Hoy hacemos el 1. Al terminar: build y typecheck en verde, ESTADO.md
actualizado y commit.

HITOS
1. Fundaciones: Next.js + TS + Tailwind + shadcn, clientes de Supabase server/browser,
   tipos generados, login por email sin registro público, layout con la paleta del proyecto.
2. Ingesta: POST /api/ingest/leads con token de servicio, validación Zod, deduplicación por
   dominio y email, rechazo contra la tabla bajas, registro en ejecuciones y auditoria,
   respuesta con resumen. Con tests.
3. Bandeja y ficha: /leads desde la vista v_bandeja con filtros; /leads/[id] con score
   desglosado, señales enlazadas a su fuente y borradores. Cambio de estado auditado.
4. Aprobación: editor de email, botones aprobar/rechazar/guardar, cola /aprobados.
5. Baja pública y pipeline: /baja sin login; /pipeline por estados.
6. Métricas y ajustes: embudo, conversión, coste; edición de config_icp.
7. Despliegue: .env.example, README de despliegue, build limpio.

Empieza por el 1.
```

### Hitos siguientes (una sesión nueva cada uno)

```
Lee CLAUDE.md y ESTADO.md. Haz el hito N: <pega la línea del hito>.
Al terminar: build y typecheck en verde, ESTADO.md actualizado y commit.
```

Eso es todo. Si el agente necesita más contexto, lo busca él en los archivos — y busca sólo lo que necesita, que es justo lo que queremos.

---

## PARTE B — El motor de prospección

Se crea una vez con `skill-creator`, en una conversación de Claude (no en Claude Code).

```
Crea con skill-creator una skill llamada "prospeccion-baladre-v2": el motor de prospección
de Baladre Cerámica. Toda la especificación está en estos archivos, que la skill debe
resumir en sus instrucciones, no copiar entera:
- VIBE_PROSPECTING.md: recetas de descubrimiento verificadas, cobertura real por segmento
  y las tres trampas del apartado 3. Sáltatelas y las consultas devolverán cero.
- APIFY.md: pipeline de enriquecimiento, actores, límites de coste y las reglas de
  economía de contexto de la sección 9. Son obligatorias.
- ARQUITECTURA.md §5 y §6: modelo de scoring y reglas de redacción.
- CLAUDE.md §6: el discurso comercial de Baladre.

FLUJO DE LA SKILL
1. Descubrir con vibe-prospecting: empresa y decisor con email, filtrando por sector,
   región y tamaño según las recetas de VIBE_PROSPECTING.md §4. Mira siempre las
   estadísticas antes de traer datos. Los grupos tipo Vocento van por lista nominal.
2. Filtrar con código, sin modelo: competencia, franquicias, sin web, ya en la base.
3. Enriquecer sólo lo que sobrevive: contacto y contenido de la web; Instagram únicamente
   para nivel A sin señal.
4. Puntuar por lotes con los pesos de config_icp. Guardar desglose y motivo.
5. Redactar, uno a uno, sólo si hay señal con URL verificable.
6. Enviar el lote a POST /api/ingest/leads con el coste real de la ejecución.

REGLAS DURAS
- Ningún actor sin límite de resultados.
- Si falta un dato, se deja vacío. Nunca se deduce.
- Sin señal verificable no hay email: el lead queda como cualificado_sin_gancho.
- LinkedIn fuera del pipeline (APIFY.md §8).
- Cada dato con su fuente y su URL.
- Antes de la primera ejecución real, valida en Apify el esquema de entrada de los actores.

MODOS: semanal (10-20 leads), bajo demanda, reenriquecimiento.
CRITERIO: calidad sobre volumen. Si una tanda no da nada que cumpla el listón, entrega
menos y dilo.
```

### Tarea programada semanal

```
Ejecuta prospeccion-baladre-v2 en modo semanal. Levante primero, señales de las últimas
4 semanas. Envía el lote a la ingesta. Responde SÓLO tres líneas: cuántos leads, de qué
segmentos, y cuál es el mejor. No listes los leads ni pegues el JSON.
```

Esas tres últimas frases importan: una tanda de 20 leads listada entera en la respuesta son varios miles de tokens de salida cada semana, para algo que ya está en la app.

---

## Las siete reglas de ahorro

Están donde tienen que estar —`CLAUDE.md` §11 para la app y `APIFY.md` §9 para el motor— pero conviene tenerlas juntas:

| # | Regla | Dónde ahorra |
|---|---|---|
| 1 | Pedir a Apify sólo los campos que se usan (`fields=`) | El mayor ahorro individual del sistema |
| 2 | Filtrar con código antes de razonar con el modelo | Evita pensar sobre lo que se va a descartar |
| 3 | Truncar el contenido de cada web a lo útil | Una web entera en contexto es dinero tirado |
| 4 | Puntuar por lotes, redactar uno a uno | Lo mecánico se agrupa; lo que da valor, no |
| 5 | Investigar cada lead en un subagente que devuelve sólo la ficha | El contexto principal no se llena de basura |
| 6 | No repetir en la respuesta lo que ya está en la base de datos | Tokens de salida, cada semana |
| 7 | Una sesión por hito y `/clear` entre medias | El contexto no se arrastra |

---

## Orden recomendado

1. Supabase creado y esquema aplicado.
2. Parte A, hitos 1 a 3 → ya se ven leads.
3. Parte B → el motor empieza a llenar la base.
4. Parte A, hitos 4 a 7.
5. Tarea programada semanal.
6. Fase de envío sólo cuando P-01 y P-03 de `ESTADO.md` estén resueltas.
