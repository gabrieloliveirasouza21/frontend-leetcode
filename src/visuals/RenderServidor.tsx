import { Stepper, type Step } from './Stepper';

interface Bar {
  lane: 0 | 1 | 2;
  from: number;
  to: number;
  label: string;
  kind: 'build' | 'server' | 'download' | 'run' | 'hydrate';
}

interface Mode {
  name: string;
  bars: Bar[];
  /** Quando o conteúdo aparece e quando a página responde a cliques. */
  visible: number;
  interactive: number;
}

const CSR: Mode = {
  name: 'CSR: renderização no cliente',
  bars: [
    { lane: 1, from: 0, to: 0.2, label: 'HTML vazio', kind: 'download' },
    { lane: 1, from: 0.2, to: 1.0, label: 'JavaScript', kind: 'download' },
    { lane: 2, from: 1.0, to: 1.4, label: 'renderiza', kind: 'run' },
    { lane: 1, from: 1.4, to: 2.0, label: 'busca dados', kind: 'download' },
    { lane: 2, from: 2.0, to: 2.3, label: 'desenha', kind: 'run' },
  ],
  visible: 2.3,
  interactive: 2.3,
};

const SSR: Mode = {
  name: 'SSR: renderização no servidor a cada pedido',
  bars: [
    { lane: 0, from: 0, to: 0.5, label: 'busca dados e gera HTML', kind: 'server' },
    { lane: 1, from: 0.5, to: 0.8, label: 'HTML pronto', kind: 'download' },
    { lane: 1, from: 0.8, to: 1.6, label: 'JavaScript', kind: 'download' },
    { lane: 2, from: 1.6, to: 2.0, label: 'hidrata', kind: 'hydrate' },
  ],
  visible: 0.8,
  interactive: 2.0,
};

const SSG: Mode = {
  name: 'SSG: HTML gerado no build',
  bars: [
    { lane: 0, from: -0.6, to: -0.05, label: 'build, antes da visita', kind: 'build' },
    { lane: 1, from: 0, to: 0.25, label: 'HTML do CDN', kind: 'download' },
    { lane: 1, from: 0.25, to: 1.05, label: 'JavaScript', kind: 'download' },
    { lane: 2, from: 1.05, to: 1.45, label: 'hidrata', kind: 'hydrate' },
  ],
  visible: 0.25,
  interactive: 1.45,
};

const ILHAS: Mode = {
  name: 'Ilhas: HTML estático com uma parte interativa',
  bars: [
    { lane: 1, from: 0, to: 0.25, label: 'HTML do CDN', kind: 'download' },
    { lane: 1, from: 0.25, to: 0.45, label: 'JS da ilha', kind: 'download' },
    { lane: 2, from: 0.45, to: 0.55, label: 'hidrata a ilha', kind: 'hydrate' },
  ],
  visible: 0.25,
  interactive: 0.55,
};

const STEPS: (Step & { scene: Mode })[] = [
  {
    title: 'Renderização no cliente',
    text: 'Numa SPA comum, o servidor manda um HTML quase vazio. O conteúdo só aparece depois de baixar o JavaScript, executar e buscar os dados.',
    scene: CSR,
  },
  {
    title: 'Renderização no servidor',
    text: 'Com SSR, o servidor busca os dados e manda o HTML pronto. A pessoa vê o conteúdo cedo, mas ele só responde a cliques depois da hidratação.',
    predict: {
      question: 'com SSR, a página fica interativa no mesmo instante em que aparece?',
      options: [
        { text: 'Não. Ela aparece com o HTML, mas só responde depois que o JavaScript baixa e hidrata', why: 'Há uma janela em que a página está visível, mas os botões ainda não funcionam.' },
        { text: 'Sim, porque o servidor já mandou tudo pronto', why: 'O servidor manda HTML. Estado e eventos só existem depois da hidratação no navegador.' },
        { text: 'Ela nunca fica interativa', why: 'Fica, depois que o framework liga os eventos ao HTML existente.' },
      ],
      answer: 0,
    },
    scene: SSR,
  },
  {
    title: 'Geração estática',
    text: 'Com SSG, o HTML foi gerado no build, antes de qualquer visita. O CDN entrega um arquivo pronto, sem trabalho no servidor a cada pedido.',
    scene: SSG,
  },
  {
    title: 'Arquitetura de ilhas',
    text: 'Quando só uma parte da página é interativa, como um contador, só ela baixa JavaScript e hidrata. A página fica visível e interativa muito cedo.',
    scene: ILHAS,
  },
];

const LANES = ['Servidor', 'Rede', 'Navegador'];
const X0 = 110;
const SCALE = 200;
const x = (s: number) => X0 + (s + 0.6) * SCALE * 0.82;

function Scene({ mode }: { mode: Mode }) {
  return (
    <svg viewBox="0 0 640 240" className="viz-svg" role="img" aria-label={`${mode.name}: conteúdo visível em ${mode.visible} s e interativo em ${mode.interactive} s`}>
      <text x={320} y={20} textAnchor="middle" className="viz-node-label small">{mode.name}</text>
      {LANES.map((lane, i) => (
        <g key={lane}>
          <text x={X0 - 10} y={58 + i * 44} textAnchor="end" className="viz-node-sub">{lane}</text>
          <line x1={X0} x2={630} y1={62 + i * 44} y2={62 + i * 44} className="viz-grid" />
        </g>
      ))}
      <line x1={x(0)} x2={x(0)} y1={30} y2={176} className="viz-grid dashed" />
      <text x={x(0)} y={192} textAnchor="middle" className="viz-node-sub">a pessoa abre o link</text>
      {mode.bars.map((bar, i) => {
        const w = (bar.to - bar.from) * SCALE * 0.82;
        // Rótulo que não cabe na barra vai para cima dela, alternando a altura para não encavalar.
        const fits = bar.label.length * 6.2 + 10 < w;
        const above = 40 + bar.lane * 44 - (i % 2) * 11;
        return (
          <g key={`${mode.name}-${i}`} className={`viz-bar ${bar.kind === 'download' ? 'download' : bar.kind === 'hydrate' || bar.kind === 'run' ? 'run' : 'parse'}`} style={{ animationDelay: `${Math.max(0, bar.from) * 0.25}s` }}>
            <rect x={x(bar.from)} y={44 + bar.lane * 44} width={w} height={22} rx={3} />
            <text x={x(bar.from) + (fits ? 5 : 0)} y={fits ? 59 + bar.lane * 44 : above} className={fits ? 'viz-bar-label' : 'viz-bar-label outside'}>{bar.label}</text>
          </g>
        );
      })}
      {[
        { at: mode.visible, label: 'conteúdo visível', y: 214, cls: 'viz-paint' },
        { at: mode.interactive, label: 'interativo', y: 232, cls: 'viz-paint ok' },
      ].map((m) => (
        <g key={m.label} className={m.cls} style={{ animationDelay: `${m.at * 0.25}s` }}>
          <line x1={x(m.at)} x2={x(m.at)} y1={34} y2={m.y - 12} />
          <text x={Math.min(x(m.at), 560)} y={m.y} textAnchor="middle" className="viz-label">{m.label}: {m.at.toFixed(1).replace('.', ',')} s</text>
        </g>
      ))}
    </svg>
  );
}

export default function RenderServidor() {
  return <Stepper steps={STEPS}>{(i) => <Scene mode={STEPS[i].scene} />}</Stepper>;
}
