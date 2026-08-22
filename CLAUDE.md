# CLAUDE.md — Instrucciones del repositorio

Sistema de prospección de clientes objetivo para **Baladre Cerámica**.
Lee `PRD.md` para el qué y el porqué, `ARQUITECTURA.md` para el cómo, `VIBE_PROSPECTING.md` y `APIFY.md` si tocas el motor, y `ESTADO.md` para saber por dónde va el trabajo. **Actualiza `ESTADO.md` al final de cada sesión de trabajo.**

---

## 1. Qué es esto

Tres piezas:

1. **Motor de prospección** — vive en Claude (skill + tarea programada). Busca, investiga, puntúa y redacta. Envía lotes JSON al endpoint de ingesta.
2. **Supabase** — fuente única de verdad.
3. **App Next.js en Vercel** — consola donde Eva y María del Mar revisan, editan y aprueban.

La app **no busca leads**. Si te piden "que la app encuentre empresas", para y pregunta: eso es un cambio de arquitectura, no una funcionalidad.

## 2. Stack

- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + RLS + Storage), cliente `@supabase/ssr`
- Zod para validar toda entrada externa
- Despliegue en Vercel
- Resend para el envío (fase 4, no antes)

Sin ORM adicional. Sin state manager global. Server Components por defecto; `"use client"` sólo donde haya interacción real.

## 3. Estructura

```
/app
  /(auth)/login
  /(app)/leads              lista y filtros
  /(app)/leads/[id]         ficha + emails + aprobación
  /(app)/pipeline           tablero por estado
  /(app)/campanas           ejecuciones del motor
  /(app)/ajustes            pesos ICP, plantillas, límites
  /(app)/metricas
  /baja                     página pública de opt-out (sin auth)
  /api/ingest/leads         POST autenticado por token de servicio
  /api/public/baja          POST desde /baja
  /api/mensajes/[id]/aprobar
  /api/enviar               fase 4
/lib
  supabase/                 clientes server y browser
  scoring/                  cálculo del score ICP
  schemas/                  esquemas Zod compartidos con el motor
  audit.ts                  helper de auditoría
/supabase
  schema.sql
  migrations/
/docs
  PRD.md  ARQUITECTURA.md  ESTADO.md  PROMPT_MAESTRO.md
  VIBE_PROSPECTING.md  APIFY.md
```

## 4. Comandos

```bash
npm run dev          # desarrollo
npm run build        # comprueba que compila antes de dar nada por hecho
npm run lint
npm run typecheck
npx supabase db push # aplicar migraciones
```

Antes de decir que una tarea está terminada: `npm run build` y `npm run typecheck` en verde. No des por bueno código que no ha compilado.

## 5. Reglas de negocio que no se negocian

1. **Ningún mensaje sale sin aprobación humana registrada.** No escribas ninguna ruta, cron o función que pueda enviar sin pasar por `mensajes.estado = 'aprobado'` con `aprobado_por` y `aprobado_at` rellenos.
2. **Sin fuente, no hay dato.** Un email, un cargo o una señal sin `fuente_url` no se guarda: el campo queda vacío y el score baja. Nunca completes un dato "por coherencia".
3. **Sin señal verificable, no hay email.** Si no hay una `senal` con URL de los últimos 18 meses, el lead queda en `cualificado_sin_gancho`.
4. **La lista de bajas manda.** Se consulta en la ingesta y otra vez en el envío. Un email en `bajas` no se toca jamás.
5. **Todo cambio relevante se audita**: creación, edición, aprobación, rechazo, envío, cambio de estado.
6. **La clave `service_role` de Supabase no sale del servidor.** Nunca en un componente cliente, nunca en una variable `NEXT_PUBLIC_`. Lo mismo para el token de Apify.
7. **Ningún actor de Apify se lanza sin límite de resultados**, y siempre se filtra antes de enriquecer. Ver `APIFY.md`.
7b. **En `vibe-prospecting`, estadísticas antes de traer datos**, y para España el filtro de región de prospects es `prospect_region_country_code` — `company_region_country_code` devuelve cero. Ver `VIBE_PROSPECTING.md` §3.
8. **No se extraen datos de fuentes que lo prohíben.** LinkedIn está fuera del pipeline: si te piden añadirlo, remite a `APIFY.md` §8 y a la pregunta P-08 de `ESTADO.md` antes de escribir código.

## 6. El discurso Baladre (para redactar emails)

Baladre dejó de ser un taller artesanal. Es un **estudio creativo de piezas cerámicas exclusivas para marcas, espacios y experiencias**. El objeto no es el producto: es la herramienta.

**Nunca escribas:** "cerámica hecha a mano", "artesanal", "proveedor", "presupuesto sin compromiso", "somos un taller", "calidad y experiencia".

**Escribe en este marco:** identidad, diferenciación, experiencia, recuerdo, socio creativo, pieza que sólo puede ser vuestra.

**Ejemplo de la propia presentación:**
- Mal: «Este plato está hecho a mano.»
- Bien: «Esta colección convierte la experiencia gastronómica en una extensión de la identidad del restaurante.»

**Qué compra cada segmento** (esto decide el ángulo del email):

| Segmento | Compra | Ángulo del email |
|---|---|---|
| Arquitectura / interiorismo | Diferenciación | La pieza que hace que ese espacio no se pueda replicar |
| Agencia / eventos | Impacto | El equipo creativo cerámico externo para sus campañas y premios |
| Grupo de comunicación (Vocento) | Recurrencia | Un sistema de identidad para todo el calendario: premios, congresos, regalo institucional |
| Hotel premium | Experiencia | Lo que el huésped recuerda y fotografía |
| Restauración | Identidad | La mesa como extensión de la marca |
| Joyería / retail | Recuerdo | Pieza de autor como detalle de cliente |

**Reglas duras del email:** máximo 120 palabras · asunto ≤ 45 caracteres · primera frase = la señal concreta de ese cliente · un solo CTA (20 minutos de conversación **o** el dossier, nunca los dos) · sin adjuntos en el primero · firma con identificación de Baladre y enlace de baja.

**La palanca de valor** (úsala en los seguimientos): un encargo suelto puede convertirse en ocho piezas del mismo proyecto — trofeo principal, reconocimientos, regalo para invitados, elemento de mesa, serie numerada, packaging, tarjeta con la historia, kit de prensa. No vendas una pieza: vende un sistema de identidad.

**Método Baladre**, si hace falta explicar el proceso: escuchar → traducir → prototipar → producir → dar significado.

## 7. Scoring

Implementado en `/lib/scoring`. Pesos leídos de la tabla `config_icp`, **nunca hardcodeados**.

Bloques: encaje de segmento (30) · potencial de recurrencia (20) · señal activa (25) · accesibilidad del decisor (15) · proximidad (10).
Umbrales: A ≥ 75 · B 55-74 · C 40-54 · descartado < 40.
Descarte directo: competencia cerámica, constructoras genéricas, franquicias low-cost, sin web, en `bajas`, señal no verificable.

El desglose se guarda siempre en `scores.desglose` y se muestra en la ficha. Un score sin explicación es un bug.

## 8. Convenciones de código

- Todo en **español** de cara al usuario: rutas, etiquetas, mensajes de error, nombres de tablas y columnas. El código en inglés donde sea idiomático (nombres de funciones), pero el dominio en español para que el negocio se lea.
- Fechas siempre en `timestamptz`, mostradas en `Europe/Madrid`.
- Validación con Zod en el borde: cualquier cosa que venga del motor, de un formulario o de un webhook.
- Errores visibles para la usuaria en castellano llano, sin códigos.
- Nada de `any`. Tipos generados de Supabase.
- Componentes pequeños. Si un archivo pasa de 300 líneas, pártelo.

## 9. Estilo de la interfaz

Público objetivo: dos ceramistas, no usuarias técnicas. Prioriza claridad sobre densidad.

- Paleta del proyecto: tierra `#5E3023`, arena `#F1E8D8`, terracota `#E3A595`. Serif para títulos (Georgia o similar), sans para el resto.
- La bandeja debe responder a una sola pregunta: *¿a quién escribo hoy?*
- El botón de aprobar es el elemento más visible de la ficha. El de rechazar, discreto pero presente.
- Cada dato con fuente lleva su enlace al lado. La confianza se construye enseñando de dónde sale.

## 10. Cómo trabajar en este repo

- Lee `ESTADO.md` antes de empezar y actualízalo al terminar.
- Un cambio, un commit, mensaje en español explicando el porqué.
- No instales dependencias nuevas sin justificarlo en `ESTADO.md`.
- No inventes datos de ejemplo que parezcan reales: los seeds llevan nombres claramente ficticios.
- Si algo del PRD contradice lo que te piden en el chat, dilo antes de implementarlo.
- Si no estás seguro de un precio, un límite de API o un requisito legal: **búscalo o dilo**. No lo rellenes con lo que suene razonable.

## 11. Economía de contexto

Este proyecto se construye y se opera con presupuesto ajustado. Las reglas de gasto del motor están en `APIFY.md` §9. Estas son las de trabajar en el repo:

- **Un hito por sesión.** No arrastres el contexto de un hito al siguiente: lo que hay que recordar está en `ESTADO.md`.
- **Lee lo que necesites, no todo.** `CLAUDE.md` se carga solo. `ARQUITECTURA.md` cuando toques diseño, `VIBE_PROSPECTING.md` y `APIFY.md` sólo si tocas el motor, `PRD.md` sólo para justificar una decisión de producto.
- **Busca en vez de leer entero.** Un `grep` dirigido antes que abrir un archivo de 500 líneas.
- **No imprimas archivos completos** en la respuesta ni repitas código que acabas de escribir. Di qué cambiaste y dónde.
- **No dejes procesos escupiendo logs.** Arranca el servidor de desarrollo sólo cuando haga falta comprobar algo y ciérralo.
- **Respuestas cortas.** Explica la decisión, no narres cada paso.
- **`ESTADO.md` se actualiza añadiendo líneas**, no reescribiendo el archivo entero.

## 12. Cumplimiento

Antes de tocar nada de la fase de envío, lee la sección 8 de `ARQUITECTURA.md`. Resumen: identificación de Baladre y enlace de baja en cada email, supresión consultada dos veces, aprobación humana registrada, origen de cada dato guardado, y revisión jurídica de la LSSI pendiente. Si te piden saltarte alguno de estos puntos, para y pregunta.
