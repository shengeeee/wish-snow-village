import * as THREE from 'three';

/** 캐릭터 뒤를 부드럽게 따라가는 3인칭 카메라. 건물·나무에 가려지면 앞으로 당겨진다. */
export class FollowCamera {
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  yaw = 0;
  private yawT = 0;
  private pitch = 0.1;
  private pitchT = 0.1;
  private dist = 4.6;
  private distT = 4.6;
  private curDist = 4.6;
  private height = 0.55;
  private heightT = 0.55;
  private focus = new THREE.Vector3();
  private started = false;
  private dir = new THREE.Vector3();
  private p = new THREE.Vector3();

  /** 닉네임 설정 중: 캐릭터를 가까이서 정면으로 */
  setIntro(on: boolean): void {
    if (on) { this.distT = 4.6; this.pitchT = 0.1; this.heightT = 0.45; }
    else { this.distT = 8; this.pitchT = 0.3; this.heightT = 1.0; }
  }

  rotate(dx: number, dy: number): void {
    this.yawT -= dx * 0.0055;
    this.pitchT = THREE.MathUtils.clamp(this.pitchT + dy * 0.004, 0.04, 1.15);
  }

  zoomBy(delta: number): void {
    this.distT = THREE.MathUtils.clamp(this.distT + delta * 0.006, 3.5, 13);
  }

  update(dt: number, target: THREE.Vector3, blocked: (p: THREE.Vector3) => boolean): void {
    const k = (r: number) => 1 - Math.exp(-r * dt);
    this.yaw += (this.yawT - this.yaw) * k(14);
    this.pitch += (this.pitchT - this.pitch) * k(this.started ? 14 : 100);
    this.dist += (this.distT - this.dist) * k(4);
    this.height += (this.heightT - this.height) * k(4);
    this.p.set(target.x, target.y + this.height, target.z);
    if (!this.started) { this.focus.copy(this.p); this.started = true; }
    else this.focus.lerp(this.p, k(9));

    const cp = Math.cos(this.pitch);
    this.dir.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    // 가림 처리: 초점에서 카메라 쪽으로 훑으며 처음 막히는 지점 앞에서 멈춘다
    let allowed = this.dist;
    const steps = 20;
    for (let i = 3; i <= steps; i++) {
      const s = (this.dist * i) / steps;
      this.p.copy(this.focus).addScaledVector(this.dir, s);
      if (blocked(this.p)) { allowed = Math.max(1.6, (this.dist * (i - 1)) / steps - 0.25); break; }
    }
    this.curDist += (allowed - this.curDist) * k(allowed < this.curDist ? 18 : 3);

    this.camera.position.copy(this.focus).addScaledVector(this.dir, this.curDist);
    if (this.camera.position.y < 0.35) this.camera.position.y = 0.35;
    this.camera.lookAt(this.focus);
  }
}
