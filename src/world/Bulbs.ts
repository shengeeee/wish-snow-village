import * as THREE from 'three';

interface Bulb { pos: THREE.Vector3; color: THREE.Color; phase: number; speed: number; group: number }

/** 마을의 모든 전구를 InstancedMesh 1개 + 글로우 포인트 1개로 그리고 은은하게 반짝인다 */
export class Bulbs {
  private items: Bulb[] = [];
  private mesh?: THREE.InstancedMesh;
  private glow?: THREE.Points;
  private glowColors?: Float32Array;
  private boost = new Map<number, number>();
  private c = new THREE.Color();

  add(pos: THREE.Vector3, color: number, group = 0): void {
    this.items.push({
      pos: pos.clone(), color: new THREE.Color(color), group,
      phase: Math.random() * Math.PI * 2, speed: 1.2 + Math.random() * 2.2,
    });
  }

  build(parent: THREE.Object3D): void {
    const n = this.items.length;
    this.mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      n,
    );
    const m = new THREE.Matrix4();
    const pos = new Float32Array(n * 3);
    this.glowColors = new Float32Array(n * 3);
    this.items.forEach((b, i) => {
      m.setPosition(b.pos);
      this.mesh!.setMatrixAt(i, m);
      this.mesh!.setColorAt(i, b.color);
      b.pos.toArray(pos, i * 3);
    });
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.glowColors, 3));
    this.glow = new THREE.Points(g, new THREE.PointsMaterial({
      map: glowTexture(), size: 1.1, sizeAttenuation: true, vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.glow.frustumCulled = false;
    parent.add(this.glow);
  }

  /** 특정 그룹(예: 트리)의 전구를 잠시 더 밝게 */
  flash(group: number, amount = 1): void {
    this.boost.set(group, amount);
  }

  update(dt: number, t: number): void {
    if (!this.mesh || !this.glowColors) return;
    for (const [g, v] of this.boost) {
      const nv = v - dt * 0.45;
      if (nv <= 0) this.boost.delete(g); else this.boost.set(g, nv);
    }
    for (let i = 0; i < this.items.length; i++) {
      const b = this.items[i];
      const extra = this.boost.get(b.group) ?? 0;
      const tw = 0.7 + 0.3 * Math.sin(t * b.speed + b.phase);
      const k = tw + extra * (0.6 + 0.6 * Math.sin(t * 14 + b.phase * 3));
      this.c.copy(b.color).multiplyScalar(Math.max(0.2, k));
      this.mesh.setColorAt(i, this.c);
      const gk = 0.42 * k;
      this.glowColors[i * 3] = b.color.r * gk;
      this.glowColors[i * 3 + 1] = b.color.g * gk;
      this.glowColors[i * 3 + 2] = b.color.b * gk;
    }
    this.mesh.instanceColor!.needsUpdate = true;
    this.glow!.geometry.attributes.color.needsUpdate = true;
  }
}

function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
