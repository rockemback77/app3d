// Cria a assinatura (preapproval) no Mercado Pago para o usuário logado.
//
// Fluxo:
//   1. App chama esta função (supabase.functions.invoke) com o JWT do usuário.
//   2. A função identifica o usuário pelo JWT.
//   3. Cria o preapproval no MP com external_reference = user.id
//      (é ASSIM que o webhook sabe de quem é a assinatura depois).
//   4. Devolve o init_point (URL do checkout hospedado do MP).
//   5. App redireciona o usuário para o init_point pagar.
//
// Protegida por JWT (verify_jwt = true em config.toml): só usuário logado.
// Deploy: supabase functions deploy mp-create-subscription

import { createClient } from 'jsr:@supabase/supabase-js@2';

// SUPABASE_URL e SUPABASE_ANON_KEY são automáticos no runtime.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
// Secret (supabase secrets set): mesmo token do webhook.
const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')!;
// Para onde o MP devolve o usuário depois do checkout. Pode virar secret APP_URL.
const APP_URL = Deno.env.get('APP_URL') ?? 'https://app3d.luizhmail.workers.dev';

// ⬇⬇⬇ AJUSTE O PREÇO DA ASSINATURA AQUI (R$ por mês) ⬇⬇⬇
const PRICE_BRL = 19.90;
// ⬆⬆⬆ ------------------------------------------------ ⬆⬆⬆

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

  // Identifica o usuário pelo JWT do Supabase.
  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: 'usuário inválido' }, 401);
  if (!user.email) return json({ error: 'usuário sem email' }, 400);

  // Cria o preapproval no Mercado Pago.
  const res = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: 'Assinatura Printaê — Calculadora de Custo 3D',
      external_reference: user.id, // o webhook lê isto para saber de quem é
      payer_email: user.email,
      back_url: APP_URL,
      status: 'pending',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: PRICE_BRL,
        currency_id: 'BRL',
      },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('MP preapproval falhou:', JSON.stringify(data));
    return json({ error: 'erro ao criar assinatura no Mercado Pago' }, 502);
  }

  // init_point = checkout hospedado do MP. O app redireciona para cá.
  return json({ init_point: data.init_point, id: data.id }, 200);
});
