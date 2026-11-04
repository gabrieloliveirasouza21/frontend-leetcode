import { useId, useState } from 'react';
import { compare, specificity, type Result } from './calcularEspecificidade';

const PRESETS: [string, string][] = [
  ['#lineup li', '.headliner'],
  ['#lineup li', '#lineup .headliner'],
  ['#lineup li', '.headliner.headliner.headliner'],
  [':where(#lineup) li', '.headliner'],
  ['li:not(#vip)', 'ul li.headliner'],
];

const COLUMNS = [
  { kind: 'id', label: 'ids' },
  { kind: 'class', label: 'classes, atributos e pseudo-classes' },
  { kind: 'element', label: 'elementos e pseudo-elementos' },
] as const;

function read(selector: string): Result | string {
  try {
    return specificity(selector);
  } catch (error) {
    return (error as Error).message;
  }
}

function SelectorRow({ name, value, onChange, result, winner }: { name: string; value: string; onChange: (v: string) => void; result: Result | string; winner: boolean }) {
  const id = useId();
  return (
    <div className={winner ? 'spec-row winner' : 'spec-row'}>
      <label htmlFor={id} className="spec-name">Regra {name}</label>
      <input id={id} className="spec-input" value={value} spellCheck={false} onChange={(e) => onChange(e.target.value)} />
      {typeof result === 'string' ? (
        <p className="spec-error">{result}</p>
      ) : (
        <>
          <div className="spec-parts" aria-label="Partes do seletor">
            {result.parts.map((part, i) =>
              part.kind === 'combinator' ? (
                <span key={i} className="spec-combinator">{part.text.trim() || '␣'}</span>
              ) : (
                <span key={i} className={`spec-chip ${part.kind}`}>{part.text}</span>
              ),
            )}
          </div>
          <div className="spec-weight" aria-label={`Especificidade ${result.weight.join(', ')}`}>
            {COLUMNS.map((column, i) => (
              <span key={column.kind} className={`spec-cell ${column.kind}`} title={column.label}>
                {result.weight[i]}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function verdict(a: Result, b: Result) {
  const diff = compare(a.weight, b.weight);
  if (diff === 0) return { winner: 'empate' as const, text: 'Empate. Quando a especificidade é igual, vence a regra que aparece por último no CSS.' };
  const column = a.weight[0] !== b.weight[0] ? 0 : a.weight[1] !== b.weight[1] ? 1 : 2;
  const names = ['ids', 'classes', 'elementos'];
  const winner = diff > 0 ? 'A' : 'B';
  const loser = diff > 0 ? 'B' : 'A';
  const decided =
    column === 0
      ? `A regra ${winner} tem mais ids. A comparação para aí, por mais classes ou elementos que a regra ${loser} tenha.`
      : column === 1
        ? `Os ids empatam, e a regra ${winner} tem mais ${names[column]}.`
        : `Ids e classes empatam, e a regra ${winner} tem mais ${names[column]}.`;
  return { winner, text: `A regra ${winner} vence. ${decided}` };
}

export default function Specificity() {
  const [a, setA] = useState(PRESETS[0][0]);
  const [b, setB] = useState(PRESETS[0][1]);
  const ra = read(a);
  const rb = read(b);
  const result = typeof ra !== 'string' && typeof rb !== 'string' ? verdict(ra, rb) : null;

  return (
    <div className="spec">
      <p className="muted">
        Escreva dois seletores que disputam a mesma propriedade. Cada parte é contada numa coluna, e a comparação vai da esquerda para a direita.
      </p>
      <div className="spec-legend">
        {COLUMNS.map((c) => <span key={c.kind} className={`spec-chip ${c.kind}`}>{c.label}</span>)}
      </div>
      <SelectorRow name="A" value={a} onChange={setA} result={ra} winner={result?.winner === 'A'} />
      <SelectorRow name="B" value={b} onChange={setB} result={rb} winner={result?.winner === 'B'} />
      <p className="spec-verdict" aria-live="polite">{result ? result.text : 'Corrija o seletor para comparar.'}</p>
      <div className="spec-presets" role="group" aria-label="Exemplos">
        <span className="muted">Experimente:</span>
        {PRESETS.map(([pa, pb]) => (
          <button key={pa + pb} className="filter" onClick={() => { setA(pa); setB(pb); }}>
            {pa} × {pb}
          </button>
        ))}
      </div>
    </div>
  );
}
