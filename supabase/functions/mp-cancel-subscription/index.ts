// Cancela a assinatura (preapproval) do usuário logado no Mercado Pago.
//
// Fluxo:
//   1. App chama com o JWT do usuário.
//   2. Lê a linha do próprio usuário em subscriptions (RLS permite o SELECT
//      do próprio user_id) para pegar o provider_subscription_id.
//   3. PUT no preapproval do MP com status=cancelled.
//   4. O webhook recebe o evento e atualiza o status no banco.
//
// Protegida por JWT (verify_jwt = true). Deploy:
//   supabase functions deploy mp-cancel-subscription

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'sem autenticação' }, 401);

  // Client no contexto do usuário: a RLS garante que ele só lê a própria linha.
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: 'usuário inválido' }, 401);

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('provider_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (subErr) return json({ error: 'erro ao ler assinatura' }, 500);

  const subId = sub?.provider_subscription_id;
  if (!subId) return json({ error: 'nenhuma assinatura ativa para cancelar' }, 404);

  // Cancela no Mercado Pago.
  const res = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('MP cancel falhou:', detail);
    return json({ error: 'erro ao cancelar no Mercado Pago' }, 502);
  }

  // O webhook recebe o evento de cancelamento e atualiza o status no banco.
  return json({ ok: true }, 200);
});
