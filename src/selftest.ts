// Página de autoteste: roda cada solução, armadilha e código inicial no corretor real do navegador.
// Os testes automatizados abrem esta página num navegador de verdade e leem window.__selftest.
// O conteúdo é importado dentro de main: um erro no YAML vira falha do teste, em vez de travar a página.
import { isAccepted, judge, type Report } from './judge';

interface Failure {
  slug: string;
  problem: string;
}

declare global {
  interface Window {
    __selftest?: { done: boolean; checked: number; failures: Failure[] };
  }
}

const log = document.getElementById('log')!;
const params = new URLSearchParams(location.search);
// ?only=slug1,slug2 roda só esses problemas.
const only = params.get('only')?.split(',');

function describe(report: Report): string {
  if (report.error) return `erro: ${report.error}`;
  if (report.rule) return `regra: ${report.rule}`;
  if (report.escaped) return `defeito escapou: ${report.escaped}`;
  if (report.types?.length) return `tipos: ${report.types.join(' | ')}`;
  const failed = report.results.filter((r) => !r.ok);
  if (failed.length) return failed.map((r) => `${r.name}: ${r.message}`).join(' | ');
  return report.results.length ? 'aceito' : 'nenhum teste rodou';
}

async function main() {
  const state = { done: false, checked: 0, failures: [] as Failure[] };
  window.__selftest = state;
  const { problems } = await import('./content');
  const executable = problems.filter((p) => p.kind !== 'quiz' && (!only || only.includes(p.slug)));
  for (const problem of executable) {
    const fail = (message: string) => state.failures.push({ slug: problem.slug, problem: message });
    if (!problem.solution) {
      fail('sem solução de referência');
      continue;
    }
    if (problem.kind !== 'tests' && !problem.tests?.some((t) => !t.hidden)) fail('nenhum teste visível');
    if (problem.kind !== 'tests' && !problem.tests?.some((t) => t.hidden)) fail('nenhum teste oculto');

    const solution = await judge(problem, problem.solution, 'submit');
    if (!isAccepted(solution)) fail(`a solução foi reprovada: ${describe(solution)}`);
    const run = await judge(problem, problem.solution, 'run');
    if (!isAccepted(run)) fail(`a solução foi reprovada em Executar: ${describe(run)}`);

    for (const trap of problem.traps) {
      const report = await judge(problem, trap.code, 'submit');
      if (isAccepted(report)) fail(`a armadilha "${trap.reason}" foi aprovada`);
    }
    if (problem.starter !== undefined) {
      const report = await judge(problem, problem.starter, 'submit');
      if (isAccepted(report)) fail('o código inicial já é aprovado');
    }
    state.checked++;
    log.textContent = `${state.checked}/${executable.length} problemas\n` + state.failures.map((f) => `✗ ${f.slug}: ${f.problem}`).join('\n');
  }
  state.done = true;
  log.textContent = `Fim: ${state.checked} problemas, ${state.failures.length} falha(s)\n` + state.failures.map((f) => `✗ ${f.slug}: ${f.problem}`).join('\n');
}

main().catch((error) => {
  window.__selftest = { done: true, checked: 0, failures: [{ slug: '*', problem: String(error?.stack ?? error) }] };
  log.textContent = String(error?.stack ?? error);
});
