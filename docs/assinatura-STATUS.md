# Status da assinatura (Mercado Pago) — ponto de retomada

**Última atualização:** 2026-10-22

Documento pra retomar de onde paramos. **Todo o código está pronto e deployado.**
O que falta é config de produção do Mercado Pago + teste com pagamento real.

---

## TL;DR — onde paramos

- Backend (3 Edge Functions + banco + webhook) **no ar e com pipeline provado
  ponta a ponta** em sandbox (menos o status `active`, travado pelo modelo de
  credenciais do MP — ver abaixo).
- App novo (tela Assinar + checkout + card de assinatura em Settings) **em
  produção** (Cloudflare, branch mergeada na `master`).
- Falta: ir pra produção real do MP (token + webhook em modo produtivo) e testar
  com cartão real. E limpezas pequenas.

---

## As 3 Edge Functions (deployadas)

| Função | verify_jwt | Chamada por | Faz |
|---|---|---|---|
| `mp-webhook` | não (`--no-verify-jwt`) | Mercado Pago | recebe notificação, valida HMAC, consulta o MP, upsert em `subscriptions` |
| `mp-create-subscription` | sim | app (botão Assinar) | cria preapproval com `external_reference=user.id`, devolve `init_point` |
| `mp-cancel-subscription` | sim | app (Settings) | cancela o preapproval no MP |

URL do webhook: `https://xsfeemdgkdsfdommxztw.supabase.co/functions/v1/mp-webhook`

Redeploy: `npx supabase functions deploy <nome> [--no-verify-jwt] --project-ref xsfeemdgkdsfdommxztw`

Secrets (setar via `npx supabase secrets set --env-file ./supabase/functions/.env --project-ref xsfeemdgkdsfdommxztw`):
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` (valores no `.env` local, não comitado).
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` são automáticos no runtime.

---

## Banco (Supabase, projeto xsfeemdgkdsfdommxztw)

Tabela `public.subscriptions` já tinha: `user_id` (PK, FK auth.users), `status`,
`current_period_end`, `provider`, `provider_customer_id`, `updated_at`.
Migrations aplicadas (via SQL Editor):
- `0001_subscriptions_provider_columns.sql` → adicionou `provider_subscription_id`, `provider_payment_id`.
- `0002_webhook_events.sql` → tabela de dedup `webhook_events`.

### ⚠️ Pegadinha do GRANT (resolvida, mas FALTA pôr em migration)
Tabela criada por SQL cru NÃO concede privilégio automático. O `service_role`
ignora RLS mas ainda precisa de GRANT de tabela. Sem ele o upsert do webhook dá
`permission denied (42501)`. Rodamos manualmente:
```sql
grant select, insert, update on public.subscriptions to service_role;
grant select, insert on public.webhook_events to service_role;
```
**TODO:** registrar isso numa migration `0003_grants.sql` pra não repetir.

---

## O nó do Mercado Pago (o que mais travou)

### Dois apps, não confundir
O que importa é o **app** (application_id), não a conta. O número **logo depois de
`APP_USR-`** no access token é o application_id.

| App | application_id | Papel |
|---|---|---|
| Principal (conta da esposa, danneholiveira@hotmail.com) | `4199377477828515` | **webhook está aqui**; credencial de PRODUÇÃO (`APP_USR-4199377477828515-...`) |
| Vendedor de teste | `3361478551468307` | credencial que apareceu como "teste" (`APP_USR-3361478551468307-...-3787007056`) |

**Regra de ouro:** o número depois de `APP_USR-` no `MP_ACCESS_TOKEN` TEM que ser
igual ao `application_id` do webhook. O MP só notifica o app **dono** do
preapproval (= app cujo token criou). Se token e webhook forem apps diferentes,
a notificação nunca chega (foi o bug que deu `webhook_events=0`).

### Modelo de credenciais (MP novo)
Apps novos só têm **Credenciais de produção** (APP_USR). Não existe mais token
`TEST-`. Teste é via **usuários de teste**. Por isso o sandbox `active` 100%
automático travou: o app 4199 só tem credencial de produção (exigiria cartão real).

### Webhook: modo teste vs produtivo
O webhook do app tem config separada por modo, cada uma com **chave secreta
própria**. A que usamos (`MP_WEBHOOK_SECRET` atual) é do **MODO TESTE** do app 4199.
**Pra produção:** pegar a chave secreta do **Modo produtivo** do app 4199 e trocar.

---

## O que está PROVADO (sandbox)

| Elo | Status |
|---|---|
| App Assinar → cria preapproval (checkout abriu) | ✅ |
| Validação HMAC do `x-signature` | ✅ (200, não 401) |
| Função consulta o MP e lê `external_reference` | ✅ |
| GRANT service_role | ✅ |
| Upsert grava em `subscriptions` com dados reais do MP | ✅ (gravou `inactive` de um preapproval `pending`) |
| Mapeamento `authorized → active` | ✅ por construção (mesmo caminho que gravou `inactive`) |

Único não-visto end-to-end pela via real do MP: a notificação automática
disparando `active` (travado pelo modelo de credenciais, não por bug).

---

## Como retomar

### Opção A — ver o `active` em sandbox (via API, sem navegador)
Requer token do app **3361** (que tem credencial de teste utilizável) deployado:
1. `.env`: `MP_ACCESS_TOKEN` = token do app 3361 (`APP_USR-3361478551468307-...`); `secrets set`.
2. Já existe um preapproval `authorized` de teste: `381d784b4b4e49859c38f89f28cf80e8`
   (external_reference = user de teste abaixo). Disparar o webhook assinado nele
   (HMAC-SHA256 do manifesto `id:<id>;request-id:<reqid>;ts:<ts>;` com o
   `MP_WEBHOOK_SECRET`, header `x-signature: ts=<ts>,v1=<hex>`, POST em
   `.../mp-webhook?data.id=<id>&type=subscription_preapproval`).
3. Confere `status=active` na `subscriptions`.
4. Voltar o token pro app 4199.

Card token de teste pra criar novos `authorized`: usar **Visa** `4235 6477 2802 5682`
(Mastercard deu `Unsupported_credit_card_for_recurring_payment`), nome `APRO`,
CVV `123`, CPF `12345678909`, via `POST /v1/card_tokens?public_key=<public key do app>`.

### Opção B — produção real (lançamento)
1. `MP_ACCESS_TOKEN` = produção do app 4199 (`APP_USR-4199377477828515-...`) — já é o atual.
2. Webhook do app 4199 em **Modo produtivo**: pegar a **chave secreta de produção**
   e trocar `MP_WEBHOOK_SECRET`; `secrets set`.
3. Confirmar URL do webhook cadastrada no modo produtivo + evento "Planos e assinaturas".
4. Cliente real paga com cartão real → `active`.

---

## Dados de teste (sandbox) usados

- user_id (comprador no Supabase): `f2ca5a6e-72f4-4278-b04d-e6e76ad9c363`
  (email `test_user_387983567415744476@testuser.com`).
- Comprador de teste MP: usuário `TESTUSER387983567415744476` (User ID 3787007044).
- Vendedor de teste MP: usuário `TESTUSER8626408007440944091` (User ID 3787007056).
- Preapprovals de teste criados: `a807cd1b07cd4230a52f2388e0b92203` (pending),
  `381d784b4b4e49859c38f89f28cf80e8` (authorized).
- Preço: `PRICE_BRL = 19.90` em `supabase/functions/mp-create-subscription/index.ts`.
- Redirect URLs do Supabase Auth: produção + `localhost:5180/**` + `localhost:5173/**`.

---

## Limpezas pendentes

1. **Reverter debug temporário** em `mp-webhook/index.ts`: o bloco do erro de
   upsert devolve `{error, message, code, details, hint}` (TEMP). Voltar pro
   `return new Response('db error', { status: 500 })` e redeploy.
2. **Migration do GRANT** (`0003_grants.sql`) com os grants acima.
3. **Chave secreta de produção** do webhook (trocar a de teste) ao lançar.
4. **Rotacionar** `client_secret` do OAuth Google (exposto em chat) antes de público.
5. Remover `localhost` das Redirect URLs do Supabase ao final (higiene).
6. Apagar o plano/link `mpago.la` criado no painel (não usado — modelo é sem plano).

---

## Referências no repo
- `docs/webhook-mercadopago.md` — deploy/secrets passo a passo.
- `docs/entenda-webhook-assinatura.md` — explicação didática do fluxo.
- `supabase/functions/` — as 3 funções.
- `supabase/migrations/` — colunas + webhook_events.
