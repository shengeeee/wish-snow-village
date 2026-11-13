// 마을 전체를 조립하고, 충돌·가림·상호작용 대상을 관리한다
import * as THREE from 'three';
import { WORLD, onPath } from '../config';
import { mulberry32 } from '../core/util';
import type { Quality } from '../core/quality';
import { Bulbs } from './Bulbs';
import { ChristmasTree } from './ChristmasTree';
import { pineGeometries } from './foliage';
import { buildGround, buildSky, hillHeight } from './ground';
import { COLORS, SNOW, std } from './materials';
import { addBench, addCabin, addLamp, addMarket, addSign, makeGift, put, rbox, type MarketDef } from './props';
import type { Collider, Interactable, Occluder, WorldCtx } from './types';

const MARKETS: MarketDef[] = [
  { name: '핫초코', line: '따끈한 핫초코 한 잔 어때요? 마시멜로도 동동 띄워 드려요.', awning: '#c5524a', roof: COLORS.roofRed, wall: COLORS.woodCream },
  { name: '군밤', line: '방금 구운 군밤이에요. 손 시릴 땐 주머니에 쏙 넣어 두세요.', awning: '#3f6f57', roof: COLORS.roofGreen, wall: 0xe2c9a6 },
  { name: '붕어빵', line: '팥 붕어빵, 슈크림 붕어빵! 꼬리부터 드시나요, 머리부터 드시나요?', awning: '#d8a548', roof: COLORS.roofRed, wall: 0xecdcc4 },
  { name: '어묵', line: '뜨끈한 어묵 국물 한 컵이면 눈싸움도 문제없어요.', awning: '#8fb0cc', roof: COLORS.roofGreen, wall: COLORS.woodCream },
];

interface Puff { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; origin: THREE.Vector3; age: number; life: number; dx: number }

export class World {
  readonly root = new THREE.Group();
  readonly tree: ChristmasTree;
  private colliders: Collider[] = [];
  private occluders: Occluder[] = [];
  private interactables: Interactable[] = [];
  private bulbs = new Bulbs();
  private puffs: Puff[] = [];

  constructor(scene: THREE.Scene, quality: Quality, say: (t: string) => void) {
    scene.add(this.root);
    const ctx: WorldCtx = {
      root: this.root, colliders: this.colliders, occluders: this.occluders, interactables: this.interactables,
      bulbs: this.bulbs, lights: [], rng: mulberry32(20261225), say,
    };
    buildSky(scene);
    buildGround(this.root);

    // ── A. 중앙 광장 ──
    this.tree = new ChristmasTree(ctx);
    ctx.interactables.push({
      x: 0, z: 0, r: 7.8, label: '트리 반짝이기',
      action: () => { this.tree.sparkle(); say('트리가 반짝반짝 빛나요 ✨'); },
    });

    MARKETS.forEach((def, i) => {
      const a = Math.PI / 4 + (i * Math.PI) / 2, R = 10.3;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      addMarket(ctx, x, z, Math.atan2(-x, -z), def);
      // 마켓 옆 선물 더미
      for (const s of [-1, 1]) {
        const ga = a + s * 0.24, gr = R - 0.9;
        const gift = makeGift(0.5 + ctx.rng() * 0.3, s > 0 ? COLORS.red : COLORS.green, COLORS.cream);
        gift.position.set(Math.cos(ga) * gr, 0.02, Math.sin(ga) * gr);
        gift.rotation.y = ctx.rng() * 3;
        this.root.add(gift);
        ctx.colliders.push({ kind: 'circle', x: gift.position.x, z: gift.position.z, r: 0.45 });
      }
      const ba = a + Math.PI / 4 - 0.33, bx = Math.cos(ba) * 7.2, bz = Math.sin(ba) * 7.2;
      addBench(ctx, bx, bz, Math.atan2(-bx, -bz));
    });

    // 가로등 + 그 사이에 늘어진 전구 줄
    const tops: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4;
      tops.push(addLamp(ctx, Math.cos(a) * 13, Math.sin(a) * 13, i % 2 === 0));
    }
    const wireMat = std(COLORS.iron, 0.8);
    const stringCols = [0xffd27a, 0xff8a6a, 0xfff1c9, 0x9fd6a8, 0xffb35c];
    tops.forEach((a, i) => {
      const b = tops[(i + 1) % tops.length];
      const mid = a.clone().lerp(b, 0.5);
      mid.y -= 1.1;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      this.root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.015, 5), wireMat));
      for (let k = 1; k < 11; k++) {
        const p = curve.getPoint(k / 11);
        p.y -= 0.09;
        this.bulbs.add(p, stringCols[(k + i) % stringCols.length]);
      }
    });

    addSign(ctx, 3.4, 12.2, 0.2, '눈사람 들판', '광장 밖 하얀 들판이 눈사람 들판이에요. 눈덩이 굴리기는 곧 열릴 예정이에요!');
    addSign(ctx, 12.4, 3.2, Math.PI / 2 + 0.15, '눈싸움 놀이터 →', '이 길 끝에 눈싸움 놀이터가 있어요. 눈덩이 던지기는 준비 중이에요.');
    addSign(ctx, -3.2, -12.4, Math.PI - 0.2, '오두막 가는 길', '굴뚝 연기가 피어오르는 통나무 오두막으로 가는 길이에요.');
    addSign(ctx, -4.6, 5.4, -0.6, '소원 트리', '마을의 소원 트리예요. 소원 달기는 곧 열릴 예정이에요. 지금은 트리를 반짝여 볼 수 있어요!');

    // ── D. 오두막 + 굴뚝 연기 ──
    const puffGeo = new THREE.SphereGeometry(0.5, 12, 10);
    WORLD.cabins.forEach((c, i) => {
      const chimney = addCabin(ctx, c.x, c.z, c.rot, i === 0 ? COLORS.roofRed : COLORS.roofGreen);
      for (let k = 0; k < 6; k++) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xf2eef5, transparent: true, opacity: 0, roughness: 1, depthWrite: false });
        const mesh = new THREE.Mesh(puffGeo, mat);
        this.root.add(mesh);
        this.puffs.push({ mesh, mat, origin: chimney, age: (k / 6) * 5, life: 5, dx: ctx.rng() - 0.5 });
      }
      // 오두막 앞 가로등
      const f = new THREE.Vector3(2.9, 0, 3.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.rot);
      addLamp(ctx, c.x + f.x, c.z + f.z, false);
    });

    this.buildArena(ctx);
    this.buildForest(ctx);

    this.bulbs.build(this.root);
    ctx.lights.forEach((l, i) => { l.visible = i < quality.pointLights; });
  }

  // ── C. 눈싸움 놀이터 (Phase 1에서는 공간만) ──
  private buildArena(ctx: WorldCtx): void {
    const a = WORLD.arena, snow = SNOW();
    const walls = [
      { x: -3.5, z: -3, rot: 0.3, w: 2.6 }, { x: 3.2, z: -3.6, rot: -0.5, w: 2.2 }, { x: 0, z: 0.2, rot: 1.57, w: 2.8 },
      { x: -3.8, z: 3.6, rot: -0.4, w: 2.4 }, { x: 4, z: 3, rot: 0.6, w: 2.6 },
    ];
    for (const w of walls) {
      const m = put(this.root, rbox(w.w, 0.95, 0.7, 0.3, 5), snow, a.x + w.x, 0.4, a.z + w.z);
      m.rotation.y = w.rot;
      ctx.colliders.push({ kind: 'box', x: a.x + w.x, z: a.z + w.z, hw: w.w / 2, hd: 0.35, rot: w.rot });
    }
    for (const d of [{ x: -6, z: 0.5, r: 1.0 }, { x: 6.3, z: -0.4, r: 1.1 }, { x: 0.5, z: -6.2, r: 0.9 }, { x: -0.4, z: 6.3, r: 1.0 }]) {
      put(this.root, new THREE.SphereGeometry(d.r, 24, 14), snow, a.x + d.x, 0, a.z + d.z).scale.y = 0.8;
      ctx.colliders.push({ kind: 'circle', x: a.x + d.x, z: a.z + d.z, r: d.r * 0.9 });
    }
    // 경계: 낮은 눈 둔덕과 깃발
    const flagCols = [COLORS.red, COLORS.green, COLORS.gold, 0x8fb0cc];
    for (let i = 0; i < 20; i++) {
      const an = (i / 20) * Math.PI * 2 + 0.16;
      const x = a.x + Math.cos(an) * a.r, z = a.z + Math.sin(an) * a.r;
      if (onPath(x, z, 0.8)) continue;
      put(this.root, new THREE.SphereGeometry(0.55, 14, 8), snow, x, 0, z).scale.set(1.3, 0.5, 1);
      if (i % 3 === 0) {
        put(this.root, new THREE.CylinderGeometry(0.04, 0.05, 1.9, 8), std(COLORS.woodDark), x, 0.95, z);
        const flag = put(this.root, new THREE.ConeGeometry(0.22, 0.55, 3), std(flagCols[(i / 3) % 4 | 0], 0.8), x + 0.3, 1.7, z);
        flag.rotation.z = -Math.PI / 2;
        flag.scale.z = 0.15;
      }
    }
    addSign(ctx, a.x - a.r - 0.6, 2.7, Math.PI / 2, '눈싸움 놀이터', '눈벽 뒤에 숨어 눈덩이를 던지는 놀이터예요. 눈싸움은 준비 중이에요!');
  }

  // ── D. 눈 쌓인 소나무 숲과 작은 눈 둔덕 ──
  private buildForest(ctx: WorldCtx): void {
    const rng = ctx.rng, a = WORLD.arena;
    const spots: { x: number; y: number; z: number; s: number }[] = [];
    const free = (x: number, z: number, gap: number) =>
      !onPath(x, z, 2.4) && Math.hypot(x - a.x, z - a.z) > a.r + 2.5 &&
      WORLD.cabins.every((c) => Math.hypot(x - c.x, z - c.z) > 7) &&
      spots.every((s) => Math.hypot(x - s.x, z - s.z) > gap);

    // 광장 가장자리의 작은 나무
    for (let i = 0; i < 8; i++) {
      const an = (i * Math.PI) / 4 + 0.72 * (i % 2 ? 1 : -1) * 0.35 + Math.PI / 4 * (i % 2);
      const ang = Math.PI / 4 + Math.floor(i / 2) * (Math.PI / 2) + (i % 2 ? 0.36 : -0.36);
      void an;
      spots.push({ x: Math.cos(ang) * 12.2, y: 0, z: Math.sin(ang) * 12.2, s: 0.62 + rng() * 0.12 });
    }
    // 들판~외곽 숲 (바깥으로 갈수록 빽빽하게, 들판 안쪽은 넓게 비운다)
    for (let tries = 0; tries < 900 && spots.length < 100; tries++) {
      const r = 19 + rng() * 30.5, an = rng() * Math.PI * 2;
      const dens = r < 27 ? 0.05 : r < 37 ? 0.22 : 1;
      if (rng() > dens) continue;
      const x = Math.cos(an) * r, z = Math.sin(an) * r;
      if (free(x, z, 3)) spots.push({ x, y: 0, z, s: 0.85 + rng() * 0.6 });
    }
    const playable = spots.length;
    // 언덕 위 배경 숲
    for (let i = 0; i < 70; i++) {
      const r = 54 + rng() * 12, an = rng() * Math.PI * 2;
      const x = Math.cos(an) * r, z = Math.sin(an) * r;
      spots.push({ x, y: hillHeight(x, z) - 0.2, z, s: 1.1 + rng() * 0.8 });
    }

    const geo = pineGeometries();
    const leaf = new THREE.InstancedMesh(geo.leaf, std(0xffffff, 0.9), spots.length);
    const snow = new THREE.InstancedMesh(geo.snow, SNOW(), spots.length);
    const trunk = new THREE.InstancedMesh(geo.trunk, std(COLORS.trunk, 0.9), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
    spots.forEach((s, i) => {
      q.setFromAxisAngle(up, rng() * Math.PI * 2);
      m.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.s, s.s * (0.92 + rng() * 0.2), s.s));
      leaf.setMatrixAt(i, m); snow.setMatrixAt(i, m); trunk.setMatrixAt(i, m);
      leaf.setColorAt(i, col.setHex(rng() > 0.5 ? COLORS.pine : COLORS.pineLight));
      if (i < playable) {
        ctx.colliders.push({ kind: 'circle', x: s.x, z: s.z, r: 0.75 * s.s });
        ctx.occluders.push({ kind: 'cone', x: s.x, z: s.z, r: 2.0 * s.s, h: 4.6 * s.s });
      }
    });
    for (const im of [leaf, snow, trunk]) {
      im.castShadow = im.receiveShadow = true;
      im.frustumCulled = false;
      this.root.add(im);
    }

    // 들판의 폭신한 눈 둔덕
    const mounds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 36, 14), SNOW(), 70);
    let n = 0;
    for (let tries = 0; tries < 500 && n < 70; tries++) {
      const r = 16 + rng() * 34, an = rng() * Math.PI * 2;
      const x = Math.cos(an) * r, z = Math.sin(an) * r;
      if (!free(x, z, 1.6)) continue;
      const s = 0.5 + rng() * 0.9;
      m.compose(new THREE.Vector3(x, -0.1 * s, z), q.setFromAxisAngle(up, rng() * 3), new THREE.Vector3(s * 1.3, s * 0.3, s));
      mounds.setMatrixAt(n++, m);
    }
    mounds.count = n;
    mounds.receiveShadow = true;
    this.root.add(mounds);
  }

  /** 원형 몸체를 장애물과 월드 경계 밖으로 밀어낸다 */
  resolve(pos: THREE.Vector3, radius: number): void {
    for (const c of this.colliders) {
      if (c.kind === 'circle') {
        const dx = pos.x - c.x, dz = pos.z - c.z, min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (min - d) / d;
          pos.x += dx * k; pos.z += dz * k;
        }
      } else {
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
        if (Math.abs(lx) > c.hw + radius || Math.abs(lz) > c.hd + radius) continue;
        const qx = THREE.MathUtils.clamp(lx, -c.hw, c.hw), qz = THREE.MathUtils.clamp(lz, -c.hd, c.hd);
        let ox = lx - qx, oz = lz - qz;
        let d = Math.hypot(ox, oz), nx: number, nz: number, push: number;
        if (d > 1e-5) {
          if (d >= radius) continue;
          nx = ox / d; nz = oz / d; push = radius - d;
        } else {
          // 상자 안쪽: 가장 가까운 면으로
          const px = c.hw - Math.abs(lx), pz = c.hd - Math.abs(lz);
          if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; push = px + radius; }
          else { nx = 0; nz = Math.sign(lz) || 1; push = pz + radius; }
        }
        ox = nx * push; oz = nz * push;
        pos.x += ox * cs + oz * sn;
        pos.z += -ox * sn + oz * cs;
      }
    }
    const r = Math.hypot(pos.x, pos.z);
    if (r > WORLD.boundR) { pos.x *= WORLD.boundR / r; pos.z *= WORLD.boundR / r; }
  }

  /** 카메라 가림 판정: 점이 건물·나무 부피 안에 있는가 */
  blocked = (p: THREE.Vector3): boolean => {
    for (const o of this.occluders) {
      if (p.y > o.h) continue;
      const dx = p.x - o.x, dz = p.z - o.z;
      if (o.kind === 'cone') {
        if (p.y < (o.y0 ?? 0)) continue;
        const r = o.r * (1 - (p.y / o.h) * 0.85);
        if (dx * dx + dz * dz < r * r) return true;
      } else {
        const cs = Math.cos(o.rot), sn = Math.sin(o.rot);
        if (Math.abs(dx * cs - dz * sn) < o.hw && Math.abs(dx * sn + dz * cs) < o.hd) return true;
      }
    }
    return false;
  };

  /** 가장 가까운 상호작용 대상 (작은 대상이 큰 대상보다 우선) */
  nearest(x: number, z: number): Interactable | null {
    let best: Interactable | null = null, bestR = Infinity;
    for (const it of this.interactables) {
      if (Math.hypot(x - it.x, z - it.z) < it.r && it.r < bestR) { best = it; bestR = it.r; }
    }
    return best;
  }

  update(dt: number, t: number): void {
    this.bulbs.update(dt, t);
    this.tree.update(dt, t);
    for (const p of this.puffs) {
      p.age += dt;
      if (p.age > p.life) p.age -= p.life;
      const k = p.age / p.life;
      p.mesh.position.set(p.origin.x + p.dx * k * 1.2 + Math.sin(t + p.dx * 9) * 0.1, p.origin.y + k * 3.2, p.origin.z + k * 0.9);
      p.mesh.scale.setScalar(0.35 + k * 0.75);
      p.mat.opacity = 0.55 * Math.min(1, k * 5) * (1 - k);
    }
  }
}
