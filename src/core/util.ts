import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/** 시드 고정 난수 (모든 접속자가 같은 마을을 보도록) */
export function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 이음매 없이 부드러운 법선을 갖도록 정점을 합친다 (텍스처 없는 메시용) */
export function smoothen(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

export function dampAngle(cur: number, target: number, rate: number, dt: number): number {
  let d = (target - cur) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-rate * dt));
}

export function textTexture(
  text: string,
  o: { w?: number; h?: number; bg?: string; fg?: string; size?: number } = {},
): THREE.CanvasTexture {
  const w = o.w ?? 512, h = o.h ?? 200;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = o.bg ?? '#f3e4c8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = o.fg ?? '#5a4032';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = o.size ?? 84;
  do {
    ctx.font = `${size}px Jua, "Apple SD Gothic Neo", sans-serif`;
    size -= 4;
  } while (ctx.measureText(text).width > w * 0.88 && size > 20);
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
