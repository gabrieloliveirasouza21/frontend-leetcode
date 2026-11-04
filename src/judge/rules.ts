import type { EditorPart, JudgedProblem } from './types';

/** Remove comentários e, em JS e CSS, textos entre aspas, para que must_use e forbid olhem só o código. */
export function stripForRules(code: string, language: EditorPart): string {
  if (language === 'html') return code.replace(/<!--[\s\S]*?-->/g, ' ');
  let out = '';
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    const next = code[i + 1];
    if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2);
      i = end === -1 ? code.length : end + 2;
      out += ' ';
    } else if (language === 'js' && c === '/' && next === '/') {
      const end = code.indexOf('\n', i);
      i = end === -1 ? code.length : end;
    } else if (c === '"' || c === "'" || (language === 'js' && c === '`')) {
      let j = i + 1;
      while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1;
      i = j + 1;
      out += '""';
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function languageOf(problem: JudgedProblem): EditorPart {
  if (problem.kind === 'dom') return problem.editor ?? 'html';
  return 'js';
}

/** Devolve a regra violada, ou null. */
export function checkRules(problem: JudgedProblem, code: string): string | null {
  const language = languageOf(problem);
  const stripped = stripForRules(code, language);
  const has = (term: string) =>
    /^[\w$-]+$/.test(term) ? new RegExp(`(^|[^\\w$-])${term.replace(/[$-]/g, '\\$&')}($|[^\\w$-])`).test(stripped) : stripped.includes(term);
  for (const term of problem.must_use ?? []) {
    if (!has(term)) return `O código precisa usar ${term}.`;
  }
  for (const term of problem.forbid ?? []) {
    if (has(term)) return `Este problema não permite usar ${term}.`;
  }
  return null;
}
