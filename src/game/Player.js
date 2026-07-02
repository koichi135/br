import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { WALL_HEIGHT } from './Maze.js';

const EYE_HEIGHT = 1.65;
const RADIUS = 0.34;
const WALK_SPEED = 3.1;
const SPRINT_SPEED = 5.6;
const STEP_INTERVAL_WALK = 0.52;
const STEP_INTERVAL_SPRINT = 0.32;

export class Player {
  constructor(camera, domElement, world) {
    this.camera = camera;
    this.world = world;
    this.controls = new PointerLockControls(camera, domElement);

    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.stamina = 100;
    this.flashlightOn = false;
    this.flashlightBattery = 100;
    this.sprinting = false;
    this.moving = false;
    this._stepAccum = 0;
    this.onFootstep = null; // callback(sprinting)
    this.frozen = false;

    this._distSinceStep = 0;

    this.flashlight = new THREE.SpotLight(0xdfe9ff, 0, 14, Math.PI / 6.2, 0.55, 1.7);
    this.flashlight.position.set(0, 0, 0);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, 0, -1);
    camera.add(this.flashlight);
    camera.add(this.flashTarget);
    this.flashlight.target = this.flashTarget;

    this._keydownHandler = (e) => this._onKey(e, true);
    this._keyupHandler = (e) => this._onKey(e, false);
    window.addEventListener('keydown', this._keydownHandler);
    window.addEventListener('keyup', this._keyupHandler);
  }

  dispose() {
    window.removeEventListener('keydown', this._keydownHandler);
    window.removeEventListener('keyup', this._keyupHandler);
    this.camera.remove(this.flashlight);
    this.camera.remove(this.flashTarget);
    this.controls.dispose();
  }

  _onKey(e, down) {
    if (e.repeat) return;
    const code = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
      if (down) this.keys.add(code); else this.keys.delete(code);
    }
    if (down && code === 'KeyF') this.toggleFlashlight();
  }

  toggleFlashlight() {
    if (this.flashlightBattery <= 0.5) return;
    this.flashlightOn = !this.flashlightOn;
  }

  setSpawn(x, z) {
    this.controls.object.position.set(x, EYE_HEIGHT, z);
  }

  get position() {
    return this.controls.object.position;
  }

  resolveCollisions(next) {
    // Resolve X then Z against nearby wall AABBs, expanded by player radius.
    const boxes = this.world.wallsNear(next.x, next.z, RADIUS + 1.2);
    for (const b of boxes) {
      const minX = b.minX - RADIUS, maxX = b.maxX + RADIUS;
      const minZ = b.minZ - RADIUS, maxZ = b.maxZ + RADIUS;
      if (next.x > minX && next.x < maxX && next.z > minZ && next.z < maxZ) {
        // Push out along axis of least penetration.
        const penX = Math.min(next.x - minX, maxX - next.x);
        const penZ = Math.min(next.z - minZ, maxZ - next.z);
        if (penX < penZ) {
          next.x = (next.x - minX < maxX - next.x) ? minX : maxX;
        } else {
          next.z = (next.z - minZ < maxZ - next.z) ? minZ : maxZ;
        }
      }
    }
    return next;
  }

  update(dt) {
    if (this.frozen) return;
    const keys = this.keys;
    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const wantSprint = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && forward > 0 && this.stamina > 2;

    this.moving = forward !== 0 || strafe !== 0;
    this.sprinting = this.moving && wantSprint;

    const speed = this.sprinting ? SPRINT_SPEED : WALK_SPEED;

    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - dt * 22);
    } else {
      this.stamina = Math.min(100, this.stamina + dt * 12);
    }

    const dir = new THREE.Vector3(strafe, 0, -forward);
    if (dir.lengthSq() > 0) dir.normalize();

    if (this.moving) {
      const obj = this.controls.object;
      const before = obj.position.clone();
      this.controls.moveRight(dir.x * speed * dt);
      this.controls.moveForward(-dir.z * speed * dt);
      obj.position.y = EYE_HEIGHT;
      const resolved = this.resolveCollisions(obj.position.clone());
      obj.position.x = resolved.x;
      obj.position.z = resolved.z;

      const moved = before.distanceTo(obj.position);
      this._distSinceStep += moved;
      const interval = this.sprinting ? STEP_INTERVAL_SPRINT : STEP_INTERVAL_WALK;
      if (this._distSinceStep >= interval) {
        this._distSinceStep = 0;
        if (this.onFootstep) this.onFootstep(this.sprinting);
      }
    } else {
      this._distSinceStep = 0;
    }

    // Flashlight battery.
    if (this.flashlightOn) {
      this.flashlightBattery = Math.max(0, this.flashlightBattery - dt * 3.2);
      if (this.flashlightBattery <= 0) this.flashlightOn = false;
    } else {
      this.flashlightBattery = Math.min(100, this.flashlightBattery + dt * 1.1);
    }
    const lowBatteryFlicker = this.flashlightOn && this.flashlightBattery < 15
      ? (Math.random() < 0.15 ? 0.15 : 1) : 1;
    this.flashlight.intensity = this.flashlightOn ? 55 * lowBatteryFlicker : 0;
  }

  get noiseRadius() {
    if (!this.moving) return 0;
    return this.sprinting ? 9 : 4.5;
  }
}
