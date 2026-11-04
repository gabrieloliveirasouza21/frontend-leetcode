import { Stepper, type Step } from './Stepper';

const CODE = [
  "console.log('A');",
  "setTimeout(() => console.log('B'), 0);",
  "Promise.resolve().then(() => console.log('C'));",
  "console.log('D');",
];

interface Scene {
  line: number | null;
  stack: string[];
  micro: string[];
  macro: string[];
  output: string[];
}

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'O código síncrono começa',
    text: 'O script roda de cima para baixo na pilha de chamadas. `console.log(\'A\')` executa na hora.',
    scene: { line: 0, stack: ['script', "console.log('A')"], micro: [], macro: [], output: ['A'] },
  },
  {
    title: 'setTimeout agenda uma tarefa',
    text: 'O `setTimeout` não espera. Ele registra o callback, que entra na fila de tarefas quando o tempo passa, mesmo que seja 0.',
    scene: { line: 1, stack: ['script', 'setTimeout(…)'], micro: [], macro: ["() => log('B')"], output: ['A'] },
  },
  {
    title: 'then agenda uma microtarefa',
    text: 'A promessa já está resolvida, então o callback do `then` vai para a fila de microtarefas, que é outra fila.',
    scene: { line: 2, stack: ['script', 'Promise.then(…)'], micro: ["() => log('C')"], macro: ["() => log('B')"], output: ['A'] },
  },
  {
    title: 'O resto do código síncrono',
    text: '`console.log(\'D\')` roda antes de qualquer callback, porque a pilha ainda está ocupada com o script.',
    scene: { line: 3, stack: ['script', "console.log('D')"], micro: ["() => log('C')"], macro: ["() => log('B')"], output: ['A', 'D'] },
  },
  {
    title: 'Pilha vazia: microtarefas primeiro',
    text: 'Quando a pilha esvazia, o navegador roda todas as microtarefas antes de pegar a próxima tarefa. Por isso `C` vem antes de `B`.',
    predict: {
      question: 'a pilha esvaziou. Há um callback na fila de microtarefas, `C`, e outro na fila de tarefas, `B`. Qual roda primeiro?',
      options: [
        { text: '`C`, da fila de microtarefas', why: 'As microtarefas são esvaziadas sempre que a pilha fica vazia, antes da próxima tarefa.' },
        { text: '`B`, porque o setTimeout foi chamado antes', why: 'A ordem de chamada não decide. As filas têm prioridades diferentes.' },
        { text: 'Os dois ao mesmo tempo', why: 'JavaScript roda uma coisa de cada vez na thread principal.' },
      ],
      answer: 0,
    },
    scene: { line: null, stack: ["() => log('C')"], micro: [], macro: ["() => log('B')"], output: ['A', 'D', 'C'] },
  },
  {
    title: 'Depois, a próxima tarefa',
    text: 'Com as microtarefas vazias, o laço de eventos pega a tarefa do `setTimeout`. A saída final é `A D C B`.',
    scene: { line: null, stack: ["() => log('B')"], micro: [], macro: [], output: ['A', 'D', 'C', 'B'] },
  },
];

function Column({ x, title, items, tone }: { x: number; title: string; items: string[]; tone: string }) {
  return (
    <g>
      <text x={x + 70} y={150} textAnchor="middle" className="viz-node-sub">{title}</text>
      <rect x={x} y={158} width={140} height={110} rx={6} className="viz-column" />
      {items.map((item, i) => (
        <g key={item + i} className={`viz-chip ${tone}`}>
          <rect x={x + 8} y={240 - i * 30} width={124} height={24} rx={4} />
          <text x={x + 70} y={256 - i * 30} textAnchor="middle">{item}</text>
        </g>
      ))}
    </g>
  );
}

function Scene({ scene }: { scene: Scene }) {
  return (
    <svg viewBox="0 0 640 290" className="viz-svg" role="img" aria-label={`Saída até agora: ${scene.output.join(' ')}`}>
      {CODE.map((line, i) => (
        <g key={line}>
          {scene.line === i && <rect x={10} y={10 + i * 24} width={410} height={22} rx={3} className="viz-current-line" />}
          <text x={18} y={26 + i * 24} className="viz-mono small">{line}</text>
        </g>
      ))}
      <text x={460} y={26} className="viz-node-sub">console</text>
      <rect x={455} y={34} width={170} height={70} rx={6} className="viz-column" />
      <text x={468} y={76} className="viz-mono">{scene.output.join('  ')}</text>
      <Column x={10} title="Pilha de chamadas" items={scene.stack} tone="stack" />
      <Column x={250} title="Microtarefas (then, await)" items={scene.micro} tone="micro" />
      <Column x={490} title="Tarefas (setTimeout, eventos)" items={scene.macro} tone="macro" />
    </svg>
  );
}

export default function EventLoop() {
  return <Stepper steps={STEPS}>{(i) => <Scene scene={STEPS[i].scene} />}</Stepper>;
}
