// Webhook do Mercado Pago (assinatura recorrente / preapproval).
//
// Fluxo seguro:
//   1. Só aceita POST.
//   2. Verifica a assinatura HMAC do header `x-signature` (senão qualquer um
//      forja um POST e ativa assinatura de graça).
//   3. NUNCA confia no corpo: pega só o id e consulta a API do Mercado Pago
//      com o MP_ACCESS_TOKEN para saber o status real.
//   4. Faz upsert em public.subscriptions via service_role (burla RLS).
//      Idempotente: MP reenvia o mesmo evento, upsert por user_id não duplica.
//
// Deploy: supabase functions deploy mp-webhook --no-verify-jwt
// (o webhook é anônimo — o MP não manda JWT do Supabase)

import { createClient } from 'jsr:@supabase/supabase-js@2';

// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente no
// runtime da Edge Function — não precisam ser setados como secret.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Esses dois SIM precisam: supabase secrets set MP_ACCESS_TOKEN=... MP_WEBHOOK_SECRET=...
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';

const MP_API = 'https://api.mercadopago.com';

/** Comparação de tempo constante — evita timing attack no hash da assinatura. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** HMAC-SHA256 do manifesto, hex. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida o header `x-signature` do Mercado Pago.
 * Formato: `ts=<unix>,v1=<hmac>`.
 * Manifesto assinado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (segmentos ausentes são omitidos; data.id alfanumérico vai em minúsculas).
 */
async function verifySignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) {
    console.error('MP_WEBHOOK_SECRET não configurado — rejeitando por segurança');
    return false;
  }
  if (!xSignature) return false;

  let ts = '';
  let v1 = '';
  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim());
    if (k === 'ts') ts = v;
    else if (k === 'v1') v1 = v;
  }
  if (!ts || !v1) return false;

  const id = dataId && /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId ?? '';
  let manifest = '';
  if (id) manifest += `id:${id};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = await hmacHex(MP_WEBHOOK_SECRET, manifest);
  return timingSafeEqual(expected, v1);
}

/** GET autenticado na API do Mercado Pago. null se não achar. */
async function mpGet(path: string): Promise<any | null> {
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });
  if (!res.ok) {
    console.error(`MP GET ${path} -> ${res.status}`);
    return null;
  }
  return await res.json();
}

/** Status do preapproval do MP -> status da nossa tabela subscriptions. */
function mapStatus(preapprovalStatus: string): string {
  switch (preapprovalStatus) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'past_due';
    case 'cancelled':
      return 'canceled';
    default:
      return 'inactive';
  }
}

type Resolved = {
  userId: string;
  status: string;
  periodEnd: string | null;
  subId: string;
  paymentId: string | null;
  customerId: string | null;
};

/**
 * A partir de um preapproval (assinatura), extrai o estado para gravar.
 * user_id vem do external_reference (setado no checkout — fase 5).
 */
function fromPreapproval(pre: any, paymentId: string | null): Resolved | null {
  const userId = pre?.external_reference;
  if (!userId) {
    console.error('preapproval sem external_reference — impossível mapear usuário');
    return null;
  }
  return {
    userId,
    status: mapStatus(pre.status),
    periodEnd: pre.next_payment_date ?? null,
    subId: String(pre.id),
    paymentId,
    customerId: pre.payer_id != null ? String(pre.payer_id) : null,
  };
}

Deno.serve(async (req) => {
  // Health check: validadores de webhook (inclusive o MP ao salvar a URL)
  // às vezes fazem um GET. Responde 200 para não reprovar a validação.
  if (req.method === 'GET') {
    return new Response('ok', { status: 200 });
  }
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({} as any));

  // data.id e type podem vir na query string OU no corpo — a assinatura é
  // calculada sobre o data.id da query.
  const dataId = url.searchParams.get('data.id') ?? body?.data?.id ?? url.searchParams.get('id') ?? null;
  const type = body?.type ?? url.searchParams.get('type') ?? body?.topic ?? url.searchParams.get('topic') ?? '';

  const ok = await verifySignature(
    req.headers.get('x-signature'),
    req.headers.get('x-request-id'),
    dataId,
  );
  if (!ok) {
    return new Response('invalid signature', { status: 401 });
  }

  if (!dataId) {
    return new Response('missing data.id', { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotência de ENTREGA: o MP reenvia a mesma notificação em caso de
  // timeout/erro. `body.id` é o id da notificação (estável entre reenvios da
  // MESMA notificação — diferente do data.id, que é o id do recurso). Se já
  // processamos esse id, short-circuit: evita reconsultar a API do MP à toa.
  // (Duplicata de ESTADO já é coberta pelo upsert por user_id; evento fora de
  // ordem já é coberto por sempre reconsultarmos o estado atual no MP.)
  const eventId = body?.id != null ? String(body.id) : null;
  if (eventId) {
    const { data: seen } = await supabase
      .from('webhook_events')
      .select('event_id')
      .eq('provider', 'mercadopago')
      .eq('event_id', eventId)
      .maybeSingle();
    if (seen) {
      return new Response('duplicate', { status: 200 });
    }
  }

  // Resolve o estado real consultando o MP (nunca confia no corpo).
  let resolved: Resolved | null = null;

  if (type.includes('preapproval') && !type.includes('authorized_payment')) {
    const pre = await mpGet(`/preapproval/${dataId}`);
    if (pre) resolved = fromPreapproval(pre, null);
  } else if (type.includes('authorized_payment')) {
    // Cobrança mensal recorrente: resolve o preapproval ligado.
    const ap = await mpGet(`/authorized_payments/${dataId}`);
    if (ap?.preapproval_id) {
      const pre = await mpGet(`/preapproval/${ap.preapproval_id}`);
      if (pre) resolved = fromPreapproval(pre, ap?.payment?.id ? String(ap.payment.id) : String(dataId));
    }
  } else if (type === 'payment') {
    // Pagamento avulso: só ativa se aprovado e com external_reference.
    const pay = await mpGet(`/v1/payments/${dataId}`);
    if (pay?.external_reference && pay?.status === 'approved') {
      resolved = {
        userId: pay.external_reference,
        status: 'active',
        periodEnd: null,
        subId: pay?.metadata?.preapproval_id ? String(pay.metadata.preapproval_id) : '',
        paymentId: String(pay.id),
        customerId: pay?.payer?.id != null ? String(pay.payer.id) : null,
      };
    }
  } else {
    // Tipo não tratado (ex: ping de teste) — assinatura válida, retorna 200
    // para o MP não reenviar.
    return new Response('ignored', { status: 200 });
  }

  if (!resolved) {
    // Recurso não encontrado no MP ou sem dados úteis. 200 evita retry storm;
    // o estado real será reconciliado no próximo evento.
    return new Response('no-op', { status: 200 });
  }

  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: resolved.userId,
      status: resolved.status,
      current_period_end: resolved.periodEnd,
      provider: 'mercadopago',
      provider_subscription_id: resolved.subId || null,
      provider_payment_id: resolved.paymentId,
      provider_customer_id: resolved.customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    console.error('upsert subscriptions falhou:', error.message);
    return new Response('db error', { status: 500 });
  }

  // Marca o evento como processado SÓ APÓS sucesso. Se algo acima falhasse
  // (MP ou db), o evento NÃO seria marcado e o reenvio do MP reprocessaria —
  // nunca perdemos uma atualização por causa do dedup.
  if (eventId) {
    const { error: evErr } = await supabase
      .from('webhook_events')
      .insert({ provider: 'mercadopago', event_id: eventId });
    // 23505 = unique_violation (corrida com reenvio simultâneo). Inofensivo:
    // o estado já foi gravado. Qualquer outro erro é só log, não quebra a resposta.
    if (evErr && evErr.code !== '23505') {
      console.error('registro em webhook_events falhou (nao-fatal):', evErr.message);
    }
  }

  return new Response('ok', { status: 200 });
});
