import * as THREE from 'three';
import { tierGeometry, snowCapGeometry } from './foliage';
import { std, COLORS, SNOW } from './materials';
import { makeGift } from './props';
import type { WorldCtx } from './types';

export const TREE_BULB_GROUP = 1;

/** 광장 중앙의 거대한 소원 트리 */
export class ChristmasTree {
  readonly group = new THREE.Group();
  private star: THREE.Mesh;
  private starLight: THREE.PointLight;
  private ornaments: THREE.InstancedMesh;
  private flashT = 0;
  private bulbs: WorldCtx['bulbs'];

  constructor(ctx: WorldCtx) {
    this.bulbs = ctx.bulbs;
    const g = this.group;
    const leaf = std(COLORS.pine, 0.9), snow = SNOW();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, y = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y;
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      return m;
    };

    add(new THREE.CylinderGeometry(0.5, 0.7, 2.2, 20), std(COLORS.trunk, 0.9), 1.1);
    const mound = add(new THREE.SphereGeometry(3.3, 40, 16), snow, 0);
    mound.scale.y = 0.11;

    const N = 6;
    const orn: { p: THREE.Vector3; c: number }[] = [];
    const ornColors = [COLORS.red, COLORS.gold, COLORS.cream, COLORS.red, 0xd98a6a];
    const bulbColors = [0xffd27a, 0xffb35c, 0xfff1c9, 0xff8a6a, 0xffd27a];
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const R = THREE.MathUtils.lerp(4.4, 1.3, f);
      const H = THREE.MathUtils.lerp(3.4, 2.5, f);
      const y = 1.7 + i * 1.6;
      const lobes = Math.round(R * 3.2);
      add(tierGeometry(R, H, lobes), leaf, y);
      add(snowCapGeometry(R, H, lobes, 0.58), snow, y);

      // 가지 끝 전구
      const nb = Math.round(R * 6.5);
      for (let k = 0; k < nb; k++) {
        const a = (k / nb) * Math.PI * 2 + i * 0.5;
        ctx.bulbs.add(new THREE.Vector3(Math.cos(a) * R * 1.0, y - 0.1, Math.sin(a) * R * 1.0), bulbColors[(k + i) % bulbColors.length], TREE_BULB_GROUP);
        if (k % 2 === 0) {
          const t = 0.84, r = R * Math.pow(t, 0.9) + 0.1;
          const a2 = a + 0.3;
          ctx.bulbs.add(new THREE.Vector3(Math.cos(a2) * r, y + H * Math.pow(1 - t, 1.2) + 0.08, Math.sin(a2) * r), bulbColors[(k + i + 2) % bulbColors.length], TREE_BULB_GROUP);
        }
      }
      // 오너먼트
      const no = Math.round(R * 3.4);
      for (let k = 0; k < no; k++) {
        const a = (k / no) * Math.PI * 2 + i * 1.1 + 0.2;
        const t = 0.93, r = R * Math.pow(t, 0.9) + 0.14;
        orn.push({ p: new THREE.Vector3(Math.cos(a) * r, y + H * Math.pow(1 - t, 1.2) - 0.12, Math.sin(a) * r), c: ornColors[(k + i * 2) % ornColors.length] });
      }
    }
    this.ornaments = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.2, 20, 14),
      new THREE.MeshStandardMaterial({ roughness: 0.28, metalness: 0.25 }),
      orn.length,
    );
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    orn.forEach((o, i) => {
      m4.setPosition(o.p);
      this.ornaments.setMatrixAt(i, m4);
      this.ornaments.setColorAt(i, col.setHex(o.c));
    });
    this.ornaments.castShadow = true;
    g.add(this.ornaments);

    // 별
    const top = 1.7 + (N - 1) * 1.6 + 2.5;
    const shape = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 0.72 : 0.34;
      const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
      if (k === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const starGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.09, bevelSegments: 4 });
    starGeo.translate(0, 0, -0.06);
    this.star = add(starGeo, new THREE.MeshStandardMaterial({ color: 0xffd76e, emissive: 0xffc04a, emissiveIntensity: 1.6, roughness: 0.4 }), top + 0.55);
    this.star.castShadow = false;
    this.starLight = new THREE.PointLight(0xffd9a0, 90, 34, 1.8);
    this.starLight.position.set(0, top + 0.4, 0);
    g.add(this.starLight);
    ctx.lights.push(this.starLight);
    const baseLight = new THREE.PointLight(0xffc98a, 12, 20, 1.8);
    baseLight.position.set(0, 1.5, 6.5);
    g.add(baseLight);
    ctx.lights.push(baseLight);

    // 트리 아래 선물
    const giftCols = [COLORS.red, COLORS.green, COLORS.cream, COLORS.gold, 0x9db7cf, COLORS.red, 0xd9a3a0, COLORS.green, COLORS.cream];
    giftCols.forEach((c, i) => {
      const a = (i / giftCols.length) * Math.PI * 2 + 0.3;
      const r = 2.0 + ctx.rng() * 1.0;
      const s = 0.55 + ctx.rng() * 0.45;
      const gift = makeGift(s, c, c === COLORS.cream || c === COLORS.gold ? COLORS.red : COLORS.cream);
      gift.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
      gift.rotation.y = ctx.rng() * Math.PI;
      g.add(gift);
    });

    ctx.root.add(g);
    ctx.colliders.push({ kind: 'circle', x: 0, z: 0, r: 3.4 });
    ctx.occluders.push({ kind: 'cone', x: 0, z: 0, r: 4.9, h: top + 1, y0: 1.45 });
  }

  /** 트리 전구가 잠시 화려하게 반짝인다 */
  sparkle(): void {
    this.flashT = 1;
    this.bulbs.flash(TREE_BULB_GROUP, 1);
  }

  update(dt: number, t: number): void {
    this.flashT = Math.max(0, this.flashT - dt * 0.45);
    this.star.rotation.y = Math.sin(t * 0.5) * 0.5;
    const pulse = 1 + 0.08 * Math.sin(t * 2.3) + this.flashT * 0.6;
    this.star.scale.setScalar(pulse);
    (this.star.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + 0.3 * Math.sin(t * 2.3) + this.flashT * 2;
    this.starLight.intensity = 90 * pulse;
    // 장식이 살짝 흔들리는 느낌
    this.ornaments.rotation.y = Math.sin(t * 0.8) * 0.006;
    this.ornaments.position.y = Math.sin(t * 1.1) * 0.012;
  }
}
