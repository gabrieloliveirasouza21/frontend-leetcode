import { useCallback, useState } from 'react';

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

export const loadDraft = (slug: string) => read(`trilha-frontend:draft:${slug}`);
export const saveDraft = (slug: string, code: string) => write(`trilha-frontend:draft:${slug}`, code);
