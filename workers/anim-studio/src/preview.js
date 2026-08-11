import * as THREE from "three";

export function createPreview(host) {
  const w = host.clientWidth || 480;
  const h = host.clientHeight || 340;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  host.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a1018);
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 50);
  camera.position.set(0, 1.15, 3.1);
  camera.lookAt(0, 0.9, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.15));
  scene.add(new THREE.GridHelper(4, 12, 0x334455, 0x1a2433));

  const root = new THREE.Group();
  scene.add(root);
  const bones = new Map();
  const mk = (name, parent, ox = 0, oy = 0.15, oz = 0) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(ox, oy, oz);
    parent.add(b);
    bones.set(name, b);
    const joint = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3dd6c6, emissive: 0x0a3030, roughness: 0.5 }),
    );
    b.add(joint);
    return b;
  };

  const hips = mk("mixamorigHips", root, 0, 1.0, 0);
  const spine = mk("mixamorigSpine", hips, 0, 0.14, 0);
  const spine2 = mk("mixamorigSpine2", spine, 0, 0.14, 0);
  const neck = mk("mixamorigNeck", spine2, 0, 0.1, 0);
  mk("mixamorigHead", neck, 0, 0.12, 0);
  const lSh = mk("mixamorigLeftShoulder", spine2, 0.12, 0.04, 0);
  const lArm = mk("mixamorigLeftArm", lSh, 0.16, 0, 0);
  const lFa = mk("mixamorigLeftForeArm", lArm, 0.2, 0, 0);
  mk("mixamorigLeftHand", lFa, 0.16, 0, 0);
  const rSh = mk("mixamorigRightShoulder", spine2, -0.12, 0.04, 0);
  const rArm = mk("mixamorigRightArm", rSh, -0.16, 0, 0);
  const rFa = mk("mixamorigRightForeArm", rArm, -0.2, 0, 0);
  mk("mixamorigRightHand", rFa, -0.16, 0, 0);
  const lUp = mk("mixamorigLeftUpLeg", hips, 0.1, 0, 0);
  const lLeg = mk("mixamorigLeftLeg", lUp, 0, -0.38, 0);
  mk("mixamorigLeftFoot", lLeg, 0, -0.38, 0);
  const rUp = mk("mixamorigRightUpLeg", hips, -0.1, 0, 0);
  const rLeg = mk("mixamorigRightLeg", rUp, 0, -0.38, 0);
  mk("mixamorigRightFoot", rLeg, 0, -0.38, 0);

  const helper = new THREE.SkeletonHelper(hips);
  helper.material.color.set(0x7c9cff);
  scene.add(helper);

  const mixer = new THREE.AnimationMixer(root);
  const clock = new THREE.Clock();
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    mixer.update(clock.getDelta());
    renderer.render(scene, camera);
  };
  loop();

  function motionToClip(motion) {
    const boneNames = Object.keys(motion.frames[0]?.pose || {});
    const times = motion.frames.map((f) => f.t);
    const tracks = boneNames.map((bone) => {
      const values = [];
      for (const f of motion.frames) {
        const q = f.pose[bone] || [0, 0, 0, 1];
        values.push(q[0], q[1], q[2], q[3]);
      }
      return new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values);
    });
    const clip = new THREE.AnimationClip(motion.id || "mocap", motion.durationSec, tracks);
    clip.optimize?.();
    return clip;
  }

  function play(motion) {
    mixer.stopAllAction();
    const clip = motionToClip(motion);
    const action = mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.12).play();
    return action;
  }

  function dispose() {
    cancelAnimationFrame(raf);
    mixer.stopAllAction();
    renderer.dispose();
    host.replaceChildren();
  }

  function resize() {
    const nw = host.clientWidth || w;
    const nh = host.clientHeight || h;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  }
  window.addEventListener("resize", resize);

  return { play, dispose, resize, mixer };
}
