/**
 * CinemaCastingTornado — GPU funnel + wind dust from casting-abilities-threejs
 * (https://casting-abilities-threejs.vercel.app wind element).
 *
 * Port: multi-shell vertex funnel (neck/flare/lean/rope-out) + ridged dust helix.
 * Cinema SSOT: timed/path'd by CinemaTornadoDirector (beat-driven, not free sandbox).
 * FPS: low segment shells, additive only, no depth soft-fade RT readback.
 */
import * as THREE from 'three';
import { applyCinemaBlend, CINEMA_RENDER_ORDER } from './CinemaMaterialBlend';

/** Compact noise suite used by both shell VS/FS (casting-abilities Lf subset). */
const NOISE_GLSL = /* glsl */ `
vec3 mod289_c(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289_c(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute_c(vec4 x){return mod289_c(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt_c(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289_c(i);
  vec4 p=permute_c(permute_c(permute_c(
    i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt_c(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm3(vec3 p){
  float a=0.5,s=0.0;
  for(int i=0;i<4;i++){s+=a*snoise(p);p=p*2.02+17.0;a*=0.5;}
  return s;
}
float ridged(vec3 p,int oct){
  float a=0.5,s=0.0;
  for(int i=0;i<4;i++){
    if(i>=oct)break;
    s+=a*(1.0-abs(snoise(p)));
    p=p*2.1+9.0;a*=0.5;
  }
  return s;
}
float fresnelTerm(vec3 viewDir,vec3 n,float power,float scale){
  float f=1.0-max(0.0,dot(normalize(viewDir),normalize(n)));
  return pow(f,power)*scale;
}
`;

const TORNADO_VERT = /* glsl */ `
uniform float uTime;
uniform float uAge;
uniform float uNeck;
uniform float uFlare;
uniform float uSkirt;
uniform float uRough;
uniform float uLean;
uniform float uSeed;
uniform float uShellScale;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
${NOISE_GLSL}
float ropeT(){return smoothstep(0.62,1.0,uAge);}
vec2 coreOffset(float h){
  float w=pow(clamp(h,0.0,1.0),1.5);
  vec2 slow=vec2(snoise(vec3(h*1.05,uTime*0.33,0.0)),snoise(vec3(h*1.05,uTime*0.29,17.3)));
  vec2 fast=vec2(snoise(vec3(h*3.1,uTime*0.95,5.7)),snoise(vec3(h*3.1,uTime*0.88,41.2)));
  return (slow*0.78+fast*0.3)*uLean*w*(1.0+ropeT()*2.0);
}
float funnelRadius(float h,float ang){
  float hc=clamp(h,0.0,1.0);
  float r=mix(uNeck,1.0,pow(hc,uFlare));
  r+=uSkirt*exp(-hc*18.0);
  r*=1.0+uRough*fbm3(vec3(hc*2.6-uTime*0.9,uSeed*7.0,uTime*0.2));
  r*=1.0+0.07*snoise(vec3(cos(ang)*1.3,sin(ang)*1.3,hc*2.2-uTime*0.7+uSeed));
  r*=mix(1.0,0.34,ropeT());
  return max(r,0.015);
}
vec3 funnelPoint(float h,float ang){
  float r=funnelRadius(h,ang)*uShellScale;
  vec3 p=vec3(cos(ang)*r,h,sin(ang)*r);
  p.xz+=coreOffset(h);
  return p;
}
void main(){
  vUv=uv;
  float ang=uv.x*6.2831853;
  vec3 pos=funnelPoint(uv.y,ang);
  vec3 dh=funnelPoint(uv.y+0.02,ang)-pos;
  vec3 da=funnelPoint(uv.y,ang+0.06)-pos;
  vec4 world=modelMatrix*vec4(pos,1.0);
  vec3 wh=(modelMatrix*vec4(pos+dh,1.0)).xyz-world.xyz;
  vec3 wa=(modelMatrix*vec4(pos+da,1.0)).xyz-world.xyz;
  vNormalW=normalize(cross(wh,wa)+1e-6);
  vViewDir=cameraPosition-world.xyz;
  gl_Position=projectionMatrix*viewMatrix*world;
}
`;

const TORNADO_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAge;
uniform vec3 uColorInner;
uniform vec3 uColorOuter;
uniform float uOpacity;
uniform float uSpin;
uniform float uNoiseStrength;
uniform float uGlow;
uniform float uFresnel;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDir;
${NOISE_GLSL}
void main(){
  float h=clamp(vUv.y,0.0,1.0);
  float ang=vUv.x*6.2831853;
  float rate=uSpin*mix(2.2,0.55,smoothstep(0.0,0.9,h));
  float lift=uTime*uSpin*0.5;
  float w1=uTime*rate+h*5.0+uSeed;
  float w2=uTime*rate*0.72+h*6.4+uSeed*2.7;
  vec2 c1=vec2(cos(ang-w1),sin(ang-w1));
  vec2 c2=vec2(cos(ang-w2),sin(ang-w2));
  float n1=ridged(vec3(c1*2.1,h*2.4-lift),4);
  float n2=ridged(vec3(c2*3.9,h*4.6-lift*1.5),4);
  float dust=smoothstep(0.42,1.0,(n1*0.62+n2*0.38)*uNoiseStrength+0.26);
  float grit=fbm3(vec3(c1*8.5,h*8.0-lift*2.1))*0.5+0.5;
  dust*=0.62+0.62*grit;
  float fres=fresnelTerm(vViewDir,vNormalW,2.0,1.0)*uFresnel;
  float load=mix(1.15,0.45,smoothstep(0.0,0.8,h))*mix(0.4,1.0,smoothstep(0.0,0.16,h));
  float tip=mix(1.2,-0.25,smoothstep(0.0,0.3,uAge));
  float descend=smoothstep(tip-0.2,tip,h);
  float vertical=smoothstep(1.0,0.66,h)*smoothstep(0.0,0.04,h)*descend;
  float death=1.0-smoothstep(0.72,1.0,uAge);
  float facing=gl_FrontFacing?1.0:0.4;
  float body=vertical*load*uOpacity*death*facing;
  float alpha=dust*(0.42+fres*0.6)*body+fres*0.07*body;
  if(alpha<0.004) discard;
  vec3 color=mix(uColorOuter,uColorInner,clamp(dust*0.9+fres*0.45,0.0,1.0));
  color*=uGlow*mix(0.75,1.1,dust);
  gl_FragColor=vec4(color,alpha);
}
`;

export type CastingTornadoQuality = 'low' | 'medium' | 'high';

export type CastingTornadoOpts = {
  /** SI height of funnel (m) */
  heightM?: number;
  /** SI base radius (m) */
  radiusM?: number;
  quality?: CastingTornadoQuality;
  /** Water (ocean) vs air palette */
  water?: boolean;
};

type Shell = {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
};

const SEG: Record<CastingTornadoQuality, { radial: number; height: number; shells: number }> = {
  low: { radial: 28, height: 20, shells: 2 },
  medium: { radial: 40, height: 32, shells: 3 },
  high: { radial: 56, height: 40, shells: 3 },
};

function makeShellMaterial(index: number, water: boolean): THREE.ShaderMaterial {
  const inner = new THREE.Color(water ? 0xd8f4ff : 0xf4fcff);
  const outer = new THREE.Color(water ? 0x3a8ab0 : 0xb6d8ea);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAge: { value: 0 },
      uNeck: { value: 0.2 * (1 - index * 0.15) },
      uFlare: { value: 2 },
      uSkirt: { value: 0.3 * Math.max(0, 1 - index * 0.4) },
      uRough: { value: 0.17 * (1 + index * 0.35) },
      uLean: { value: 0.55 },
      uSeed: { value: index * 3.77 },
      uShellScale: { value: 1 - index * 0.17 },
      uColorInner: { value: inner },
      uColorOuter: { value: outer },
      uOpacity: { value: 0.55 * (1.5 / (0.5 + 1)) },
      uSpin: { value: 5.5 * (1 + index * 0.3) },
      uNoiseStrength: { value: 0.71 },
      uGlow: { value: 0.95 },
      uFresnel: { value: 1.36 },
    },
    vertexShader: TORNADO_VERT,
    fragmentShader: TORNADO_FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  // Soft additive custom blend — smoother than raw AdditiveBlending under post
  applyCinemaBlend(mat, {
    recipe: 'softAdditive',
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  return mat;
}

/** One casting-abilities wind tornado (multi-shell GPU funnel + dust). */
export class CinemaCastingTornado {
  readonly root = new THREE.Group();
  private shells: Shell[] = [];
  private dust: THREE.Points | null = null;
  private heightM: number;
  private radiusM: number;
  private age = 0;
  private time = 0;
  private quality: CastingTornadoQuality;
  /** 0..1 grow for external lifecycle */
  grow = 0;
  spin = 2.4 + Math.random() * 0.6;

  constructor(opts: CastingTornadoOpts = {}) {
    this.heightM = opts.heightM ?? 7.2;
    this.radiusM = opts.radiusM ?? 2.2;
    this.quality = opts.quality ?? 'medium';
    const water = opts.water !== false;
    const segs = SEG[this.quality];
    // Shared unit cylinder; scale Y = height, XZ = radius
    const geo = new THREE.CylinderGeometry(1, 1, 1, segs.radial, segs.height, true);
    geo.translate(0, 0.5, 0);
    for (let i = 0; i < segs.shells; i++) {
      const mat = makeShellMaterial(i, water);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.renderOrder = CINEMA_RENDER_ORDER.tornado + i;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.root.add(mesh);
      this.shells.push({ mesh, mat });
    }
    // Lightweight dust (instanced-friendly points, no extra draw for leaves)
    const dustN = this.quality === 'high' ? 180 : this.quality === 'medium' ? 110 : 60;
    const pos = new Float32Array(dustN * 3);
    for (let i = 0; i < dustN; i++) {
      const a = Math.random() * Math.PI * 2;
      const h = Math.random();
      const r = 0.15 + h * 0.9;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const dgeo = new THREE.BufferGeometry();
    dgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dmat = new THREE.PointsMaterial({
      color: water ? 0xa8d8f0 : 0xe8f6ff,
      size: 0.18,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      fog: false,
      toneMapped: false,
    });
    applyCinemaBlend(dmat, {
      recipe: 'softAdditive',
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
      fog: false,
    });
    this.dust = new THREE.Points(dgeo, dmat);
    this.dust.frustumCulled = false;
    this.dust.renderOrder = CINEMA_RENDER_ORDER.tornado + 3;
    this.root.add(this.dust);
    this.root.scale.set(this.radiusM, this.heightM, this.radiusM);
    this.root.name = 'cinema_casting_tornado';
    this.root.renderOrder = CINEMA_RENDER_ORDER.tornado;
    this.root.visible = false;
  }

  /** Lifecycle age 0..1 (cast birth → rope death). */
  setAge(age: number): void {
    this.age = THREE.MathUtils.clamp(age, 0, 1);
    for (const s of this.shells) s.mat.uniforms.uAge.value = this.age;
  }

  setGrow(grow: number): void {
    this.grow = THREE.MathUtils.clamp(grow, 0, 1);
    // Scale visual height with grow; age tracks maturity for shader rope
    const s = 0.08 + this.grow * 0.92;
    this.root.scale.set(this.radiusM * s, this.heightM * s, this.radiusM * s);
    // Birth only — don't fight kill() age scrub
    if (this.age < 0.7) {
      this.setAge(this.grow * 0.55);
    }
  }

  /** Kill dissolve — push age toward 1 for rope-out. */
  kill(dt: number): boolean {
    this.age = Math.min(1, this.age + dt * 1.1);
    for (const s of this.shells) s.mat.uniforms.uAge.value = this.age;
    this.grow = Math.max(0, this.grow - dt * 2.2);
    const s = Math.max(0.04, 0.08 + this.grow * 0.92);
    this.root.scale.set(this.radiusM * s, this.heightM * s, this.radiusM * s);
    if (this.dust) {
      const m = this.dust.material as THREE.PointsMaterial;
      m.opacity = Math.max(0, 0.55 * (1 - this.age));
    }
    return this.age >= 0.98 || this.grow <= 0.04;
  }

  update(dt: number, windLean = 0.55): void {
    this.time += dt;
    this.root.rotation.y += dt * this.spin * (0.7 + this.grow * 0.5);
    for (const s of this.shells) {
      s.mat.uniforms.uTime.value = this.time;
      s.mat.uniforms.uLean.value = windLean;
      s.mat.uniforms.uAge.value = this.age;
    }
    if (this.dust?.visible) {
      const attr = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const spin = this.time * this.spin * 1.4;
      for (let i = 0; i < arr.length; i += 3) {
        const h = arr[i + 1];
        const r0 = 0.12 + h * 0.95;
        const a = spin * (2.2 - h * 1.4) + i * 0.17;
        arr[i] = Math.cos(a) * r0;
        arr[i + 2] = Math.sin(a) * r0;
        arr[i + 1] = (h + dt * 0.35) % 1;
      }
      attr.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const s of this.shells) {
      s.mat.dispose();
    }
    // shared geo — dispose once
    const geo = this.shells[0]?.mesh.geometry;
    geo?.dispose();
    if (this.dust) {
      this.dust.geometry.dispose();
      (this.dust.material as THREE.Material).dispose();
    }
    this.shells = [];
    this.dust = null;
  }
}

// ── AI path / timing director ──────────────────────────────────────────

export type TornadoPlan = {
  /** Spawn world XZ */
  spawn: THREE.Vector3;
  /** Path samples toward ship (world) */
  path: THREE.Vector3[];
  /** Stagger delay before visible (s) */
  delay: number;
  /** Advance speed bias */
  aggressiveness: number;
};

/**
 * Deterministic “AI” director: times + paths cyclones from levi cast → hull.
 * Golden-angle spacing, Catmull-style mid control from wind direction.
 */
export function planCastingTornadoPaths(
  ship: THREE.Vector3,
  levi: THREE.Vector3,
  count: number,
  seed = 1,
): TornadoPlan[] {
  const plans: TornadoPlan[] = [];
  const windAng = Math.atan2(ship.x - levi.x, ship.z - levi.z);
  const golden = 2.399963229728653; // ≈ 137.5°
  for (let i = 0; i < count; i++) {
    const ang = windAng + Math.PI + i * golden + seed * 0.17;
    const dist = 18 + i * 4.5 + ((seed * 13 + i * 7) % 5);
    const spawn = new THREE.Vector3(
      levi.x + Math.cos(ang) * dist * 0.35 + Math.cos(ang + 0.8) * 8,
      0.04,
      levi.z + Math.sin(ang) * dist * 0.35 + Math.sin(ang + 0.8) * 8,
    );
    // Prefer spawn on levi-side water, then spiral toward ship
    const mid1 = new THREE.Vector3().lerpVectors(spawn, ship, 0.35);
    mid1.x += Math.cos(ang + 1.2) * 6;
    mid1.z += Math.sin(ang + 1.2) * 6;
    mid1.y = 0.04;
    const mid2 = new THREE.Vector3().lerpVectors(spawn, ship, 0.7);
    mid2.x += Math.cos(ang - 0.9) * 3.5;
    mid2.z += Math.sin(ang - 0.9) * 3.5;
    mid2.y = 0.05;
    const end = ship.clone();
    end.x += Math.cos(ang) * (4 + i * 0.8);
    end.z += Math.sin(ang) * (4 + i * 0.8);
    end.y = 0.06;
    plans.push({
      spawn,
      path: [spawn.clone(), mid1, mid2, end],
      delay: i * 0.48 + (i % 2) * 0.12,
      aggressiveness: 0.85 + i * 0.12,
    });
  }
  return plans;
}

/** Sample piecewise-linear path at u 0..1 */
export function sampleTornadoPath(path: THREE.Vector3[], u: number, out: THREE.Vector3): THREE.Vector3 {
  if (path.length === 0) return out.set(0, 0, 0);
  if (path.length === 1) return out.copy(path[0]);
  const t = THREE.MathUtils.clamp(u, 0, 1) * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(t));
  const f = t - i;
  // smoothstep for cinematic ease
  const s = f * f * (3 - 2 * f);
  return out.copy(path[i]).lerp(path[i + 1], s);
}

/**
 * Global wind vector for ocean + rain lean (casting wind field).
 * Strength scales with storm + active cyclone count.
 */
export function cinemaWindVector(
  storm: number,
  cycloneActive: number,
  ship: THREE.Vector3,
  levi: THREE.Vector3,
  out: THREE.Vector3,
): THREE.Vector3 {
  out.subVectors(ship, levi);
  out.y = 0;
  if (out.lengthSq() < 1e-4) out.set(1, 0, 0.35);
  out.normalize();
  const str = 0.4 + storm * 0.85 + Math.min(3, cycloneActive) * 0.15;
  return out.multiplyScalar(str);
}
