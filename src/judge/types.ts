/**
 * Tipos de problema.
 * - js e ts: o aluno escreve funções, testadas num Web Worker. Em ts, os tipos também são checados.
 * - dom: o aluno escreve o HTML, o CSS ou o JS de uma página, testada num iframe.
 * - react: o aluno escreve componentes React, renderizados num iframe.
 * - tests: o aluno escreve os testes. Eles precisam passar na implementação certa e pegar cada defeito.
 * - quiz: problema conceitual de múltipla escolha.
 */
export type Kind = 'quiz' | 'js' | 'ts' | 'dom' | 'react' | 'tests';

/** Parte da página que o aluno edita num problema dom. */
export type EditorPart = 'html' | 'css' | 'js';

export interface TestCase {
  name: string;
  /** Corpo de uma função async. Tem acesso a expect, fn, wait e, no iframe, a $, $$, css, rect, click, type… */
  code: string;
  /** Teste oculto: só roda no envio, e o aluno vê só o nome. */
  hidden?: boolean;
  /** Largura do iframe em pixels, para testar media queries. Padrão: 1000. */
  width?: number;
}

export interface Mutant {
  /** Defeito que a versão errada tem. Aparece quando os testes do aluno deixam o defeito passar. */
  reason: string;
  code: string;
}

export interface JudgedProblem {
  kind: Kind;
  /** dom: a parte que o aluno edita. As outras vêm de html, css e js. */
  editor?: EditorPart;
  html?: string;
  css?: string;
  js?: string;
  /** dom: carrega o Tailwind CSS na página. */
  tailwind?: boolean;
  /** Código que roda antes do código do aluno. Em dom e react, roda dentro da página. */
  setup?: string;
  tests?: TestCase[];
  /** ts: trecho checado junto do código do aluno. Linhas com @ts-expect-error precisam dar erro de tipo. */
  types?: string;
  /** tests: implementação certa, que os testes do aluno precisam aprovar. */
  implementation?: string;
  /** tests: versões com defeito, que os testes do aluno precisam reprovar. */
  mutants?: Mutant[];
  /** tests: quantidade mínima de testes. Padrão: 1. */
  min_tests?: number;
  /** Termos exigidos ou proibidos no código enviado. Comentários e textos entre aspas não contam. */
  must_use?: string[];
  forbid?: string[];
}

export interface TestResult {
  name: string;
  ok: boolean;
  message?: string;
  hidden?: boolean;
}

export interface Report {
  results: TestResult[];
  logs: string[];
  /** Erro que impediu os testes de rodar, como erro de sintaxe. */
  error?: string;
  /** Regra do problema violada, como um termo proibido. */
  rule?: string;
  /** ts: erros de tipo. */
  types?: string[];
  /** tests: defeito que os testes do aluno não pegaram. */
  escaped?: string;
}

export const isAccepted = (report: Report) =>
  !report.error &&
  !report.rule &&
  !report.escaped &&
  !(report.types && report.types.length) &&
  report.results.length > 0 &&
  report.results.every((result) => result.ok);

export type Mode = 'run' | 'submit';
