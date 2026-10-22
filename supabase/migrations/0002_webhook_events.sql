-- Deduplicação de notificações do webhook (idempotência de entrega).
-- O webhook registra aqui o id de cada notificação já processada e usa isso
-- para ignorar reenvios do Mercado Pago (que reenvia em timeout/erro).
-- Idempotente: pode rodar várias vezes.

create table if not exists public.webhook_events (
  provider    text        not null,
  event_id    text        not null,
  received_at timestamptz not null default now(),
  primary key (provider, event_id)
);

-- Tabela interna: só o webhook (service_role) acessa. Habilitar RLS sem
-- nenhuma policy nega acesso a anon/authenticated; o service_role ignora RLS.
alter table public.webhook_events enable row level security;
