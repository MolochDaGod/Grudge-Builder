/**
 * CharacterController3D — WASD character controller with terrain following.
 *
 * W = forward (away from camera), S = back, A/D = turn, Q/E = strafe.
 * Tab toggles combat mode (face mouse) vs harvest mode (face movement).
 * Raycasts terrain to snap character Y position.
 */
import * as THREE from 'three';
import { getTerrainHeightAt } from '../terrain/IslandTerrainGenerator';
import { AnimationManager, type AnimState } from './AnimationManager';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type ControlMode = 'harvest' | 'combat';

export interface CharacterController3DConfig {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  terrainMesh: THREE.Mesh;
  modelPath?: string;
  startPosition?: THREE.Vector3;
}

export class CharacterController3D {
  public model: THREE.Group;
  public animations: AnimationManager | null = null;
  public mode: ControlMode = 'harvest';

  private camera: THREE.PerspectiveCamera;
  private terrainMesh: THREE.Mesh;
  private moveSpeed = 30;
  private turnSpeed = 3;
  private velocity = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private cameraOffset = new THREE.Vector3(0, 15, 25); // over-the-shoulder

  // Input state
  private keys: Set<string> = new Set();
  private mouseDown = false;
  private mouseDelta = { x: 0, y: 0 };
  private cameraYaw = 0;
  private cameraPitch = 0.3;

  constructor(private config: CharacterController3DConfig) {
    this.camera = config.camera;
    this.terrainMesh = config.terrainMesh;

    // Placeholder model (capsule) — will be replaced by GLTF
    this.model = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.8, 2, 8, 16),
      new THREE.MeshLambertMaterial({ color: 0x4488ff }),
    );
    body.position.y = 1.8;
    body.castShadow = true;
    this.model.add(body);

    // Direction indicator
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.8, 4),
      new THREE.MeshLambertMaterial({ color: 0xff4444 }),
    );
    arrow.position.set(0, 2.5, -1.2);
    arrow.rotation.x = -Math.PI / 2;
    this.model.add(arrow);

    const startPos = config.startPosition || new THREE.Vector3(0, 20, 0);
    this.model.position.copy(startPos);
    config.scene.add(this.model);

    this.setupInputListeners();
  }

  /** Load a GLTF character model to replace the placeholder */
  async loadModel(path: string): Promise<void> {
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(path);
      const loadedModel = gltf.scene;
      loadedModel.scale.setScalar(2);
      loadedModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Remove placeholder children and add loaded model
      while (this.model.children.length) {
        this.model.remove(this.model.children[0]);
      }
      this.model.add(loadedModel);

      // Set up animations if present
      if (gltf.animations.length > 0) {
        this.animations = new AnimationManager(loadedModel);
        gltf.animations.forEach((clip, i) => {
          // Map common animation names
          const name = clip.name.toLowerCase();
          let state: AnimState = 'idle';
          if (name.includes('walk') || name.includes('run forward')) state = 'walk';
          else if (name.includes('run')) state = 'run';
          else if (name.includes('attack') || name.includes('slash')) state = 'attack';
          else if (name.includes('idle')) state = 'idle';
          this.animations!.addClipFromGLTF(state, clip);
        });
        this.animations.play('idle');
      }
    } catch (err) {
      console.warn('Failed to load character model:', err);
    }
  }

  private setupInputListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key === 'Tab') {
        e.preventDefault();
        this.mode = this.mode === 'harvest' ? 'combat' : 'harvest';
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseDown = false;
    });
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
      }
    });
  }

  update(dt: number): void {
    // Camera rotation from mouse drag
    if (this.mouseDown) {
      this.cameraYaw -= this.mouseDelta.x * 0.003;
      this.cameraPitch = Math.max(0.1, Math.min(0.8, this.cameraPitch + this.mouseDelta.y * 0.003));
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }

    // Movement
    this.direction.set(0, 0, 0);
    let moving = false;

    if (this.keys.has('w')) { this.direction.z -= 1; moving = true; }
    if (this.keys.has('s')) { this.direction.z += 1; moving = true; }
    if (this.keys.has('q')) { this.direction.x -= 1; moving = true; } // strafe left
    if (this.keys.has('e')) { this.direction.x += 1; moving = true; } // strafe right
    if (this.keys.has('a')) { this.cameraYaw += this.turnSpeed * dt; } // turn left
    if (this.keys.has('d')) { this.cameraYaw -= this.turnSpeed * dt; } // turn right

    if (this.direction.length() > 0) {
      this.direction.normalize();
    }

    // Rotate direction relative to camera yaw
    const moveDir = this.direction.clone();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    // Apply velocity
    this.velocity.lerp(moveDir.multiplyScalar(this.moveSpeed), dt * 5);
    this.model.position.add(this.velocity.clone().multiplyScalar(dt));

    // Terrain following — raycast down
    const height = getTerrainHeightAt(this.terrainMesh, this.model.position.x, this.model.position.z);
    if (height !== null) {
      this.model.position.y = THREE.MathUtils.lerp(this.model.position.y, height, dt * 10);
    }

    // Face movement direction (harvest mode) or face camera forward (combat mode)
    if (this.mode === 'harvest' && moving) {
      const targetAngle = Math.atan2(this.velocity.x, this.velocity.z);
      this.model.rotation.y = THREE.MathUtils.lerp(
        this.model.rotation.y,
        targetAngle,
        dt * 8,
      );
    } else if (this.mode === 'combat') {
      this.model.rotation.y = this.cameraYaw + Math.PI;
    }

    // Update camera — over-the-shoulder follow
    const cameraTarget = this.model.position.clone();
    const offsetRotated = this.cameraOffset.clone();
    offsetRotated.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    offsetRotated.y *= (1 + this.cameraPitch);

    const desiredCamPos = cameraTarget.clone().add(offsetRotated);
    this.camera.position.lerp(desiredCamPos, dt * 5);
    this.camera.lookAt(cameraTarget.x, cameraTarget.y + 3, cameraTarget.z);

    // Update animations
    if (this.animations) {
      if (moving) {
        this.animations.play(this.keys.has('shift') ? 'run' : 'walk');
      } else {
        this.animations.play('idle');
      }
      this.animations.update(dt);
    }
  }

  getPosition(): THREE.Vector3 {
    return this.model.position.clone();
  }

  destroy(): void {
    this.animations?.dispose();
    this.model.parent?.remove(this.model);
  }
}
