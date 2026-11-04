import { useEffect, useState } from 'react';
import { problems } from './content';
import { useNow, useReview, useSolved } from './progress';
import { ProblemPage } from './ProblemPage';
import { QuizPage } from './QuizPage';
import { isDue } from './review';
import { ReviewPage } from './ReviewPage';
import { RoadmapPage } from './RoadmapPage';

type Route = { page: 'problema'; slug: string } | { page: 'revisao' } | { page: 'trilha' };

function currentRoute(): Route {
  const hash = window.location.hash;
  const slug = hash.match(/^#\/problema\/(.+)$/)?.[1];
  if (slug) return { page: 'problema', slug };
  if (hash === '#/revisao') return { page: 'revisao' };
  return { page: 'trilha' };
}

export function App() {
  const [route, setRoute] = useState(currentRoute);
  const { solved, markSolved } = useSolved();
  const { cards, record } = useReview();
  const now = useNow();

  useEffect(() => {
    const onChange = () => {
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const dueCount = Object.values(cards).filter((card) => isDue(card, now)).length;
  const problem = route.page === 'problema' ? problems.find((p) => p.slug === route.slug) : undefined;
  const pageProps = problem && {
    problem,
    solved: solved.has(problem.slug),
    onSolved: markSolved,
    card: cards[problem.slug],
    onAttempt: record,
  };

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">Trilha <span>Frontend</span></a>
        <nav className="topbar-nav">
          <a className={dueCount ? 'review-link due' : 'review-link'} href="#/revisao">
            Revisar{dueCount ? ` (${dueCount})` : ''}
          </a>
          <span className="progress-count">{solved.size} de {problems.length} resolvidos</span>
        </nav>
      </header>
      {pageProps?.problem.options ? (
        <QuizPage key={pageProps.problem.slug} {...pageProps} />
      ) : pageProps ? (
        <ProblemPage key={pageProps.problem.slug} {...pageProps} />
      ) : route.page === 'revisao' ? (
        <ReviewPage cards={cards} />
      ) : (
        <RoadmapPage solved={solved} />
      )}
    </>
  );
}
