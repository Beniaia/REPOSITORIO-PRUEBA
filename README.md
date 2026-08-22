# Sistema de prospección · Baladre Cerámica

Encuentra, cualifica y prepara el contacto con los clientes objetivo de Baladre: estudios de arquitectura e interiorismo, agencias de comunicación y eventos, grupos tipo Vocento, hoteles premium y restauración.

**Nada sale sin que una persona lo apruebe.** Esa regla está escrita en la base de datos, no sólo en el código.

## Los documentos, por orden de lectura

| Archivo | Qué contiene | Cuándo leerlo |
|---|---|---|
| `docs/PRD.md` | Qué se construye y por qué: problema, ICP, alcance, fases, métricas, riesgos | Primero, para entender el producto |
| `docs/ARQUITECTURA.md` | Cómo funciona: las tres capas, el flujo de un lead, el modelo de datos, el scoring, los conectores, el cumplimiento legal | Antes de tocar código |
| `docs/VIBE_PROSPECTING.md` | Cómo se **encuentran** los leads: recetas verificadas por segmento, cobertura real medida y tres trampas que hacen que una consulta devuelva cero | Antes de tocar el motor |
| `docs/APIFY.md` | Cómo se **enriquecen**: actores con sus precios, control de coste, economía de tokens y por qué LinkedIn queda fuera | Antes de tocar el motor |
| `CLAUDE.md` | Instrucciones para Claude Code: stack, estructura, reglas que no se negocian, discurso comercial de Baladre | Siempre está cargado en el repo |
| `docs/ESTADO.md` | Dónde está el trabajo hoy: decisiones, preguntas abiertas, credenciales, siguiente paso | **Se actualiza en cada sesión** |
| `docs/PROMPT_MAESTRO.md` | Los prompts para arrancar, en versión económica: uno corto por hito, el del motor y el de la tarea semanal | Cuando vayas a construir |
| `supabase/schema.sql` | Esquema completo de la base de datos, con RLS y la restricción de aprobación | Al crear el proyecto de Supabase |

## Arranque rápido

1. Crea el proyecto en Supabase y ejecuta `supabase/schema.sql`.
2. Abre esta carpeta con Claude Code y lanza el **Prompt A** de `docs/PROMPT_MAESTRO.md`.
3. Cuando la bandeja funcione, lanza el **Prompt B** en una conversación de Claude para crear el motor.
4. Programa la tarea semanal.
5. La fase de envío real espera a las preguntas P-01 y P-03 de `docs/ESTADO.md`.

## Las tres capas en una línea

`vibe-prospecting` encuentra la empresa y al decisor → Apify lee su web y busca la señal → Supabase guarda → la app en Vercel es donde Eva y María del Mar aprueban.
