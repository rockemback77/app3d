-- GRANTs de tabela para o service_role (usado pelo webhook do Mercado Pago).
-- Idempotente: pode rodar várias vezes.
--
-- Pegadinha que isto resolve: tabela criada por SQL cru NÃO concede privilégio
-- automático. O service_role ignora RLS, mas ainda precisa de GRANT de tabela —
-- sem ele o upsert do webhook falha com `permission denied (42501)`.
-- As tabelas subscriptions e webhook_events foram criadas por SQL cru, então
-- precisam do grant explícito (que antes era aplicado à mão no SQL Editor).

grant select, insert, update on public.subscriptions to service_role;
grant select, insert on public.webhook_events to service_role;
