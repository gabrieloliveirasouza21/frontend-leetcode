// Monta e roda as páginas dos problemas dom e react, cada teste num iframe novo.
import runtimeSource from './runtime.js?raw';
import type { JudgedProblem } from './types';

// Caminhos relativos porque o campo exports desses pacotes não expõe os arquivos UMD.
const reactSources = () =>
  Promise.all([
    import('../../node_modules/react/umd/react.production.min.js?raw').then((m) => m.default as string),
    import('../../node_modules/react-dom/umd/react-dom.production.min.js?raw').then((m) => m.default as string),
  ]);
const tailwindSource = () =>
  import('../../node_modules/@tailwindcss/browser/dist/index.global.js?raw').then((m) => m.default as string);

const TEST_TIMEOUT_MS = 5000;

/** Evita que um `</script>` no código feche a tag que o envolve. */
const safe = (code: string) => code.replace(/<\/(script)/gi, '<\\/$1');

/** Transforma JSX em React.createElement e tira os imports, que o iframe não resolve. */
async function compileReact(code: string): Promise<string> {
  const { transform } = await import('sucrase');
  const withoutModules = code
    .replace(/^\s*import\s[^;\n]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+(?=(async\s+)?function|class)/gm, '')
    .replace(/^\s*export\s+default\s+\w+;?\s*$/gm, '')
    .replace(/^\s*export\s+(?=(const|let|var|function|class)\b)/gm, '');
  return transform(withoutModules, { transforms: ['jsx', 'typescript'], jsxRuntime: 'classic', production: true }).code;
}

const REACT_PRELUDE =
  'const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext, Fragment, memo, useId, useLayoutEffect } = React;\n';

const REACT_MOUNT = `
;(function () {
  if (typeof App !== 'function') throw new Error('Defina um componente chamado App.');
  window.__root = ReactDOM.createRoot(document.getElementById('root'));
  ReactDOM.flushSync(function () { window.__root.render(React.createElement(App)); });
})();`;

export interface BuiltPage {
  head: string;
  body: string;
}

/** Junta as partes da página: as que o problema dá e a que o aluno escreveu. */
export async function buildPage(problem: JudgedProblem, code: string): Promise<BuiltPage> {
  const part = (name: 'html' | 'css' | 'js') => (problem.kind === 'dom' && (problem.editor ?? 'html') === name ? code : problem[name] ?? '');
  // Sem meta viewport: problemas de metadados conferem a do aluno.
  const head: string[] = ['<meta charset="utf-8">'];
  head.push(`<script>${safe(runtimeSource)}</script>`);
  // Erros do código da página são guardados e mostrados no resultado do teste.
  head.push(
    '<script>window.__errors=[];addEventListener("error",function(e){__errors.push(e.message||String(e.error))});addEventListener("unhandledrejection",function(e){__errors.push("Promise rejeitada: "+(e.reason&&e.reason.message||e.reason))});</script>',
  );
  if (problem.tailwind) head.push(`<script>${safe(await tailwindSource())}</script>`);
  head.push('<style>body{font-family:system-ui,sans-serif;margin:8px}</style>');
  const css = part('css');
  if (css) head.push(`<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);

  let body = part('html');
  let script = part('js');
  if (problem.kind === 'react') {
    const [react, reactDom] = await reactSources();
    head.push(`<script>${safe(react)}</script>`, `<script>${safe(reactDom)}</script>`);
    body = `${problem.html ?? ''}<div id="root"></div>`;
    script = REACT_PRELUDE + (await compileReact(code)) + REACT_MOUNT;
  }
  // setup roda antes do código da página, por exemplo para trocar fetch por dados fixos.
  if (problem.setup) body += `\n<script>\n${safe(problem.setup)}\n</script>`;
  if (script) body += `\n<script>\n${safe(script)}\n</script>`;
  return { head: head.join('\n'), body };
}

/** Documento completo. Se o aluno escreveu <head> ou <body>, as partes dele são mantidas. */
export function documentOf(page: BuiltPage, extra = ''): string {
  const doctype = '<!doctype html>';
  let source = page.body.replace(/<!doctype[^>]*>/i, '');
  // O teste entra no fim do body, depois dos scripts da página.
  source = /<\/body>/i.test(source) ? source.replace(/<\/body>/i, () => `${extra}</body>`) : source + extra;
  if (/<head[\s>]/i.test(source)) return doctype + source.replace(/<head([^>]*)>/i, (_, attrs) => `<head${attrs}>\n${page.head}\n`);
  if (/<body[\s>]/i.test(source)) return `${doctype}<html><head>${page.head}</head>${source.replace(/<\/?html[^>]*>/gi, '')}</html>`;
  return `${doctype}<html lang="pt-BR"><head>${page.head}</head><body>${source}</body></html>`;
}

function harness(nonce: string, testCode: string, width: number): string {
  return `<script>
(function () {
  var nonce = ${JSON.stringify(nonce)};
  var code = ${JSON.stringify(testCode).replace(/<\//g, '<\\/')};
  var width = ${width};
  function send(result) { parent.postMessage(Object.assign({ nonce: nonce }, result), '*'); }
  // O iframe isolado pode receber o tamanho depois do load. Sem isso, o layout sai com largura 0.
  function sized() {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function check() {
        if (innerWidth === width || Date.now() - start > 3000) resolve();
        else setTimeout(check, 10);
      })();
    });
  }
  function start() {
    sized().then(__rt.dom.frame).then(function () {
      var run;
      try {
        run = Function.apply(null, __rt.names.concat('return (async function () {\\n' + code + '\\n})();'));
      } catch (error) {
        send({ ok: false, message: 'Erro no teste: ' + __rt.messageOf(error) });
        return;
      }
      run.apply(null, __rt.values).then(function () {
        if (__errors.length) send({ ok: false, message: 'Erro na página: ' + __errors[0] });
        else send({ ok: true });
      }, function (error) {
        var message = __rt.messageOf(error);
        if (__errors.length) message += ' (Erro na página: ' + __errors[0] + ')';
        send({ ok: false, message: message });
      });
    });
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
</script>`;
}

let host: HTMLDivElement | null = null;
function container() {
  if (host && document.body.contains(host)) return host;
  host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // Na tela, mas invisível: o Chrome pode pular o layout de iframes fora da área visível.
  host.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;opacity:0;z-index:-1;';
  document.body.appendChild(host);
  return host;
}

export const SANDBOX = 'allow-scripts allow-forms';

/** Roda um teste numa página nova e devolve o resultado. */
export function runInFrame(page: BuiltPage, testCode: string, width = 1000): Promise<{ ok: boolean; message?: string }> {
  const nonce = Math.random().toString(36).slice(2);
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', SANDBOX);
  frame.style.cssText = `width:${width}px;height:700px;border:0;`;
  let loads = 0;
  return new Promise<{ ok: boolean; message?: string }>((resolve) => {
    const finish = (result: { ok: boolean; message?: string }) => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      frame.remove();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ ok: false, message: `O teste passou de ${TEST_TIMEOUT_MS / 1000} segundos sem terminar.` }),
      TEST_TIMEOUT_MS,
    );
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow || event.data?.nonce !== nonce) return;
      finish({ ok: event.data.ok, message: event.data.message });
    };
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', () => {
      loads++;
      // Um formulário enviado sem preventDefault recarrega a página e o teste se perde.
      if (loads > 1) finish({ ok: false, message: 'A página recarregou durante o teste. Faltou chamar preventDefault() no envio do formulário?' });
    });
    frame.srcdoc = documentOf(page, harness(nonce, testCode, width));
    container().appendChild(frame);
  });
}
