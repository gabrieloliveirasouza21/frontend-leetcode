import { KIND_LABEL, problems, topicOf } from './content';
import { useNow } from './progress';
import { INTERVALS, isDue, untilLabel, type Card } from './review';
import { DIFFICULTY_LABEL } from './RoadmapPage';

/** Selo com a próxima revisão, nas páginas dos problemas. */
export function ReviewBadge({ card }: { card?: Card }) {
  const now = useNow();
  if (!card) return null;
  const due = isDue(card, now);
  return (
    <span className={due ? 'badge review due' : 'badge review'} title={`Intervalo atual: ${INTERVALS[card.box].label}`}>
      {due ? 'Revisar agora' : `Revisão ${untilLabel(card.due, now)}`}
    </span>
  );
}

const bySlug = new Map(problems.map((p) => [p.slug, p]));

function Row({ slug, card, now }: { slug: string; card: Card; now: number }) {
  const problem = bySlug.get(slug)!;
  return (
    <li>
      <a className="problem-link" href={`#/problema/${slug}`}>
        <span className={card.lastCorrect ? 'check solved' : 'check missed'} aria-hidden="true">{card.lastCorrect ? '✓' : '✗'}</span>
        <span className="problem-title">
          {problem.title}
          <span className="review-meta">
            {topicOf(slug)?.title} · intervalo {INTERVALS[card.box].label} · {card.reviews} tentativa(s), {card.lapses} erro(s)
          </span>
        </span>
        <span className="kind">{KIND_LABEL[problem.kind]}</span>
        <span className="review-when">{isDue(card, now) ? 'agora' : untilLabel(card.due, now)}</span>
        <span className={`badge ${problem.difficulty}`}>{DIFFICULTY_LABEL[problem.difficulty]}</span>
      </a>
    </li>
  );
}

export function ReviewPage({ cards }: { cards: Record<string, Card> }) {
  const now = useNow();
  const entries = Object.entries(cards).filter(([slug]) => bySlug.has(slug));
  const due = entries.filter(([, c]) => isDue(c, now)).sort((a, b) => a[1].due - b[1].due);
  const upcoming = entries.filter(([, c]) => !isDue(c, now)).sort((a, b) => a[1].due - b[1].due);

  return (
    <main className="roadmap">
      <a className="back" href="#/">← Trilha</a>
      <section className="intro">
        <h1>Revisar</h1>
        <p>
          Cada problema volta para revisão depois de um intervalo. Acertou de primeira, o intervalo cresce: 10 min, 1 hora, 5 horas, 10 horas, 1 dia,
          3 dias, 1 semana, 1 mês, 3 meses e 6 meses. Errou, volta para 10 min. Só a primeira resposta de cada vez que você abre o problema conta.
        </p>
      </section>

      <section className="section-head">
        <h2>Para revisar agora ({due.length})</h2>
      </section>
      {due.length ? (
        <ul className="problem-list review-list">{due.map(([slug, card]) => <Row key={slug} slug={slug} card={card} now={now} />)}</ul>
      ) : (
        <p className="empty">Nada para revisar agora. Resolva problemas novos na trilha ou volte mais tarde.</p>
      )}

      <section className="section-head">
        <h2>Próximas revisões ({upcoming.length})</h2>
      </section>
      {upcoming.length ? (
        <ul className="problem-list review-list">{upcoming.map(([slug, card]) => <Row key={slug} slug={slug} card={card} now={now} />)}</ul>
      ) : (
        <p className="empty">Nenhuma revisão agendada ainda.</p>
      )}
      <p className="credit">O histórico de revisão fica salvo só neste navegador.</p>
    </main>
  );
}
