import * as THREE from 'three';

/** GPU에서 움직이는 눈송이. 카메라 주변 상자 안에서 무한히 순환한다. */
export class Snowfall {
  readonly points: THREE.Points;
  private mat: THREE.ShaderMaterial;

  constructor(count: number) {
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * 60;
      pos[i * 3 + 1] = Math.random() * 34;
      pos[i * 3 + 2] = Math.random() * 60;
      seed[i * 3] = Math.random();
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uScale: { value: 100 } },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        uniform float uTime; uniform vec3 uCenter; uniform float uScale;
        attribute vec3 aSeed; varying float vAlpha;
        const vec3 BOX = vec3(60.0, 34.0, 60.0);
        void main() {
          vec3 p = position;
          p.y -= uTime * (1.1 + aSeed.x * 1.4);              // 눈송이마다 다른 낙하 속도
          p.x += sin(uTime * 0.6 + aSeed.z * 6.28) * 0.7 + uTime * 0.3;
          p.z += cos(uTime * 0.5 + aSeed.z * 4.0) * 0.7;
          p = mod(p - uCenter + BOX * 0.5, BOX) - BOX * 0.5 + uCenter;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.55 + aSeed.y * 0.9) / max(-mv.z, 0.1);
          vAlpha = smoothstep(34.0, 18.0, -mv.z) * smoothstep(0.4, 2.0, -mv.z) * (0.55 + 0.45 * aSeed.y);
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.12, d) * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, a);
        }`,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  update(t: number, camera: THREE.Camera, viewportHeightPx: number): void {
    this.mat.uniforms.uTime.value = t;
    (this.mat.uniforms.uCenter.value as THREE.Vector3).set(camera.position.x, 15, camera.position.z);
    this.mat.uniforms.uScale.value = viewportHeightPx * 0.11;
  }
}
