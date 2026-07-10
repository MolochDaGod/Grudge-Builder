/**
 * WarAtmosphere — epic siege weather + sky for Warlord Isle.
 *
 * Storm-over-the-sea aesthetic: volumetric-ish fog, rain sheets, distant
 * lightning, god-ray sun breaks, wind-blown cloud planes.
 * Three.js best practices: GPU Points rain, shared materials, no per-frame alloc.
 */
import * as THREE from 'three';

export type WeatherPreset = 'storm' | 'golden_hour' | 'overcast' | 'dusk_battle';

export interface AtmosphereHandles {
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  fill: THREE.DirectionalLight;
}

export class WarAtmosphere {
  readonly root = new THREE.Group();
  private rain: THREE.Points | null = null;
  private rainVel: Float32Array | null = null;
  private clouds: THREE.Mesh[] = [];
  private flash = 0;
  private nextBolt = 8;
  private t = 0;
  private preset: WeatherPreset;
  private lights: AtmosphereHandles;
  private fogColor = new THREE.Color(0x4a5a6e);
  private scene: THREE.Scene;
  private wind = new THREE.Vector2(2.5, 0.8);

  constructor(
    scene: THREE.Scene,
    lights: AtmosphereHandles,
    preset: WeatherPreset = 'storm',
  ) {
    this.scene = scene;
    this.lights = lights;
    this.preset = preset;
    this.root.name = 'war_atmosphere';
    scene.add(this.root);
    this.applyPreset(preset);
    this.buildClouds();
    if (preset === 'storm' || preset === 'dusk_battle') {
      this.buildRain(preset === 'storm' ? 6000 : 2800);
    }
  }

  applyPreset(preset: WeatherPreset): void {
    this.preset = preset;
    const { sun, hemi, ambient, fill } = this.lights;

    switch (preset) {
      case 'storm':
        // Readable battlefield: cool storm without white-out fog
        this.fogColor.setHex(0x5a6a7c);
        this.scene.background = new THREE.Color(0x4a5a6c);
        this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.0045);
        sun.color.setHex(0xd8e4f0);
        sun.intensity = 0.95;
        sun.position.set(40, 70, -30);
        hemi.color.setHex(0x8a9ab0);
        hemi.groundColor.setHex(0x2a2218);
        hemi.intensity = 0.65;
        ambient.intensity = 0.32;
        fill.color.setHex(0x5080c0);
        fill.intensity = 0.4;
        fill.position.set(-50, 20, 40);
        this.wind.set(4.2, 1.4);
        break;
      case 'golden_hour':
        this.fogColor.setHex(0xc4a070);
        this.scene.background = new THREE.Color(0x8a6a4a);
        this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.007);
        sun.color.setHex(0xffc080);
        sun.intensity = 1.55;
        sun.position.set(90, 28, 20);
        hemi.color.setHex(0xffe0b0);
        hemi.groundColor.setHex(0x3a2818);
        hemi.intensity = 0.55;
        ambient.intensity = 0.28;
        fill.color.setHex(0x6080c0);
        fill.intensity = 0.2;
        fill.position.set(-40, 15, -20);
        this.wind.set(1.2, 0.3);
        break;
      case 'overcast':
        this.fogColor.setHex(0x6a7580);
        this.scene.background = new THREE.Color(0x5a6570);
        this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.009);
        sun.color.setHex(0xd0d8e0);
        sun.intensity = 0.7;
        sun.position.set(30, 80, 40);
        hemi.color.setHex(0xb0b8c0);
        hemi.groundColor.setHex(0x2a2820);
        hemi.intensity = 0.6;
        ambient.intensity = 0.32;
        fill.intensity = 0.15;
        this.wind.set(2.0, 0.6);
        break;
      case 'dusk_battle':
      default:
        this.fogColor.setHex(0x5a4060);
        this.scene.background = new THREE.Color(0x2a1830);
        this.scene.fog = new THREE.FogExp2(this.fogColor.getHex(), 0.005);
        sun.color.setHex(0xff8050);
        sun.intensity = 1.15;
        sun.position.set(-60, 28, 50);
        hemi.color.setHex(0x9070a8);
        hemi.groundColor.setHex(0x1a1008);
        hemi.intensity = 0.55;
        ambient.color.setHex(0x302030);
        ambient.intensity = 0.35;
        fill.color.setHex(0x3060c0);
        fill.intensity = 0.45;
        fill.position.set(50, 25, -30);
        this.wind.set(3.0, 1.0);
        break;
    }
  }

  private buildClouds(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 7; i++) {
      const w = 40 + Math.random() * 50;
      const h = 8 + Math.random() * 12;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 1), mat.clone());
      (m.material as THREE.MeshBasicMaterial).opacity = 0.12 + Math.random() * 0.18;
      (m.material as THREE.MeshBasicMaterial).color.setHSL(
        0.58,
        0.08,
        0.35 + Math.random() * 0.2,
      );
      m.position.set(
        (Math.random() - 0.5) * 180,
        28 + Math.random() * 22,
        (Math.random() - 0.5) * 180,
      );
      m.rotation.x = -0.15 + Math.random() * 0.1;
      m.rotation.y = Math.random() * Math.PI * 2;
      m.userData.drift = 0.4 + Math.random() * 0.8;
      m.userData.phase = Math.random() * Math.PI * 2;
      this.root.add(m);
      this.clouds.push(m);
    }
  }

  private buildRain(count: number): void {
    const positions = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 160;
      positions[i * 3 + 1] = Math.random() * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 160;
      vel[i] = 18 + Math.random() * 22;
    }
    this.rainVel = vel;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xa0c0e0,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.frustumCulled = false;
    this.rain.name = 'storm_rain';
    this.root.add(this.rain);
  }

  update(dt: number): void {
    this.t += dt;
    this.nextBolt -= dt;

    // Cloud drift
    for (const c of this.clouds) {
      c.position.x += this.wind.x * (c.userData.drift as number) * dt * 0.35;
      c.position.z += this.wind.y * (c.userData.drift as number) * dt * 0.2;
      if (c.position.x > 100) c.position.x = -100;
      if (c.position.z > 100) c.position.z = -100;
      c.position.y += Math.sin(this.t * 0.3 + (c.userData.phase as number)) * 0.01;
    }

    // Rain
    if (this.rain && this.rainVel) {
      const pos = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      const n = pos.count;
      for (let i = 0; i < n; i++) {
        arr[i * 3] += this.wind.x * dt * 1.2;
        arr[i * 3 + 1] -= this.rainVel[i]! * dt;
        arr[i * 3 + 2] += this.wind.y * dt * 0.8;
        if (arr[i * 3 + 1]! < 0) {
          arr[i * 3 + 1] = 45 + Math.random() * 10;
          arr[i * 3] = (Math.random() - 0.5) * 160;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
        }
      }
      pos.needsUpdate = true;
    }

    // Lightning flash
    if (this.preset === 'storm' || this.preset === 'dusk_battle') {
      if (this.nextBolt <= 0) {
        this.flash = 0.35 + Math.random() * 0.4;
        this.nextBolt = 6 + Math.random() * 14;
      }
      if (this.flash > 0) {
        this.flash = Math.max(0, this.flash - dt * 2.2);
        const f = Math.sin(this.flash * Math.PI) * 0.9;
        this.lights.ambient.intensity = 0.18 + f * 1.4;
        this.lights.hemi.intensity = 0.45 + f * 0.8;
        if (this.scene.fog && (this.scene.fog as THREE.FogExp2).isFogExp2) {
          (this.scene.fog as THREE.FogExp2).color.lerpColors(
            this.fogColor,
            new THREE.Color(0xc0d0ff),
            f * 0.6,
          );
        }
      }
    }

    // Subtle sun sway
    const sun = this.lights.sun;
    const base = sun.userData.basePos as THREE.Vector3 | undefined;
    if (!base) {
      sun.userData.basePos = sun.position.clone();
    } else {
      sun.position.x = base.x + Math.sin(this.t * 0.07) * 4;
      sun.position.z = base.z + Math.cos(this.t * 0.05) * 3;
    }
  }

  /** Bloom boost during lightning for post stack */
  getBloomBoost(): number {
    return this.flash > 0 ? this.flash * 0.8 : 0;
  }

  dispose(): void {
    this.scene.remove(this.root);
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
        else m.material.dispose();
      }
    });
  }
}
