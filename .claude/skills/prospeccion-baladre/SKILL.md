---
name: prospeccion-baladre
description: Prospecta una tanda de leads ICP para Baladre Cerámica (arquitectura/interiorismo, agencias de comunicación y eventos, grupos tipo Vocento, hoteles premium, restauración, joyería), los enriquece, los puntúa y redacta el primer email de cada uno, y los envía al endpoint de ingesta de la app para que aparezcan en la bandeja. Úsala cuando te pidan prospección, una tanda de leads, o "prospecta N leads" para Baladre.
---

# Prospección ICP — Baladre Cerámica (sistema Supabase + Next.js)

Esta skill sustituye a la versión anterior del mismo nombre (la que escribía en Google Sheets — sigue viva en `agente-prospeccion-baladre/` hasta que se apague oficialmente, D-01). Esta versión **no toca ninguna hoja ni ningún archivo**: descubre, enriquece, puntúa, redacta, y entrega el lote entero al endpoint de ingesta de la app, que es quien de verdad guarda los datos.

Antes de ejecutar, lee (no los repitas en el chat, ya los tienes en el repo): `CLAUDE.md` (reglas de negocio y de redacción, no negociables), `docs/VIBE_PROSPECTING.md` (recetas de descubrimiento y las tres trampas), `docs/APIFY.md` (actores, IDs, control de coste), `lib/schemas/ingest.ts` (la forma exacta del JSON que espera el endpoint).

## Objetivo de una tanda

**10 leads** por defecto (parámetro; si te piden otro número, úsalo). Reparto orientativo según el peso comercial del PRD — no es una cuota rígida, prioriza calidad sobre encajar el número exacto:

| Segmento | Nº orientativo |
|---|---|
| Arquitectura / interiorismo | 3 |
| Agencias de comunicación y eventos | 3 |
| Grupos tipo Vocento | 2 |
| Hoteles premium | 1 |
| Restauración / joyería | 1 |

Geografía: Levante primero (Alicante, Valencia, Murcia). Sólo amplía a Madrid/Barcelona/resto de España si Levante no da suficientes candidatas de calidad.

## De dónde sale el número de leads y cuándo ejecutar

**Nunca prospectes "porque sí".** Esta skill sólo se ejecuta cuando alguien lo ha pedido explícitamente, en el chat o desde la app — nunca por iniciativa propia ni con una fecha fija de cron (así lo decidió Nuria, ver `ESTADO.md`).

- Si te piden explícitamente "prospecta N leads" en el chat, usa ese número y no mires la cola de solicitudes.
- Si te invocan sin ese detalle (por ejemplo, "revisa si hay algo que prospectar"), consulta la tabla `solicitudes_prospeccion` con el MCP de Supabase:
  ```sql
  select id, tipo, numero_leads, para_cuando
  from solicitudes_prospeccion
  where estado = 'pendiente'
    and (tipo = 'inmediata' or para_cuando <= now())
  order by creado_en asc
  limit 1;
  ```
  - Si hay una fila: márcala `en_proceso` (`update solicitudes_prospeccion set estado = 'en_proceso' where id = '...'`) y usa su `numero_leads` como objetivo de la tanda. Al terminar el paso 7, márcala `completada` con el `ejecucion_id` que te haya devuelto el endpoint de ingesta.
  - Si no hay ninguna fila: no hay nada pendiente. Dilo en el chat y para ahí — no improvises una tanda sin que nadie la haya pedido.

## Configuración que necesitas antes de empezar

Si falta cualquiera de estas, **para y dilo en el chat** en vez de improvisar:

- Acceso al MCP de Supabase de este proyecto (`project_id` de `PROSPECCION CLAUDE`, ya usado en esta sesión).
- `APIFY_API_TOKEN` en el entorno (para llamar a `api.apify.com` con `curl`).
- La URL pública del endpoint de ingesta (`https://.../api/ingest/leads`) y `INGEST_SERVICE_TOKEN` — sólo existen una vez la app esté desplegada en Vercel y esas variables estén rellenas. Si la app todavía no está desplegada, no tiene sentido ejecutar esta skill hasta entonces: dilo y para ahí.
- El conector de `vibe-prospecting` (ya conectado y validado en este proyecto).

## Flujo de trabajo

### 0. Leer el estado actual antes de gastar nada

Con el MCP de Supabase (`execute_sql` o equivalente):
- `select clave, valor from config_icp` — los pesos de scoring, **nunca hardcodeados**.
- `select dominio from empresas` y `select lower(email) from contactos` — para no reprocesar lo que ya existe.
- `select lower(email), lower(dominio) from bajas` — lista de supresión completa.

Guarda estos tres conjuntos en memoria de trabajo para todo el resto del flujo. No hace falta traer más columnas de las que uses.

### 1. Descubrimiento con `vibe-prospecting`

Para cada segmento de la tanda: **estadísticas antes de traer datos** (`fetch-entities-statistics`), y sólo si el universo es razonable, `fetch-entities` con las recetas exactas de `VIBE_PROSPECTING.md` §4 (categorías vía autocompletado, `prospect_region_country_code` para España — nunca `company_region_country_code`, que da 0 — y siempre `has_contact_details: "email"`).

Grupos tipo Vocento no se buscan por consulta: se trabajan con la lista nominal + búsqueda web sobre su calendario de premios y eventos (`WebSearch`).

Pide más candidatas de las que necesitas (2-3x), porque el filtro del siguiente paso descarta.

### 2. Filtrar antes de enriquecer

Descarta, con código/lógica simple, sin gastar en Apify:
- Empresas cuyo dominio ya está en `empresas` (paso 0).
- Contactos cuyo email ya está en `contactos` (paso 0).
- Cualquier email o dominio en `bajas` (paso 0) — **nunca se procesan, ni para leer**.
- Descartes automáticos del ICP: competencia cerámica, franquicias, constructoras genéricas, sin web (ver `config_icp.descartes` y `CLAUDE.md` §7).

Sólo las que sobreviven este filtro pasan al enriquecimiento. Esto es lo que hace que la tanda quepa en presupuesto (`APIFY.md` §2).

### 3. Enriquecer con Apify

Vía `curl` a `api.apify.com` (no hay MCP dedicado; usa `Bash`), con `APIFY_API_TOKEN`, los actores y payloads exactos de `APIFY.md` §3-4:
- **Contact Details Scraper** — email/teléfono desde la web, si `vibe-prospecting` no trajo email nominal.
- **Website Content Crawler** — contenido de la web (proyectos, "sobre nosotros") para entender el encaje y buscar el gancho. Límite de páginas por web, siempre puesto (`maxRequestsPerStartUrl`).

**Nunca lances un actor sin límite de resultados** (regla 7 de `CLAUDE.md`). Antes de la primera ejecución real, abre el esquema de entrada de cada actor en Apify y confirma los nombres de campo — `APIFY.md` avisa de que son un borrador tomado de sus páginas públicas.

### 4. Señal — el motivo para escribir ahora

Sólo para las que, tras el paso 3, todavía no tienen un gancho claro: **Instagram Scraper** (últimos 6 meses, límite de posts puesto), o búsqueda web para premios/aperturas/reformas recientes.

**Regla dura**: la señal necesita una URL verificable de los últimos 18 meses. Sin eso, el lead sigue adelante pero **sin `mensajes`** — quedará como `cualificado_sin_gancho` en la app (RF-05). No inventes una señal para rellenar.

### 5. Puntuar

Aplica la fórmula de `ARQUITECTURA.md` §5 con los pesos leídos en el paso 0 (`config_icp`), no con los números fijos del documento — si alguien los ha cambiado desde la app, esos son los que mandan. Descarta (no envíes a ingesta) cualquier lead que quede por debajo del umbral de "descartado".

### 6. Redactar el email de primer contacto

Uno por lead, tipo `email_1`, siguiendo **al pie de la letra** las reglas de `CLAUDE.md` §6: máximo 120 palabras, asunto ≤ 45 caracteres, primera frase = la señal concreta, ángulo según segmento (tabla de `CLAUDE.md` §6), un solo CTA (videollamada de 15 minutos, que el destinatario proponga fecha), sin adjuntos, aviso de que lo redacta un asistente de IA en nombre de Baladre, firma con identificación de Baladre y mención de que se puede pedir no recibir más correos (el botón real lo añade la app al enviar, aquí basta con que el texto lo contemple).

Si un lead no tiene señal (paso 4), no le generes email — el array `mensajes` de ese lead va vacío.

### 7. Montar el lote y enviarlo a ingesta

Construye el JSON exactamente con la forma de `loteIngestSchema` (`lib/schemas/ingest.ts`): `{ ejecucion: { tipo: "semanal" | "manual", parametros }, leads: [{ empresa, contacto, senales, score, mensajes }] }`.

Envíalo con `curl` (Bash):

```bash
curl -s -X POST "$INGEST_URL" \
  -H "Authorization: Bearer $INGEST_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d @lote.json
```

Lee la respuesta (`leads_nuevos`, `leads_duplicados`, `leads_en_baja`) — trae también `ejecucion_id`. Si hay error de validación, corrígelo y reintenta — no le des la vuelta al esquema para que "pase".

Si esta tanda venía de una fila de `solicitudes_prospeccion` (sección anterior), márcala ahora `completada` con ese `ejecucion_id`:
```sql
update solicitudes_prospeccion set estado = 'completada', ejecucion_id = '...' where id = '...';
```

### 8. Resumen final en el chat

Breve: cuántos leads nuevos por segmento, cuáles son nivel A, cuáles se quedaron sin gancho, y el coste estimado de Apify de esta tanda (para que se pueda comparar con la estimación de `APIFY.md` §5). No repitas el JSON entero.

## Límites que no se negocian

- **Nunca marques nada como `enviado`.** Esta skill sólo crea `borrador`. El envío es un botón humano en la app.
- **Nunca inventes un email, cargo o URL.** Sin fuente, el campo va vacío y el score baja — no lo rellenes "por coherencia".
- **LinkedIn fuera del pipeline.** Sus condiciones prohíben la extracción automatizada (`APIFY.md` §8).
- Si Apify o `vibe-prospecting` fallan a mitad de tanda, entrega lo que ya tengas válido en vez de perder todo el trabajo — anótalo en el resumen.
