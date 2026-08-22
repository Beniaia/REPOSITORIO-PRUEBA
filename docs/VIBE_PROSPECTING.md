# VIBE PROSPECTING — recetas verificadas y trampas

> Versión 1.0 · 22 agosto 2026 · Complementa `APIFY.md`
> **Todas las cifras de este documento salen de consultas reales hechas el 22/08/2026 contra el conector**, no de estimaciones. Vuelve a medirlas si pasan meses: la base cambia.

---

## 1. Qué papel juega

Es el **canal de descubrimiento principal**. Sustituye a Google Maps en todos los segmentos del ICP porque hace algo que Maps nunca hizo: devuelve **la persona que decide, con email**, no sólo la empresa.

El reparto queda así:

| | Descubrir empresas | Encontrar al decisor | Enriquecer y buscar señal |
|---|---|---|---|
| **Vibe Prospecting** | ✅ principal | ✅ único que lo hace | — |
| **Apify** | fallback puntual (§4) | — | ✅ contacto, web, Instagram |
| **Búsqueda web + directorios** | grupos tipo Vocento | — | ✅ señales: premios, aperturas |

---

## 2. Cobertura medida el 22/08/2026

**Empresas** — estudios de arquitectura e interiorismo, 1-50 empleados, con web, HQ en Comunitat Valenciana y Murcia:

| Categoría | C. Valenciana | Murcia | Total |
|---|---|---|---|
| Architecture and planning | 733 | 97 | 830 |
| Interior design | 191 | 22 | 213 |
| **Total** | | | **1.043** |

Muestra real revisada: `1arquitectura.com`, `amixarquitectura.es`, `rgbarquitectos.com`, `2ms.es`, `tquatre.com`. Estudios pequeños de verdad, con dominio, ciudad y clasificación NAICS correcta (541310, Architectural Services). La cobertura de micro-estudios españoles es buena.

**Decisores con email** (fundador, propietario, socio, director o c-suite):

| Sector | Ámbito | Decisores con email |
|---|---|---|
| Arquitectura e interiorismo | C. Valenciana + Murcia | **75** |
| Hostelería y restauración | C. Valenciana + Murcia | **96** |
| Agencias de publicidad y marketing | España | **4.619** |
| Arquitectura e interiorismo | España | **961** |

**Lectura:** para un plan de 150 contactos con prioridad a la calidad, sobra. En agencias hay volumen para años. En Levante, 171 decisores nominales entre arquitectura y hostelería son más de los que Baladre puede trabajar bien en un trimestre.

---

## 3. Trampas verificadas — léelas antes de escribir el motor

Estas tres me costaron cinco consultas en falso. Están comprobadas.

### 3.1 Para prospects en España, el filtro de región es `prospect_region_country_code`

`company_region_country_code` (la región del HQ de la empresa) **devuelve 0 prospects en España**, aunque la misma consulta sobre empresas devuelva cientos. El que funciona es `prospect_region_country_code`, que filtra por dónde está la persona.

| Consulta | Resultado |
|---|---|
| Prospects, arquitectura, `company_region_country_code: ES-VC` | **0** |
| Prospects, arquitectura, `prospect_region_country_code: ES-VC, ES-MC` | **75** |

Mismo patrón en agencias: 0 por región de empresa, 4.619 filtrando por país. Si una consulta devuelve cero, **este es el primer sitio donde mirar**, antes de concluir que no hay datos.

### 3.2 `city_region` es sólo para Estados Unidos

Buscar "Valencia Spain" en el autocompletado de `city_region` devuelve Orlando, Tampa y San Juan de Puerto Rico. Para España: `company_country_code` / `prospect_country_code` (ISO Alpha-2, "ES") o los códigos ISO 3166-2 (`ES-VC`, `ES-MC`, `ES-MD`, `ES-CT`).

### 3.3 Categorías que funcionan

Verificadas por autocompletado. Usa estas literalmente:

| Segmento del ICP | `linkedin_category` |
|---|---|
| Arquitectura e interiorismo | `architecture and planning`, `interior design` |
| Agencias | `advertising services`, `marketing services` |
| Hostelería y restauración | `hotels and motels`, `restaurants`, `hospitality` |

`linkedin_category` y `naics_category` son mutuamente excluyentes: una u otra, nunca las dos.

---

## 4. Recetas por segmento

### Arquitectura e interiorismo — Levante

```json
{
  "entity_type": "prospects",
  "filters": {
    "linkedin_category": { "values": ["architecture and planning", "interior design"] },
    "prospect_region_country_code": { "values": ["ES-VC", "ES-MC"] },
    "job_level": { "values": ["founder", "owner", "partner", "director"] },
    "has_contact_details": { "value": "email" }
  }
}
```

Universo medido: 75. Al ampliar a España: 961.

### Agencias de comunicación y eventos

```json
{
  "entity_type": "prospects",
  "filters": {
    "linkedin_category": { "values": ["advertising services", "marketing services"] },
    "company_country_code": { "values": ["ES"] },
    "company_size": { "values": ["11-50", "51-200"] },
    "job_level": { "values": ["founder", "owner", "partner", "director", "c-suite"] },
    "has_contact_details": { "value": "email" }
  }
}
```

Universo medido sin filtro de tamaño: 4.619 en España. Aquí el problema es el exceso, no la falta: acota por tamaño y por región, y deja que el scoring haga el resto.

### Hoteles y restauración — Levante

```json
{
  "entity_type": "prospects",
  "filters": {
    "linkedin_category": { "values": ["hotels and motels", "restaurants", "hospitality"] },
    "prospect_region_country_code": { "values": ["ES-VC", "ES-MC"] },
    "job_level": { "values": ["founder", "owner", "director"] },
    "has_contact_details": { "value": "email" }
  }
}
```

Universo medido: 96.

### Grupos tipo Vocento

No se buscan. Son quince empresas nominales; se trabajan con búsqueda web sobre su calendario de premios y eventos.

---

## 5. Método de trabajo

1. **Estadísticas antes de traer datos.** `fetch-entities-statistics` dice cuántos hay sin gastar créditos ni contexto. Si el universo es de tres empresas, el filtro está mal.
2. **Autocompletado obligatorio** para `linkedin_category`, `naics_category`, `job_title`, `job_level` no. Un concepto por llamada: nunca listas separadas por comas.
3. **`has_contact_details: "email"`** siempre que el lead tenga que acabar en un email. Sin ese filtro entran contactos sin dirección y se pierde el trabajo aguas abajo.
4. **El fetch devuelve descubrimiento, no contacto.** El email se obtiene enriqueciendo, y eso cuesta créditos. Estima antes y no exportes sin decisión humana.
5. **Encadena por sesión**, reutilizando el `session_id` que devuelve la herramienta. Nunca inventes uno.
6. **Economía de contexto**: aplica lo mismo que en `APIFY.md` §9. Trae los campos que uses, filtra con código, y no pegues los resultados en la conversación.

---

## 6. Coste

No he verificado el precio en euros de los créditos ni cuántos consume cada enriquecimiento en tu plan. Lo que sí está confirmado por la propia herramienta: **un fetch de 5 empresas costó 5 créditos**, es decir un crédito por fila, y el enriquecimiento se cobra aparte por operación.

[Baja confianza — verifícalo antes de fijar presupuesto] Consulta tu plan y el coste por crédito en la propia herramienta (`show-pricing-plans`) antes de programar la tarea semanal. Está anotado como P-12 en `ESTADO.md`.
