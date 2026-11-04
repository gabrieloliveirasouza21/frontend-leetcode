/// <reference lib="webworker" />
import { transform } from 'sucrase';
import runtimeSource from './runtime.js?raw';
import type { JudgedProblem, Mode, Report, TestCase, TestResult } from './types';

export interface WorkerRequest {
  id: number;
  mode: Mode;
  problem: JudgedProblem;
  code: string;
}

interface Runtime {
  show: (value: unknown) => string;
  messageOf: (error: unknown) => string;
  suite: () => { describe: unknown; it: unknown; test: unknown; cases: { name: string; body: () => unknown }[] };
  names: string[];
  values: unknown[];
}

(0, eval)(runtimeSource);
const rt = (globalThis as unknown as { __rt: Runtime }).__rt;

// O código do aluno pode trocar fetch, setTimeout e console. Cada teste começa com os originais.
const pristine = {
  fetch: globalThis.fetch,
  setTimeout: globalThis.setTimeout,
  setInterval: globalThis.setInterval,
  Date: globalThis.Date,
  random: Math.random,
};
function restore() {
  Object.assign(globalThis, { fetch: pristine.fetch, setTimeout: pristine.setTimeout, setInterval: pristine.setInterval, Date: pristine.Date });
  Math.random = pristine.random;
}

let logs: string[] = [];
const MAX_LOGS = 60;
const capture = (...args: unknown[]) => {
  if (logs.length < MAX_LOGS) logs.push(args.map((a) => (typeof a === 'string' ? a : rt.show(a))).join(' '));
};
Object.assign(console, { log: capture, info: capture, warn: capture, error: capture, debug: capture });

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<unknown>;

/** Remove `export` para que o aluno possa escrever como num módulo. */
function prepare(code: string, typescript: boolean): string {
  const withoutExports = code
    .replace(/^\s*export\s+default\s+(?=(async\s+)?function|class)/gm, '')
    .replace(/^\s*export\s+(?=(const|let|var|function|async|class|type|interface|enum)\b)/gm, '')
    .replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, '');
  if (!typescript) return withoutExports;
  return transform(withoutExports, { transforms: ['typescript'], disableESTransforms: true }).code;
}

function syntaxError(code: string): string | null {
  try {
    new AsyncFunction(code);
    return null;
  } catch (error) {
    return rt.messageOf(error);
  }
}

async function runTest(source: string, test: TestCase): Promise<TestResult> {
  restore();
  try {
    // O bloco isola as variáveis do teste das do aluno.
    await new AsyncFunction(...rt.names, `${source}\n;\n{\n${test.code}\n}`)(...rt.values);
    return { name: test.name, ok: true, hidden: test.hidden };
  } catch (error) {
    return { name: test.name, ok: false, hidden: test.hidden, message: rt.messageOf(error) };
  }
}

async function runSuite(implementation: string, tests: string): Promise<{ results: TestResult[]; error?: string }> {
  restore();
  const suite = rt.suite();
  try {
    await new AsyncFunction(...rt.names, 'describe', 'it', 'test', `${implementation}\n;\n${tests}`)(...rt.values, suite.describe, suite.it, suite.test);
  } catch (error) {
    return { results: [], error: `Erro ao montar os testes: ${rt.messageOf(error)}` };
  }
  const results: TestResult[] = [];
  for (const testCase of suite.cases) {
    restore();
    try {
      await testCase.body();
      results.push({ name: testCase.name, ok: true });
    } catch (error) {
      results.push({ name: testCase.name, ok: false, message: rt.messageOf(error) });
    }
  }
  return { results };
}

async function judgeTests(problem: JudgedProblem, code: string, mode: Mode): Promise<Report> {
  const report: Report = { results: [], logs };
  const base = await runSuite(problem.implementation ?? '', code);
  report.results = base.results;
  if (base.error) return { ...report, error: base.error };
  const minimum = problem.min_tests ?? 1;
  if (base.results.length < minimum) {
    return { ...report, error: `Escreva pelo menos ${minimum} teste(s) com it() ou test(). Encontrei ${base.results.length}.` };
  }
  if (mode === 'run' || base.results.some((r) => !r.ok)) return report;
  for (const mutant of problem.mutants ?? []) {
    const run = await runSuite(mutant.code, code);
    if (!run.error && run.results.every((r) => r.ok)) return { ...report, escaped: mutant.reason };
  }
  return report;
}

async function judgeFunctions(problem: JudgedProblem, code: string, mode: Mode): Promise<Report> {
  const report: Report = { results: [], logs };
  let source: string;
  try {
    source = `${problem.setup ?? ''}\n;\n${prepare(code, problem.kind === 'ts')}`;
  } catch (error) {
    return { ...report, error: rt.messageOf(error) };
  }
  const problemWithSyntax = syntaxError(source);
  if (problemWithSyntax) return { ...report, error: problemWithSyntax };

  if (problem.kind === 'ts') {
    const { typeErrors } = await import('./typecheck');
    report.types = await typeErrors(code, problem.types ?? '');
  }

  const tests = (problem.tests ?? []).filter((t) => mode === 'submit' || !t.hidden);
  for (const test of tests) report.results.push(await runTest(source, test));
  return report;
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  logs = [];
  try {
    const report =
      data.problem.kind === 'tests'
        ? await judgeTests(data.problem, data.code, data.mode)
        : await judgeFunctions(data.problem, data.code, data.mode);
    restore();
    self.postMessage({ id: data.id, ok: true, report });
  } catch (error) {
    self.postMessage({ id: data.id, ok: false, message: error instanceof Error ? error.message : String(error) });
  }
};
