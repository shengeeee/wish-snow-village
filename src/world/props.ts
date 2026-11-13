// 마을 소품: 선물, 마켓 오두막, 통나무집, 가로등, 벤치, 표지판
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { textTexture } from '../core/util';
import { std, glow, COLORS, SNOW } from './materials';
import type { WorldCtx } from './types';

export function rbox(w: number, h: number, d: number, r = 0.08, seg = 3): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
}

export function put(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function placed(ctx: WorldCtx, x: number, z: number, rot: number): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rot;
  ctx.root.add(g);
  g.updateMatrixWorld(true);
  return g;
}

function label(text: string, w: number, h: number, bg = '#f3e4c8'): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: textTexture(text, { w: 512, h: Math.round((512 * h) / w), bg }), roughness: 0.9 }),
  );
  return m;
}

// ── 선물 상자 ──────────────────────────────────────────────
export function makeGift(s: number, color: number, ribbon: number): THREE.Group {
  const g = new THREE.Group();
  const h = s * 0.8;
  put(g, rbox(s, h, s, 0.07), std(color, 0.7), 0, h / 2, 0);
  const rm = std(ribbon, 0.6);
  put(g, rbox(s * 1.03, h * 1.03, s * 0.16, 0.03), rm, 0, h / 2, 0);
  put(g, rbox(s * 0.16, h * 1.03, s * 1.03, 0.03), rm, 0, h / 2, 0);
  for (const sx of [-1, 1]) {
    const bow = put(g, new THREE.SphereGeometry(s * 0.15, 12, 10), rm, sx * s * 0.13, h + s * 0.07, 0);
    bow.scale.set(1.2, 0.7, 0.8);
    bow.rotation.z = sx * -0.5;
  }
  return g;
}

// ── 오두막 공통 뼈대 (몸체 + 박공 + 눈 쌓인 지붕) ─────────
interface HutOpts { w: number; d: number; h: number; gh: number; wall: number; roof: number }

function hutShell(g: THREE.Group, o: HutOpts): void {
  const wall = std(o.wall, 0.9);
  put(g, rbox(o.w, o.h, o.d, 0.14, 4), wall, 0, o.h / 2, 0);
  // 벽 아래 눈
  put(g, rbox(o.w + 0.5, 0.3, o.d + 0.5, 0.15, 4), SNOW(), 0, 0.05, 0);
  // 박공 삼각형
  const tri = new THREE.Shape();
  tri.moveTo(-o.w / 2 + 0.06, 0); tri.lineTo(o.w / 2 - 0.06, 0); tri.lineTo(0, o.gh); tri.closePath();
  const gd = o.d - 0.14;
  const gable = new THREE.ExtrudeGeometry(tri, { depth: gd, bevelEnabled: false });
  gable.translate(0, 0, -gd / 2);
  put(g, gable, wall, 0, o.h - 0.03, 0);

  const a = Math.atan2(o.gh, o.w / 2);
  const L = (o.w / 2 + 0.35) / Math.cos(a) + 0.1;
  const roofMat = std(o.roof, 0.8), snow = SNOW();
  for (const s of [1, -1]) {
    const dx = s * Math.cos(a), dy = -Math.sin(a);
    const nx = s * Math.sin(a), ny = Math.cos(a);
    const slab = put(g, rbox(L, 0.16, o.d + 0.55, 0.07), roofMat,
      dx * (L / 2 - 0.05) + nx * 0.07, o.h + o.gh + dy * (L / 2 - 0.05) + ny * 0.07, 0);
    slab.rotation.z = -s * a;
    const sn = put(g, rbox(L - 0.12, 0.3, o.d + 0.38, 0.15, 4), snow,
      dx * (L / 2 - 0.1) + nx * 0.27, o.h + o.gh + dy * (L / 2 - 0.1) + ny * 0.27, 0);
    sn.rotation.z = -s * a;
  }
  const ridge = put(g, new THREE.CapsuleGeometry(0.24, o.d + 0.1, 8, 14), snow, 0, o.h + o.gh + 0.22, 0);
  ridge.rotation.x = Math.PI / 2;
}

/** 지붕 처마를 따라 전구를 단다 */
function eaveBulbs(ctx: WorldCtx, g: THREE.Group, o: HutOpts, n: number): void {
  const cols = [0xffd27a, 0xff8a6a, 0xfff1c9, 0x9fd6a8];
  const v = new THREE.Vector3();
  for (const s of [1, -1]) {
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      v.set(s * t * (o.w / 2 + 0.3), o.h + o.gh * (1 - t) - 0.12 - 0.06 * Math.sin(t * Math.PI * n), o.d / 2 + 0.32);
      ctx.bulbs.add(g.localToWorld(v), cols[(k + (s > 0 ? 0 : 2)) % cols.length]);
    }
  }
}

function stripeTexture(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 16;
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f6ecd9' : color;
    ctx.fillRect(i * 16, 0, 16, 16);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── 크리스마스 마켓 ────────────────────────────────────────
export interface MarketDef { name: string; line: string; awning: string; roof: number; wall: number }

export function addMarket(ctx: WorldCtx, x: number, z: number, rot: number, def: MarketDef): void {
  const o: HutOpts = { w: 3.3, d: 2.3, h: 2.0, gh: 1.15, wall: def.wall, roof: def.roof };
  const g = placed(ctx, x, z, rot);
  hutShell(g, o);
  const fz = o.d / 2;
  // 따뜻한 빛이 새어 나오는 판매 창
  put(g, rbox(o.w * 0.72, 0.9, 0.08, 0.06), glow(0xffcf94, 0.95), 0, 1.38, fz + 0.005, false);
  put(g, rbox(o.w * 0.8, 0.09, 0.14, 0.04), std(COLORS.woodDark), 0, 1.86, fz + 0.03);
  // 진열대
  put(g, rbox(o.w * 0.9, 0.12, 0.7, 0.05), std(COLORS.woodDark), 0, 0.9, fz + 0.28);
  for (const sx of [-1, 1]) put(g, rbox(0.12, 0.9, 0.12, 0.04), std(COLORS.woodDark), sx * o.w * 0.4, 0.45, fz + 0.52);
  // 진열 상품 (컵, 동글한 간식)
  const cup = new THREE.CylinderGeometry(0.09, 0.07, 0.2, 14);
  const snack = new THREE.SphereGeometry(0.1, 14, 10);
  for (let i = 0; i < 5; i++) {
    const px = (i - 2) * 0.5;
    if (i % 2 === 0) {
      put(g, cup, std(COLORS.cream, 0.6), px, 1.06, fz + 0.35);
      put(g, new THREE.CylinderGeometry(0.093, 0.085, 0.06, 14), std(COLORS.red, 0.6), px, 1.07, fz + 0.35);
    } else {
      put(g, snack, std(0xd9a066, 0.8), px - 0.08, 1.03, fz + 0.38).scale.y = 0.7;
      put(g, snack, std(0xc98a55, 0.8), px + 0.1, 1.03, fz + 0.3).scale.y = 0.7;
    }
  }
  // 줄무늬 차양
  const aw = put(g, rbox(o.w * 0.95, 0.07, 1.0, 0.03),
    new THREE.MeshStandardMaterial({ map: stripeTexture(def.awning), roughness: 0.9 }), 0, 2.0, fz + 0.45);
  aw.rotation.x = 0.36;
  // 간판
  put(g, rbox(1.5, 0.5, 0.08, 0.06), std(COLORS.woodDark), 0, o.h + 0.5, fz + 0.02);
  const text = label(def.name, 1.38, 0.4);
  text.position.set(0, o.h + 0.5, fz + 0.065);
  g.add(text);
  eaveBulbs(ctx, g, o, 5);

  const light = new THREE.PointLight(0xffbe7d, 14, 9, 1.8);
  light.position.set(0, 1.7, fz + 1.0);
  g.add(light);
  ctx.lights.push(light);

  ctx.colliders.push({ kind: 'box', x, z, hw: o.w / 2 + 0.15, hd: o.d / 2 + 0.75, rot });
  ctx.occluders.push({ kind: 'box', x, z, hw: o.w / 2 + 0.4, hd: o.d / 2 + 0.5, rot, h: o.h + o.gh + 0.5 });
  const front = g.localToWorld(new THREE.Vector3(0, 0, fz + 1.6));
  ctx.interactables.push({ x: front.x, z: front.z, r: 2.0, label: `${def.name} 구경하기`, action: () => ctx.say(def.line) });
}

// ── 통나무 오두막 (굴뚝 위치를 돌려준다) ──────────────────
export function addCabin(ctx: WorldCtx, x: number, z: number, rot: number, roof: number): THREE.Vector3 {
  const o: HutOpts = { w: 4.8, d: 4.0, h: 2.4, gh: 1.7, wall: COLORS.woodBrown, roof };
  const g = placed(ctx, x, z, rot);
  hutShell(g, o);
  const fz = o.d / 2;
  const dark = std(COLORS.woodDark);
  // 문
  put(g, rbox(1.0, 1.65, 0.1, 0.1), dark, 0, 0.85, fz + 0.02);
  put(g, new THREE.SphereGeometry(0.05, 10, 8), std(COLORS.gold, 0.4, 0.5), 0.32, 0.85, fz + 0.09);
  put(g, new THREE.CircleGeometry(0.2, 20), glow(0xffcf94, 1.0), 0, 1.25, fz + 0.075, false);
  // 리스
  put(g, new THREE.TorusGeometry(0.3, 0.09, 10, 24), std(COLORS.pine, 0.95), 0, 2.15, fz + 0.08);
  put(g, new THREE.SphereGeometry(0.08, 10, 8), std(COLORS.red, 0.5), 0, 1.87, fz + 0.14);
  // 창문
  for (const sx of [-1, 1]) {
    put(g, rbox(0.95, 0.95, 0.08, 0.1), dark, sx * 1.5, 1.35, fz + 0.01);
    put(g, rbox(0.78, 0.78, 0.08, 0.07), glow(0xffcf94, 1.1), sx * 1.5, 1.35, fz + 0.03, false);
    put(g, rbox(0.06, 0.8, 0.1, 0.02), dark, sx * 1.5, 1.35, fz + 0.03);
    put(g, rbox(0.8, 0.06, 0.1, 0.02), dark, sx * 1.5, 1.35, fz + 0.03);
    put(g, rbox(1.05, 0.14, 0.26, 0.06), SNOW(), sx * 1.5, 0.86, fz + 0.1);
  }
  // 굴뚝
  put(g, rbox(0.7, 1.6, 0.7, 0.1), std(0xa9766a, 0.95), 1.3, o.h + o.gh - 0.1, -0.6);
  put(g, rbox(0.86, 0.2, 0.86, 0.09), SNOW(), 1.3, o.h + o.gh + 0.75, -0.6);
  eaveBulbs(ctx, g, o, 7);

  const light = new THREE.PointLight(0xffbe7d, 16, 10, 1.8);
  light.position.set(0, 1.8, fz + 1.4);
  g.add(light);
  ctx.lights.push(light);

  ctx.colliders.push({ kind: 'box', x, z, hw: o.w / 2 + 0.2, hd: o.d / 2 + 0.2, rot });
  ctx.occluders.push({ kind: 'box', x, z, hw: o.w / 2 + 0.5, hd: o.d / 2 + 0.5, rot, h: o.h + o.gh + 0.8 });
  return g.localToWorld(new THREE.Vector3(1.3, o.h + o.gh + 0.95, -0.6));
}

// ── 가로등 (전구 줄을 걸 꼭대기 위치를 돌려준다) ──────────
export function addLamp(ctx: WorldCtx, x: number, z: number, withLight: boolean): THREE.Vector3 {
  const g = placed(ctx, x, z, 0);
  const iron = std(COLORS.iron, 0.6, 0.3);
  put(g, new THREE.CylinderGeometry(0.2, 0.26, 0.24, 16), iron, 0, 0.12, 0);
  put(g, new THREE.CylinderGeometry(0.06, 0.085, 3.1, 12), iron, 0, 1.6, 0);
  put(g, new THREE.SphereGeometry(0.12, 12, 10), iron, 0, 3.12, 0);
  put(g, rbox(0.4, 0.46, 0.4, 0.14, 4), glow(0xffd9a3, 1.5), 0, 3.42, 0, false);
  const cap = put(g, new THREE.ConeGeometry(0.36, 0.22, 16), iron, 0, 3.76, 0);
  cap.castShadow = false;
  put(g, new THREE.SphereGeometry(0.3, 16, 10), SNOW(), 0, 3.82, 0, false).scale.y = 0.4;
  ctx.bulbs.add(new THREE.Vector3(x, 3.42, z), 0xffd9a3);
  if (withLight) {
    const l = new THREE.PointLight(0xffc98a, 16, 12, 1.8);
    l.position.set(0, 3.3, 0);
    g.add(l);
    ctx.lights.push(l);
  }
  ctx.colliders.push({ kind: 'circle', x, z, r: 0.28 });
  return new THREE.Vector3(x, 3.15, z);
}

// ── 벤치 ───────────────────────────────────────────────────
export function addBench(ctx: WorldCtx, x: number, z: number, rot: number): void {
  const g = placed(ctx, x, z, rot);
  const wood = std(COLORS.woodBrown, 0.85), iron = std(COLORS.iron, 0.6, 0.3);
  put(g, rbox(1.7, 0.1, 0.55, 0.05), wood, 0, 0.42, 0);
  const back = put(g, rbox(1.7, 0.5, 0.09, 0.05), wood, 0, 0.78, -0.27);
  back.rotation.x = -0.12;
  for (const sx of [-1, 1]) put(g, rbox(0.09, 0.42, 0.5, 0.04), iron, sx * 0.7, 0.21, 0);
  put(g, rbox(1.55, 0.12, 0.44, 0.06, 4), SNOW(), 0.03, 0.5, 0.02);
  ctx.colliders.push({ kind: 'box', x, z, hw: 0.9, hd: 0.35, rot });
}

// ── 표지판 ─────────────────────────────────────────────────
export function addSign(ctx: WorldCtx, x: number, z: number, rot: number, title: string, desc: string): void {
  const g = placed(ctx, x, z, rot);
  put(g, new THREE.CylinderGeometry(0.07, 0.09, 1.5, 10), std(COLORS.woodDark), 0, 0.75, 0);
  put(g, rbox(1.7, 0.62, 0.1, 0.1), std(COLORS.woodBrown), 0, 1.5, 0);
  for (const s of [1, -1]) {
    const t = label(title, 1.56, 0.48);
    t.position.set(0, 1.5, s * 0.056);
    if (s < 0) t.rotation.y = Math.PI;
    g.add(t);
  }
  put(g, rbox(1.6, 0.14, 0.2, 0.07, 4), SNOW(), 0, 1.84, 0, false);
  put(g, new THREE.SphereGeometry(0.3, 14, 8), SNOW(), 0, 0, 0, false).scale.y = 0.3;
  ctx.colliders.push({ kind: 'circle', x, z, r: 0.3 });
  ctx.interactables.push({ x, z, r: 2.3, label: '표지판 읽기', action: () => ctx.say(desc) });
}
