import { useCallback, useEffect, useState } from 'react';
import { schedule, type Card } from './review';

const SOLVED_KEY = 'trilha-frontend:solved';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sem armazenamento (janela privada): o progresso vale só para esta sessão.
  }
}

export function useSolved() {
  const [solved, setSolved] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(read(SOLVED_KEY) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });

  const markSolved = useCallback((slug: string) => {
    setSolved((previous) => {
      const next = new Set(previous).add(slug);
      write(SOLVED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { solved, markSolved };
}

const REVIEW_KEY = 'trilha-frontend:revisao';

/** Histórico de revisão por problema, salvo no navegador. */
export function useReview() {
  const [cards, setCards] = useState<Record<string, Card>>(() => {
    try {
      return JSON.parse(read(REVIEW_KEY) ?? '{}') as Record<string, Card>;
    } catch {
      return {};
    }
  });

  const record = useCallback((slug: string, correct: boolean) => {
    setCards((previous) => {
      const next = { ...previous, [slug]: schedule(previous[slug], correct, Date.now()) };
      write(REVIEW_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { cards, record };
}

/** Hora atual, atualizada a cada 30 segundos, para contadores de revisão. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export const loadDraft =(slug: string) => read(`trilha-frontend:draft:${slug}`);
export const saveDraft = (slug: string, code: string) => write(`trilha-frontend:draft:${slug}`, code);
