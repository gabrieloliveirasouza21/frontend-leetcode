// Checagem de tipos com o compilador do TypeScript, carregado só quando um problema ts é corrigido.
import ts from 'typescript';

// Só as bibliotecas da linguagem: os problemas de tipos não usam o DOM.
const libLoaders = import.meta.glob<string>(
  ['../../node_modules/typescript/lib/lib.es5.d.ts', '../../node_modules/typescript/lib/lib.es20*.d.ts', '../../node_modules/typescript/lib/lib.decorators*.d.ts'],
  { query: '?raw', import: 'default' },
);

let libs: Promise<Map<string, ts.SourceFile>> | null = null;

function loadLibs() {
  libs ??= Promise.all(
    Object.entries(libLoaders).map(async ([path, load]) => {
      const name = path.slice(path.lastIndexOf('/') + 1);
      return [name, ts.createSourceFile(name, await load(), ts.ScriptTarget.ES2022)] as const;
    }),
  ).then((entries) => new Map(entries));
  return libs;
}

const MAIN = 'solucao.ts';

/** Erros de tipo do código do aluno junto do trecho do problema. Vazio quando está tudo certo. */
export async function typeErrors(code: string, checks: string): Promise<string[]> {
  const libFiles = await loadLibs();
  const userLines = code.split('\n').length;
  const text = `${code}\n\n// ---- checagens do problema ----\n${checks}\n`;
  const main = ts.createSourceFile(MAIN, text, ts.ScriptTarget.ES2022, true);
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts'],
    types: [],
    noUnusedLocals: false,
  };
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === MAIN ? main : libFiles.get(name)),
    getDefaultLibFileName: () => 'lib.es2022.d.ts',
    writeFile: () => undefined,
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    fileExists: (name) => name === MAIN || libFiles.has(name),
    readFile: () => undefined,
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  };
  const program = ts.createProgram([MAIN], options, host);
  const lines = text.split('\n');
  return ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file?.fileName === MAIN)
    .map((d) => {
      const { line } = d.file!.getLineAndCharacterOfPosition(d.start ?? 0);
      const message = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      if (d.code === 2578) {
        // Linha marcada com @ts-expect-error que não deu erro: o tipo do aluno aceita algo que devia recusar.
        const checked = lines[line + 1]?.trim() ?? '';
        return `O tipo aceitou um uso que devia recusar: ${checked}`;
      }
      const where = line < userLines ? `Linha ${line + 1} do seu código` : `Na checagem "${lines[line].trim()}"`;
      return `${where}: ${message}`;
    });
}
