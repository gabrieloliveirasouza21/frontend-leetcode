import { Component, lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactNode } from 'react';
import './visuals.css';

/** Uma visualização que falha, por exemplo sem rede para baixar o módulo, não derruba o problema. */
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p className="muted">Não foi possível carregar a visualização. Recarregue a página para tentar de novo.</p> : this.props.children;
  }
}

interface VisualEntry {
  title: string;
  /** Carregada só quando o problema é aberto. O Three.js fica fora do bundle principal. */
  component: LazyExoticComponent<ComponentType>;
}

const sequence = (name: 'Cors' | 'CacheHttp' | 'Agente' | 'ServiceWorker') =>
  lazy(() => import('./sequencias').then((m) => ({ default: m[name] })));

/** Visualizações que um problema pode usar com o campo `visual`. */
export const VISUALS: Record<string, VisualEntry> = {
  dns: { title: 'Uma consulta de DNS, passo a passo', component: lazy(() => import('./Dns')) },
  pacotes: { title: 'Pacotes atravessando a rede', component: lazy(() => import('./Pacotes')) },
  renderizacao: { title: 'Do HTML aos pixels', component: lazy(() => import('./Render')) },
  assincrono: { title: 'Três pedidos na linha do tempo', component: lazy(() => import('./Async')) },
  'event-loop': { title: 'O laço de eventos', component: lazy(() => import('./EventLoop')) },
  eventos: { title: 'O caminho de um clique', component: lazy(() => import('./Eventos')) },
  especificidade: { title: 'Calculadora de especificidade', component: lazy(() => import('./Specificity')) },
  flexbox: { title: 'Laboratório de Flexbox', component: lazy(() => import('./Flexbox')) },
  'box-model': { title: 'Laboratório do box model', component: lazy(() => import('./BoxModel')) },
  git: { title: 'O histórico do Git como grafo', component: lazy(() => import('./Git')) },
  cors: { title: 'Uma requisição entre origens', component: sequence('Cors') },
  'cache-http': { title: 'Cache HTTP em três visitas', component: sequence('CacheHttp') },
  'service-worker': { title: 'O service worker entre a página e a rede', component: sequence('ServiceWorker') },
  agente: { title: 'O laço de um agente', component: sequence('Agente') },
  'renderizacao-servidor': { title: 'CSR, SSR, SSG e ilhas na linha do tempo', component: lazy(() => import('./RenderServidor')) },
  empilhamento: { title: 'As camadas da página em 3D', component: lazy(() => import('./Stacking3D')) },
  composicao: { title: 'Camadas de composição em 3D', component: lazy(() => import('./Composicao3D')) },
};

export function VisualPanel({ id }: { id: string }) {
  const entry = VISUALS[id];
  if (!entry) return null;
  const Visual = entry.component;
  return (
    <section className="visual" aria-label={entry.title}>
      <h3 className="visual-title">{entry.title}</h3>
      <Fallback>
        <Suspense fallback={<p className="muted">Carregando a visualização…</p>}>
          <Visual />
        </Suspense>
      </Fallback>
    </section>
  );
}
