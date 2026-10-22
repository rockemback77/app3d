-- Colunas que faltam na tabela subscriptions para o webhook do Mercado Pago.
-- Idempotente: pode rodar várias vezes.
--
-- A tabela já existe (criada por SQL cru) e já tem: user_id, status,
-- current_period_end, provider, provider_customer_id, updated_at
-- (verificado via PostgREST em 2026-10-22). Só estas duas faltavam:

alter table public.subscriptions
  add column if not exists provider_subscription_id text,
  add column if not exists provider_payment_id text;

-- Busca rápida por assinatura do provider (reconciliação / suporte).
create index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider_subscription_id);

-- O webhook escreve via service_role (burla RLS). A policy de SELECT
-- (auth.uid() = user_id) e o grant para `authenticated` continuam valendo
-- para a leitura do app — este arquivo não os altera.
