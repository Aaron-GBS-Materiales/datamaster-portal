-- ─────────────────────────────────────────────────────────────
-- DATAMASTER PORTAL — Script SQL para Supabase
-- Copia y pega esto en Supabase > SQL Editor > New query
-- ─────────────────────────────────────────────────────────────

-- TABLA 1: Usuarios
create table if not exists usuarios (
  id              uuid default gen_random_uuid() primary key,
  nombre          text not null,
  email           text not null unique,
  pais            text not null,
  unidad_negocio  text not null,
  rol             text not null default 'Solicitante',
  activo          boolean not null default true,
  created_at      timestamptz default now()
);

-- TABLA 2: Solicitudes
create table if not exists solicitudes (
  id                  uuid default gen_random_uuid() primary key,
  ticket_id           text not null unique,
  email_solicitante   text not null,
  nombre_solicitante  text not null,
  pais                text not null,
  unidad_negocio      text not null,
  tipo_solicitud      text not null default 'Creación',
  denominacion        text not null,
  unidad_medida       text not null,
  texto_pedido        text not null,
  estado              text not null default 'Pendiente',
  fecha_recepcion     timestamptz default now(),
  fecha_respuesta     timestamptz,
  atendido_por        text,
  cantidad_codigos    integer,
  created_at          timestamptz default now()
);

-- TABLA 3: Códigos OTP
create table if not exists codigos_otp (
  id         uuid default gen_random_uuid() primary key,
  email      text not null,
  codigo     text not null,
  expira     timestamptz not null,
  usado      boolean not null default false,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────
-- PERMISOS (Row Level Security)
-- Permite que la app lea y escriba sin autenticación de usuarios
-- ─────────────────────────────────────────────────────────────
alter table usuarios    enable row level security;
alter table solicitudes enable row level security;
alter table codigos_otp enable row level security;

create policy "allow_all_usuarios"    on usuarios    for all using (true) with check (true);
create policy "allow_all_solicitudes" on solicitudes for all using (true) with check (true);
create policy "allow_all_otp"         on codigos_otp for all using (true) with check (true);
