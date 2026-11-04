// Cálculo de especificidade de um seletor CSS, para a calculadora da trilha.
// Segue Selectors Level 4: :is(), :not() e :has() valem o argumento mais específico, e :where() vale zero.

export type Weight = [ids: number, classes: number, elements: number];

export interface Part {
  text: string;
  kind: 'id' | 'class' | 'element' | 'zero' | 'combinator';
}

export interface Result {
  weight: Weight;
  parts: Part[];
}

const LEGACY_PSEUDO_ELEMENTS = new Set(['before', 'after', 'first-line', 'first-letter']);
const MAX_OF_ARGUMENT = new Set(['is', 'not', 'has', 'matches']);

export const compare = (a: Weight, b: Weight) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

const add = (a: Weight, b: Weight): Weight => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Divide uma lista de seletores pelas vírgulas de fora de parênteses e colchetes. */
function splitList(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const c of text) {
    if (c === '(' || c === '[') depth++;
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else current += c;
  }
  out.push(current);
  return out.map((s) => s.trim());
}

/** Lê até o parêntese ou colchete que fecha o que abre em `start`. */
function closing(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    if (text[i] === close) depth--;
    if (depth === 0) return i;
  }
  throw new Error(`Falta fechar ${open}`);
}

const NAME = /^-?[_a-zA-Z -￿][-_a-zA-Z0-9 -￿]*/;

function parseSelector(selector: string): Result {
  const text = selector.trim();
  if (!text) throw new Error('Seletor vazio');
  let weight: Weight = [0, 0, 0];
  const parts: Part[] = [];
  let i = 0;
  while (i < text.length) {
    const rest = text.slice(i);
    const c = text[i];
    if (/[\s>+~]/.test(c)) {
      const match = rest.match(/^\s*[>+~]?\s*/)![0];
      if (match.trim()) parts.push({ text: match.trim(), kind: 'combinator' });
      else parts.push({ text: ' ', kind: 'combinator' });
      i += match.length;
      continue;
    }
    if (c === '*') {
      parts.push({ text: '*', kind: 'zero' });
      i++;
      continue;
    }
    if (c === '#' || c === '.') {
      const name = rest.slice(1).match(NAME)?.[0];
      if (!name) throw new Error(`Nome inválido depois de ${c}`);
      parts.push({ text: c + name, kind: c === '#' ? 'id' : 'class' });
      weight = add(weight, c === '#' ? [1, 0, 0] : [0, 1, 0]);
      i += name.length + 1;
      continue;
    }
    if (c === '[') {
      const end = closing(text, i, '[', ']');
      parts.push({ text: text.slice(i, end + 1), kind: 'class' });
      weight = add(weight, [0, 1, 0]);
      i = end + 1;
      continue;
    }
    if (c === ':') {
      const isElement = rest.startsWith('::');
      const name = rest.slice(isElement ? 2 : 1).match(NAME)?.[0];
      if (!name) throw new Error('Nome inválido depois de :');
      let end = i + (isElement ? 2 : 1) + name.length;
      let argument: string | null = null;
      if (text[end] === '(') {
        const close = closing(text, end, '(', ')');
        argument = text.slice(end + 1, close);
        end = close + 1;
      }
      const raw = text.slice(i, end);
      const lower = name.toLowerCase();
      if (isElement || LEGACY_PSEUDO_ELEMENTS.has(lower)) {
        parts.push({ text: raw, kind: 'element' });
        weight = add(weight, [0, 0, 1]);
      } else if (lower === 'where') {
        parts.push({ text: raw, kind: 'zero' });
      } else if (MAX_OF_ARGUMENT.has(lower) && argument !== null) {
        // Vale o seletor mais específico da lista dentro dos parênteses.
        const best = splitList(argument).map((s) => parseSelector(s).weight).sort((a, b) => compare(b, a))[0];
        parts.push({ text: raw, kind: best[0] ? 'id' : best[1] ? 'class' : best[2] ? 'element' : 'zero' });
        weight = add(weight, best);
      } else {
        parts.push({ text: raw, kind: 'class' });
        weight = add(weight, [0, 1, 0]);
      }
      i = end;
      continue;
    }
    const name = rest.match(NAME)?.[0];
    if (!name) throw new Error(`Caractere inesperado: ${c}`);
    parts.push({ text: name, kind: 'element' });
    weight = add(weight, [0, 0, 1]);
    i += name.length;
  }
  return { weight, parts: parts.filter((p, index) => !(p.kind === 'combinator' && (index === 0 || index === parts.length - 1))) };
}

/** Especificidade de um único seletor. Listas com vírgula não são aceitas, porque cada item tem a sua. */
export function specificity(selector: string): Result {
  if (splitList(selector).length > 1) throw new Error('Use um seletor por vez: cada item de uma lista com vírgula tem a própria especificidade');
  return parseSelector(selector);
}
