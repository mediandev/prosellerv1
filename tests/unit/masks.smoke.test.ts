import { describe, it, expect } from 'vitest';
import { maskCEP, unmaskNumber } from '@/lib/masks';

describe('masks.ts smoke (F-002 setup)', () => {
  it('maskCEP formats 8 digits as XXXXX-XXX', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
  });

  it('maskCEP strips non-digits before formatting', () => {
    expect(maskCEP('abc01310def100xyz')).toBe('01310-100');
  });

  it('unmaskNumber removes every non-digit character', () => {
    expect(unmaskNumber('(11) 98765-4321')).toBe('11987654321');
  });
});
