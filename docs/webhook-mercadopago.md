# Webhook Mercado Pago (assinatura recorrente)

Edge Function do Supabase que recebe notificações do Mercado Pago e atualiza
`public.subscriptions`. Modelo: **preapproval** (assinatura recorrente mensal).

Arquivos:
- `supabase/functions/mp-webhook/index.ts` — a função
- `supabase/migrations/0001_subscriptions_provider_columns.sql` — colunas que a função grava
- `supabase/config.toml` — `verify_jwt = false` para esta função

## Segurança (já implementada na função)

- **HMAC** do header `x-signature` verificado antes de qualquer coisa. POST forjado = 401.
- **Nunca confia no corpo**: pega só o `id` e consulta a API do MP com o `MP_ACCESS_TOKEN`.
- **Idempotência**: upsert por `user_id` (PK). MP reenvia o mesmo evento sem duplicar.
- **service_role** (burla RLS) injetado automático no runtime — não vira secret seu.

## Pré-requisitos (uma vez)

```bash
npm i -g supabase          # ou: npx supabase ...
supabase login
supabase link --project-ref xsfeemdgkdsfdommxztw
```

## 1. Migration (colunas provider)

Roda a migration que garante as colunas usadas pela função:

```bash
supabase db push
```

Alternativa manual (SQL Editor do Supabase): cole o conteúdo de
`supabase/migrations/0001_subscriptions_provider_columns.sql`.

## 2. Segredos

`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são **automáticos** no runtime — não setar.
Só estes dois precisam ser configurados:

```bash
supabase secrets set MP_ACCESS_TOKEN=APP_USR-xxxxxxxx
supabase secrets set MP_WEBHOOK_SECRET=sua-chave-secreta-do-painel-mp
```

- `MP_ACCESS_TOKEN`: Mercado Pago > Suas integrações > sua aplicação > Credenciais de produção > Access Token.
- `MP_WEBHOOK_SECRET`: Mercado Pago > sua aplicação > Webhooks > "Chave secreta" (clave secreta). É essa chave que assina o `x-signature`.

## 3. Deploy

```bash
supabase functions deploy mp-webhook --no-verify-jwt
```

URL resultante:

```
https://xsfeemdgkdsfdommxztw.supabase.co/functions/v1/mp-webhook
```

## 4. Configurar no painel do Mercado Pago

Mercado Pago > sua aplicação > **Webhooks** > Configurar notificações:

- **URL**: a URL acima.
- **Eventos**: marcar `Planos e assinaturas` (gera `subscription_preapproval` e
  `subscription_authorized_payment`). Opcional: `Pagamentos` (`payment`).
- Salvar e copiar a **chave secreta** gerada — é o `MP_WEBHOOK_SECRET` do passo 2.
  Se gerar depois de setar o secret, re-rode o `secrets set` com o valor novo e
  faça deploy de novo.

## 5. Testar

- Painel do MP tem "Simular notificação" — envia um evento assinado de teste.
- Logs da função: `supabase functions logs mp-webhook` (ou aba Logs no dashboard).
- Esperado: `200 ok` em evento válido; `401 invalid signature` se a chave estiver errada.

## Como o user_id chega até aqui

A função lê `external_reference` do preapproval para saber de quem é a assinatura.
**O checkout (fase 5) precisa criar o preapproval com `external_reference = auth.user.id`.**
Sem isso, o webhook recebe o evento mas não sabe em qual linha gravar (loga erro e dá no-op).

## Mapeamento de status

| preapproval (MP) | subscriptions.status |
|------------------|----------------------|
| authorized       | active               |
| paused           | past_due             |
| cancelled        | canceled             |
| (outros)         | inactive             |

`current_period_end` = `next_payment_date` do preapproval. O gate do app
(`isActive()`) libera enquanto `status` ∈ {active, trialing} e `periodEnd` no futuro.
