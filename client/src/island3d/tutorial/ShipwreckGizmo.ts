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
}

export function createShipwreckGizmo(
  camera: THREE.Camera,
  domElement: HTMLElement,
  scene: THREE.Scene,
): ShipwreckGizmoHandle {
  const controls = new TransformControls(camera, domElement);
  controls.setSize(0.85);
  controls.setMode('translate');
  controls.visible = false;

  // TransformControls is an Object3D in recent three
  scene.add(controls as unknown as THREE.Object3D);

  let attached: THREE.Object3D | null = null;
  let changeCb: ((xyz: Xyz, object: THREE.Object3D) => void) | null = null;
  let dragging = false;

  controls.addEventListener('dragging-changed', (e: { value: boolean }) => {
    dragging = e.value;
    // Notify host to pause orbit/character cam
    domElement.dispatchEvent(
      new CustomEvent('shipwreck-gizmo-drag', { detail: { dragging: e.value } }),
    );
  });

  controls.addEventListener('change', () => {
    if (!attached) return;
    const p = attached.position;
    changeCb?.({ x: p.x, y: p.y, z: p.z }, attached);
  });

  const handle: ShipwreckGizmoHandle = {
    controls,
    attach(object) {
      if (object) {
        controls.attach(object);
        controls.visible = true;
        attached = object;
      } else {
        controls.detach();
        controls.visible = false;
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
      controls.visible = on && !!attached;
    },
    onChange(cb) {
      changeCb = cb;
    },
    getAttached() {
      return attached;
    },
    dispose() {
      controls.detach();
      scene.remove(controls as unknown as THREE.Object3D);
      controls.dispose();
      attached = null;
    },
  };

  // Expose dragging for external checks
  (handle as any).isDragging = () => dragging;

  return handle;
}
