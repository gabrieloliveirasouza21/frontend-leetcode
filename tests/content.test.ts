import { describe, expect, it } from 'vitest';
import { practice, problems, sections, topicProblemSlugs } from '../src/content';
import { checkRules } from '../src/judge/rules';

const KINDS = ['quiz', 'js', 'ts', 'dom', 'react', 'tests'];
const DIFFICULTIES = ['facil', 'medio', 'dificil'];

describe('conteúdo', () => {
  it('não repete slugs', () => {
    const slugs = problems.map((p) => p.slug);
    expect(slugs.filter((slug, i) => slugs.indexOf(slug) !== i)).toEqual([]);
  });

  it('coloca cada problema em algum lugar da trilha', () => {
    const placed = new Set([...sections.flatMap((s) => s.topics), ...practice].flatMap(topicProblemSlugs));
    expect(problems.filter((p) => !placed.has(p.slug)).map((p) => p.slug)).toEqual([]);
  });

  it('não deixa tópico nem subtópico vazio', () => {
    const empty: string[] = [];
    for (const topic of [...sections.flatMap((s) => s.topics), ...practice]) {
      if (topicProblemSlugs(topic).length === 0) empty.push(topic.id);
      for (const subtopic of topic.subtopics) if (subtopic.problems.length === 0) empty.push(`${topic.id}/${subtopic.name}`);
    }
    expect(empty).toEqual([]);
  });

  it.each(problems.map((p) => [p.slug, p] as const))('%s tem os campos do seu tipo', (_, problem) => {
    expect(KINDS).toContain(problem.kind);
    expect(DIFFICULTIES).toContain(problem.difficulty);
    expect(problem.title?.trim()).toBeTruthy();
    expect(problem.statement?.trim()).toBeTruthy();
    expect(problem.explanation?.trim()).toBeTruthy();
    if (problem.kind === 'quiz') {
      expect(problem.solution).toBeUndefined();
      expect(problem.options!.length).toBeGreaterThanOrEqual(3);
      expect(problem.answer).toBeGreaterThanOrEqual(0);
      expect(problem.answer).toBeLessThan(problem.options!.length);
      for (const option of problem.options!) {
        expect(option.text?.trim()).toBeTruthy();
        expect(option.why?.trim()).toBeTruthy();
      }
      expect(new Set(problem.options!.map((o) => o.text)).size).toBe(problem.options!.length);
      return;
    }
    expect(problem.solution?.trim()).toBeTruthy();
    expect(problem.hints.length).toBeGreaterThan(0);
    if (problem.kind === 'dom') expect(['html', 'css', 'js']).toContain(problem.editor);
    if (problem.kind === 'tests') {
      expect(problem.implementation?.trim()).toBeTruthy();
      expect(problem.mutants!.length).toBeGreaterThan(0);
    } else {
      expect(problem.tests!.length).toBeGreaterThan(1);
      for (const test of problem.tests!) {
        expect(test.name?.trim()).toBeTruthy();
        expect(test.code?.trim()).toBeTruthy();
      }
    }
    if (problem.kind === 'ts') expect(problem.types?.trim()).toBeTruthy();
    // A solução respeita as regras do próprio problema.
    expect(checkRules(problem, problem.solution!)).toBeNull();
  });
});

describe('visualizações', () => {
  it('todo visual citado existe', async () => {
    const { VISUALS } = await import('../src/visuals');
    const missing = problems.filter((p) => p.visual && !VISUALS[p.visual]).map((p) => `${p.slug}: ${p.visual}`);
    expect(missing).toEqual([]);
  });
});

describe('regras', () => {
  const js = { kind: 'js' as const };
  it('ignora comentários e textos entre aspas', () => {
    expect(checkRules({ ...js, forbid: ['innerHTML'] }, '// innerHTML\nconst a = "innerHTML";')).toBeNull();
    expect(checkRules({ ...js, forbid: ['innerHTML'] }, 'el.innerHTML = x;')).not.toBeNull();
  });
  it('compara palavras inteiras', () => {
    expect(checkRules({ ...js, forbid: ['var'] }, 'const variavel = 1;')).toBeNull();
    expect(checkRules({ ...js, forbid: ['var'] }, 'var x = 1;')).not.toBeNull();
  });
  it('em HTML, olha os atributos', () => {
    const html = { kind: 'dom' as const, editor: 'html' as const, must_use: ['type="email"'] };
    expect(checkRules(html, '<input type="email">')).toBeNull();
    expect(checkRules(html, '<!-- type="email" --><input>')).not.toBeNull();
  });
});
