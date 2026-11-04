import { Stepper, type Step } from './Stepper';

// Pontos da rede: servidor, quatro roteadores e o navegador.
const P = {
  servidor: [60, 140],
  r1: [200, 70],
  r2: [200, 210],
  r3: [400, 70],
  r4: [400, 210],
  navegador: [560, 140],
} as const;
type Point = keyof typeof P;
const LINKS: [Point, Point][] = [['servidor', 'r1'], ['servidor', 'r2'], ['r1', 'r3'], ['r2', 'r4'], ['r1', 'r4'], ['r2', 'r3'], ['r3', 'navegador'], ['r4', 'navegador']];

interface Packet {
  n: number;
  at: Point;
  lost?: boolean;
  /** Já entregue, na posição da remontagem. */
  done?: boolean;
}

interface Scene {
  packets: Packet[];
  note?: string;
  received?: number[];
}

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'A resposta vira pacotes',
    text: 'O servidor em São Paulo divide a página em pacotes. Cada um leva o endereço IP de destino e um número de sequência do TCP.',
    scene: { packets: [1, 2, 3, 4].map((n) => ({ n, at: 'servidor' as Point })) },
  },
  {
    title: 'Caminhos independentes',
    text: 'Cada roteador olha o destino e encaminha o pacote para o próximo salto. Pacotes da mesma página podem seguir rotas diferentes.',
    scene: { packets: [{ n: 1, at: 'r1' }, { n: 2, at: 'r2' }, { n: 3, at: 'r1' }, { n: 4, at: 'r2' }] },
  },
  {
    title: 'Um pacote se perde',
    text: 'Um roteador congestionado descarta o pacote 3. Os outros seguem, e o 4 chega antes do 2: a ordem de chegada não é garantida.',
    scene: { packets: [{ n: 1, at: 'navegador', done: true }, { n: 2, at: 'r4' }, { n: 3, at: 'r3', lost: true }, { n: 4, at: 'navegador', done: true }], received: [1, 4] },
  },
  {
    title: 'O TCP percebe a falta',
    text: 'O navegador recebeu 1, 2 e 4, mas não o 3. Pela numeração, o TCP sabe exatamente o que falta e avisa o servidor.',
    predict: {
      question: 'o pacote 3 se perdeu no caminho. O que acontece?',
      options: [
        { text: 'Só o pacote 3 é reenviado', why: 'O TCP confirma o que recebeu, e o servidor reenvia apenas o que não foi confirmado.' },
        { text: 'A página inteira é enviada de novo', why: 'Isso seria desperdício. A numeração permite reenviar só o pedaço perdido.' },
        { text: 'A página aparece sem aquele pedaço', why: 'O TCP só entrega os dados à aplicação completos e em ordem.' },
      ],
      answer: 0,
    },
    scene: { packets: [{ n: 1, at: 'navegador', done: true }, { n: 2, at: 'navegador', done: true }, { n: 4, at: 'navegador', done: true }, { n: 3, at: 'r2' }], received: [1, 2, 4], note: 'falta o 3: reenviando só ele' },
  },
  {
    title: 'Remontado na ordem',
    text: 'Com o 3 reenviado, o TCP entrega os dados completos e em ordem ao navegador. A aplicação nunca vê a bagunça do caminho.',
    scene: { packets: [1, 2, 3, 4].map((n) => ({ n, at: 'navegador' as Point, done: true })), received: [1, 2, 3, 4] },
  },
];

function Scene({ scene }: { scene: Scene }) {
  const offsets = new Map<Point, number>();
  return (
    <svg viewBox="0 0 640 300" className="viz-svg" role="img" aria-label={`Pacotes: ${scene.packets.map((p) => `${p.n} em ${p.at}${p.lost ? ' perdido' : ''}`).join(', ')}`}>
      {LINKS.map(([a, b]) => (
        <line key={a + b} x1={P[a][0]} y1={P[a][1]} x2={P[b][0]} y2={P[b][1]} className="viz-grid" />
      ))}
      {(Object.keys(P) as Point[]).map((k) => (
        <g key={k} className="viz-node">
          {k === 'servidor' || k === 'navegador' ? (
            <>
              <rect x={P[k][0] - 48} y={P[k][1] - 22} width={96} height={44} rx={8} />
              <text x={P[k][0]} y={P[k][1] + 5} textAnchor="middle" className="viz-node-label small">{k === 'servidor' ? 'Servidor SP' : 'Navegador'}</text>
            </>
          ) : (
            <>
              <circle cx={P[k][0]} cy={P[k][1]} r={20} className="viz-router" />
              <text x={P[k][0]} y={P[k][1] + 4} textAnchor="middle" className="viz-node-sub">roteador</text>
            </>
          )}
        </g>
      ))}
      {scene.packets.filter((p) => !p.done).map((p) => {
        const i = offsets.get(p.at) ?? 0;
        offsets.set(p.at, i + 1);
        const [px, py] = P[p.at];
        return (
          <g key={`${p.n}-${p.at}`} className={`viz-packet${p.lost ? ' lost' : ''}`}>
            <rect x={px - 30 + i * 28} y={py - 50} width={24} height={24} rx={4} />
            <text x={px - 18 + i * 28} y={py - 33} textAnchor="middle">{p.lost ? '✗' : p.n}</text>
          </g>
        );
      })}
      <text x={420} y={262} className="viz-node-sub">chegou ao navegador:</text>
      {(scene.received ?? []).map((n, i) => (
        <g key={n} className="viz-packet done">
          <rect x={540 + i * 24} y={248} width={20} height={20} rx={3} />
          <text x={550 + i * 24} y={262} textAnchor="middle">{n}</text>
        </g>
      ))}
      {scene.note && <text x={320} y={290} textAnchor="middle" className="viz-label">{scene.note}</text>}
    </svg>
  );
}

export default function Pacotes() {
  return <Stepper steps={STEPS}>{(i) => <Scene scene={STEPS[i].scene} />}</Stepper>;
}
