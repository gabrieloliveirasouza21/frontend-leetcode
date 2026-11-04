/**
 * Ordem aleatória dos índices de 0 a n - 1, pelo algoritmo de Fisher-Yates.
 * As opções são escritas com a resposta certa em qualquer posição, e embaralhar
 * a cada abertura impede que a posição entregue a resposta.
 */
export function shuffledIndices(n: number, random: () => number = Math.random): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
