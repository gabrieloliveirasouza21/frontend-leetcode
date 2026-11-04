import { Stepper, type Step } from './Stepper';

interface Commit {
  id: string;
  lane: 0 | 1;
  col: number;
  parents: string[];
  label?: string;
  tone?: 'bad' | 'ok' | 'ghost';
}

interface Scene {
  commits: Commit[];
  /** Ponteiros: nome do branch e o commit para onde aponta. */
  refs: { name: string; at: string; lane?: 0 | 1 }[];
  /** Linha extra com a cópia de uma colega. */
  remote?: { label: string; commits: string[] };
}

const A: Commit = { id: 'A', lane: 0, col: 0, parents: [] };
const B: Commit = { id: 'B', lane: 0, col: 1, parents: ['A'] };
const C: Commit = { id: 'C', lane: 1, col: 2, parents: ['B'], label: 'filtro' };
const D: Commit = { id: 'D', lane: 1, col: 3, parents: ['C'], label: 'filtro 2' };
const E: Commit = { id: 'E', lane: 0, col: 3, parents: ['B'], label: 'correção' };
const M: Commit = { id: 'M', lane: 0, col: 4, parents: ['E', 'D'], label: 'merge' };
const X: Commit = { id: 'X', lane: 0, col: 5, parents: ['M'], label: 'quebrou', tone: 'bad' };

const STEPS: (Step & { scene: Scene })[] = [
  {
    title: 'O histórico é uma cadeia de commits',
    text: 'Cada commit aponta para o anterior. Um branch é só um ponteiro para um commit: `main` aponta para `B`.',
    scene: { commits: [A, B], refs: [{ name: 'main', at: 'B' }] },
  },
  {
    title: 'Um branch para a tarefa',
    text: '`git switch -c filtro` cria outro ponteiro no mesmo commit. Os commits novos movem só o branch atual.',
    scene: { commits: [A, B, C, D], refs: [{ name: 'main', at: 'B' }, { name: 'filtro', at: 'D', lane: 1 }] },
  },
  {
    title: 'A main também anda',
    text: 'Enquanto isso, alguém publica uma correção na `main`. Agora os dois caminhos divergem a partir de `B`.',
    scene: { commits: [A, B, C, D, E], refs: [{ name: 'main', at: 'E' }, { name: 'filtro', at: 'D', lane: 1 }] },
  },
  {
    title: 'O merge junta os caminhos',
    text: 'O merge cria um commit com dois pais, `E` e `D`. Se os dois lados mudaram as mesmas linhas, o Git para e pede que você resolva o conflito antes desse commit.',
    scene: { commits: [A, B, C, D, E, M], refs: [{ name: 'main', at: 'M' }, { name: 'filtro', at: 'D', lane: 1 }] },
  },
  {
    title: 'Um commit quebrado foi publicado',
    text: 'O commit `X` foi para a `main` remota e quebrou a página. Uma colega já baixou a `main` com o `X`.',
    scene: { commits: [A, B, C, D, E, M, X], refs: [{ name: 'main', at: 'X' }], remote: { label: 'cópia da colega', commits: ['M', 'X'] } },
  },
  {
    title: 'Desfazendo com revert',
    text: '`git revert X` cria um commit novo, `X\'`, que desfaz as mudanças. O histórico publicado continua igual, e a colega recebe o `X\'` no próximo pull.',
    predict: {
      question: '`X` já está na cópia da colega. Qual comando desfaz sem atrapalhar quem já baixou?',
      options: [
        { text: '`git revert X`, que adiciona um commit desfazendo', why: 'Nada do histórico existente muda, então todo mundo continua compatível.' },
        { text: '`git reset --hard M` e `git push --force`', why: 'Isso apaga o X do remoto, mas a colega ainda o tem e pode trazê-lo de volta no próximo push.' },
        { text: 'Apagar o arquivo e fazer commit', why: 'Isso pode desfazer mais do que o X ou menos, e não deixa claro no histórico o que foi revertido.' },
      ],
      answer: 0,
    },
    scene: {
      commits: [A, B, C, D, E, M, X, { id: "X'", lane: 0, col: 6, parents: ['X'], label: 'revert', tone: 'ok' }],
      refs: [{ name: 'main', at: "X'" }],
      remote: { label: 'cópia da colega', commits: ['M', 'X', "X'"] },
    },
  },
  {
    title: 'O risco do reset com force',
    text: 'Com `reset --hard` e `push --force`, o `X` some do remoto, mas continua na cópia da colega. Os históricos divergem, e o próximo push dela traz o `X` de volta.',
    scene: {
      commits: [A, B, C, D, E, M, { ...X, tone: 'ghost' }],
      refs: [{ name: 'main', at: 'M' }],
      remote: { label: 'cópia da colega', commits: ['M', 'X'] },
    },
  },
];

const x = (col: number) => 50 + col * 85;
const y = (lane: number) => 70 + lane * 70;

function Scene({ scene }: { scene: Scene }) {
  const byId = new Map(scene.commits.map((c) => [c.id, c]));
  return (
    <svg viewBox="0 0 640 260" className="viz-svg" role="img" aria-label={`Grafo com ${scene.commits.length} commits`}>
      {scene.commits.flatMap((c) =>
        c.parents.map((p) => {
          const parent = byId.get(p)!;
          return (
            <path
              key={`${c.id}-${p}`}
              d={`M${x(parent.col)},${y(parent.lane)} C${x(parent.col) + 40},${y(parent.lane)} ${x(c.col) - 40},${y(c.lane)} ${x(c.col)},${y(c.lane)}`}
              className={`viz-edge${c.tone === 'ghost' ? ' ghost' : ''}`}
            />
          );
        }),
      )}
      {scene.commits.map((c) => (
        <g key={c.id} className={`viz-commit ${c.tone ?? ''}`}>
          <circle cx={x(c.col)} cy={y(c.lane)} r={15} />
          <text x={x(c.col)} y={y(c.lane) + 5} textAnchor="middle">{c.id}</text>
          {c.label && <text x={x(c.col)} y={y(c.lane) + 34} textAnchor="middle" className="viz-node-sub">{c.label}</text>}
        </g>
      ))}
      {scene.refs.map((r) => {
        const c = byId.get(r.at)!;
        return (
          <g key={r.name} className="viz-ref">
            <rect x={x(c.col) - 30} y={y(c.lane) - 46} width={60} height={20} rx={4} />
            <text x={x(c.col)} y={y(c.lane) - 32} textAnchor="middle">{r.name}</text>
          </g>
        );
      })}
      {scene.remote && (
        <g>
          <text x={20} y={232} className="viz-node-sub">{scene.remote.label}:</text>
          {scene.remote.commits.map((id, i) => (
            <g key={id} className={`viz-commit small ${id === 'X' ? 'bad' : id === "X'" ? 'ok' : ''}`}>
              <circle cx={150 + i * 46} cy={228} r={12} />
              <text x={150 + i * 46} y={232} textAnchor="middle">{id}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

export default function Git() {
  return <Stepper steps={STEPS}>{(i) => <Scene scene={STEPS[i].scene} />}</Stepper>;
}
