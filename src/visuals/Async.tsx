import { Stepper, type Step } from './Stepper';

interface Request {
  name: string;
  from: number;
  to: number;
  /** O pedido falhou nesse momento. */
  failed?: boolean;
  /** Continuou rodando, mas o resultado foi descartado. */
  ignored?: boolean;
}

interface Scene {
  code: string[];
  requests: Request[];
  /** Momento em que o await termina, e o que ele devolve. */
  done: number;
  outcome: string;
  bad?: boolean;
}

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'Um await de cada vez',
    text: 'Cada `await` pausa a função até a promessa terminar. Com três seguidos, o segundo pedido só começa quando o primeiro acaba.',
    scene: {
      code: ['const bandas = await api.bandas();', 'const palcos = await api.palcos();', 'const horarios = await api.horarios();'],
      requests: [
        { name: 'bandas', from: 0, to: 40 },
        { name: 'palcos', from: 40, to: 80 },
        { name: 'horarios', from: 80, to: 120 },
      ],
      done: 120,
      outcome: 'pronto em 120 ms',
    },
  },
  {
    title: 'Todos ao mesmo tempo',
    text: 'Criar as três promessas antes de esperar faz os pedidos correrem juntos. `Promise.all` espera todas, e o total é o tempo do mais lento.',
    predict: {
      question: 'cada pedido leva 40 ms. Com `Promise.all`, quanto tempo leva o total?',
      options: [
        { text: '40 ms', why: 'Os três correm ao mesmo tempo, então o total é o do mais lento.' },
        { text: '120 ms', why: 'Esse é o tempo da versão com três `await` seguidos, em que um espera o outro.' },
        { text: '0 ms, porque nada espera', why: 'O `await` continua esperando, só que espera as três de uma vez.' },
      ],
      answer: 0,
    },
    scene: {
      code: ['const [bandas, palcos, horarios] = await Promise.all([', '  api.bandas(), api.palcos(), api.horarios(),', ']);'],
      requests: [
        { name: 'bandas', from: 0, to: 40 },
        { name: 'palcos', from: 0, to: 40 },
        { name: 'horarios', from: 0, to: 40 },
      ],
      done: 40,
      outcome: 'pronto em 40 ms',
    },
  },
  {
    title: 'O mais lento manda',
    text: 'Com tempos diferentes, o `Promise.all` termina quando o último pedido chega. Aqui, aos 90 ms.',
    scene: {
      code: ['await Promise.all([api.bandas(), api.palcos(), api.horarios()]);'],
      requests: [
        { name: 'bandas', from: 0, to: 30 },
        { name: 'palcos', from: 0, to: 90 },
        { name: 'horarios', from: 0, to: 55 },
      ],
      done: 90,
      outcome: 'pronto em 90 ms',
    },
  },
  {
    title: 'Quando um falha',
    text: '`Promise.all` rejeita assim que qualquer promessa rejeita, sem esperar as outras. Elas continuam, mas o resultado é descartado.',
    predict: {
      question: 'o pedido de `palcos` falha aos 30 ms. Quando o `Promise.all` rejeita?',
      options: [
        { text: 'Aos 30 ms, logo na falha', why: 'Ele rejeita com o primeiro erro, e os outros resultados são ignorados.' },
        { text: 'Aos 90 ms, quando todos terminam', why: 'Quem espera todos, inclusive os que falharam, é o `Promise.allSettled`.' },
        { text: 'Nunca, porque os outros deram certo', why: 'Basta uma rejeição para o `Promise.all` rejeitar.' },
      ],
      answer: 0,
    },
    scene: {
      code: ['await Promise.all([api.bandas(), api.palcos(), api.horarios()]);'],
      requests: [
        { name: 'bandas', from: 0, to: 60, ignored: true },
        { name: 'palcos', from: 0, to: 30, failed: true },
        { name: 'horarios', from: 0, to: 90, ignored: true },
      ],
      done: 30,
      outcome: 'rejeita aos 30 ms: Error("fora do ar")',
      bad: true,
    },
  },
  {
    title: 'Esperar todos, mesmo com falha',
    text: '`Promise.allSettled` espera todas as promessas e devolve o status de cada uma. Serve quando cada parte da tela pode carregar ou falhar sozinha.',
    scene: {
      code: ['const resultados = await Promise.allSettled([...]);', '// [{ status: "fulfilled", value }, { status: "rejected", reason }, …]'],
      requests: [
        { name: 'bandas', from: 0, to: 60 },
        { name: 'palcos', from: 0, to: 30, failed: true },
        { name: 'horarios', from: 0, to: 90 },
      ],
      done: 90,
      outcome: 'pronto em 90 ms, com um item rejeitado',
    },
  },
];

const X0 = 110;
const SCALE = 4.2;
const x = (ms: number) => X0 + ms * SCALE;

function AsyncScene({ scene }: { scene: Scene }) {
  const top = 24 + scene.code.length * 18;
  return (
    <svg viewBox="0 0 640 260" className="viz-svg" role="img" aria-label={`Linha do tempo: ${scene.outcome}`}>
      {scene.code.map((line, i) => (
        <text key={i} x={16} y={22 + i * 18} className="viz-mono small">{line}</text>
      ))}
      {scene.requests.map((r, i) => {
        const y = top + 18 + i * 40;
        return (
          <g key={`${scene.done}-${r.name}-${i}`}>
            <text x={X0 - 10} y={y + 16} textAnchor="end" className="viz-node-sub">{r.name}</text>
            <line x1={X0} x2={x(130)} y1={y + 11} y2={y + 11} className="viz-grid" />
            <g className={`viz-bar download${r.ignored ? ' ignored' : ''}${r.failed ? ' failed' : ''}`} style={{ animationDelay: `${r.from * 0.01}s` }}>
              <rect x={x(r.from)} y={y} width={(r.to - r.from) * SCALE} height={22} rx={3} />
              <text x={x(r.to) + 6} y={y + 16} className="viz-bar-label outside">
                {r.failed ? '✗ falhou' : r.ignored ? 'descartado' : `${r.to} ms`}
              </text>
            </g>
          </g>
        );
      })}
      <g className={scene.bad ? 'viz-paint bad' : 'viz-paint'} key={`done-${scene.done}-${scene.outcome}`} style={{ animationDelay: `${scene.done * 0.01}s` }}>
        <line x1={x(scene.done)} x2={x(scene.done)} y1={top + 8} y2={top + 136} />
        <text x={Math.min(x(scene.done), 470)} y={top + 154} textAnchor="middle" className="viz-label">{scene.outcome}</text>
      </g>
      {[0, 40, 80, 120].map((ms) => (
        <text key={ms} x={x(ms)} y={250} textAnchor="middle" className="viz-node-sub">{ms} ms</text>
      ))}
    </svg>
  );
}

export default function Async() {
  return <Stepper steps={STEPS}>{(i) => <AsyncScene scene={STEPS[i].scene} />}</Stepper>;
}
