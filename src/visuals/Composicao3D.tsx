import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { labeledPlane } from './threeLabel';

type Mode = 'left' | 'transform';

const STAGES = ['Estilo', 'Layout', 'Pintura', 'Composição'];
/** Etapas refeitas a cada quadro da animação, em cada modo. */
const WORK: Record<Mode, boolean[]> = {
  left: [true, true, true, true],
  transform: [false, false, false, true],
};

const ANGLED = { yaw: -0.6, pitch: 0.5 };
const FRONT = { yaw: 0, pitch: 0 };

/**
 * Animar `left` refaz layout e pintura da camada da página a cada quadro.
 * Animar `transform` promove o cartão para uma camada própria, e só a composição muda.
 */
export default function Composicao3D() {
  const mount = useRef<HTMLDivElement>(null);
  const target = useRef({ mode: 'left' as Mode, explode: 1, ...ANGLED });
  const [mode, setMode] = useState<Mode>('left');
  const [explode, setExplode] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    target.current.mode = mode;
    target.current.explode = explode;
  }, [mode, explode]);

  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 11);
    const world = new THREE.Group();
    scene.add(world);

    const page = labeledPlane(8, 5, '#3a3f45', ['camada da página'], 0.95).mesh;
    const card = labeledPlane(2.2, 1.4, '#5cc8e6', ['cartão', 'animado']).mesh;
    // O brilho verde imita o "paint flashing" do DevTools: a área repintada no quadro.
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.8), new THREE.MeshBasicMaterial({ color: '#57c283', transparent: true, opacity: 0, depthWrite: false }));
    const layerEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(2.4, 1.6)), new THREE.LineBasicMaterial({ color: '#e8a33d' }));
    world.add(page, flash, card, layerEdges);

    const current = { lift: 0, explode: target.current.explode, yaw: target.current.yaw, pitch: target.current.pitch };
    let dragging: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      dragging = { x: e.clientX, y: e.clientY };
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      target.current.yaw = THREE.MathUtils.clamp(target.current.yaw + (e.clientX - dragging.x) * 0.008, -1.4, 1.4);
      target.current.pitch = THREE.MathUtils.clamp(target.current.pitch + (e.clientY - dragging.y) * 0.008, -0.2, 1.2);
      dragging = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      dragging = null;
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);

    const resize = () => {
      const width = host.clientWidth;
      const height = Math.round(width * 0.56);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = target.current;
      const ease = 0.1;
      const promoted = t.mode === 'transform';
      current.lift += ((promoted ? 1 : 0) - current.lift) * ease;
      current.explode += (t.explode - current.explode) * ease;
      current.yaw += (t.yaw - current.yaw) * ease;
      current.pitch += (t.pitch - current.pitch) * ease;

      const phase = ((now - start) / 1000) * 1.3;
      const x = Math.sin(phase) * 2.4;
      const y = -0.4;
      card.position.set(x, y, 0.02 + current.lift * current.explode * 1.6);
      layerEdges.position.copy(card.position);
      (layerEdges.material as THREE.LineBasicMaterial).opacity = current.lift;
      (layerEdges.material as THREE.LineBasicMaterial).transparent = true;
      flash.position.set(x, y, 0.015);
      // Sem camada própria, a área do cartão é repintada a cada quadro.
      (flash.material as THREE.MeshBasicMaterial).opacity = promoted ? 0 : 0.35 + 0.25 * Math.sin(phase * 9);

      world.rotation.set(current.pitch, current.yaw, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerup', onUp);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose();
          const material = object.material as THREE.Material & { map?: THREE.Texture };
          material.map?.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  const view = (angles: { yaw: number; pitch: number }, spread: number) => {
    Object.assign(target.current, angles);
    setExplode(spread);
  };

  return (
    <div className="stack3d">
      {failed ? (
        <p className="muted">Seu navegador não conseguiu iniciar o WebGL. A explicação abaixo descreve o que a cena mostraria.</p>
      ) : (
        <div ref={mount} className="stack3d-canvas" role="img" aria-label="Cena 3D com a camada da página e um cartão animado" />
      )}
      <div className="pipeline" aria-label="Etapas refeitas a cada quadro">
        {STAGES.map((stage, i) => (
          <span key={stage} className={WORK[mode][i] ? 'pipeline-stage on' : 'pipeline-stage'}>{stage}</span>
        ))}
      </div>
      <p className="stack3d-state" aria-live="polite">
        {mode === 'left'
          ? 'Animando left: a cada quadro, o navegador recalcula o layout e repinta a camada da página onde o cartão passa, o brilho verde. Em página pesada, isso derruba os quadros por segundo.'
          : 'Animando transform: o cartão ganha uma camada própria, a borda laranja. A cada quadro, só a composição muda a posição da camada, sem layout nem pintura.'}
      </p>
      <div className="stack3d-controls" role="group" aria-label="Propriedade animada">
        <span className="muted">Animar:</span>
        <button className={mode === 'left' ? 'filter active' : 'filter'} aria-pressed={mode === 'left'} onClick={() => setMode('left')}>left</button>
        <button className={mode === 'transform' ? 'filter active' : 'filter'} aria-pressed={mode === 'transform'} onClick={() => setMode('transform')}>transform: translateX()</button>
      </div>
      <div className="stack3d-controls">
        <label className="stack3d-slider">
          Afastar as camadas
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
        </label>
        <button className="ghost" onClick={() => view(FRONT, 0)}>Ver como na tela</button>
        <button className="ghost" onClick={() => view(ANGLED, 1)}>Ver em camadas</button>
      </div>
    </div>
  );
}
