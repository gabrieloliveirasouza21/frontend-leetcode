import { describe, expect, it } from 'vitest';
import { compare, specificity } from '../src/visuals/calcularEspecificidade';

const w = (selector: string) => specificity(selector).weight;

describe('especificidade', () => {
  it.each([
    ['li', [0, 0, 1]],
    ['.headliner', [0, 1, 0]],
    ['#lineup li', [1, 0, 1]],
    ['#lineup .headliner', [1, 1, 0]],
    ['ul > li.headliner:hover', [0, 2, 2]],
    ['a[href^="https"]', [0, 1, 1]],
    ['p::first-line', [0, 0, 2]],
    ['p:before', [0, 0, 2]],
    ['*', [0, 0, 0]],
    ['.a.b.c', [0, 3, 0]],
    ['li:nth-child(2n + 1)', [0, 1, 1]],
  ])('%s', (selector, expected) => {
    expect(w(selector)).toEqual(expected);
  });

  it(':is, :not e :has valem o argumento mais específico', () => {
    expect(w(':is(#lineup, .x) li')).toEqual([1, 0, 1]);
    expect(w('li:not(.headliner)')).toEqual([0, 1, 1]);
    expect(w('section:has(> h2)')).toEqual([0, 0, 2]);
  });

  it(':where vale zero', () => {
    expect(w(':where(#lineup) li')).toEqual([0, 0, 1]);
  });

  it('compara por coluna', () => {
    expect(compare(w('#lineup li'), w('.a.b.c.d.e.f.g.h.i.j.k'))).toBeGreaterThan(0);
    expect(compare(w('.x'), w('.y'))).toBe(0);
  });

  it('recusa listas e seletores inválidos', () => {
    expect(() => specificity('h1, h2')).toThrow();
    expect(() => specificity('#')).toThrow();
    expect(() => specificity('a[href')).toThrow();
    expect(() => specificity('')).toThrow();
  });

  it('separa as partes', () => {
    expect(specificity('#lineup > li.headliner').parts.map((p) => [p.text, p.kind])).toEqual([
      ['#lineup', 'id'],
      ['>', 'combinator'],
      ['li', 'element'],
      ['.headliner', 'class'],
    ]);
  });
});
