-- Colunas de provider na tabela subscriptions, usadas pelo webhook do Mercado Pago.
-- Idempotente: pode rodar várias vezes. A tabela já existe (criada por SQL cru);
-- aqui só garantimos que as colunas que o webhook grava existem.

alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_payment_id text,
  add column if not exists updated_at timestamptz not null default now();

-- Busca rápida por assinatura do provider (reconciliação / suporte).
create index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider_subscription_id);

-- O webhook escreve via service_role (burla RLS). A policy de SELECT
-- (auth.uid() = user_id) e o grant para `authenticated` continuam valendo
-- para a leitura do app — este arquivo não os altera.
