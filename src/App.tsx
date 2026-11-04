import { useEffect, useState } from 'react';
import { problems } from './content';
import { useSolved } from './progress';
import { ProblemPage } from './ProblemPage';
import { QuizPage } from './QuizPage';
import { RoadmapPage } from './RoadmapPage';

function currentSlug() {
  return window.location.hash.match(/^#\/problema\/(.+)$/)?.[1] ?? null;
}

export function App() {
  const [slug, setSlug] = useState(currentSlug);
  const { solved, markSolved } = useSolved();

  useEffect(() => {
    const onChange = () => {
      setSlug(currentSlug());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const problem = problems.find((p) => p.slug === slug);
  return (
    <>
      <header className="topbar">
        <a className="brand" href="#/">Trilha <span>Frontend</span></a>
        <span className="progress-count">{solved.size} de {problems.length} resolvidos</span>
      </header>
      {problem?.options ? (
        <QuizPage key={problem.slug} problem={problem} solved={solved.has(problem.slug)} onSolved={markSolved} />
      ) : problem ? (
        <ProblemPage key={problem.slug} problem={problem} solved={solved.has(problem.slug)} onSolved={markSolved} />
      ) : (
        <RoadmapPage solved={solved} />
      )}
    </>
  );
}
