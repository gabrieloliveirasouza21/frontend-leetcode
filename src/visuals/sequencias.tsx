// Visualizações em forma de diagrama de sequência: quem manda o quê para quem, passo a passo.
import { SequenceDiagram, type SequenceStep } from './Sequence';

const CORS: SequenceStep[] = [
  {
    title: 'O site chama outra origem',
    text: 'O JavaScript de `https://ruido.com.br` faz um `fetch` com `PUT` e corpo JSON para `https://api.ruido.com.br`. É outra origem, porque o domínio é diferente.',
    messages: [{ from: 0, to: 0, label: "fetch(api, { method: 'PUT' })" }],
  },
  {
    title: 'O preflight',
    text: 'Como é um `PUT` com JSON, o navegador pergunta antes, com uma requisição `OPTIONS`. Ela diz a origem e o método que o site quer usar.',
    predict: {
      question: 'o pedido é um `PUT` com JSON para outra origem. O que o navegador envia primeiro?',
      options: [
        { text: 'Um `OPTIONS` perguntando se a origem e o método são permitidos', why: 'Pedidos que não são simples passam por um preflight antes do pedido real.' },
        { text: 'O `PUT` direto, e confere a resposta depois', why: 'Isso acontece em pedidos simples, como um GET sem cabeçalhos especiais. Um PUT com JSON pede permissão antes.' },
        { text: 'Nada, porque o navegador bloqueia qualquer outra origem', why: 'O navegador permite, desde que o servidor autorize pelos cabeçalhos de CORS.' },
      ],
      answer: 0,
    },
    messages: [{ from: 0, to: 1, label: 'OPTIONS /bandas', detail: 'Origin: ruido.com.br · Access-Control-Request-Method: PUT' }],
  },
  {
    title: 'A API responde sem autorizar',
    text: 'A API responde 200, mas sem `Access-Control-Allow-Origin`. O navegador entende que a origem não foi autorizada.',
    messages: [{ from: 1, to: 0, label: '200 OK', detail: 'sem Access-Control-Allow-Origin', tone: 'bad' }],
  },
  {
    title: 'Bloqueado pelo navegador',
    text: 'O `PUT` nem é enviado e o `fetch` rejeita com erro de CORS. Quem bloqueia é o navegador, não o servidor.',
    messages: [{ from: 0, to: 0, label: 'TypeError: blocked by CORS policy', tone: 'bad' }],
  },
  {
    title: 'Com a API configurada',
    text: 'Depois da correção, a API responde ao preflight com a origem, os métodos e os cabeçalhos permitidos.',
    messages: [
      { from: 0, to: 1, label: 'OPTIONS /bandas', detail: 'Origin: ruido.com.br' },
      { from: 1, to: 0, label: '204 No Content', detail: 'Allow-Origin: https://ruido.com.br · Allow-Methods: PUT', tone: 'ok' },
    ],
  },
  {
    title: 'O pedido real',
    text: 'Agora o navegador envia o `PUT`. A resposta também traz `Access-Control-Allow-Origin`, e o JavaScript consegue ler o corpo.',
    messages: [
      { from: 0, to: 1, label: 'PUT /bandas', detail: 'Content-Type: application/json' },
      { from: 1, to: 0, label: '200 OK', detail: 'Access-Control-Allow-Origin: https://ruido.com.br', tone: 'ok' },
    ],
  },
];

export function Cors() {
  return <SequenceDiagram id="cors" actors={['ruido.com.br', 'api.ruido.com.br']} steps={CORS} />;
}

const CACHE: SequenceStep[] = [
  {
    title: 'Primeira visita',
    text: 'O navegador baixa o HTML e o JavaScript. O HTML vem com `no-cache`, e o arquivo com hash no nome vem com cache de um ano e `immutable`.',
    messages: [
      { from: 0, to: 2, label: 'GET /index.html' },
      { from: 2, to: 0, label: '200 · Cache-Control: no-cache', detail: 'ETag: "v1" · aponta para app.3f9a.js' },
      { from: 0, to: 2, label: 'GET /app.3f9a.js' },
      { from: 2, to: 0, label: '200 · max-age=31536000, immutable' },
    ],
    notes: [{ actor: 1, text: 'guardou index.html e app.3f9a.js' }],
  },
  {
    title: 'O HTML é revalidado',
    text: 'Na volta, o navegador pergunta se o HTML mudou, mandando a ETag que tem. Sem mudança, o servidor responde `304`, sem corpo.',
    messages: [
      { from: 0, to: 2, label: 'GET /index.html', detail: 'If-None-Match: "v1"' },
      { from: 2, to: 0, label: '304 Not Modified', tone: 'ok' },
    ],
    notes: [{ actor: 1, text: 'usa o index.html guardado', tone: 'ok' }],
  },
  {
    title: 'O JavaScript nem sai do cache',
    text: 'O arquivo com hash ainda está dentro do `max-age`, então o navegador usa a cópia guardada, sem nenhuma requisição.',
    predict: {
      question: 'na segunda visita, o navegador pede o `app.3f9a.js` ao servidor de novo?',
      options: [
        { text: 'Não, usa a cópia do cache sem perguntar nada', why: 'Dentro do max-age, a resposta guardada vale. E immutable diz que ela nunca muda.' },
        { text: 'Sim, sempre baixa tudo de novo', why: 'Isso desperdiçaria o cache. O cabeçalho permite reutilizar o arquivo por um ano.' },
        { text: 'Pergunta com If-None-Match, como no HTML', why: 'O HTML é revalidado porque tem no-cache. O arquivo com hash não precisa.' },
      ],
      answer: 0,
    },
    messages: [{ from: 0, to: 1, label: 'app.3f9a.js do cache', tone: 'ok' }],
  },
  {
    title: 'Depois do deploy',
    text: 'O deploy gera `app.7c21.js` e um HTML novo apontando para ele. A revalidação do HTML traz a versão nova, que pede o arquivo novo. O antigo nunca é usado por engano.',
    messages: [
      { from: 0, to: 2, label: 'GET /index.html', detail: 'If-None-Match: "v1"' },
      { from: 2, to: 0, label: '200 · ETag: "v2"', detail: 'aponta para app.7c21.js' },
      { from: 0, to: 2, label: 'GET /app.7c21.js' },
      { from: 2, to: 0, label: '200 · max-age=31536000, immutable' },
    ],
    notes: [{ actor: 1, text: 'app.3f9a.js fica sem uso' }],
  },
];

export function CacheHttp() {
  return <SequenceDiagram id="cache" actors={['Navegador', 'Cache do navegador', 'Servidor']} steps={CACHE} />;
}

const AGENTE: SequenceStep[] = [
  {
    title: 'A pergunta',
    text: 'A pessoa pergunta algo que o modelo não sabe sozinho. O programa manda a conversa ao modelo junto com a lista de ferramentas disponíveis.',
    messages: [
      { from: 0, to: 1, label: 'Que horas toca o Vórtice?' },
      { from: 1, to: 2, label: 'mensagens + ferramentas: [horario]' },
    ],
  },
  {
    title: 'O modelo pede uma ferramenta',
    text: 'Em vez de responder, o modelo pede para usar `horario` com a entrada `{ banda: "Vórtice" }`. Quem executa é o programa, não o modelo.',
    messages: [{ from: 2, to: 1, label: 'usar horario', detail: '{ banda: "Vórtice" }' }],
  },
  {
    title: 'O programa executa',
    text: 'O programa confere se a ferramenta está na lista, executa e devolve o resultado ao modelo como mais uma mensagem.',
    messages: [
      { from: 1, to: 3, label: 'horario({ banda: "Vórtice" })' },
      { from: 3, to: 1, label: '"22h"', tone: 'ok' },
      { from: 1, to: 2, label: 'resultado: "22h"' },
    ],
  },
  {
    title: 'A resposta final',
    text: 'Com o resultado no contexto, o modelo responde. O laço termina porque veio uma resposta, não um pedido de ferramenta.',
    messages: [
      { from: 2, to: 1, label: 'resposta: Toca às 22h', tone: 'ok' },
      { from: 1, to: 0, label: 'Toca às 22h' },
    ],
  },
  {
    title: 'Um pedido fora da lista',
    text: 'Se o modelo pedir algo que não existe, como `apagarTudo`, o programa não executa nada e devolve um erro ao modelo. Os limites ficam no código.',
    predict: {
      question: 'o modelo pede a ferramenta `apagarTudo`, que não está na lista. O que o programa deve fazer?',
      options: [
        { text: 'Recusar e devolver um erro ao modelo, sem executar nada', why: 'O programa é quem decide o que roda. O modelo só sugere.' },
        { text: 'Executar, porque o modelo sabe o que faz', why: 'O modelo pode errar ou ser manipulado por um texto malicioso. Executar qualquer pedido é perigoso.' },
        { text: 'Encerrar o programa com erro', why: 'Devolver o erro ao modelo deixa ele tentar outro caminho, sem derrubar a conversa.' },
      ],
      answer: 0,
    },
    messages: [
      { from: 2, to: 1, label: 'usar apagarTudo', tone: 'bad' },
      { from: 1, to: 2, label: 'erro: ferramenta desconhecida', tone: 'muted' },
    ],
  },
];

export function Agente() {
  return <SequenceDiagram id="agente" actors={['Pessoa', 'Programa (laço)', 'Modelo', 'Ferramenta']} steps={AGENTE} />;
}

const SW: SequenceStep[] = [
  {
    title: 'A instalação',
    text: 'Na primeira visita, a página registra o service worker. No evento `install`, ele guarda a programação e os arquivos do site no Cache Storage.',
    messages: [
      { from: 0, to: 1, label: "register('/sw.js')" },
      { from: 1, to: 3, label: 'GET /programacao.json, /app.js…' },
      { from: 1, to: 2, label: 'cache.addAll([...])', tone: 'ok' },
    ],
    notes: [{ actor: 2, text: 'programação guardada', tone: 'ok' }],
  },
  {
    title: 'Online: rede primeiro',
    text: 'Com internet, o service worker intercepta o pedido, busca na rede e atualiza o cache com a resposta mais nova.',
    messages: [
      { from: 0, to: 1, label: 'fetch /programacao.json' },
      { from: 1, to: 3, label: 'GET /programacao.json' },
      { from: 3, to: 1, label: '200', tone: 'ok' },
      { from: 1, to: 2, label: 'cache.put(...)' },
      { from: 1, to: 0, label: 'resposta da rede', tone: 'ok' },
    ],
  },
  {
    title: 'Offline: o cache responde',
    text: 'Sem sinal, a rede falha. O service worker captura a falha e responde com a cópia guardada, e a página abre normalmente.',
    predict: {
      question: 'o sinal caiu e a página pede a programação. O que a fã vê?',
      options: [
        { text: 'A programação guardada, vinda do cache', why: 'O service worker trata a falha de rede e responde com o que guardou.' },
        { text: 'A página de erro do navegador', why: 'Isso aconteceria sem service worker. Com ele, a requisição passa pelo seu código antes.' },
        { text: 'Uma página em branco até o sinal voltar', why: 'O service worker responde na hora com o cache, sem esperar a rede.' },
      ],
      answer: 0,
    },
    messages: [
      { from: 0, to: 1, label: 'fetch /programacao.json' },
      { from: 1, to: 3, label: 'GET /programacao.json' },
      { from: 3, to: 1, label: 'falha de rede', tone: 'bad' },
      { from: 1, to: 2, label: 'cache.match(...)' },
      { from: 2, to: 1, label: 'cópia guardada', tone: 'ok' },
      { from: 1, to: 0, label: 'resposta do cache', tone: 'ok' },
    ],
  },
];

export function ServiceWorker() {
  return <SequenceDiagram id="sw" actors={['Página', 'Service worker', 'Cache Storage', 'Rede']} steps={SW} />;
}
