-- =====================================================================
-- Baladre Cerámica · Sistema de prospección
-- Esquema inicial de Supabase (Postgres)
-- Versión 1.0 · 21/08/2026
-- =====================================================================
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.
-- Idioma del dominio: español, para que el negocio se lea sin traducir.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type segmento_t as enum (
  'arquitectura', 'agencia', 'grupo_comunicacion',
  'hotel', 'restauracion', 'joyeria', 'otro'
);

create type nivel_t as enum ('A', 'B', 'C', 'descartado');

create type rol_decision_t as enum ('decisor', 'prescriptor', 'gatekeeper', 'desconocido');

create type email_estado_t as enum ('verificado', 'probable', 'generico', 'no_encontrado');

create type lead_estado_t as enum (
  'nuevo', 'cualificado', 'cualificado_sin_gancho', 'borrador_listo',
  'aprobado', 'enviado', 'respondido', 'reunion', 'piloto',
  'cliente', 'descartado', 'baja'
);

create type mensaje_tipo_t as enum ('email_1', 'seguimiento_1', 'seguimiento_2', 'manual');

create type mensaje_estado_t as enum ('borrador', 'aprobado', 'rechazado', 'enviado', 'error');

create type actor_t as enum ('humano', 'agente', 'sistema');

-- ---------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------
create table empresas (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  segmento      segmento_t not null default 'otro',
  web           text,
  dominio       text unique,           -- clave de deduplicación
  descripcion   text,
  ciudad        text,
  provincia     text,
  comunidad     text,
  pais          text default 'España',
  telefono      text,
  email_generico text,
  linkedin_url  text,
  instagram     text,
  tamano_estimado text,
  fuente        text not null,          -- de dónde salió: 'maps', 'directorio_ctaa', 'busqueda_web'...
  fuente_url    text,                   -- sin origen, el dato no entra
  notas         text,
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index on empresas (segmento);
create index on empresas (provincia);

-- ---------------------------------------------------------------------
-- Contactos
-- ---------------------------------------------------------------------
create table contactos (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  nombre        text,
  apellidos     text,
  cargo         text,
  rol_decision  rol_decision_t not null default 'desconocido',
  email         text,
  email_estado  email_estado_t not null default 'no_encontrado',
  email_fuente  text,
  telefono      text,
  linkedin_url  text,
  fuente_url    text,
  creado_en     timestamptz not null default now(),
  unique (empresa_id, email)
);
create index on contactos (email);

-- ---------------------------------------------------------------------
-- Señales: el motivo por el que escribir AHORA
-- ---------------------------------------------------------------------
create table senales (
  id          uuid primary key default gen_random_uuid(),
  empresa_id  uuid not null references empresas(id) on delete cascade,
  tipo        text not null,   -- premio, apertura, reforma, evento, proyecto, aniversario, congreso
  titulo      text not null,
  resumen     text,
  url         text not null,   -- OBLIGATORIA: sin URL no es una señal
  fecha       date,
  peso        int not null default 0 check (peso between 0 and 25),
  creado_en   timestamptz not null default now()
);
create index on senales (empresa_id);

-- ---------------------------------------------------------------------
-- Scores
-- ---------------------------------------------------------------------
create table scores (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references empresas(id) on delete cascade,
  puntuacion    int not null check (puntuacion between 0 and 100),
  nivel         nivel_t not null,
  desglose      jsonb not null,   -- {encaje:30, recurrencia:15, senal:20, accesibilidad:10, proximidad:10}
  motivo        text not null,    -- una frase explicable para la persona que revisa
  modelo        text,
  calculado_en  timestamptz not null default now()
);
create index on scores (empresa_id, calculado_en desc);

-- ---------------------------------------------------------------------
-- Ejecuciones del motor
-- ---------------------------------------------------------------------
create table ejecuciones (
  id              uuid primary key default gen_random_uuid(),
  tipo            text not null default 'manual',   -- 'semanal' | 'manual' | 'reenriquecimiento'
  parametros      jsonb,
  leads_nuevos    int default 0,
  leads_duplicados int default 0,
  coste_estimado  numeric(10,4),
  estado          text default 'ok',
  log             text,
  creado_en       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Leads: la unidad de trabajo
-- ---------------------------------------------------------------------
create table leads (
  id                  uuid primary key default gen_random_uuid(),
  empresa_id          uuid not null references empresas(id) on delete cascade,
  contacto_id         uuid references contactos(id) on delete set null,
  ejecucion_id        uuid references ejecuciones(id) on delete set null,
  estado              lead_estado_t not null default 'nuevo',
  prioridad           int default 0,
  responsable         text,
  siguiente_accion_en date,
  notas               text,
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  unique (empresa_id, contacto_id)
);
create index on leads (estado);
create index on leads (creado_en desc);

-- ---------------------------------------------------------------------
-- Mensajes
-- ---------------------------------------------------------------------
create table mensajes (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references leads(id) on delete cascade,
  tipo                mensaje_tipo_t not null default 'email_1',
  asunto              text not null,
  cuerpo              text not null,
  angulo              text,               -- qué gancho se usó
  senal_id            uuid references senales(id) on delete set null,
  estado              mensaje_estado_t not null default 'borrador',
  editado_por_humano  boolean not null default false,
  aprobado_por        text,
  aprobado_en         timestamptz,
  enviado_en          timestamptz,
  proveedor_id        text,
  respondido_en       timestamptz,
  creado_en           timestamptz not null default now(),
  -- Regla dura: no se puede marcar como enviado sin aprobación registrada
  constraint enviado_exige_aprobacion check (
    estado <> 'enviado' or (aprobado_por is not null and aprobado_en is not null)
  )
);
create index on mensajes (lead_id);
create index on mensajes (estado);

-- ---------------------------------------------------------------------
-- Bajas (lista de supresión) — manda sobre todo lo demás
-- ---------------------------------------------------------------------
create table bajas (
  id        uuid primary key default gen_random_uuid(),
  email     text,
  dominio   text,
  motivo    text,
  origen    text not null default 'pagina_baja',  -- pagina_baja | respuesta | manual | rebote
  creado_en timestamptz not null default now(),
  check (email is not null or dominio is not null)
);
create unique index on bajas (lower(email)) where email is not null;
create unique index on bajas (lower(dominio)) where dominio is not null;

-- ---------------------------------------------------------------------
-- Auditoría
-- ---------------------------------------------------------------------
create table auditoria (
  id         bigserial primary key,
  actor      actor_t not null,
  actor_id   text,
  accion     text not null,
  entidad    text not null,
  entidad_id uuid,
  antes      jsonb,
  despues    jsonb,
  creado_en  timestamptz not null default now()
);
create index on auditoria (entidad, entidad_id);
create index on auditoria (creado_en desc);

-- ---------------------------------------------------------------------
-- Configuración del ICP (pesos editables sin tocar código)
-- ---------------------------------------------------------------------
create table config_icp (
  clave       text primary key,
  valor       jsonb not null,
  descripcion text,
  actualizado_en timestamptz not null default now()
);

insert into config_icp (clave, valor, descripcion) values
('pesos_segmento', '{"arquitectura":30,"agencia":30,"grupo_comunicacion":28,"hotel":20,"restauracion":12,"joyeria":8,"otro":0}', 'Encaje de segmento, máximo 30'),
('max_bloques', '{"encaje":30,"recurrencia":20,"senal":25,"accesibilidad":15,"proximidad":10}', 'Techo de cada bloque del score'),
('umbrales', '{"A":75,"B":55,"C":40}', 'Puntuación mínima para cada nivel'),
('pesos_proximidad', '{"alicante":10,"valencia":10,"murcia":10,"madrid":7,"barcelona":7,"baleares":7,"resto_espana":5,"internacional":2}', 'Proximidad geográfica'),
('pesos_accesibilidad', '{"verificado":15,"probable":10,"generico":5,"no_encontrado":0}', 'Accesibilidad del decisor'),
('descartes', '["fabricante_ceramica","taller_ceramica","constructora_generica","franquicia_low_cost","sin_web"]', 'Motivos de descarte automático'),
('limite_envio_diario', '20', 'Máximo de emails aprobados que se pueden enviar por día (fase 4)');

-- ---------------------------------------------------------------------
-- Trigger de actualizado_en
-- ---------------------------------------------------------------------
create or replace function tocar_actualizado_en() returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger t_empresas_upd before update on empresas
  for each row execute function tocar_actualizado_en();
create trigger t_leads_upd before update on leads
  for each row execute function tocar_actualizado_en();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table empresas    enable row level security;
alter table contactos   enable row level security;
alter table senales     enable row level security;
alter table scores      enable row level security;
alter table leads       enable row level security;
alter table mensajes    enable row level security;
alter table bajas       enable row level security;
alter table auditoria   enable row level security;
alter table ejecuciones enable row level security;
alter table config_icp  enable row level security;

-- Usuarios autenticados (Eva, M. del Mar, Nuria): acceso completo de lectura/escritura.
-- La ingesta del motor usa service_role, que salta RLS por diseño.
do $$
declare t text;
begin
  foreach t in array array['empresas','contactos','senales','scores','leads','mensajes','bajas','auditoria','ejecuciones','config_icp']
  loop
    execute format(
      'create policy "auth_todo_%1$s" on %1$I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- La auditoría no se edita ni se borra: sólo se inserta y se lee.
drop policy "auth_todo_auditoria" on auditoria;
create policy "auditoria_lectura" on auditoria for select to authenticated using (true);
create policy "auditoria_insercion" on auditoria for insert to authenticated with check (true);

-- ---------------------------------------------------------------------
-- Vista de trabajo para la bandeja
-- ---------------------------------------------------------------------
-- security_invoker: la vista respeta el RLS de quien consulta, no el del propietario.
create view v_bandeja with (security_invoker = true) as
select
  l.id            as lead_id,
  l.estado,
  e.nombre        as empresa,
  e.segmento,
  e.provincia,
  e.web,
  c.nombre        as contacto_nombre,
  c.cargo,
  c.email,
  c.email_estado,
  s.puntuacion,
  s.nivel,
  s.motivo,
  (select count(*) from senales sn where sn.empresa_id = e.id) as n_senales,
  l.creado_en
from leads l
join empresas e on e.id = l.empresa_id
left join contactos c on c.id = l.contacto_id
left join lateral (
  select * from scores sc where sc.empresa_id = e.id order by calculado_en desc limit 1
) s on true;
