// 트리·소나무에 쓰는 둥근 치마 모양 가지 층과 그 위의 눈
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothen } from '../core/util';

function scallop(g: THREE.BufferGeometry, R: number, lobes: number, ar: number, ay: number, ph = 0): void {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const f = Math.pow(Math.min(r / R, 1), 2.5);
    const w = Math.sin(Math.atan2(z, x) * lobes + ph);
    const k = 1 + ar * w * f;
    p.setXYZ(i, x * k, y - ay * R * (0.5 + 0.5 * w) * f, z * k);
  }
}

/** 가지 한 층: 꼭대기(0,H)에서 가장자리(R,0)로 퍼지고 끝이 둥글게 말린다 */
export function tierGeometry(R: number, H: number, lobes: number, seg = 44): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 12, lip = Math.min(0.3, R * 0.1);
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    pts.push(new THREE.Vector2(Math.max(R * Math.pow(t, 0.9), 0.001), H * Math.pow(1 - t, 1.2)));
  }
  pts.push(
    new THREE.Vector2(R * 0.985, -lip * 0.45), new THREE.Vector2(R * 0.86, -lip * 0.9),
    new THREE.Vector2(R * 0.5, -lip * 0.8), new THREE.Vector2(0.001, -lip * 0.5),
  );
  const g = new THREE.LatheGeometry(pts, seg);
  scallop(g, R, lobes, 0.07, 0.07);
  return smoothen(g);
}

/** 가지 층 윗부분을 덮는 눈 */
export function snowCapGeometry(R: number, H: number, lobes: number, cover = 0.62, seg = 44): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 9;
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * cover;
    pts.push(new THREE.Vector2(Math.max(R * Math.pow(t, 0.9) * 1.03 + 0.04 * (k / n), 0.001), H * Math.pow(1 - t, 1.2) + 0.06));
  }
  const e = pts[pts.length - 1];
  pts.push(new THREE.Vector2(e.x * 0.99, e.y - 0.07), new THREE.Vector2(e.x * 0.9, e.y - 0.09));
  const g = new THREE.LatheGeometry(pts, seg);
  scallop(g, e.x, lobes + 2, 0.1, 0.1, 1.3);
  return smoothen(g);
}

/** 작은 소나무 1그루분의 합쳐진 지오메트리 (잎 / 눈 / 줄기) */
export function pineGeometries(): { leaf: THREE.BufferGeometry; snow: THREE.BufferGeometry; trunk: THREE.BufferGeometry } {
  const tiers = [
    { R: 1.5, H: 1.7, y: 0.9, l: 7 },
    { R: 1.15, H: 1.5, y: 1.85, l: 6 },
    { R: 0.8, H: 1.35, y: 2.75, l: 5 },
  ];
  const leaf = mergeGeometries(tiers.map((t) => tierGeometry(t.R, t.H, t.l, 28).translate(0, t.y, 0)))!;
  const snow = mergeGeometries(tiers.map((t) => snowCapGeometry(t.R, t.H, t.l, 0.6, 28).translate(0, t.y, 0)))!;
  const trunk = new THREE.CylinderGeometry(0.2, 0.28, 1.2, 12).translate(0, 0.6, 0);
  return { leaf, snow, trunk };
}
