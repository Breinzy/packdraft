export function rpcErrorStatus(message: string): number {
  const closed = /closed|not open|not found|not tradable|not eligible|not in this tournament|invite|qualifier|only free/i;
  if (/not authenticated|profile required/i.test(message)) return 401;
  if (/insufficient/i.test(message)) return 400;
  if (/quantity/i.test(message)) return 400;
  if (closed.test(message)) return 409;
  if (/missing supabase|not configured/i.test(message)) return 503;
  return 400;
}

export function rpcErrorMessage(err: unknown): string {
  if (err instanceof Error) return stripRpcPrefix(err.message);
  if (err && typeof err === 'object' && 'message' in err) {
    return stripRpcPrefix(String((err as { message: unknown }).message));
  }
  return 'Request failed';
}

function stripRpcPrefix(message: string): string {
  return message.replace(/^[A-Z0-9]+:\s*/, '');
}
