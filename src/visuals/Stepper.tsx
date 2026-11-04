import { useEffect, useState, type ReactNode } from 'react';
import { inline } from '../text';

export interface Prediction {
  question: string;
  options: { text: string; why: string }[];
  answer: number;
}

export interface Step {
  title: string;
  text: string;
  /** Pergunta feita antes de mostrar este passo: a pessoa prevê, depois vê. */
  predict?: Prediction;
}

const AUTOPLAY_MS = 3000;

/**
 * Animação passo a passo. `children` desenha o estado do passo atual.
 * Antes de um passo com `predict`, a animação para e pede uma previsão.
 */
export function Stepper({ steps, children }: { steps: Step[]; children: (index: number) => ReactNode }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Previsões já respondidas, pelo índice do passo, com a opção escolhida.
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const nextIndex = index + 1;
  const next = steps[nextIndex];
  const asking = next?.predict && answers[nextIndex] === undefined;
  const last = index === steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (last || asking) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [playing, index, last, asking]);

  const step = steps[index];
  const picked = next?.predict ? answers[nextIndex] : undefined;

  return (
    <div className="stepper">
      <div className="stepper-canvas">{children(index)}</div>
      <div className="stepper-caption" aria-live="polite">
        <p className="stepper-count">Passo {index + 1} de {steps.length}</p>
        <h4>{step.title}</h4>
        <p>{inline(step.text)}</p>
      </div>

      {next?.predict && (
        <div className="predict" role="group" aria-label="Previsão">
          <p className="predict-question">Antes de continuar: {inline(next.predict.question)}</p>
          <div className="predict-options">
            {next.predict.options.map((option, i) => {
              const state = picked === undefined ? '' : i === next.predict!.answer ? 'right' : i === picked ? 'wrong' : 'dim';
              return (
                <button
                  key={option.text}
                  className={`predict-option ${state}`}
                  disabled={picked !== undefined}
                  aria-pressed={picked === i}
                  onClick={() => setAnswers({ ...answers, [nextIndex]: i })}
                >
                  {inline(option.text)}
                </button>
              );
            })}
          </div>
          {picked !== undefined && (
            <p className={`why ${picked === next.predict.answer ? 'right' : 'wrong'}`}>
              {picked === next.predict.answer ? 'Isso. ' : 'Não exatamente. '}
              {inline(next.predict.options[picked].why)}
            </p>
          )}
        </div>
      )}

      <div className="stepper-controls">
        <button className="ghost" onClick={() => { setPlaying(false); setIndex(Math.max(0, index - 1)); }} disabled={index === 0}>
          ← Anterior
        </button>
        <button className="ghost" onClick={() => setPlaying(!playing)} disabled={last || !!asking}>
          {playing ? 'Pausar' : 'Tocar'}
        </button>
        <button className="primary" onClick={() => { setPlaying(false); setIndex(nextIndex); }} disabled={last || !!asking}>
          {next?.predict ? 'Ver o que acontece →' : 'Próximo →'}
        </button>
        {last && (
          <button className="ghost" onClick={() => { setIndex(0); setAnswers({}); }}>
            Recomeçar
          </button>
        )}
      </div>
    </div>
  );
}
