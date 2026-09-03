import { describe, expect, it } from 'vitest';
import { isNavActive, PRIMARY_NAV } from '@/components/layout/nav-config';

describe('collector navigation', () => {
  it('does not treat settings as a set page', () => {
    const sets = PRIMARY_NAV.find((item) => item.label === 'Sets');
    expect(sets).toBeTruthy();
    expect(isNavActive('/settings', sets!)).toBe(false);
    expect(isNavActive('/sets', sets!)).toBe(true);
    expect(isNavActive('/sets/abc', sets!)).toBe(true);
  });

  it('treats legacy asset URLs as market', () => {
    const market = PRIMARY_NAV.find((item) => item.label === 'Market');
    expect(market).toBeTruthy();
    expect(isNavActive('/market', market!)).toBe(true);
    expect(isNavActive('/assets/xyz', market!)).toBe(true);
    expect(isNavActive('/overview', market!)).toBe(false);
  });

  it('highlights overview only on the home route', () => {
    const overview = PRIMARY_NAV.find((item) => item.label === 'Overview');
    expect(overview).toBeTruthy();
    expect(isNavActive('/', overview!)).toBe(true);
    expect(isNavActive('/dashboard', overview!)).toBe(true);
    expect(isNavActive('/portfolio', overview!)).toBe(false);
  });
});
