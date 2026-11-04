// Repetição espaçada em caixas, no estilo Leitner.
// Cada acerto leva o problema para o próximo intervalo. Um erro volta para o primeiro.

const MIN = 60_000;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

export const INTERVALS: { ms: number; label: string }[] = [
  { ms: 10 * MIN, label: '10 min' },
  { ms: HORA, label: '1 hora' },
  { ms: 5 * HORA, label: '5 horas' },
  { ms: 10 * HORA, label: '10 horas' },
  { ms: DIA, label: '1 dia' },
  { ms: 3 * DIA, label: '3 dias' },
  { ms: 7 * DIA, label: '1 semana' },
  { ms: 30 * DIA, label: '1 mês' },
  { ms: 90 * DIA, label: '3 meses' },
  { ms: 180 * DIA, label: '6 meses' },
];

export interface Card {
  /** Posição em INTERVALS. */
  box: number;
  /** Quando o problema volta para revisão, em milissegundos desde 1970. */
  due: number;
  /** Total de tentativas registradas. */
  reviews: number;
  /** Quantas vezes errou. */
  lapses: number;
  /** Se a última tentativa foi um acerto. */
  lastCorrect: boolean;
}

/**
 * Registra uma tentativa. A primeira tentativa, certa ou errada, começa no primeiro intervalo.
 * Depois, cada acerto avança uma caixa e cada erro volta para a primeira.
 */
export function schedule(card: Card | undefined, correct: boolean, now: number): Card {
  const box = !card || !correct ? 0 : Math.min(card.box + 1, INTERVALS.length - 1);
  return {
    box,
    due: now + INTERVALS[box].ms,
    reviews: (card?.reviews ?? 0) + 1,
    lapses: (card?.lapses ?? 0) + (correct ? 0 : 1),
    lastCorrect: correct,
  };
}

export const isDue = (card: Card, now: number) => card.due <= now;

/** Texto curto para o tempo até a revisão, como "em 3 horas" ou "agora". */
export function untilLabel(due: number, now: number): string {
  const diff = due - now;
  if (diff <= 0) return 'agora';
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (diff < HORA) return rtf.format(Math.max(1, Math.round(diff / MIN)), 'minute');
  if (diff < DIA) return rtf.format(Math.round(diff / HORA), 'hour');
  if (diff < 30 * DIA) return rtf.format(Math.round(diff / DIA), 'day');
  return rtf.format(Math.round(diff / (30 * DIA)), 'month');
}
