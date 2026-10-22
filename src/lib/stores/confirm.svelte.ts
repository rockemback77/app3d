// Confirmação no estilo do app (substitui o confirm() nativo do navegador).
type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

let resolver: ((v: boolean) => void) | null = null;

export const confirmState = $state<{ open: boolean; opts: ConfirmOpts }>({
  open: false,
  opts: { message: '' },
});

/** Abre o modal e resolve true (confirmar) ou false (cancelar). */
export function askConfirm(opts: ConfirmOpts | string): Promise<boolean> {
  confirmState.opts = typeof opts === 'string' ? { message: opts } : opts;
  confirmState.open = true;
  return new Promise<boolean>((res) => {
    resolver = res;
  });
}

export function resolveConfirm(v: boolean): void {
  confirmState.open = false;
  resolver?.(v);
  resolver = null;
}
