import { getCronSecret } from '@/lib/env';

export function isCronAuthorized(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}
