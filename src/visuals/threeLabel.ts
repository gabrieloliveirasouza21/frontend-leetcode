import * as THREE from 'three';

/** Plano com texto, desenhado num canvas, para cada camada da página. `draw` troca o texto. */
export function labeledPlane(width: number, height: number, color: string, lines: string[], opacity = 1) {
  const canvas = document.createElement('canvas');
  const scale = 128;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = (text: string[]) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.fillStyle = '#111';
    ctx.font = `600 ${Math.round(scale * 0.24)}px system-ui, sans-serif`;
    text.forEach((line, i) => ctx.fillText(line, scale * 0.14, scale * (0.36 + i * 0.3)));
    texture.needsUpdate = true;
  };
  draw(lines);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: opacity < 1, opacity, side: THREE.DoubleSide });
  return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(width, height), material), draw };
}
