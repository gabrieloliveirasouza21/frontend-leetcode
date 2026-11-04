import type { ReactNode } from 'react';
import { topicOf } from './content';

/** Renderiza `código` inline: enunciados são texto simples, sem Markdown completo. */
export function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}

/** Um parágrafo de texto, ou uma lista quando todas as linhas começam com `- ` ou `1. `. */
function Block({ text }: { text: string }) {
  const lines = text.trim().split('\n').map((line) => line.trim());
  if (lines.every((line) => line.startsWith('- '))) {
    return <ul className="statement-list">{lines.map((line, i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
  }
  if (lines.every((line) => /^\d+\.\s/.test(line))) {
    return <ol className="statement-list">{lines.map((line, i) => <li key={i}>{inline(line.replace(/^\d+\.\s/, ''))}</li>)}</ol>;
  }
  return <p>{inline(text)}</p>;
}

/** Parágrafos separados por linha em branco. Blocos entre ``` viram código. */
export function Paragraphs({ text }: { text: string }) {
  const blocks = text.trim().split(/(```[\s\S]*?```)/g).filter((block) => block.trim());
  return (
    <>
      {blocks.flatMap((block, b) =>
        block.startsWith('```')
          ? [<pre key={b} className="schema">{block.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')}</pre>]
          : block.trim().split(/\n\s*\n/).map((paragraph, i) => <Block key={`${b}-${i}`} text={paragraph} />),
      )}
    </>
  );
}

export interface StudyLink {
  label: string;
  url: string;
}

/** Fontes do próprio problema primeiro, depois as do tópico, sem repetir. */
export function StudyLinks({ problem }: { problem: { slug: string; study?: StudyLink[] } }) {
  const topic = topicOf(problem.slug);
  const links = [...(problem.study ?? []), ...(topic?.study ?? [])].filter((link, i, all) => all.findIndex((l) => l.url === link.url) === i);
  return (
    <ul className="study">
      {links.map((link) => (
        <li key={link.url}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>
      ))}
    </ul>
  );
}
