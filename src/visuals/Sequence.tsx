import { Stepper, type Step } from './Stepper';

export interface Message {
  from: number;
  to: number;
  label: string;
  /** Linha extra, menor, abaixo do rótulo. */
  detail?: string;
  tone?: 'ok' | 'bad' | 'muted';
}

/** Um passo de um diagrama de sequência: as mensagens novas deste passo. */
export interface SequenceStep extends Step {
  messages: Message[];
  /** Observação que aparece sobre a linha de um ator, como "cache: app.js". */
  notes?: { actor: number; text: string; tone?: 'ok' | 'bad' }[];
}

const ROW = 46;
const TOP = 56;

/**
 * Diagrama de sequência passo a passo: atores em colunas e mensagens de cima para baixo.
 * As mensagens dos passos anteriores continuam visíveis, mais apagadas.
 */
export function SequenceDiagram({ actors, steps, id }: { actors: string[]; steps: SequenceStep[]; id: string }) {
  const total = steps.reduce((n, s) => n + s.messages.length, 0);
  const notes = Math.max(0, ...steps.map((s) => s.notes?.length ?? 0));
  const height = TOP + total * ROW + 20 + notes * 26;
  const width = 640;
  const col = (i: number) => 80 + (i * (width - 160)) / Math.max(1, actors.length - 1);

  return (
    <Stepper steps={steps}>
      {(index) => {
        let row = 0;
        const shown = steps.slice(0, index + 1);
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="viz-svg" role="img" aria-label={`Diagrama de sequência, passo ${index + 1}`}>
            <defs>
              {(['ok', 'bad', 'muted', 'base'] as const).map((tone) => (
                <marker key={tone} id={`${id}-${tone}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className={`viz-head ${tone}`} />
                </marker>
              ))}
            </defs>
            {actors.map((actor, i) => (
              <g key={actor} className="viz-node">
                <rect x={col(i) - 74} y={8} width={148} height={34} rx={7} />
                <text x={col(i)} y={30} textAnchor="middle" className="viz-node-label small">{actor}</text>
                <line x1={col(i)} x2={col(i)} y1={42} y2={height - 10} className="viz-lifeline" />
              </g>
            ))}
            {shown.map((step, s) =>
              step.messages.map((m, j) => {
                const y = TOP + row++ * ROW + 18;
                const current = s === index;
                const tone = m.tone ?? 'base';
                const x1 = col(m.from);
                const x2 = col(m.to);
                const self = m.from === m.to;
                const mid = self ? x1 + 70 : (x1 + x2) / 2;
                return (
                  <g key={`${s}-${j}`} className={`viz-msg ${tone}${current ? ' current' : ' past'}`}>
                    {self ? (
                      <path d={`M${x1},${y} h40 v14 h-36`} markerEnd={`url(#${id}-${tone})`} />
                    ) : (
                      <line x1={x1 + Math.sign(x2 - x1) * 4} x2={x2 - Math.sign(x2 - x1) * 6} y1={y} y2={y} markerEnd={`url(#${id}-${tone})`} />
                    )}
                    <text x={self ? x1 + 48 : mid} y={self ? y + 11 : y - 7} textAnchor={self ? "start" : "middle"} className="viz-msg-label">{m.label}</text>
                    {m.detail && <text x={mid} y={y + 15} textAnchor="middle" className="viz-msg-detail">{m.detail}</text>}
                  </g>
                );
              }),
            )}
            {steps[index].notes?.map((note, i) => {
              // Largura pelo texto, sem sair do desenho.
              const w = Math.max(120, note.text.length * 6.8 + 16);
              const left = Math.min(Math.max(4, col(note.actor) - w / 2), width - w - 4);
              return (
                <g key={i} className={`viz-note ${note.tone ?? ''}`}>
                  <rect x={left} y={height - 34 - i * 26} width={w} height={22} rx={4} />
                  <text x={left + w / 2} y={height - 19 - i * 26} textAnchor="middle">{note.text}</text>
                </g>
              );
            })}
          </svg>
        );
      }}
    </Stepper>
  );
}
