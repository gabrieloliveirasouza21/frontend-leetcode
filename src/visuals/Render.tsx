import { Stepper, type Step } from './Stepper';

const STAGES = ['HTML → DOM', 'CSS → CSSOM', 'Árvore de renderização', 'Layout', 'Pintura'];

/** Barras de uma linha do tempo, em segundos. */
interface Bar {
  lane: 0 | 1 | 2;
  from: number;
  to: number;
  label?: string;
  kind: 'parse' | 'download' | 'run' | 'wait';
}

interface Timeline {
  name: string;
  bars: Bar[];
  /** Momento da primeira pintura. */
  paint: number;
}

const SEM_ATRIBUTO: Timeline = {
  name: '<script src="analytics.js">',
  bars: [
    { lane: 0, from: 0, to: 0.2, kind: 'parse' },
    { lane: 0, from: 0.2, to: 2.2, kind: 'wait', label: 'parado esperando o script' },
    { lane: 1, from: 0.2, to: 2.0, kind: 'download', label: 'download lento' },
    { lane: 2, from: 2.0, to: 2.2, kind: 'run' },
    { lane: 0, from: 2.2, to: 2.6, kind: 'parse' },
  ],
  paint: 2.7,
};

const COM_DEFER: Timeline = {
  name: '<script src="analytics.js" defer>',
  bars: [
    { lane: 0, from: 0, to: 0.6, kind: 'parse' },
    { lane: 1, from: 0.2, to: 2.0, kind: 'download', label: 'download em paralelo' },
    { lane: 2, from: 2.0, to: 2.2, kind: 'run', label: 'roda depois do HTML' },
  ],
  paint: 0.7,
};

const COM_ASYNC: Timeline = {
  name: '<script src="analytics.js" async>',
  bars: [
    { lane: 0, from: 0, to: 0.6, kind: 'parse' },
    { lane: 1, from: 0.2, to: 0.45, kind: 'download', label: 'download rápido' },
    { lane: 0, from: 0.45, to: 0.6, kind: 'wait', label: 'pausa' },
    { lane: 2, from: 0.45, to: 0.6, kind: 'run' },
    { lane: 0, from: 0.6, to: 0.75, kind: 'parse' },
  ],
  paint: 0.85,
};

type Scene = { stage: number } | { timeline: Timeline };

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'HTML vira DOM',
    text: 'O navegador lê o HTML de cima para baixo e monta o DOM, a árvore de elementos da página.',
    scene: { stage: 0 },
  },
  {
    title: 'CSS vira CSSOM',
    text: 'Os arquivos de CSS viram o CSSOM, com as regras de estilo. Sem ele, o navegador não sabe como desenhar nada, por isso CSS bloqueia a pintura.',
    scene: { stage: 1 },
  },
  {
    title: 'A árvore de renderização',
    text: 'DOM e CSSOM se juntam numa árvore só com o que aparece na tela. Um elemento com `display: none` fica de fora.',
    scene: { stage: 2 },
  },
  {
    title: 'Layout',
    text: 'O navegador calcula a posição e o tamanho de cada caixa, a partir da largura da janela.',
    scene: { stage: 3 },
  },
  {
    title: 'Pintura',
    text: 'Por fim, as caixas viram pixels. É a primeira pintura: o momento em que a pessoa vê algo.',
    scene: { stage: 4 },
  },
  {
    title: 'Um script comum no head',
    text: 'Ao encontrar `<script src>` sem atributo, o navegador para de ler o HTML, baixa o script, executa e só então continua. Com o servidor do script lento, a página fica em branco.',
    scene: { timeline: SEM_ATRIBUTO },
  },
  {
    title: 'O mesmo script com defer',
    text: 'Com `defer`, o download acontece em paralelo e a leitura do HTML continua. O script roda no fim, na ordem em que aparece. A primeira pintura chega muito antes.',
    predict: {
      question: 'com `defer`, o navegador para de ler o HTML enquanto o script baixa?',
      options: [
        { text: 'Não. Ele continua lendo e roda o script só no fim', why: 'O download acontece em paralelo, e a execução espera o HTML terminar.' },
        { text: 'Sim, como num script comum', why: 'Esse é justamente o comportamento que o `defer` evita.' },
        { text: 'O script nunca é executado', why: 'Ele é executado, só que depois de o HTML ser lido.' },
      ],
      answer: 0,
    },
    scene: { timeline: COM_DEFER },
  },
  {
    title: 'E com async',
    text: 'Com `async`, o download também é paralelo, mas o script roda assim que chega, pausando a leitura por um instante e sem ordem garantida entre scripts. Serve para scripts independentes, como analytics.',
    scene: { timeline: COM_ASYNC },
  },
];

const LANES = ['Leitura do HTML', 'Rede', 'Execução do JS'];
const X0 = 130;
const SCALE = 170;

function TimelineView({ timeline }: { timeline: Timeline }) {
  const x = (s: number) => X0 + s * SCALE;
  return (
    <svg viewBox="0 0 640 230" className="viz-svg" role="img" aria-label={`Linha do tempo com ${timeline.name}`}>
      <text x={320} y={22} textAnchor="middle" className="viz-mono">{timeline.name}</text>
      {LANES.map((lane, i) => (
        <g key={lane}>
          <text x={X0 - 10} y={62 + i * 44} textAnchor="end" className="viz-node-sub">{lane}</text>
          <line x1={X0} x2={x(2.9)} y1={66 + i * 44} y2={66 + i * 44} className="viz-grid" />
        </g>
      ))}
      {timeline.bars.map((bar, i) => (
        <g key={`${timeline.name}-${i}`} className={`viz-bar ${bar.kind}`} style={{ animationDelay: `${bar.from * 0.2}s` }}>
          <rect x={x(bar.from)} y={48 + bar.lane * 44} width={Math.max(2, (bar.to - bar.from) * SCALE)} height={22} rx={3} />
          {bar.label && (
            <text x={x(bar.from) + 6} y={63 + bar.lane * 44} className="viz-bar-label">{bar.label}</text>
          )}
        </g>
      ))}
      <g className="viz-paint" key={`${timeline.name}-paint`} style={{ animationDelay: `${timeline.paint * 0.2}s` }}>
        <line x1={x(timeline.paint)} x2={x(timeline.paint)} y1={38} y2={186} />
        <text x={x(timeline.paint)} y={204} textAnchor="middle" className="viz-label">primeira pintura: {timeline.paint.toFixed(1).replace('.', ',')} s</text>
      </g>
      {[0, 1, 2].map((s) => (
        <text key={s} x={x(s)} y={222} textAnchor="middle" className="viz-node-sub">{s} s</text>
      ))}
    </svg>
  );
}

function Pipeline({ stage }: { stage: number }) {
  return (
    <svg viewBox="0 0 640 230" className="viz-svg" role="img" aria-label={`Etapa ${stage + 1}: ${STAGES[stage]}`}>
      {STAGES.map((name, i) => {
        const x = 12 + i * 126;
        const state = i < stage ? 'done' : i === stage ? 'focus' : 'todo';
        return (
          <g key={name} className={`viz-stage ${state}`}>
            <rect x={x} y={30} width={112} height={56} rx={8} />
            <text x={x + 56} y={63} textAnchor="middle" className="viz-node-label small">{name}</text>
            {i < STAGES.length - 1 && <path d={`M${x + 114},58 l10,0`} className="viz-connector" />}
          </g>
        );
      })}
      <g className="viz-detail" key={stage}>
        {stage === 0 && (
          <>
            <text x={40} y={130} className="viz-mono small">{'<main>'}</text>
            <text x={56} y={150} className="viz-mono small">{'<h1>Line-up</h1>'}</text>
            <text x={56} y={170} className="viz-mono small">{'<ul class="bandas">…</ul>'}</text>
            <text x={40} y={190} className="viz-mono small">{'</main>'}</text>
            <path d="M260,160 l60,0" className="viz-connector" markerEnd="url(#seta-render)" />
            <Tree x={420} />
          </>
        )}
        {stage === 1 && (
          <>
            <text x={40} y={140} className="viz-mono small">{'h1 { font-size: 32px }'}</text>
            <text x={40} y={162} className="viz-mono small">{'.bandas { display: grid }'}</text>
            <text x={40} y={184} className="viz-mono small">{'.aviso { display: none }'}</text>
            <text x={420} y={162} textAnchor="middle" className="viz-node-sub">regras indexadas por seletor</text>
          </>
        )}
        {stage === 2 && <Tree x={320} hideLast />}
        {stage === 3 && (
          <g className="viz-layout">
            <rect x={200} y={110} width={240} height={100} rx={4} />
            <rect x={212} y={120} width={140} height={22} rx={2} />
            <rect x={212} y={150} width={68} height={50} rx={2} />
            <rect x={286} y={150} width={68} height={50} rx={2} />
            <rect x={360} y={150} width={68} height={50} rx={2} />
            <text x={460} y={128} className="viz-node-sub">x, y, largura, altura</text>
          </g>
        )}
        {stage === 4 && (
          <g className="viz-painted">
            <rect x={200} y={110} width={240} height={100} rx={4} />
            <text x={214} y={137} className="viz-painted-title">Line-up</text>
            <rect x={212} y={150} width={68} height={50} rx={4} className="c1" />
            <rect x={286} y={150} width={68} height={50} rx={4} className="c2" />
            <rect x={360} y={150} width={68} height={50} rx={4} className="c3" />
          </g>
        )}
      </g>
      <defs>
        <marker id="seta-render" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="viz-arrowhead" />
        </marker>
      </defs>
    </svg>
  );
}

function Tree({ x, hideLast = false }: { x: number; hideLast?: boolean }) {
  const nodes = [
    { label: 'main', dx: 0, dy: 0 },
    { label: 'h1', dx: -70, dy: 50 },
    { label: 'ul', dx: 0, dy: 50 },
    { label: 'p.aviso', dx: 76, dy: 50 },
  ];
  return (
    <g className="viz-tree">
      {nodes.slice(1).map((n, i) => (
        <line key={n.label} x1={x} y1={128} x2={x + n.dx} y2={128 + n.dy - 14} className={hideLast && i === 2 ? 'viz-grid gone' : 'viz-grid'} />
      ))}
      {nodes.map((n, i) => (
        <g key={n.label} className={hideLast && i === 3 ? 'viz-node gone' : 'viz-node'}>
          <rect x={x + n.dx - 32} y={114 + n.dy} width={64} height={26} rx={5} />
          <text x={x + n.dx} y={131 + n.dy} textAnchor="middle" className="viz-node-sub">{n.label}</text>
        </g>
      ))}
      {hideLast && <text x={x + 76} y={208} textAnchor="middle" className="viz-node-sub">display: none, fora</text>}
    </g>
  );
}

export default function Render() {
  return (
    <Stepper steps={STEPS}>
      {(i) => {
        const scene = STEPS[i].scene;
        return 'stage' in scene ? <Pipeline stage={scene.stage} /> : <TimelineView timeline={scene.timeline} />;
      }}
    </Stepper>
  );
}
