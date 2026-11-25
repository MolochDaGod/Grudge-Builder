/**
 * ShipwreckGizmo — TransformControls + numeric XYZ for scene entities.
 * Translate / rotate / scale modes for prefabs, nodes, NPCs, zones.
 */
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { Xyz } from '@shared/definitions/shipwreckScene';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface ShipwreckGizmoHandle {
  controls: TransformControls;
  attach: (object: THREE.Object3D | null) => void;
  setMode: (mode: GizmoMode) => void;
  getXyz: () => Xyz | null;
  setXyz: (xyz: Xyz) => void;
  setRotationY: (rad: number) => void;
  setScaleUniform: (s: number) => void;
  setEnabled: (on: boolean) => void;
  onChange: (cb: (xyz: Xyz, object: THREE.Object3D) => void) => void;
  dispose: () => void;
  getAttached: () => THREE.Object3D | null;
  isDragging: () => boolean;
}

export function createShipwreckGizmo(
  camera: THREE.Camera,
  domElement: HTMLElement,
  scene: THREE.Scene,
): ShipwreckGizmoHandle {
  const controls = new TransformControls(camera, domElement);
  controls.setSize(0.85);
  controls.setMode('translate');
  const helper = controls.getHelper();
  helper.visible = false;
  scene.add(helper);

  let attached: THREE.Object3D | null = null;
  let changeCb: ((xyz: Xyz, object: THREE.Object3D) => void) | null = null;
  let dragging = false;

  controls.addEventListener('dragging-changed', (e) => {
    dragging = e.value === true;
    // Notify host to pause orbit/character cam
    domElement.dispatchEvent(
      new CustomEvent('shipwreck-gizmo-drag', { detail: { dragging } }),
    );
  });

  controls.addEventListener('change', () => {
    if (!attached) return;
    const p = attached.position;
    changeCb?.({ x: p.x, y: p.y, z: p.z }, attached);
  });

  const handle: ShipwreckGizmoHandle = {
    controls,
    isDragging: () => dragging,
    attach(object) {
      if (object) {
        controls.attach(object);
        helper.visible = true;
        attached = object;
      } else {
        controls.detach();
        helper.visible = false;
        attached = null;
      }
    },
    setMode(mode) {
      controls.setMode(mode);
    },
    getXyz() {
      if (!attached) return null;
      const p = attached.position;
      return { x: p.x, y: p.y, z: p.z };
    },
    setXyz(xyz) {
      if (!attached) return;
      attached.position.set(xyz.x, xyz.y, xyz.z);
      changeCb?.(xyz, attached);
    },
    setRotationY(rad) {
      if (!attached) return;
      attached.rotation.y = rad;
      changeCb?.(
        { x: attached.position.x, y: attached.position.y, z: attached.position.z },
        attached,
      );
    },
    setScaleUniform(s) {
      if (!attached) return;
      attached.scale.setScalar(s);
      changeCb?.(
        { x: attached.position.x, y: attached.position.y, z: attached.position.z },
        attached,
      );
    },
    setEnabled(on) {
      controls.enabled = on;
      helper.visible = on && !!attached;
    },
    onChange(cb) {
      changeCb = cb;
    },
    getAttached() {
      return attached;
    },
    dispose() {
      controls.detach();
      scene.remove(helper);
      controls.dispose();
      attached = null;
    },
  };


  return handle;
}
