import { supabase } from '../supabase';

/**
 * Inicia o checkout da assinatura: chama a Edge Function que cria o preapproval
 * no Mercado Pago e redireciona o usuário para o checkout hospedado do MP.
 * Retorna uma mensagem de erro, ou null em caso de sucesso (redireciona).
 */
export async function startCheckout(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('mp-create-subscription', {
    body: {},
  });
  if (error) return error.message ?? 'falha ao iniciar o checkout';
  const url = (data as { init_point?: string } | null)?.init_point;
  if (!url) return 'resposta inválida do servidor';
  window.location.href = url;
  return null;
}
