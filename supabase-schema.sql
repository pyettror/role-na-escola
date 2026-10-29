-- Esquema inicial de referência para Supabase.
-- Revise e teste as políticas antes de usar com dados reais.
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text not null default '',
  categoria text not null default 'Evento escolar',
  data date,
  horario_inicio time,
  local text,
  imagem_capa text,
  estado text not null default 'rascunho' check (estado in ('publicado','rascunho')),
  destaque boolean not null default false,
  cronograma jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.fotografias (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  url text not null,
  alt text,
  criado_em timestamptz not null default now()
);
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  url text not null,
  titulo text,
  criado_em timestamptz not null default now()
);
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.eventos enable row level security;
alter table public.fotografias enable row level security;
alter table public.videos enable row level security;
alter table public.admins enable row level security;
-- Conteúdo publicado pode ser lido publicamente.
create policy "Leitura pública de eventos publicados" on public.eventos for select using (estado = 'publicado');
create policy "Leitura pública de fotos de eventos publicados" on public.fotografias for select using (
  exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'publicado')
);
create policy "Leitura pública de vídeos de eventos publicados" on public.videos for select using (
  exists (select 1 from public.eventos e where e.id = evento_id and e.estado = 'publicado')
);
-- Não são criadas políticas de escrita neste arquivo. A escrita segura deve ser
-- configurada após definir como os usuários autenticados serão validados como admins.
