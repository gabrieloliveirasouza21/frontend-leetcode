import { buildPage, documentOf, runInFrame } from './frame';
import { checkRules } from './rules';
import type { JudgedProblem, Mode, Report } from './types';
import type { WorkerRequest } from './worker';

export * from './types';

// O TypeScript leva alguns segundos para carregar na primeira checagem.
const WORKER_TIMEOUT_MS = 15000;
export const TIMEOUT_MESSAGE = 'O código passou do tempo limite e foi interrompido. Verifique se há um laço infinito ou uma promessa que nunca termina.';

let worker: Worker | null = null;
let nextId = 1;

/** Um laço infinito trava o worker: em timeout, ele inteiro é descartado. */
function callWorker(problem: JudgedProblem, code: string, mode: Mode): Promise<Report> {
  worker ??= new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const current = worker;
  const id = nextId++;
  return new Promise<Report>((resolve, reject) => {
    const timer = setTimeout(() => {
      current.terminate();
      if (worker === current) worker = null;
      resolve({ results: [], logs: [], error: TIMEOUT_MESSAGE });
    }, WORKER_TIMEOUT_MS);
    const onMessage = ({ data }: MessageEvent) => {
      if (data.id !== id) return;
      clearTimeout(timer);
      current.removeEventListener('message', onMessage);
      if (data.ok) resolve(data.report as Report);
      else reject(new Error(data.message));
    };
    current.addEventListener('message', onMessage);
    current.postMessage({ id, mode, problem, code } satisfies WorkerRequest);
  });
}

function syntaxErrorOf(code: string): string | null {
  try {
    new Function(code);
    return null;
  } catch (error) {
    return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

async function judgePage(problem: JudgedProblem, code: string, mode: Mode): Promise<Report> {
  const report: Report = { results: [], logs: [] };
  if (problem.kind === 'dom' && problem.editor === 'js') {
    const error = syntaxErrorOf(code);
    if (error) return { ...report, error };
  }
  let page;
  try {
    page = await buildPage(problem, code);
  } catch (error) {
    return { ...report, error: error instanceof Error ? error.message : String(error) };
  }
  const tests = (problem.tests ?? []).filter((t) => mode === 'submit' || !t.hidden);
  const outcomes = await Promise.all(tests.map((test) => runInFrame(page, test.code, test.width)));
  report.results = tests.map((test, i) => ({ name: test.name, hidden: test.hidden, ...outcomes[i] }));
  return report;
}

/** Corrige o código. Em `run`, só os testes visíveis; em `submit`, todos, mais as regras do problema. */
export async function judge(problem: JudgedProblem, code: string, mode: Mode): Promise<Report> {
  const report = problem.kind === 'dom' || problem.kind === 'react' ? await judgePage(problem, code, mode) : await callWorker(problem, code, mode);
  if (mode === 'submit' && !report.error) {
    const rule = checkRules(problem, code);
    if (rule) report.rule = rule;
  }
  return report;
}

/** Documento da pré-visualização, sem testes. */
export async function previewDocument(problem: JudgedProblem, code: string): Promise<string> {
  return documentOf(await buildPage(problem, code));
}
