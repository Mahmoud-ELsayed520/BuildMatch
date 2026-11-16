import { describe, it, expect } from 'vitest';
import { formatCurrency, formatArea } from './formatters';

describe('Formatters Utility', () => {
  it('formats area correctly with Arabic square meter symbol', () => {
    expect(formatArea(500)).toBe('500 م²');
    expect(formatArea(null)).toBe('—');
  });

  it('formats currency with default EGP safely', () => {
    const formatted = formatCurrency(100000);
    expect(formatted).toContain('ج.م');
    expect(formatCurrency(null)).toBe('0 EGP');
  });
});
