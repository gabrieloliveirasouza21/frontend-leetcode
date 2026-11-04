import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { labeledPlane } from './threeLabel';

/** Parâmetros que a cena acompanha suavemente a cada quadro. */
interface Target {
  explode: number;
  headerZ: 1 | 3;
  yaw: number;
  pitch: number;
}

const FRONT = { yaw: 0, pitch: 0 };
const ANGLED = { yaw: -0.65, pitch: 0.55 };


const headerLabel = (z: number) => [`cabeçalho  position: relative; z-index: ${z}`];
const menuLabel = (z: number) => ['menu', `z-index: ${z}`];

function describe(headerZ: number, menuZ: number) {
  return headerZ === 1
    ? `O cabeçalho tem z-index 1 e o banner tem 2. O menu, com z-index ${menuZ}, só disputa posição dentro do contexto do cabeçalho, então fica abaixo do banner.`
    : `O cabeçalho agora tem z-index 3, acima do banner. O contexto inteiro sobe, e o menu vem junto, por cima do banner.`;
}

export default function Stacking3D() {
  const mount = useRef<HTMLDivElement>(null);
  const target = useRef<Target>({ explode: 1, headerZ: 1, ...ANGLED });
  const [explode, setExplode] = useState(1);
  const [headerZ, setHeaderZ] = useState<1 | 3>(1);
  const [menuZ, setMenuZ] = useState(9999);
  const [failed, setFailed] = useState(false);

  const labels = useRef<{ header: (t: string[]) => void; menu: (t: string[]) => void } | null>(null);

  useEffect(() => {
    target.current.explode = explode;
    target.current.headerZ = headerZ;
    labels.current?.header(headerLabel(headerZ));
    labels.current?.menu(menuLabel(menuZ));
  }, [explode, headerZ, menuZ]);

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
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 12);

    const world = new THREE.Group();
    scene.add(world);

    const page = labeledPlane(8, 5.4, '#3a3f45', ['página'], 0.9).mesh;
    const headerPlane = labeledPlane(8, 0.9, '#5cc8e6', headerLabel(1));
    const header = headerPlane.mesh;
    header.position.y = 2.0;
    const menuPlane = labeledPlane(2.4, 2.6, '#e8a33d', menuLabel(9999));
    const menu = menuPlane.mesh;
    menu.position.set(2.2, 0.55, 0);
    const banner = labeledPlane(8, 1.7, '#d7263d', ['banner  position: relative; z-index: 2']).mesh;
    banner.position.y = 0.35;
    labels.current = { header: headerPlane.draw, menu: menuPlane.draw };

    // O contexto de empilhamento do cabeçalho: uma caixa que prende o menu dentro dela.
    const contextGroup = new THREE.Group();
    contextGroup.add(header, menu);
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(8.2, 3.5, 1),
      new THREE.MeshBasicMaterial({ color: '#5cc8e6', transparent: true, opacity: 0.08, depthWrite: false }),
    );
    const slabEdges = new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), new THREE.LineBasicMaterial({ color: '#5cc8e6', transparent: true, opacity: 0.7 }));
    slab.add(slabEdges);
    slab.position.y = 0.9;
    contextGroup.add(slab);

    // A pilha fica centrada no eixo de rotação, para caber na tela em qualquer arranjo.
    const stack = new THREE.Group();
    stack.add(page, contextGroup, banner);
    world.add(stack);

    const current = { explode: target.current.explode, level: 1, yaw: target.current.yaw, pitch: target.current.pitch };

    // Arrastar gira a cena.
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
      const height = Math.round(width * 0.62);
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    const tick = () => {
      const t = target.current;
      const ease = 0.12;
      current.explode += (t.explode - current.explode) * ease;
      current.level += (t.headerZ - current.level) * ease;
      current.yaw += (t.yaw - current.yaw) * ease;
      current.pitch += (t.pitch - current.pitch) * ease;

      // Distância entre camadas: quase zero de frente, aberta quando afastada.
      const gap = 0.03 + current.explode * 0.8;
      page.position.z = 0;
      banner.position.z = 2 * gap;
      contextGroup.position.z = current.level * gap;
      // Dentro do contexto, o menu fica acima do cabeçalho, por maior que seja o z-index.
      header.position.z = 0;
      menu.position.z = 0.01 + current.explode * 0.35;
      slab.scale.z = 0.02 + current.explode * 0.45;
      slab.position.z = menu.position.z / 2;
      slab.visible = current.explode > 0.05;

      stack.position.z = -(Math.max(2, current.level) * gap) / 2;
      world.rotation.set(current.pitch, current.yaw, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();

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
      labels.current = null;
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
        <div ref={mount} className="stack3d-canvas" role="img" aria-label="Camadas da página afastadas em 3D: página, cabeçalho com o menu dentro, e banner" />
      )}
      <p className="stack3d-state" aria-live="polite">{describe(headerZ, menuZ)}</p>
      <div className="stack3d-controls">
        <label className="stack3d-slider">
          Afastar as camadas
          <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(Number(e.target.value))} />
        </label>
        <button className="ghost" onClick={() => view(FRONT, 0)}>Ver como na tela</button>
        <button className="ghost" onClick={() => view(ANGLED, 1)}>Ver em camadas</button>
      </div>
      <div className="stack3d-controls" role="group" aria-label="Valores de z-index">
        <span className="muted">Menu:</span>
        <button className={menuZ === 9999 ? 'filter active' : 'filter'} aria-pressed={menuZ === 9999} onClick={() => setMenuZ(9999)}>z-index 9999</button>
        <button className={menuZ === 999999 ? 'filter active' : 'filter'} aria-pressed={menuZ === 999999} onClick={() => setMenuZ(999999)}>z-index 999999</button>
        <span className="muted">Cabeçalho:</span>
        <button className={headerZ === 1 ? 'filter active' : 'filter'} aria-pressed={headerZ === 1} onClick={() => setHeaderZ(1)}>z-index 1</button>
        <button className={headerZ === 3 ? 'filter active' : 'filter'} aria-pressed={headerZ === 3} onClick={() => setHeaderZ(3)}>z-index 3</button>
      </div>
      <p className="muted">Arraste a cena para girar. Aumentar o z-index do menu não muda nada. Subir o do cabeçalho muda tudo.</p>
    </div>
  );
}
