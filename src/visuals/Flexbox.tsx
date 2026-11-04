import { useState, type CSSProperties } from 'react';
import { inline } from '../text';

const OPTIONS = {
  flexDirection: ['row', 'column'],
  justifyContent: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'],
  alignItems: ['stretch', 'flex-start', 'center', 'flex-end'],
  flexWrap: ['nowrap', 'wrap'],
} as const;

type Settings = { [K in keyof typeof OPTIONS]: (typeof OPTIONS)[K][number] } & { gap: number; items: number; grow: boolean };

const CSS_NAME: Record<keyof typeof OPTIONS, string> = {
  flexDirection: 'flex-direction',
  justifyContent: 'justify-content',
  alignItems: 'align-items',
  flexWrap: 'flex-wrap',
};

const HEIGHTS = [40, 64, 30, 52, 44, 36, 58, 48];

/** Playground de Flexbox: o navegador desenha de verdade o contêiner com as propriedades escolhidas. */
export default function Flexbox() {
  const [s, setS] = useState<Settings>({ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'stretch', flexWrap: 'nowrap', gap: 8, items: 4, grow: false });
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS({ ...s, [key]: value });

  const container: CSSProperties = {
    display: 'flex',
    flexDirection: s.flexDirection,
    justifyContent: s.justifyContent,
    alignItems: s.alignItems,
    flexWrap: s.flexWrap,
    gap: s.gap,
  };
  const code = [
    '.palco {',
    '  display: flex;',
    ...(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((k) => `  ${CSS_NAME[k]}: ${s[k]};`),
    `  gap: ${s.gap}px;`,
    '}',
    ...(s.grow ? ['.banda:first-child { flex-grow: 1; }'] : []),
  ];

  return (
    <div className="flexlab">
      <div className="flexlab-stage" style={container} aria-label="Contêiner flex de exemplo">
        {Array.from({ length: s.items }, (_, i) => (
          <div
            key={i}
            className="flexlab-item"
            style={{
              minHeight: s.alignItems === 'stretch' ? undefined : HEIGHTS[i],
              width: s.flexDirection === 'row' ? 90 : undefined,
              flexGrow: s.grow && i === 0 ? 1 : 0,
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>
      <pre className="schema flexlab-code">{code.join('\n')}</pre>
      <div className="flexlab-controls">
        {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((key) => (
          <fieldset key={key} className="flexlab-group">
            <legend>{CSS_NAME[key]}</legend>
            {OPTIONS[key].map((value) => (
              <button key={value} className={s[key] === value ? 'filter active' : 'filter'} aria-pressed={s[key] === value} onClick={() => set(key, value as never)}>
                {value}
              </button>
            ))}
          </fieldset>
        ))}
        <div className="flexlab-group flexlab-sliders">
          <label>gap: {s.gap}px <input type="range" min={0} max={40} value={s.gap} onChange={(e) => set('gap', Number(e.target.value))} /></label>
          <label>itens: {s.items} <input type="range" min={1} max={8} value={s.items} onChange={(e) => set('items', Number(e.target.value))} /></label>
          <label><input type="checkbox" checked={s.grow} onChange={(e) => set('grow', e.target.checked)} /> primeiro item com flex-grow: 1</label>
        </div>
      </div>
      <p className="muted">
        {inline("Repare: `justify-content` sempre age no eixo principal, e `align-items` no eixo cruzado. Trocar `flex-direction` troca os eixos.")}
      </p>
    </div>
  );
}
