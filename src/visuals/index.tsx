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

/** Visualizações que um problema pode usar com o campo `visual`. */
export const VISUALS: Record<string, VisualEntry> = {
  dns: { title: 'Uma consulta de DNS, passo a passo', component: lazy(() => import('./Dns')) },
  renderizacao: { title: 'Do HTML aos pixels', component: lazy(() => import('./Render')) },
  assincrono: { title: 'Três pedidos na linha do tempo', component: lazy(() => import('./Async')) },
  especificidade: { title: 'Calculadora de especificidade', component: lazy(() => import('./Specificity')) },
  empilhamento: { title: 'As camadas da página em 3D', component: lazy(() => import('./Stacking3D')) },
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
