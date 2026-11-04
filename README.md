# Trilha Frontend

Plataforma estilo LeetCode organizada como uma trilha de estudo de frontend. São 296 exercícios de HTML, CSS, JavaScript, TypeScript, React, testes e conceitos, com correção automática no navegador, sem servidor. Cada exercício tem fontes para estudar, e os temas mais teóricos têm visualizações interativas em 2D e 3D.

## Rodar

```bash
npm install
npm run dev
npm test
npm run links
```

`npm test` abre um navegador de verdade com o Playwright: o Edge no Windows e o Chrome nos outros sistemas. Para usar outro navegador instalado, defina `BROWSER_CHANNEL`. Para rodar só alguns problemas, use `ONLY=slug1,slug2 npm test`.

`npm run links` confere se todos os links de estudo abrem. Ele fica fora do `npm test` porque depende da rede.

## Seções da trilha

- **Fundamentos, IA no desenvolvimento e Frontend avançado:** as seções, os tópicos e os subtópicos do roadmap, em `sections` no `content/roadmap.yaml`. HTML, CSS, JavaScript e Web APIs não têm subtópicos no roadmap, então os subtópicos desses quatro tópicos são desta trilha.
- **Como no trabalho:** Conserte e Implemente, em `practice` no mesmo arquivo. Os exercícios já começam com código no editor.

## Tipos de problema

| `kind` | O aluno escreve | Onde roda |
|---|---|---|
| `js` | Funções em JavaScript | Web Worker |
| `ts` | Funções e tipos em TypeScript. O compilador do TypeScript checa os tipos | Web Worker |
| `dom` | O HTML, o CSS ou o JavaScript de uma página, conforme `editor` | iframe isolado |
| `react` | Um componente `App` em JSX | iframe com React 18 |
| `tests` | Testes com `test` e `expect` | Web Worker |
| `quiz` | Nada: escolhe uma opção | — |

## Como a correção funciona

- **Testes:** cada teste é o corpo de uma função async com `expect`, no estilo do Vitest e do Jest, e `fn()` para funções espiãs. Os testes de página também têm `$`, `$$`, `css`, `rect`, `text`, `click`, `type`, `press`, `submit`, `tick` e `wait`. A biblioteca fica em `src/judge/runtime.js`.
- **Executar e Enviar:** Executar roda os testes visíveis. Enviar roda também os ocultos (`hidden: true`), que cobrem casos de borda, e confere as regras do problema.
- **Isolamento:** cada teste de página roda num iframe novo, com `sandbox`. Código em Worker é interrompido depois de 15 segundos.
- **Tipos:** em problemas `ts`, o trecho `types` é checado junto do código do aluno. Linhas com `@ts-expect-error` precisam dar erro, o que testa se o tipo recusa o que deve recusar.
- **Testes do aluno:** em problemas `tests`, os testes precisam passar em `implementation` e falhar em cada versão de `mutants`.

## Adicionar um problema

Crie um arquivo em `content/problems/`, com um problema ou uma lista deles. O campo `in` liga o problema à trilha, como `css/Flexbox`, ou só `auth-strategies` em tópico sem subtópicos. Nomes com vírgula precisam de aspas: `["html/Textos, listas e links"]`. Campos:

| Campo | Uso |
|---|---|
| `slug`, `title` | Identificação |
| `kind` | Tipo do problema, da tabela acima |
| `in` | Lugares na trilha, no formato `id-do-tópico/Nome do subtópico` |
| `difficulty` | `facil`, `medio` ou `dificil` |
| `statement` | Enunciado. Aceita `código` inline, listas com `- ` e blocos entre ``` |
| `editor` | Em `dom`: `html`, `css` ou `js`, a parte que o aluno edita |
| `html`, `css`, `js` | Em `dom` e `react`: as partes da página que o problema já dá |
| `tailwind` | Em `dom`: carrega o Tailwind CSS na página |
| `setup` | Código que roda antes do código do aluno, como dados ou um `fetch` falso |
| `tests` | Lista de `name`, `code`, `hidden` e `width`, a largura da página em pixels |
| `types` | Em `ts`: trecho checado com o código do aluno |
| `implementation`, `mutants`, `min_tests` | Em `tests`: o código certo, as versões com defeito e o mínimo de testes |
| `starter` | Opcional. Código que já vem no editor. O autoteste exige que ele seja reprovado |
| `must_use`, `forbid` | Opcional. Termos exigidos ou proibidos no código enviado. Comentários e, em JS e CSS, textos entre aspas não contam |
| `solution` | Solução de referência |
| `hints`, `explanation` | Dicas progressivas e solução comentada |
| `traps` | Respostas erradas comuns, com `reason` e `code`, que o corretor precisa reprovar |
| `options`, `answer` | Só em `quiz`. Lista de `text` e `why`, e o índice da resposta certa |
| `visual` | Opcional. Visualização interativa mostrada depois do enunciado, pelo id em `src/visuals/index.tsx` |
| `study` | Obrigatório. Lista de `label` e `url` com fontes para estudar este exercício, mostradas antes das fontes do tópico |

## Revisão espaçada

A tela Revisar (`#/revisao`) mostra os problemas que venceram e as próximas revisões, e o topo do site mostra quantos estão pendentes. A lógica fica em `src/review.ts`:

- a primeira resposta de cada abertura do problema conta: a primeira opção escolhida numa questão, ou a primeira entrega num exercício de código
- acertou, o problema vai para o próximo intervalo: 10 min, 1 hora, 5 horas, 10 horas, 1 dia, 3 dias, 1 semana, 1 mês, 3 meses e 6 meses
- errou, volta para 10 min

O histórico fica no `localStorage`, como o progresso.

## Fontes de estudo

Todo exercício tem pelo menos uma fonte própria em `study`, e o teste de conteúdo falha sem ela. Nos problemas conceituais, as fontes aparecem antes das opções, para a pessoa estudar antes de responder. Prefira o MDN em português e use a versão em inglês quando a página não tiver tradução, avisando no rótulo, como `(MDN, em inglês)`.

## Visualizações

Temas teóricos ganham visualizações interativas em `src/visuals/`, carregadas só quando o problema abre. Um mesmo id pode servir a vários problemas.

- **Passo a passo**, com o componente `Stepper`. Antes de alguns passos, a pessoa prevê o que vai acontecer e só depois vê: `dns`, `pacotes`, `renderizacao`, `assincrono`, `event-loop`, `eventos`, `git` e `renderizacao-servidor`.
- **Diagramas de sequência**, com o `SequenceDiagram`: `cors`, `cache-http`, `service-worker` e `agente`.
- **Laboratórios**, em que a pessoa mexe nos valores: `especificidade`, `flexbox` e `box-model`.
- **Cenas 3D** com Three.js: `empilhamento`, para contextos de empilhamento, e `composicao`, para camadas de composição em animações.

Para criar uma, escreva o componente em `src/visuals/`, registre o id em `VISUALS` e use `visual: <id>` no problema. Um teste confere que todo id citado existe.

`npm test` valida o conteúdo e roda o autoteste (`selftest.html`) no navegador: cada solução passa, cada armadilha e cada código inicial é reprovado. Uma armadilha aprovada indica que falta um teste oculto. O teste também falha se um problema ficar fora da trilha ou se um tópico ou subtópico ficar sem problema.

## Limitações conhecidas

- **Laço infinito em páginas:** código em Worker é interrompido, mas um laço infinito num problema `dom` ou `react` trava a aba. O rascunho fica salvo, então recarregar a página resolve.
- **Hover e foco visual:** os testes de página não simulam o mouse em cima. Regras de `:hover` são conferidas pelo CSSOM.
- **Frameworks além do React:** Vue, Angular, Svelte, Solid e os temas de SSR, SSG, deploy, desktop e mobile são cobertos por problemas conceituais, porque rodar esses ambientes no navegador exigiria um servidor.
- **Respostas no cliente:** soluções e testes ocultos vão no bundle. Um ranking confiável exigiria correção no servidor.
- **Progresso:** fica no `localStorage`, sem conta de usuário.

## Conteúdo e licença

A licença do [roadmap.sh](https://roadmap.sh/frontend) permite só uso pessoal do conteúdo e compartilhamento de links. Este projeto reproduz os nomes e a organização das seções, tópicos e subtópicos do roadmap de frontend, com crédito e link. Enunciados, testes e explicações são originais. Reproduzir a organização pode exigir autorização, então confirme com o autor antes de divulgar o projeto. Não copie textos nem imagens do roadmap.sh, nem de sites que ele indica.
