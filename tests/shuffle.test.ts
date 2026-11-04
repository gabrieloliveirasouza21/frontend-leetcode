import { describe, expect, it } from 'vitest';
import { shuffledIndices } from '../src/shuffle';

describe('embaralhar opções', () => {
  it('devolve cada índice uma vez', () => {
    for (let n = 0; n <= 6; n++) expect([...shuffledIndices(n)].sort()).toEqual(Array.from({ length: n }, (_, i) => i));
  });

  it('a resposta certa cai em todas as posições', () => {
    const posicoes = new Set<number>();
    for (let i = 0; i < 400; i++) posicoes.add(shuffledIndices(4).indexOf(0));
    expect([...posicoes].sort()).toEqual([0, 1, 2, 3]);
  });

  it('usa o gerador recebido', () => {
    expect(shuffledIndices(3, () => 0)).toEqual([1, 2, 0]);
  });
});
