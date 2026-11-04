import { Stepper, type Step } from './Stepper';

type NodeId = 'navegador' | 'resolvedor' | 'raiz' | 'br' | 'autoritativo';

const NODES: Record<NodeId, { x: number; y: number; label: string; sub: string }> = {
  navegador: { x: 70, y: 150, label: 'Navegador', sub: 'da fã' },
  resolvedor: { x: 260, y: 150, label: 'Resolvedor', sub: 'do provedor' },
  raiz: { x: 520, y: 45, label: 'Servidor raiz', sub: '.' },
  br: { x: 520, y: 150, label: 'Servidor .br', sub: 'domínio de topo' },
  autoritativo: { x: 520, y: 255, label: 'Autoritativo', sub: 'festivalruido.com.br' },
};

// Trocar a key reinicia a animação da seta a cada passo.
const SCENE_KEY = (s: { msg?: { from: string; to: string; label: string } }) => (s.msg ? `${s.msg.from}-${s.msg.to}-${s.msg.label}` : '');

const ANTIGO = '203.0.113.10';
const NOVO = '198.51.100.7';

interface Scene {
  /** Mensagem em trânsito. */
  msg?: { from: NodeId; to: NodeId; label: string };
  /** O que o resolvedor tem em cache. */
  cache?: { ip: string; ttl: string; stale?: boolean };
  /** Registro A publicado no servidor autoritativo. */
  registro: string;
  /** Nó em destaque. */
  focus?: NodeId;
}

const SCENES: (Step & { scene: Scene })[] = [
  {
    title: 'A pergunta',
    text: 'A fã digita `festivalruido.com.br`. O navegador não sabe o IP e pergunta ao resolvedor do provedor de internet.',
    scene: { msg: { from: 'navegador', to: 'resolvedor', label: 'IP de festivalruido.com.br?' }, registro: ANTIGO },
  },
  {
    title: 'Começando pela raiz',
    text: 'O cache do resolvedor está vazio. Ele pergunta ao servidor raiz, que não sabe o IP, mas sabe quem cuida do `.br`.',
    predict: {
      question: 'o cache do resolvedor está vazio. A quem ele pergunta primeiro?',
      options: [
        { text: 'Ao servidor raiz', why: 'A consulta desce a hierarquia do nome a partir do topo: raiz, depois `.br`, depois o domínio.' },
        { text: 'Direto ao servidor do festival', why: 'O resolvedor ainda não sabe qual servidor cuida do domínio. É isso que ele vai descobrir descendo a hierarquia.' },
        { text: 'Ao navegador de outra pessoa', why: 'Navegadores não respondem consultas de DNS uns dos outros.' },
      ],
      answer: 0,
    },
    scene: { msg: { from: 'resolvedor', to: 'raiz', label: 'quem cuida de .br?' }, registro: ANTIGO, focus: 'raiz' },
  },
  {
    title: 'Descendo um nível',
    text: 'O servidor do `.br` também não tem o IP, mas sabe quais servidores são autoritativos para `festivalruido.com.br`.',
    scene: { msg: { from: 'resolvedor', to: 'br', label: 'quem cuida de festivalruido?' }, registro: ANTIGO, focus: 'br' },
  },
  {
    title: 'A resposta oficial',
    text: 'O servidor autoritativo responde com o registro A, e junto vai o TTL de 86400 segundos: a resposta pode ser reaproveitada por um dia.',
    scene: { msg: { from: 'autoritativo', to: 'resolvedor', label: `A ${ANTIGO}, TTL 86400` }, registro: ANTIGO, focus: 'autoritativo' },
  },
  {
    title: 'Guardado em cache',
    text: 'O resolvedor guarda a resposta e entrega o IP ao navegador. Quem perguntar de novo neste dia recebe a resposta do cache, sem repetir o caminho.',
    scene: { msg: { from: 'resolvedor', to: 'navegador', label: ANTIGO }, cache: { ip: ANTIGO, ttl: '86400 s' }, registro: ANTIGO },
  },
  {
    title: 'A migração',
    text: `A equipe troca o registro A para o servidor novo, \`${NOVO}\`. A mudança acontece só no servidor autoritativo.`,
    scene: { cache: { ip: ANTIGO, ttl: '82800 s' }, registro: NOVO, focus: 'autoritativo' },
  },
  {
    title: 'O IP antigo ainda vale',
    text: 'Outro fã usa o mesmo resolvedor uma hora depois. O cache ainda vale por 82800 segundos, então ele recebe o IP antigo, sem consultar o autoritativo.',
    predict: {
      question: 'outro fã pergunta ao mesmo resolvedor uma hora depois da migração. Que IP ele recebe?',
      options: [
        { text: `O antigo, \`${ANTIGO}\``, why: 'A resposta em cache ainda está dentro do TTL, e o resolvedor não tem motivo para perguntar de novo.' },
        { text: `O novo, \`${NOVO}\``, why: 'O resolvedor nem consulta o autoritativo enquanto o TTL não vence. Ele não sabe da mudança.' },
        { text: 'Um erro, porque os dois IPs conflitam', why: 'Não há conflito: o resolvedor só conhece a resposta que guardou.' },
      ],
      answer: 0,
    },
    scene: { msg: { from: 'resolvedor', to: 'navegador', label: `${ANTIGO} (do cache)` }, cache: { ip: ANTIGO, ttl: '82800 s', stale: true }, registro: NOVO, focus: 'resolvedor' },
  },
  {
    title: 'O TTL vence',
    text: 'Um dia depois, a entrada expira. A próxima consulta refaz o caminho e chega ao IP novo. Baixar o TTL dias antes da migração encurta essa espera.',
    scene: { msg: { from: 'autoritativo', to: 'resolvedor', label: `A ${NOVO}, TTL 86400` }, cache: { ip: NOVO, ttl: '86400 s' }, registro: NOVO, focus: 'autoritativo' },
  },
];

/** Fração do caminho entre os centros em que a linha sai da caixa de 124 por 52. */
const edge = (dx: number, dy: number) => Math.min(dx ? 66 / Math.abs(dx) : Infinity, dy ? 30 / Math.abs(dy) : Infinity);

function Arrow({ from, to, label }: { from: NodeId; to: NodeId; label: string }) {
  const a = NODES[from];
  const b = NODES[to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  // Começa e termina na borda das caixas, não no centro.
  const t = edge(dx, dy);
  const sx = a.x + dx * t;
  const sy = a.y + dy * t;
  const ex = b.x - dx * t;
  const ey = b.y - dy * t;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2 - 10;
  return (
    <g className="viz-arrow" key={`${from}-${to}-${label}`}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} markerEnd="url(#dns-seta)" />
      <rect x={mx - label.length * 3.4 - 6} y={my - 13} width={label.length * 6.8 + 12} height={20} rx={4} className="viz-label-bg" />
      <text x={mx} y={my + 1} textAnchor="middle" className="viz-label">{label}</text>
    </g>
  );
}

function DnsScene({ scene }: { scene: Scene }) {
  return (
    <svg viewBox="0 0 640 320" className="viz-svg" role="img" aria-label="Diagrama da consulta de DNS">
      <defs>
        <marker id="dns-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="viz-arrowhead" />
        </marker>
      </defs>
      {(Object.keys(NODES) as NodeId[]).map((id) => {
        const n = NODES[id];
        return (
          <g key={id} className={scene.focus === id ? 'viz-node focus' : 'viz-node'}>
            <rect x={n.x - 62} y={n.y - 26} width={124} height={52} rx={8} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" className="viz-node-label">{n.label}</text>
            <text x={n.x} y={n.y + 14} textAnchor="middle" className="viz-node-sub">{n.sub}</text>
          </g>
        );
      })}
      <g className="viz-box">
        <rect x={198} y={195} width={124} height={62} rx={6} />
        <text x={260} y={213} textAnchor="middle" className="viz-node-sub">cache</text>
        {scene.cache ? (
          <>
            <text x={260} y={232} textAnchor="middle" className={scene.cache.stale ? 'viz-mono stale' : 'viz-mono'}>{scene.cache.ip}</text>
            <text x={260} y={249} textAnchor="middle" className="viz-node-sub">TTL {scene.cache.ttl}</text>
          </>
        ) : (
          <text x={260} y={238} textAnchor="middle" className="viz-node-sub">vazio</text>
        )}
      </g>
      <text x={520} y={302} textAnchor="middle" className="viz-mono small">registro A: {scene.registro}</text>
      {scene.msg && <Arrow key={SCENE_KEY(scene)} from={scene.msg.from} to={scene.msg.to} label={scene.msg.label} />}
    </svg>
  );
}

export default function Dns() {
  return <Stepper steps={SCENES}>{(i) => <DnsScene scene={SCENES[i].scene} />}</Stepper>;
}
