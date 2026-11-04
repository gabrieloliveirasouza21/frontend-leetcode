import { parse } from 'yaml';
import roadmapRaw from '../content/roadmap.yaml?raw';
import type { JudgedProblem } from './judge/types';

export type Difficulty = 'facil' | 'medio' | 'dificil';

export interface QuizOption {
  text: string;
  /** Por que essa opção está certa ou errada. Aparece depois de responder. */
  why: string;
}

export interface Problem extends JudgedProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** Lugares na trilha, como `css/Flexbox` ou `auth-strategies`. */
  in: string[];
  statement: string;
  /** Código que já vem no editor. */
  starter?: string;
  /** Solução de referência. Problemas quiz não têm. */
  solution?: string;
  hints: string[];
  explanation: string;
  /** Respostas erradas comuns que o corretor precisa reprovar. */
  traps: { reason: string; code: string }[];
  options?: QuizOption[];
  answer?: number;
  /** Fontes para estudar este problema, mostradas antes das do tópico. */
  study: { label: string; url: string }[];
  /** Visualização interativa mostrada depois do enunciado, pelo id em src/visuals. */
  visual?: string;
}

export interface Subtopic {
  name: string;
  /** Agrupador do roadmap, como React dentro de SSR. */
  group?: string;
  problems: string[];
}

export interface Topic {
  id: string;
  title: string;
  summary: string;
  study: { label: string; url: string }[];
  /** Problemas ligados direto ao tópico, quando ele não tem subtópicos. */
  problems?: string[];
  subtopics: Subtopic[];
}

export interface Section {
  id: string;
  title: string;
  summary?: string;
  topics: Topic[];
}

const files = import.meta.glob<string>('../content/problems/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const roadmap = parse(roadmapRaw) as { sections: Section[]; practice: Topic[] };

/** Partes do roadmap, como Fundamentos e Frontend avançado. */
export const sections: Section[] = roadmap.sections;
for (const section of sections) for (const topic of section.topics) topic.subtopics ??= [];

/** Seções por tipo de trabalho, fora do roadmap. */
export const practice: Topic[] = roadmap.practice;
for (const topic of practice) topic.subtopics ??= [];

export const topics: Topic[] = sections.flatMap((section) => section.topics);
const allTopics = [...topics, ...practice];

// Um arquivo pode trazer um problema ou uma lista deles.
const loaded = Object.values(files).flatMap((raw) => parse(raw) as Problem | Problem[]);
for (const problem of loaded) {
  problem.hints ??= [];
  problem.traps ??= [];
  problem.study ??= [];
}

// Só a primeira barra separa tópico de subtópico.
for (const problem of loaded) {
  for (const place of problem.in ?? []) {
    const slash = place.indexOf('/');
    const topicId = slash === -1 ? place : place.slice(0, slash);
    const subtopicName = slash === -1 ? '' : place.slice(slash + 1);
    const topic = allTopics.find((t) => t.id === topicId);
    const target = subtopicName ? topic?.subtopics.find((s) => s.name === subtopicName) : topic;
    if (!target) throw new Error(`${problem.slug}: lugar desconhecido na trilha: ${place}`);
    (target.problems ??= []).push(problem.slug);
  }
}

// Dentro de cada lista, do mais fácil para o mais difícil.
const DIFFICULTY_RANK: Record<Difficulty, number> = { facil: 0, medio: 1, dificil: 2 };
const difficultyOf = new Map(loaded.map((p) => [p.slug, DIFFICULTY_RANK[p.difficulty]]));
const byDifficulty = (a: string, b: string) => (difficultyOf.get(a) ?? 0) - (difficultyOf.get(b) ?? 0);
for (const topic of allTopics) {
  topic.problems?.sort(byDifficulty);
  for (const subtopic of topic.subtopics) subtopic.problems.sort(byDifficulty);
}

/** Todos os problemas de um tópico, sem repetir. */
export function topicProblemSlugs(topic: Topic): string[] {
  return [...new Set([...(topic.problems ?? []), ...topic.subtopics.flatMap((s) => s.problems)])];
}

const roadmapOrder = [...new Set(allTopics.flatMap(topicProblemSlugs))];
const rank = (slug: string) => {
  const index = roadmapOrder.indexOf(slug);
  return index === -1 ? roadmapOrder.length : index;
};

export const problems: Problem[] = [...loaded].sort((a, b) => rank(a.slug) - rank(b.slug));

/** Tópico em que o problema aparece primeiro. */
export const topicOf = (slug: string) => allTopics.find((topic) => topicProblemSlugs(topic).includes(slug));

/** Nomes dos subtópicos em que o problema aparece. */
export function subtopicNames(slug: string): string[] {
  return [...new Set(allTopics.flatMap((topic) => topic.subtopics.filter((s) => s.problems.includes(slug)).map((s) => s.name)))];
}

export const KIND_LABEL: Record<string, string> = {
  quiz: 'Conceito',
  js: 'JavaScript',
  ts: 'TypeScript',
  dom: 'Página',
  react: 'React',
  tests: 'Testes',
};
