// 지형: 눈밭, 외곽 언덕, 광장 바닥, 길, 하늘
import * as THREE from 'three';
import { WORLD } from '../config';
import { COLORS, SNOW, std } from './materials';

/** 월드 외곽을 감싸는 눈 언덕의 높이 (플레이 영역 안쪽은 0) */
export function hillHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(r, WORLD.boundR + 1, 68);
  if (k <= 0) return 0;
  const th = Math.atan2(z, x);
  return k * (7.5 + 2.6 * Math.sin(th * 3 + 0.5) + 1.6 * Math.sin(th * 7 + 2) + 0.9 * Math.sin(th * 13 + 1));
}

export function buildGround(root: THREE.Group): void {
  const geo = new THREE.PlaneGeometry(210, 210, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hillHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, SNOW());
  ground.receiveShadow = true;
  root.add(ground);

  // 광장: 눈이 살짝 덮인 돌바닥
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.plazaR, 72),
    new THREE.MeshStandardMaterial({ map: plazaTexture(), roughness: 0.95 }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  root.add(plaza);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(WORLD.plazaR + 0.1, 0.5, 10, 96), SNOW());
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 0.22;
  rim.receiveShadow = true;
  root.add(rim);

  // 다져진 눈길
  const pathMat = std(0xdfe0ec, 1);
  for (const pt of WORLD.paths) {
    const len = pt.to - pt.from + 1.5;
    const path = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.pathHalfW * 2, len), pathMat);
    path.rotation.x = -Math.PI / 2;
    path.rotation.z = Math.atan2(pt.ax, pt.az);
    const mid = (pt.from + pt.to) / 2 - 0.4;
    path.position.set(pt.ax * mid, 0.012, pt.az * mid);
    path.receiveShadow = true;
    root.add(path);
    // 길 양옆의 낮은 눈 둔덕
    for (const s of [1, -1]) {
      const edge = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, len - 1.5, 6, 12), SNOW());
      edge.rotation.x = Math.PI / 2;
      edge.rotation.z = Math.atan2(pt.ax, pt.az);
      edge.scale.y = 1; edge.scale.z = 0.45;
      const off = s * (WORLD.pathHalfW + 0.15);
      edge.position.set(pt.ax * mid + pt.az * off, 0, pt.az * mid - pt.ax * off);
      edge.receiveShadow = true;
      root.add(edge);
    }
  }

  // 눈싸움 놀이터 바닥
  const a = WORLD.arena;
  const arena = new THREE.Mesh(new THREE.CircleGeometry(a.r, 56), std(0xdbe6f4, 1));
  arena.rotation.x = -Math.PI / 2;
  arena.position.set(a.x, 0.014, a.z);
  arena.receiveShadow = true;
  root.add(arena);
}

function plazaTexture(): THREE.CanvasTexture {
  const S = 2048, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b3a8ae';
  ctx.fillRect(0, 0, S, S);
  const shades = ['#d9d0cd', '#cfc5c4', '#d4c8c0', '#c6bcc0', '#ddd5d3'];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.translate(S / 2, S / 2);
  for (let r = 24; r < S / 2 + 30; r += 44) {
    const n = Math.max(6, Math.floor((Math.PI * 2 * r) / 64));
    const off = rnd() * 6;
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.rotate(((i + off) / n) * Math.PI * 2);
      ctx.fillStyle = shades[Math.floor(rnd() * shades.length)];
      const w = ((Math.PI * 2 * r) / n) - 7;
      ctx.beginPath();
      ctx.roundRect(r - 19, -w / 2, 38, w, 12);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // 눈 흩뿌림: 가장자리로 갈수록 많이
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * S * 0.5;
    const x = S / 2 + Math.cos(a) * rr, y = S / 2 + Math.sin(a) * rr;
    const rad = 28 + rnd() * 92;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const al = 0.25 + 0.5 * (rr / (S * 0.5)) ** 2;
    g.addColorStop(0, `rgba(250,249,252,${al})`);
    g.addColorStop(1, 'rgba(250,249,252,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const edge = ctx.createRadialGradient(S / 2, S / 2, S * 0.4, S / 2, S / 2, S * 0.5);
  edge.addColorStop(0, 'rgba(246,244,243,0)');
  edge.addColorStop(1, 'rgba(246,244,243,0.95)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export const SKY = { horizon: 0x9a86b4, mid: 0x55507f, top: 0x25254d, fog: 0x8279a6 };

export function buildSky(scene: THREE.Scene): void {
  const geo = new THREE.SphereGeometry(300, 32, 20);
  const p = geo.attributes.position;
  const cols = new Float32Array(p.count * 3);
  const h = new THREE.Color(SKY.horizon), m = new THREE.Color(SKY.mid), t = new THREE.Color(SKY.top), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = Math.max(0, p.getY(i) / 300);
    if (y < 0.25) c.lerpColors(h, m, y / 0.25); else c.lerpColors(m, t, Math.min(1, (y - 0.25) / 0.5));
    c.toArray(cols, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);

  // 별
  const n = 260, sp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.25 + Math.random() * 1.2;
    sp[i * 3] = Math.cos(a) * Math.cos(e) * 280;
    sp[i * 3 + 1] = Math.sin(e) * 280;
    sp[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 280;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xfff4dc, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false })));
  scene.fog = new THREE.Fog(SKY.fog, 45, 150);
  void COLORS;
}
