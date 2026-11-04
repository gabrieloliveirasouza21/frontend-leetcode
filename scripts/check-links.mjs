// Confere se todos os links de estudo abrem. Fica fora do `npm test` porque depende da rede.
// Uso: npm run links
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';

const urls = new Set();
const collect = (study) => study?.forEach((link) => urls.add(link.url));

for (const file of readdirSync('content/problems')) {
  const parsed = parse(readFileSync(`content/problems/${file}`, 'utf8'));
  for (const problem of [parsed].flat()) collect(problem.study);
}
const roadmap = parse(readFileSync('content/roadmap.yaml', 'utf8'));
for (const topic of [...roadmap.sections.flatMap((s) => s.topics), ...roadmap.practice]) collect(topic.study);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const list = [...urls];
const broken = [];
for (let i = 0; i < list.length; i += 12) {
  await Promise.all(
    list.slice(i, i + 12).map(async (url) => {
      try {
        const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) });
        if (!response.ok) broken.push(`${response.status} ${url}`);
      } catch (error) {
        broken.push(`erro ${url}: ${error.message}`);
      }
    }),
  );
}
console.log(`${list.length} links, ${broken.length} com problema`);
for (const line of broken) console.log(line);
process.exitCode = broken.length ? 1 : 0;
