# Entenda o webhook de assinatura (do zero, passo a passo)

Documento didático. Explica **por que** o webhook existe, **por que são dois deploys
em lugares diferentes**, e **o que exatamente trafega** em cada requisição (o que sai,
o que volta). Não precisa saber nada de antemão.

---

## 1. O problema que o webhook resolve

Seu app cobra **assinatura mensal** pelo Mercado Pago. A pergunta central é:

> Como o app sabe que o fulano **pagou** e pode usar o app?

O jeito errado seria o app perguntar ao Mercado Pago "esse cara pagou?" toda hora.
Isso é frágil: o pagamento pode acontecer quando o app está fechado (renovação
automática no mês seguinte, cartão recusado, estorno…). O app não está rodando
nessas horas.

O jeito certo é o contrário: **o Mercado Pago avisa você** quando algo muda. Esse
"aviso automático" é o **webhook**.

```
Mercado Pago:  "Ei, a assinatura do usuário X virou PAGA."   ──aviso──▶  seu código
```

Webhook = uma URL sua que o Mercado Pago chama (faz um POST) sempre que um
pagamento ou assinatura muda de estado. Você não pergunta; você é avisado.

---

## 2. As peças do quebra-cabeça

Seu sistema tem **quatro serviços separados**, cada um na sua "casa":

| Peça | O que é | Onde mora |
|------|---------|-----------|
| **App PWA** | A tela que o usuário usa (Svelte) | Cloudflare (`app3d.luizhmail.workers.dev`) |
| **Banco + Auth** | Tabela `subscriptions`, login | Supabase (`xsfeemdgkdsfdommxztw`) |
| **Webhook** | O código que recebe o aviso do MP | Supabase (Edge Function) |
| **Mercado Pago** | Cobra o cartão/Pix e manda o aviso | Servidores do MP |

Repare: **app** e **webhook** são códigos diferentes, com propósitos diferentes,
e moram em plataformas diferentes. Isso é a raiz dos "dois deploys".

---

## 3. Por que DOIS deploys?

Porque são **dois programas diferentes**, em **duas plataformas diferentes**. Deploy
é "publicar um programa no seu servidor". Dois programas = dois deploys.

### Deploy 1 — o App (já existe, você não mexe agora)

- **O quê:** o site Svelte (HTML/CSS/JS) que roda no celular do usuário.
- **Onde:** Cloudflare.
- **Como:** `npx wrangler deploy` (ou o Cloudflare builda sozinho do GitHub).
- **Natureza:** é código **público**, roda no navegador do usuário. Qualquer um
  pode ler. Por isso **não pode** ter segredos (token do MP, chave de admin do banco).

### Deploy 2 — o Webhook (é o novo, o desta fase)

- **O quê:** a Edge Function `mp-webhook` (código TypeScript/Deno).
- **Onde:** Supabase.
- **Como:** `supabase functions deploy mp-webhook --no-verify-jwt`.
- **Natureza:** é código **privado**, roda no servidor. Ninguém vê o código. Por
  isso **pode** guardar segredos (o token do MP, a chave admin do banco).

### A pergunta natural: "não dava pra juntar tudo num deploy só?"

Dava — era a opção "Cloudflare Worker" que descartamos. Separar é melhor porque:

1. **Segurança.** O webhook precisa da `service_role` do Supabase — a chave que
   abre o banco inteiro, ignorando todas as travas de segurança (RLS). Essa chave
   é uma bomba. Colocando o webhook **dentro** do Supabase, a chave nunca sai de
   casa: o Supabase injeta ela automaticamente no ambiente da função. Se o webhook
   morasse no Cloudflare, você teria que **copiar** a chave pra lá — agora ela mora
   em dois lugares, dobrando a chance de vazar.

2. **Isolamento de falha.** Se um deploy ruim do webhook quebrar, o app no Cloudflare
   continua no ar (são servidores separados). Se estivessem juntos, um bug no webhook
   poderia derrubar o app inteiro.

3. **Proximidade.** O webhook só faz uma coisa: escrever no banco. O banco é o
   Supabase. Então o webhook mora coladinho no que ele precisa.

Resumo: **um deploy pro app (Cloudflare), um pro webhook (Supabase)**, porque são
programas de naturezas opostas (público vs. secreto) e isso dá mais segurança.

---

## 4. O ciclo completo de uma assinatura (visão de cima)

```
┌──────────┐   1. clica "Assinar"      ┌─────────────┐
│ Usuário  │ ─────────────────────────▶│  App (PWA)  │
└──────────┘                           └──────┬──────┘
     ▲                                        │ 2. cria assinatura (preapproval)
     │                                        ▼    com external_reference = user_id
     │                                 ┌─────────────┐
     │  6. app lê status e libera      │ Mercado Pago│
     │     (ou bloqueia) a tela        └──────┬──────┘
     │                                        │ 3. cobra cartão/Pix
     │                                        │    e, quando muda algo, AVISA:
     │                                        ▼
┌────┴───────┐   5. upsert         ┌────────────────────┐
│  Supabase  │◀────────────────────│  Webhook           │
│  (tabela   │                     │  (Edge Function)   │
│ subscriptions)                   └────────────────────┘
└────────────┘        ▲  4. webhook pergunta ao MP "qual o status REAL do id X?"
                      └──────────────────────────────────┘
```

1. Usuário clica **Assinar** no app.
2. App cria uma **assinatura (preapproval)** no Mercado Pago, carimbando o
   `external_reference` com o `user_id` do usuário. *(Isso é a Fase 5 — ainda não feita.)*
3. Mercado Pago cobra o cartão/Pix. Toda vez que algo muda (pagou, renovou, cancelou,
   falhou), o MP dispara o **webhook**.
4. O webhook **não confia** no aviso. Ele pega só o `id` do aviso e **pergunta de
   volta** ao Mercado Pago: "qual o status real dessa assinatura?".
5. Com a resposta confiável do MP, o webhook grava (`upsert`) na tabela
   `subscriptions`: status, até quando está pago, de quem é.
6. Quando o usuário abre o app, o app lê a linha dele na `subscriptions` e decide:
   libera a tela ou mostra "assine".

---

## 5. A requisição do webhook em detalhe (o que vai, o que vem)

Aqui está o coração do que você pediu: **o que trafega**.

### 5.1. O que o Mercado Pago MANDA pra você (a notificação)

O MP faz um **POST** na sua URL. A notificação vem em três partes:

**(a) A query string na URL** (dados na própria URL):

```
POST https://xsfeemdgkdsfdommxztw.supabase.co/functions/v1/mp-webhook?type=subscription_preapproval&data.id=2c938084726fca480172750000000000
```

- `type` → o tipo do evento (ex: `subscription_preapproval` = assinatura mudou).
- `data.id` → o **id do recurso** no Mercado Pago (o número da assinatura).

**(b) Os headers** (metadados da requisição):

```
x-signature: ts=1704908010,v1=3d519...a8f   ← a ASSINATURA de segurança
x-request-id: abc-123-def                    ← id único desta requisição
content-type: application/json
```

- `x-signature` é o mais importante: é uma **prova criptográfica** de que foi o
  Mercado Pago (e não um impostor) que mandou isso. Explicado no item 5.3.

**(c) O corpo (body) em JSON:**

```json
{
  "type": "subscription_preapproval",
  "action": "updated",
  "data": { "id": "2c938084726fca480172750000000000" }
}
```

> **Importante:** o corpo **repete** o `type` e o `id`. Mas a gente **não confia**
> no corpo pra decidir nada além de "qual id consultar". Veja 5.4.

### 5.2. O que o webhook RESPONDE pro Mercado Pago

A resposta é curtíssima — só um número de status HTTP. O MP só quer saber se você
recebeu:

| Resposta | Quando | O que o MP faz |
|----------|--------|----------------|
| `200 ok` | Deu tudo certo (ou evento ignorável) | Fica satisfeito, não reenvia |
| `401 invalid signature` | A assinatura não bateu (impostor?) | Descarta |
| `400 missing data.id` | Faltou o id | — |
| `500 db error` | Erro ao gravar no banco | **Reenvia depois** (retry) |

Regra de ouro dos webhooks: **responda 200 rápido**. Se você demora ou erra, o MP
reenvia o mesmo aviso várias vezes (por isso a idempotência no item 6).

### 5.3. A verificação de assinatura (`x-signature`) — por que e como

**Por que:** sua URL de webhook é pública. Qualquer pessoa na internet pode fazer
um POST nela dizendo "ei, o usuário X pagou, libera!". Sem checagem, um golpista
ativaria assinatura de graça. A assinatura HMAC impede isso.

**Como funciona (ideia):** você e o Mercado Pago compartilham uma **senha secreta**
(`MP_WEBHOOK_SECRET`, que você copia do painel do MP). O MP usa essa senha pra
gerar um "selo" (o `v1` dentro do `x-signature`) a partir dos dados da requisição.
Seu webhook refaz o mesmo cálculo com a mesma senha. Se o selo que você calculou
bate com o que veio, foi o MP mesmo. Um impostor não tem a senha, então não
consegue forjar o selo.

**O cálculo (o que o código faz):**

```
1. Lê do x-signature:  ts (timestamp) e v1 (o selo que o MP mandou)
2. Monta o "manifesto":  id:<data.id>;request-id:<x-request-id>;ts:<ts>;
3. Calcula HMAC-SHA256(manifesto, MP_WEBHOOK_SECRET)  →  selo_calculado
4. Compara selo_calculado com v1
       bate  → requisição legítima, segue
       não bate → 401, descarta
```

> Detalhe fino: a comparação é feita em **tempo constante** (`timingSafeEqual`) pra
> não vazar informação pelo tempo de resposta. É paranoia correta de segurança.

### 5.4. "Nunca confie no corpo" — a volta ao Mercado Pago

Mesmo com a assinatura válida, o webhook **não** usa o status que veio no aviso.
Por quê? O aviso diz "algo mudou no id X", mas não dá pra garantir que o corpo
reflete o estado atual (avisos podem chegar fora de ordem, atrasados, etc.).

Então o webhook faz uma **segunda requisição**, agora **ele** chamando o MP:

**O que o webhook MANDA pro MP (a consulta):**

```
GET https://api.mercadopago.com/preapproval/2c938084726fca480172750000000000
Authorization: Bearer <MP_ACCESS_TOKEN>
```

- É um GET autenticado com o `MP_ACCESS_TOKEN` (o token da sua conta MP — secreto).
- Pergunta: "me diga o estado atual e verdadeiro dessa assinatura".

**O que o MP RESPONDE (o estado verdadeiro):**

```json
{
  "id": "2c938084726fca480172750000000000",
  "status": "authorized",
  "external_reference": "d572bd5a-654b-44f4-bbf0-989a1d982178",
  "payer_id": 123456789,
  "next_payment_date": "2026-11-22T00:00:00.000-03:00"
}
```

- `status` → `authorized` (pagando), `paused`, `cancelled`…
- `external_reference` → **o `user_id` do seu usuário** (que o checkout carimbou).
  É assim que o webhook sabe **de quem** é a assinatura.
- `payer_id` → id do cliente no MP (guardamos em `provider_customer_id`).
- `next_payment_date` → até quando está pago (vira `current_period_end`).

### 5.5. O que o webhook GRAVA no banco (o upsert)

Com o estado verdadeiro em mãos, o webhook escreve na tabela `subscriptions`:

```
upsert em public.subscriptions:
  user_id                  = external_reference        (de quem é)
  status                   = "active"                  (traduzido de "authorized")
  current_period_end       = next_payment_date         (até quando vale)
  provider                 = "mercadopago"
  provider_subscription_id = id do preapproval
  provider_payment_id      = id do pagamento (nas renovações)
  provider_customer_id     = payer_id
  updated_at               = agora
```

Tradução de status (MP → nosso):

| status no MP | status na tabela | app libera? |
|--------------|------------------|-------------|
| `authorized` | `active`         | sim         |
| `paused`     | `past_due`       | não         |
| `cancelled`  | `canceled`       | não         |
| (outro)      | `inactive`       | não         |

---

## 6. Idempotência (por que gravar o mesmo aviso 2x não quebra)

O Mercado Pago **reenvia** o mesmo aviso se achar que você não recebeu (timeout,
erro). Então o mesmo evento pode chegar 2, 3 vezes. Se cada chegada criasse uma
linha nova, você teria assinaturas duplicadas.

Solução: **upsert por `user_id`** (que é a chave primária). Upsert = "insere se não
existe, atualiza se existe". Chegando o mesmo aviso de novo, ele só reescreve a
mesma linha com os mesmos dados. Zero duplicata. Isso é **idempotência**: repetir a
operação dá o mesmo resultado.

---

## 7. Como o app usa isso (o outro lado)

O app **não** fala com o Mercado Pago nem com o webhook. Ele só lê a tabela:

```
app abre → fetchSubscription() → SELECT status, current_period_end
                                 FROM subscriptions WHERE user_id = eu
         → isActive()?  status ∈ {active, trialing} E period_end no futuro
              sim → libera o app
              não → mostra tela "Assine"
```

Essa leitura é protegida por **RLS**: a policy `auth.uid() = user_id` garante que
cada usuário só enxerga a própria linha. O webhook, por outro lado, escreve com a
`service_role`, que **ignora** a RLS (ele precisa escrever na linha de qualquer
usuário). Por isso o webhook tem que ser servidor secreto.

---

## 8. Os segredos (quem sabe o quê)

| Segredo | O que abre | Onde fica | Você seta? |
|---------|-----------|-----------|------------|
| `MP_ACCESS_TOKEN` | Sua conta Mercado Pago (consultar pagamentos) | Supabase (secret) | **Sim** |
| `MP_WEBHOOK_SECRET` | Valida a assinatura dos avisos | Supabase (secret) | **Sim** |
| `SUPABASE_SERVICE_ROLE_KEY` | O banco inteiro (ignora RLS) | Supabase (automático) | **Não** — já vem |
| `SUPABASE_URL` | Endereço do banco | Supabase (automático) | **Não** — já vem |

A `service_role` e a URL o Supabase injeta sozinho no ambiente da função. Você só
precisa setar os dois do Mercado Pago. É mais um motivo de o webhook morar no
Supabase: a chave mais perigosa nunca precisa ser copiada por você.

---

## 9. Passo a passo de deploy (o resumão)

> Detalhes e comandos completos: `docs/webhook-mercadopago.md`.

1. **Migration** (`supabase db push`) → cria as 2 colunas que faltavam na tabela.
2. **Segredos** (`supabase secrets set MP_ACCESS_TOKEN=... MP_WEBHOOK_SECRET=...`).
3. **Deploy do webhook** (`supabase functions deploy mp-webhook --no-verify-jwt`).
4. **Painel do MP** → cadastrar a URL do webhook e os eventos de assinatura.

O `--no-verify-jwt` existe porque, por padrão, toda Edge Function exige um login
(JWT) do Supabase. Mas o Mercado Pago não tem login do Supabase — ele é um
estranho autenticado pela **assinatura HMAC**, não por JWT. Então desligamos a
exigência de JWT e confiamos na checagem de assinatura que o próprio código faz.

---

## 10. Glossário rápido

- **Webhook** — URL sua que um serviço externo chama pra te avisar de um evento.
- **Deploy** — publicar um programa no servidor pra ele ficar no ar.
- **Edge Function** — pequeno programa de servidor que o Supabase roda sob demanda.
- **preapproval** — o nome que o Mercado Pago dá pra uma **assinatura recorrente**.
- **HMAC** — técnica pra provar, com uma senha compartilhada, que uma mensagem é
  autêntica e não foi adulterada.
- **RLS (Row Level Security)** — trava do Postgres que decide, linha a linha, quem
  pode ver/editar o quê.
- **service_role** — chave de administrador do Supabase que ignora a RLS.
- **upsert** — insere se não existe, atualiza se existe.
- **idempotente** — repetir a operação não muda o resultado final.
- **external_reference** — campo livre que mandamos ao MP pra marcar de quem é a
  assinatura (guardamos o `user_id` ali).
```
