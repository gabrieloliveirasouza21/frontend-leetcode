import { describe, expect, it } from 'vitest';
import { INTERVALS, isDue, schedule, untilLabel, type Card } from '../src/review';

const MIN = 60_000;
const t0 = Date.UTC(2026, 0, 1);

describe('agendador de revisão', () => {
  it('primeira tentativa vai para 10 minutos, acertando ou errando', () => {
    expect(schedule(undefined, true, t0)).toMatchObject({ box: 0, due: t0 + 10 * MIN, reviews: 1, lapses: 0 });
    expect(schedule(undefined, false, t0)).toMatchObject({ box: 0, due: t0 + 10 * MIN, reviews: 1, lapses: 1 });
  });

  it('cada acerto avança um intervalo, na ordem pedida', () => {
    const esperado = ['10 min', '1 hora', '5 horas', '10 horas', '1 dia', '3 dias', '1 semana', '1 mês', '3 meses', '6 meses'];
    let card: Card | undefined;
    const vistos: string[] = [];
    let agora = t0;
    for (let i = 0; i < esperado.length; i++) {
      card = schedule(card, true, agora);
      vistos.push(INTERVALS[card.box].label);
      expect(card.due - agora).toBe(INTERVALS[card.box].ms);
      agora = card.due;
    }
    expect(vistos).toEqual(esperado);
  });

  it('depois de 6 meses, continua em 6 meses', () => {
    let card = schedule(undefined, true, t0);
    for (let i = 0; i < 15; i++) card = schedule(card, true, card.due);
    expect(INTERVALS[card.box].label).toBe('6 meses');
  });

  it('errar volta para o primeiro intervalo', () => {
    let card = schedule(undefined, true, t0);
    for (let i = 0; i < 5; i++) card = schedule(card, true, card.due);
    card = schedule(card, false, card.due);
    expect(card.box).toBe(0);
    expect(card.lapses).toBe(1);
    expect(card.lastCorrect).toBe(false);
  });

  it('vence na hora certa', () => {
    const card = schedule(undefined, true, t0);
    expect(isDue(card, t0 + 9 * MIN)).toBe(false);
    expect(isDue(card, t0 + 10 * MIN)).toBe(true);
  });

  it('descreve o tempo até a revisão', () => {
    expect(untilLabel(t0, t0)).toBe('agora');
    expect(untilLabel(t0 + 10 * MIN, t0)).toBe('em 10 minutos');
    expect(untilLabel(t0 + 5 * 60 * MIN, t0)).toBe('em 5 horas');
    expect(untilLabel(t0 + 3 * 24 * 60 * MIN, t0)).toBe('em 3 dias');
  });
});
