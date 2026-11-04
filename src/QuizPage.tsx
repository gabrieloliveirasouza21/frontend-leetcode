import { useState } from 'react';
import { problems, subtopicNames, topicOf, type Problem } from './content';
import { inline, Paragraphs } from './ProblemPage';
import { DIFFICULTY_LABEL } from './RoadmapPage';

export function QuizPage({ problem, solved, onSolved }: { problem: Problem; solved: boolean; onSolved: (slug: string) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const topic = topicOf(problem.slug);
  const next = problems[problems.indexOf(problem) + 1];
  const correct = picked === problem.answer;

  const pick = (index: number) => {
    setPicked(index);
    if (index === problem.answer) onSolved(problem.slug);
  };

  return (
    <main className="quiz">
      <a className="back" href="#/">← Trilha</a>
      <div className="statement-head">
        <h1>{problem.title}</h1>
        <span className={`badge ${problem.difficulty}`}>{DIFFICULTY_LABEL[problem.difficulty]}</span>
        {solved && <span className="badge done">Resolvido</span>}
      </div>
      <ul className="topics">
        {topic && <li className="topic-name">{topic.title}</li>}
        {subtopicNames(problem.slug).map((name) => <li key={name}>{name}</li>)}
      </ul>
      <Paragraphs text={problem.statement} />

      <div className="options" role="group" aria-label="Opções de resposta">
        {problem.options!.map((option, index) => {
          const state = picked === index ? (correct ? 'right' : 'wrong') : '';
          return (
            <div key={option.text}>
              <button className={`option ${state}`} aria-pressed={picked === index} onClick={() => pick(index)}>
                {inline(option.text)}
              </button>
              {picked === index && <p className={`why ${state}`} aria-live="polite">{inline(option.why)}</p>}
            </div>
          );
        })}
      </div>

      {(correct || solved) && (
        <section className="quiz-after">
          <h3>Para fixar</h3>
          <Paragraphs text={problem.explanation} />
          {topic && (
            <ul className="study">
              {topic.study.map((link) => (
                <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>
              ))}
            </ul>
          )}
          {next && <a className="next" href={`#/problema/${next.slug}`}>Próximo: {next.title} →</a>}
        </section>
      )}
    </main>
  );
}
