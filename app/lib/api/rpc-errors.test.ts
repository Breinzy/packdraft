import { describe, expect, it } from 'vitest';
import { rpcErrorMessage, rpcErrorStatus } from './rpc-errors';

describe('rpcErrorStatus', () => {
  it('maps auth failures to 401', () => {
    expect(rpcErrorStatus('Not authenticated')).toBe(401);
    expect(rpcErrorStatus('Profile required')).toBe(401);
  });

  it('maps cash, holdings, and quantity to 400', () => {
    expect(rpcErrorStatus('Insufficient cash')).toBe(400);
    expect(rpcErrorStatus('Insufficient holdings')).toBe(400);
    expect(rpcErrorStatus('Quantity must be a positive integer')).toBe(400);
  });

  it('maps closed or ineligible trades to 409', () => {
    expect(rpcErrorStatus('Trading is closed')).toBe(409);
    expect(rpcErrorStatus('Tournament is not open to join')).toBe(409);
    expect(rpcErrorStatus('Asset is not tradable')).toBe(409);
    expect(rpcErrorStatus('Asset is not in this tournament')).toBe(409);
  });
});

describe('rpcErrorMessage', () => {
  it('strips Postgres exception prefixes', () => {
    expect(rpcErrorMessage(new Error('P0001: Insufficient cash'))).toBe('Insufficient cash');
  });

  it('reads message objects', () => {
    expect(rpcErrorMessage({ message: 'Trading is closed' })).toBe('Trading is closed');
  });
});
