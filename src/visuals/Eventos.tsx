import { Stepper, type Step } from './Stepper';

const NODES = ['window', 'document', 'body', 'ul#lineup', 'li', 'strong'];

interface Scene {
  /** Índice do nó em que o evento está agora. */
  at: number | null;
  phase: 'captura' | 'alvo' | 'borbulha' | 'parado' | null;
  /** Nós já percorridos nesta fase. */
  path: number[];
  fired?: string;
  stopped?: boolean;
}

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'O clique',
    text: 'A pessoa clica no nome da banda, dentro de um `<strong>`, dentro de um `<li>`, dentro da lista. O elemento clicado é o alvo, o `event.target`.',
    scene: { at: 5, phase: null, path: [] },
  },
  {
    title: 'Fase de captura',
    text: 'O evento começa em `window` e desce até o alvo. Listeners registrados com `{ capture: true }` rodam nessa descida.',
    scene: { at: 4, phase: 'captura', path: [0, 1, 2, 3, 4] },
  },
  {
    title: 'No alvo',
    text: 'O evento chega ao `<strong>`. Listeners do próprio alvo rodam aqui.',
    scene: { at: 5, phase: 'alvo', path: [5] },
  },
  {
    title: 'Fase de borbulha',
    text: 'Agora o evento sobe pelos ancestrais. A maioria dos listeners, os registrados sem `capture`, rodam nesta subida.',
    scene: { at: 4, phase: 'borbulha', path: [5, 4] },
  },
  {
    title: 'O listener da lista dispara',
    text: 'O listener está no `ul`, não no item. Mesmo assim, ele roda quando o evento passa por ali. `event.target` ainda é o `<strong>`, e `event.target.closest("li")` acha o item.',
    predict: {
      question: 'o listener de clique está no `ul#lineup`, e o clique foi no `<strong>` dentro de um `li`. O listener roda?',
      options: [
        { text: 'Sim, porque o evento sobe até o ul na fase de borbulha', why: 'É isso que permite a delegação: um listener no pai atende todos os filhos.' },
        { text: 'Não, só listeners do elemento clicado rodam', why: 'O evento percorre todos os ancestrais. Listeners em qualquer um deles podem rodar.' },
        { text: 'Só se o li tiver um id', why: 'O id não muda o caminho do evento.' },
      ],
      answer: 0,
    },
    scene: { at: 3, phase: 'borbulha', path: [5, 4, 3], fired: 'listener do ul roda: target = strong' },
  },
  {
    title: 'Até a raiz',
    text: 'Sem interrupção, o evento continua subindo até `window`. Itens adicionados depois funcionam igual, porque o listener está no pai.',
    scene: { at: 0, phase: 'borbulha', path: [5, 4, 3, 2, 1, 0], fired: 'listener do ul roda: target = strong' },
  },
  {
    title: 'stopPropagation',
    text: 'Se um listener no `li` chamar `event.stopPropagation()`, o evento para ali e não chega ao `ul`. Por isso, use com cuidado: ele quebra a delegação acima.',
    scene: { at: 4, phase: 'parado', path: [5, 4], stopped: true },
  },
];

function Scene({ scene }: { scene: Scene }) {
  const y = (i: number) => 20 + i * 42;
  const labelX = 150;
  return (
    <svg viewBox="0 0 640 280" className="viz-svg" role="img" aria-label={`Evento em ${scene.at === null ? '' : NODES[scene.at]}, fase ${scene.phase ?? 'inicial'}`}>
      {NODES.map((node, i) => {
        const visited = scene.path.includes(i);
        const here = scene.at === i;
        const blocked = scene.stopped && i < 4;
        return (
          <g key={node} className={`viz-node${here ? ' focus' : ''}${blocked ? ' gone' : ''}`}>
            <rect x={labelX + i * 18} y={y(i)} width={150} height={32} rx={6} className={visited ? 'visited' : ''} />
            <text x={labelX + i * 18 + 75} y={y(i) + 21} textAnchor="middle" className="viz-node-label small">{node}</text>
            {i > 0 && <line x1={labelX + i * 18 + 10} y1={y(i - 1) + 32} x2={labelX + i * 18 + 10} y2={y(i)} className="viz-grid" />}
          </g>
        );
      })}
      {scene.phase === 'captura' && <path d={`M110,${y(0) + 10} L110,${y(4) + 20}`} className="viz-flow-line down" markerEnd="url(#ev-seta)" />}
      {(scene.phase === 'borbulha' || scene.phase === 'parado') && (
        <path d={`M110,${y(5) + 16} L110,${y(scene.at ?? 5) + 16}`} className={`viz-flow-line up${scene.stopped ? ' bad' : ''}`} markerEnd="url(#ev-seta)" />
      )}
      {scene.phase && <text x={20} y={y(2) + 20} className="viz-phase">{scene.phase === 'parado' ? 'parou' : scene.phase}</text>}
      {scene.fired && (
        <g className="viz-note ok">
          <rect x={360} y={y(3) - 2} width={270} height={36} rx={5} />
          <text x={495} y={y(3) + 20} textAnchor="middle">{scene.fired}</text>
        </g>
      )}
      {scene.stopped && (
        <g className="viz-note bad">
          <rect x={360} y={y(4) - 2} width={270} height={36} rx={5} />
          <text x={495} y={y(4) + 20} textAnchor="middle">li: event.stopPropagation()</text>
        </g>
      )}
      <defs>
        <marker id="ev-seta" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="viz-arrowhead" />
        </marker>
      </defs>
    </svg>
  );
}

export default function Eventos() {
  return <Stepper steps={STEPS}>{(i) => <Scene scene={STEPS[i].scene} />}</Stepper>;
}
