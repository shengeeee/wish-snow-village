// 기본 플레이어 캐릭터 (2등신 패딩 캐릭터)
// 외부 모델 없이 코드로 생성한다. 추후 GLB로 교체할 때는
// root / setMoveSpeed / setPalette / update / dispose 인터페이스만 유지하면 된다.
import * as THREE from 'three';

export interface CharacterPalette {
  jacket: number;
  scarf: number;
  fur: number;
  mitten: number;
  pants: number;
  boot: number;
  skin: number;
  hair: number;
  blush: number;
}

function base(over: Partial<CharacterPalette>): CharacterPalette {
  return {
    jacket: 0xc5524a, scarf: 0x3f6f57, fur: 0xf6efe2, mitten: 0xf1e4cd, pants: 0x4a4a63,
    boot: 0x8a5f45, skin: 0xffd9c2, hair: 0x6b4a3a, blush: 0xf5958f, ...over,
  };
}

export const PALETTES = {
  red: base({ jacket: 0xc5524a, scarf: 0x3f6f57 }),
  green: base({ jacket: 0x47755e, scarf: 0xc5524a }),
  cream: base({ jacket: 0xe9d9bf, scarf: 0xc5524a, fur: 0xfffaf0 }),
  sky: base({ jacket: 0x8fb0cc, scarf: 0xf1e6d2 }),
  mustard: base({ jacket: 0xd8a548, scarf: 0x3f6f57 }),
} satisfies Record<string, CharacterPalette>;

export type PaletteKey = keyof typeof PALETTES;
export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

/** 캐릭터 전체 키 (이름표 위치 등에 사용) */
export const CHARACTER_HEIGHT = 1.32;

const DIM = { hipY: 0.2, jacketH: 0.44, headY: 0.76, hoodR: 0.36, faceR: 0.3, faceZ: 0.09 };

/** 패딩 몸통의 높이(0~1)별 반지름. 3단 퀼팅 볼륨 포함. */
function jacketRadius(t: number): number {
  const s = t * t * (3 - 2 * t);
  let r = THREE.MathUtils.lerp(0.25, 0.185, s);
  r += 0.022 * Math.pow(Math.abs(Math.sin(Math.PI * t * 3)), 0.55);
  if (t < 0.09) r *= Math.sqrt(1 - Math.pow(1 - t / 0.09, 2));
  r *= 1 - 0.45 * THREE.MathUtils.smoothstep(t, 0.86, 1);
  return r;
}

/** 털 느낌의 부드러운 요철 */
function fluff<T extends THREE.BufferGeometry>(geo: T, amp: number, freq: number): T {
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d =
      Math.sin(x * freq + 1.3) * Math.sin(y * freq * 1.13 + 0.7) * Math.sin(z * freq * 0.91 + 2.1) +
      0.5 * Math.sin(x * freq * 2.3 + y * freq * 1.7 + z * freq * 2.9);
    p.setXYZ(i, x + n.getX(i) * d * amp, y + n.getY(i) * d * amp, z + n.getZ(i) * d * amp);
  }
  return geo;
}

let fabricBump: THREE.CanvasTexture | null = null;
function getFabricBump(): THREE.CanvasTexture {
  if (fabricBump) return fabricBump;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 118 + Math.random() * 20;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  fabricBump = new THREE.CanvasTexture(c);
  fabricBump.wrapS = fabricBump.wrapT = THREE.RepeatWrapping;
  fabricBump.repeat.set(6, 6);
  return fabricBump;
}

interface Arm { shoulder: THREE.Group; splay: THREE.Group; side: number }

export class PlayerCharacter {
  readonly root = new THREE.Group();
  private mat: Record<string, THREE.MeshStandardMaterial | THREE.MeshBasicMaterial>;
  private geos: THREE.BufferGeometry[] = [];
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private scarfTail = new THREE.Group();
  private armL: Arm;
  private armR: Arm;
  private legL: THREE.Group;
  private legR: THREE.Group;
  private eyes: THREE.Group[] = [];
  private time = Math.random() * 10;
  private phase = 0;
  private speed = 0;
  private walk = 0;
  private blinkIn = 2 + Math.random() * 2;
  private blinkT = 0;

  constructor(palette: CharacterPalette = PALETTES.red) {
    this.root.name = 'PlayerCharacter';
    const bump = getFabricBump();
    const M = (this.mat = {
      jacket: new THREE.MeshPhysicalMaterial({
        color: palette.jacket, roughness: 0.72, sheen: 0.6, sheenRoughness: 0.55,
        sheenColor: new THREE.Color(0xffffff), bumpMap: bump, bumpScale: 0.6,
      }),
      scarf: new THREE.MeshStandardMaterial({ color: palette.scarf, roughness: 0.95, bumpMap: bump, bumpScale: 1.5 }),
      fur: new THREE.MeshStandardMaterial({ color: palette.fur, roughness: 1 }),
      mitten: new THREE.MeshStandardMaterial({ color: palette.mitten, roughness: 0.95 }),
      pants: new THREE.MeshStandardMaterial({ color: palette.pants, roughness: 0.9 }),
      boot: new THREE.MeshStandardMaterial({ color: palette.boot, roughness: 0.75 }),
      skin: new THREE.MeshStandardMaterial({ color: palette.skin, roughness: 0.62 }),
      hair: new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.8 }),
      blush: new THREE.MeshStandardMaterial({ color: palette.blush, roughness: 0.9, transparent: true, opacity: 0.55 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x2a2226, roughness: 0.25 }),
      white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      button: new THREE.MeshStandardMaterial({ color: 0xf3e7cf, roughness: 0.5 }),
    });

    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, shadow = true) => {
      this.geos.push(geo);
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = shadow;
      m.receiveShadow = shadow;
      parent.add(m);
      return m;
    };

    const { hips, torso, head } = this;
    hips.position.y = DIM.hipY;
    this.root.add(hips);
    hips.add(torso);

    // 패딩 몸통
    const pts: THREE.Vector2[] = [];
    const N = 56;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push(new THREE.Vector2(Math.max(jacketRadius(t), 0.0001), t * DIM.jacketH));
    }
    mesh(new THREE.LatheGeometry(pts, 56), M.jacket, torso).scale.z = 0.93;
    for (const t of [1 / 6, 1 / 2]) {
      const b = mesh(new THREE.SphereGeometry(0.024, 16, 12), M.button, torso);
      b.scale.z = 0.45;
      b.position.set(0, t * DIM.jacketH, jacketRadius(t) * 0.93 + 0.002);
    }

    // 목도리
    const scarf = mesh(new THREE.TorusGeometry(0.165, 0.062, 16, 48), M.scarf, torso);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.435;
    scarf.scale.set(1, 0.95, 0.85);
    mesh(new THREE.SphereGeometry(0.058, 16, 12), M.scarf, torso).position.set(0.105, 0.425, 0.17);
    const tail = this.scarfTail;
    tail.position.set(0.11, 0.42, 0.175);
    tail.rotation.set(-0.25, 0, -0.12);
    torso.add(tail);
    const tailMesh = mesh(new THREE.CapsuleGeometry(0.045, 0.11, 8, 16), M.scarf, tail);
    tailMesh.position.set(0, -0.1, 0.03);
    tailMesh.scale.z = 0.55;

    // 팔
    const makeArm = (side: number): Arm => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.2, 0.345, 0);
      torso.add(shoulder);
      const splay = new THREE.Group();
      splay.rotation.z = side * 0.5;
      shoulder.add(splay);
      mesh(new THREE.CapsuleGeometry(0.08, 0.1, 10, 20), M.jacket, splay).position.y = -0.085;
      const cuff = mesh(fluff(new THREE.TorusGeometry(0.058, 0.03, 12, 28), 0.006, 60), M.fur, splay);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.165;
      const mit = mesh(new THREE.SphereGeometry(0.068, 20, 16), M.mitten, splay);
      mit.position.y = -0.215;
      mit.scale.set(1, 1.08, 0.95);
      mesh(new THREE.SphereGeometry(0.028, 12, 10), M.mitten, splay).position.set(-side * 0.02, -0.2, 0.06);
      return { shoulder, splay, side };
    };
    this.armL = makeArm(1);
    this.armR = makeArm(-1);

    // 다리 + 부츠
    const makeLeg = (side: number): THREE.Group => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.095, 0.05, 0);
      hips.add(hip);
      mesh(new THREE.CapsuleGeometry(0.07, 0.06, 8, 16), M.pants, hip).position.y = -0.07;
      const boot = mesh(new THREE.SphereGeometry(0.1, 24, 18), M.boot, hip);
      boot.position.set(0, -0.178, 0.028);
      boot.scale.set(0.9, 0.72, 1.25);
      const cuff = mesh(fluff(new THREE.TorusGeometry(0.062, 0.03, 12, 28), 0.006, 60), M.fur, hip);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.115;
      return hip;
    };
    this.legL = makeLeg(1);
    this.legR = makeLeg(-1);

    // 머리 (패딩 모자 + 얼굴)
    head.position.y = DIM.headY;
    head.scale.set(1.05, 0.97, 1);
    hips.add(head);
    mesh(new THREE.SphereGeometry(DIM.hoodR, 56, 40), M.jacket, head);
    const seamGeo = new THREE.TorusGeometry(DIM.hoodR, 0.011, 8, 48, Math.PI);
    seamGeo.rotateZ(THREE.MathUtils.degToRad(52));
    seamGeo.rotateY(-Math.PI / 2);
    mesh(seamGeo, M.jacket, head);
    mesh(new THREE.SphereGeometry(DIM.faceR, 48, 36), M.skin, head).position.z = DIM.faceZ;
    mesh(fluff(new THREE.TorusGeometry(0.252, 0.06, 20, 72), 0.009, 42), M.fur, head).position.z = 0.262;
    const hair = mesh(new THREE.SphereGeometry(DIM.faceR + 0.004, 36, 12, 0, Math.PI * 2, 0, Math.PI * 0.2), M.hair, head);
    hair.position.z = DIM.faceZ;
    hair.rotation.x = 0.5;

    const onFace = (obj: THREE.Object3D, x: number, y: number, lift = 0) => {
      const z = Math.sqrt(DIM.faceR * DIM.faceR - x * x - y * y);
      const nrm = new THREE.Vector3(x, y, z).normalize();
      obj.position.set(x, y, z + DIM.faceZ).addScaledVector(nrm, lift);
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
      head.add(obj);
      return obj;
    };
    for (const side of [1, -1]) {
      const eye = onFace(new THREE.Group(), side * 0.098, -0.022, 0.002) as THREE.Group;
      mesh(new THREE.SphereGeometry(0.034, 20, 16), M.eye, eye, false).scale.set(0.9, 1.12, 0.4);
      mesh(new THREE.SphereGeometry(0.01, 10, 8), M.white, eye, false).position.set(0.011, 0.014, 0.013);
      this.eyes.push(eye);
      const blushG = onFace(new THREE.Group(), side * 0.168, -0.09, 0.001);
      mesh(new THREE.SphereGeometry(0.042, 16, 12), M.blush, blushG, false).scale.set(1.15, 0.75, 0.12);
    }
    const mouthGeo = new THREE.TorusGeometry(0.02, 0.0065, 8, 20, Math.PI);
    mouthGeo.rotateZ(Math.PI);
    mesh(mouthGeo, M.eye, onFace(new THREE.Group(), 0, -0.082, 0.001), false);
  }

  /** 이동 속도(0=정지, 1=최고 속도). 포즈는 update에서 부드럽게 보간된다. */
  setMoveSpeed(v: number): void {
    this.speed = THREE.MathUtils.clamp(v, 0, 1);
  }

  setPalette(p: CharacterPalette): void {
    for (const [k, v] of Object.entries(p)) this.mat[k]?.color.setHex(v);
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.walk += (this.speed - this.walk) * Math.min(1, dt * 8);
    const w = this.walk, idle = 1 - w;
    this.phase += dt * 9.5 * (0.35 + 0.65 * w);
    const s = Math.sin(this.phase);
    const breath = Math.sin(t * 2.1);

    this.hips.position.y = DIM.hipY + Math.abs(s) * 0.035 * w;
    this.hips.rotation.z = s * 0.055 * w;
    this.hips.rotation.y = s * 0.09 * w;
    this.torso.rotation.x = 0.07 * w;
    this.torso.scale.set(1 + 0.012 * breath * idle, 1 + 0.02 * breath * idle, 1 + 0.016 * breath * idle);

    const swing = s * 0.75 * w;
    this.legL.rotation.x = -swing;
    this.legR.rotation.x = swing;
    for (const arm of [this.armL, this.armR]) {
      arm.shoulder.rotation.x = arm.side * swing * 0.85;
      arm.splay.rotation.z = arm.side * (0.5 + 0.035 * breath * idle + 0.08 * w);
    }

    this.head.position.y = DIM.headY + 0.007 * breath * idle;
    this.head.rotation.z = -s * 0.035 * w + Math.sin(t * 0.7) * 0.025 * idle;
    this.head.rotation.y = -s * 0.05 * w + Math.sin(t * 0.45) * 0.09 * idle;
    this.head.rotation.x = Math.sin(t * 0.6 + 1) * 0.02 * idle;
    this.scarfTail.rotation.x = -0.25 + Math.sin(this.phase * 2 + 0.6) * 0.18 * w + Math.sin(t * 1.3) * 0.03;

    this.blinkIn -= dt;
    if (this.blinkIn <= 0) { this.blinkT = 0.14; this.blinkIn = 2.4 + Math.random() * 3; }
    let open = 1;
    if (this.blinkT > 0) {
      this.blinkT -= dt;
      open = Math.max(0.08, Math.abs(this.blinkT / 0.14 - 0.5) * 2);
    }
    for (const e of this.eyes) e.scale.y = open;
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    for (const m of Object.values(this.mat)) m.dispose();
    this.root.removeFromParent();
  }
}
