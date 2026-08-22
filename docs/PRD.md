# PRD — Sistema de prospección de clientes objetivo · Baladre Cerámica

> Versión 1.0 · 21 agosto 2026 · Autora del encargo: Nuria · Cliente: Baladre Cerámica (Eva y María del Mar)
> Documento de producto. El diseño técnico está en `ARQUITECTURA.md`; el estado vivo en `ESTADO.md`.

---

## 1. Contexto

Baladre Cerámica es un estudio de Alicante, en activo desde 1995, con dos ceramistas y treinta años de oficio. Su plan estratégico 2026-2028 cambia el posicionamiento: deja de venderse como **taller artesanal** y pasa a **estudio creativo de piezas cerámicas exclusivas para marcas, espacios y experiencias**.

Ese cambio tiene una consecuencia comercial concreta: el crecimiento no viene de vender más piezas, sino de construir **relaciones recurrentes con prescriptores**. Un solo estudio de arquitectura abre hoteles, restaurantes y espacios; una sola agencia puede necesitar piezas cada año para premios, eventos y regalos corporativos.

El roadmap de 90 días de la presentación fija el objetivo: **150 contactos → 10 reuniones → 3 pilotos**. Hoy ese trabajo es manual y no se hace.

## 2. Problema

Baladre no tiene un problema de producto ni de discurso: tiene la obra y ahora tiene el relato. Tiene un problema de **sistema de contacto**.

1. Encontrar a las empresas correctas exige investigar una por una (¿este estudio hace obra hotelera? ¿esta agencia organiza premios?). Es lento y nadie lo hace.
2. Cuando aparece un buen momento para escribir (un premio, una apertura, una reforma), nadie se entera.
3. Escribir un email que suene a socio creativo y no a proveedor cuesta 20 minutos por lead.
4. No hay memoria: se pierde a quién se escribió, qué se dijo y cuándo toca volver.

## 3. Objetivo del producto

Convertir el roadmap comercial de la presentación en un sistema que funcione todas las semanas sin que Eva y María del Mar dejen el torno.

**Objetivo medible (primeros 90 días de uso):**

| Métrica | Meta |
|---|---|
| Leads cualificados nivel A o B en la base | 150 |
| Emails aprobados y enviados | 100 |
| Tasa de respuesta | ≥ 8 % *(estimación de partida, a recalibrar con datos reales — no tengo un benchmark verificado del sector)* |
| Reuniones conseguidas | 10 |
| Proyectos piloto | 3 |
| Tiempo humano por lead | < 3 minutos (revisar y aprobar) |

## 4. Usuarios

| Usuario | Qué hace en el sistema |
|---|---|
| **Eva / María del Mar** | Revisan la bandeja, contrastan la señal, editan el email si hace falta, aprueban, mueven el lead en el pipeline |
| **Nuria (administradora)** | Lanza campañas bajo demanda, ajusta el ICP y los pesos de scoring, revisa métricas y coste |
| *(No hay más roles.)* El sistema es de un solo cliente: Baladre. |

## 5. Cliente ideal (ICP)

Traducción literal de la diapositiva 09 y del reparto de esfuerzo comercial de la presentación.

| Nivel | Segmento | Esfuerzo | Qué compra realmente |
|---|---|---|---|
| **A** | Estudios de arquitectura e interiorismo | 30 % | Diferenciación |
| **A** | Agencias de comunicación y eventos | 25 % | Impacto |
| **A** | Grupos de comunicación y marketing (modelo Vocento) | 25 % | Recurrencia: premios, congresos, patrocinios, hospitality |
| **B** | Hoteles premium | 10 % | Experiencia |
| **C** | Restauración | 5 % | Identidad |
| **C** | Joyería / retail de autor | 5 % | Recuerdo |

**Geografía:** primero Levante (Alicante, Valencia, Murcia), donde la proximidad permite invitar al taller. Después el resto de España, con foco en Madrid y Barcelona para agencias y grupos.

**Prioridad de calidad sobre volumen**, decidido explícitamente: mejor 20 leads con señal real que 150 de directorio.

**Empresas a replicar** (de la diapositiva 13): Vocento, LLYC, Atrevia en primera prioridad; PRISA, Atresmedia, Havas, Ogilvy, McCann en segunda; MCI Group, Eventoplus y agencias premium de eventos en tercera.

## 6. Alcance

### Dentro del alcance

- **F1 · Descubrir**: encontrar empresas del ICP **y a la persona que decide, con su email**, por sector, región y tamaño, usando `vibe-prospecting`. Los grupos tipo Vocento se trabajan con lista nominal. Recetas verificadas y cobertura medida en `VIBE_PROSPECTING.md`.
- **F2 · Investigar y enriquecer**: web, proyectos publicados, decisor y su cargo, email, y sobre todo **la señal**: el motivo por el que escribir ahora. También con Apify (extracción de contacto y lectura de la web), tras un filtro previo que descarta lo que no encaja **antes** de gastar en enriquecerlo.
- **F3 · Cualificar**: score 0-100 y nivel A/B/C con desglose explicable. Nada de "el modelo dice que sí".
- **F4 · Redactar**: borrador de primer email y dos seguimientos, en el discurso Baladre, anclados en la señal verificable.
- **F5 · Revisar y aprobar**: consola donde una persona lee, edita, aprueba o rechaza. Todo queda en auditoría.
- **F6 · Pipeline y métricas**: estados del lead, siguiente acción, embudo y conversión.

### Fuera del alcance ahora (fase 2, ya diseñada)

- Envío real de los emails desde la app y secuencias de seguimiento automáticas.
- Detección automática de respuestas.
- Multi-cliente / white-label.
- Agente de voz o chat (eso es Lola, otro proyecto).

### Explícitamente descartado

- Envío automático sin persona. Nunca.
- Compra de bases de datos de terceros.
- Scraping de fuentes que lo prohíban en sus términos de uso, **LinkedIn incluido**. Ver `APIFY.md` §8 para el razonamiento y las alternativas.

## 7. Requisitos funcionales

### RF-01 · Ingesta de leads
El sistema acepta lotes de leads producidos por el motor mediante un endpoint autenticado. Valida esquema, deduplica por dominio y por email, y descarta cualquier contacto presente en la lista de bajas. Cada lote queda registrado como una ejecución con su coste estimado.

### RF-02 · Ficha de lead
Muestra empresa, contacto, segmento, score con su desglose, la señal con enlace a la fuente, y el histórico de mensajes. Todo dato tiene su origen visible: si no hay fuente, se muestra vacío, nunca inventado.

### RF-03 · Bandeja de trabajo
Lista filtrable por nivel (A/B/C), segmento, provincia, estado y fecha. Orden por defecto: score descendente dentro de los pendientes de revisar.

### RF-04 · Scoring explicable
Cada lead lleva puntuación por bloques (encaje, recurrencia, señal, accesibilidad, proximidad) y un motivo en una frase. Los pesos se editan desde la app sin tocar código.

### RF-05 · Redacción de emails
Tres borradores por lead (primer contacto + dos seguimientos), respetando las reglas de discurso. **Si no hay señal verificable con URL, no se genera email**: el lead queda como "cualificado sin gancho".

### RF-06 · Aprobación humana
Botones aprobar / editar / rechazar. Al aprobar se guarda quién, cuándo y el texto exacto. Sin aprobación, un mensaje no puede pasar a enviado bajo ninguna ruta del código.

### RF-07 · Pipeline
Estados: `nuevo → cualificado → borrador_listo → aprobado → enviado → respondido → reunión → piloto → cliente`, más `descartado` y `baja`. Cada cambio de estado se audita.

### RF-08 · Lista de bajas y página pública
Página `/baja` accesible sin login que registra el opt-out por email o por dominio completo. Bloquea de forma permanente cualquier contacto futuro.

### RF-09 · Auditoría
Registro inmutable de acciones de personas y del agente: qué se creó, qué se editó, qué se aprobó, qué se envió.

### RF-10 · Métricas
Embudo por segmento y por nivel, tasa de respuesta, tiempo medio de revisión, leads por ejecución y coste por lead cualificado.

### RF-11 · Campañas bajo demanda
Registro de peticiones tipo "20 estudios de interiorismo en Valencia con obra hotelera" con sus parámetros y resultados, para poder repetirlas y compararlas.

### RF-12 · Envío (fase 2)
Cola de aprobados, envío por proveedor con dominio propio, límite diario configurable, supresión contra bajas en el momento del envío, y registro de entregas, aperturas y rebotes.

## 8. Requisitos no funcionales

- **Trazabilidad**: todo dato con origen. Es requisito legal y de confianza, no un extra.
- **Idioma**: interfaz y emails en español. Preparado para valenciano e inglés más adelante.
- **Coste**: tope de ~50 €/mes en servicios. Panel de coste por ejecución.
- **Simplicidad de uso**: Eva y María del Mar no son usuarias técnicas. Máximo tres clics para aprobar un lead.
- **Resiliencia**: si el motor falla, la app sigue operativa con los datos existentes.
- **Seguridad**: RLS activo en todas las tablas; la clave de servicio sólo en el servidor, nunca en el navegador.
- **Portabilidad**: exportación completa a CSV en cualquier momento. Nada queda secuestrado.

## 9. Fases de entrega

| Fase | Contenido | Resultado visible |
|---|---|---|
| **F0 · Fundaciones** | Repo, esquema Supabase, auth, endpoint de ingesta, migración del Sheets actual | Base de datos viva con los leads que ya existen |
| **F1 · Consola** | Bandeja, ficha, filtros, estados, auditoría | Eva puede ver y mover leads |
| **F2 · Motor** | Skill de prospección, scoring, señales, deduplicación, tarea semanal | Entran leads nuevos solos cada lunes |
| **F3 · Redacción y aprobación** | Borradores, editor, cola de aprobación | Emails listos para copiar y enviar a mano |
| **F4 · Envío** | Dominio, proveedor de email, cola de envío, `/baja`, webhooks | El botón "aprobar y enviar" funciona |
| **F5 · Métricas** | Embudo, conversión, coste | Se puede decidir dónde apretar |

F0-F3 son el producto mínimo útil. F4 sólo cuando la revisión legal esté cerrada.

## 10. Métricas de éxito del propio sistema

- ≥ 70 % de los leads que entran son aprobados sin edición mayor. Si baja, el motor no está entendiendo el ICP.
- 0 emails enviados sin registro de aprobación. Es un fallo crítico, no una métrica.
- 0 datos de contacto sin fuente trazable.
- Coste por lead cualificado por debajo de 0,50 € *(objetivo de partida, sin datos reales todavía)*.

## 11. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El email B2B en frío choca con el art. 21 de la LSSI | Alto | Revisión jurídica antes de la fase 4; identificación y baja en cada email; preferencia por direcciones corporativas |
| Emails inventados o cargos erróneos | Alto (daña la marca) | Regla dura: sin fuente, campo vacío. Estado del email siempre explícito |
| Señales alucinadas por el modelo | Alto | Toda señal exige URL; la app muestra el enlace para que la persona lo contraste antes de aprobar |
| El proyecto Supabase Free se pausa por inactividad | Medio | Verificado: pausa tras 1 semana sin actividad. La tarea semanal la mantiene despierta; si no, pasar a Pro |
| Vercel Hobby no permite uso comercial | Medio | Verificado en su documentación. Presupuestar Pro (20 $/mes) o elegir otro hosting |
| Volumen bajo de decisores con email | Medio | Combinar fuentes; aceptar el email corporativo como entrada válida con score menor |
| Gasto descontrolado en Apify | Medio | Ningún actor se lanza sin límite de resultados; filtro previo antes de enriquecer; coste registrado por ejecución. Estimación: ≈1,40 $ por tanda de 20 leads |
| Extracción de fuentes que la prohíben | Alto (legal y reputacional) | `robots.txt` y condiciones antes de rastrear; sólo datos abiertos; LinkedIn fuera del pipeline |
| Dependencia de Claude para el motor | Medio | El JSON de ingesta está desacoplado: cualquier otro motor puede alimentar la app mañana |

## 12. Decisiones ya tomadas

1. Se construye **desde cero**, no se extiende el sistema de Relevance AI + Google Sheets.
2. Base de datos: **Supabase**. App: **Next.js desplegada en Vercel**, construida con Claude Code.
3. El **motor de búsqueda vive en Claude**; la app muestra y aprueba.
4. Operativa: **automático semanal + bajo demanda**.
5. Envío: **desde la app con botón de aprobar**, en fase 2.
6. Correo actual de Baladre: Gmail gratuito → hará falta un dominio o subdominio propio para enviar bien.
7. Prioridad: **calidad del lead sobre volumen**. Levante primero.
8. Presupuesto: hasta ~50 €/mes.
9. **`vibe-prospecting` descubre** (empresa + decisor + email) y **Apify enriquece** (contenido de la web, contacto, señal). Google Maps sale del ciclo semanal y queda como recurso puntual. Todo se ejecuta desde el motor en Claude, nunca desde la app. Sin LinkedIn.

## 13. Preguntas abiertas

Están en `ESTADO.md`, que es el documento que se actualiza. Las principales: dominio de envío, hosting definitivo si Vercel Pro no compensa, revisión jurídica de la LSSI, y qué directorios sectoriales permiten extracción automatizada.

---

**Fuentes de este documento:** presentación estratégica de Baladre (archivo local del proyecto), [baladreceramica.com](https://www.baladreceramica.com), y las páginas de precios de [Apify](https://apify.com/pricing), [Resend](https://resend.com/pricing), [Supabase](https://supabase.com/pricing) y [Vercel](https://vercel.com/docs/plans/hobby), consultadas el 21 de agosto de 2026.
