import * as THREE from 'three';
import { CELL_SIZE, WALL_HEIGHT } from './Maze.js';

const SPEED = { patrol: 1.3, investigate: 2.1, hunt: 3.7 };
const CATCH_RADIUS = 0.85;
const ALERT_HUNT = 0.78;
const ALERT_INVESTIGATE = 0.22;

function segmentBlocked(x1, z1, x2, z2, wallBoxes) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const steps = Math.max(2, Math.floor(len / 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + dx * t, z = z1 + dz * t;
    for (const b of wallBoxes) {
      if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
    }
  }
  return false;
}

// A corrupted, faceless thing that lives in the dead pages -- built from a
// canvas of scrambled static so its "face" never reads the same way twice.
function buildStaticTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  return { canvas: c, tex };
}

export class Entity {
  constructor(scene, maze, world) {
    this.maze = maze;
    this.world = world;
    this.scene = scene;
    this.state = 'patrol';
    this.alert = 0;
    this.cell = { x: maze.exit.x, y: maze.exit.y };
    this.path = null;
    this.pathIndex = 0;
    this.repathTimer = 0;
    this.wanderTarget = null;
    this.investigateTarget = null;
    this.lingerTimer = 0;
    this.caught = false;
    this.active = false;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a08, roughness: 0.9, emissive: 0x140302, emissiveIntensity: 0.4,
    });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.15, 4, 8), bodyMat);
    torso.position.y = 1.05;
    group.add(torso);

    const { canvas, tex } = buildStaticTexture();
    this._staticCanvas = canvas;
    this._staticTex = tex;
    const headMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.9 });
    const head = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), headMat);
    head.position.y = 1.85;
    this.head = head;
    group.add(head);

    const glow = new THREE.PointLight(0xff2200, 0, 4.5, 2);
    glow.position.y = 1.6;
    group.add(glow);
    this.glow = glow;

    this.group = group;
    scene.add(group);

    this.spawnFar(maze.spawn);
  }

  spawnFar(fromCell) {
    const dist = this.maze.bfsDistances(fromCell.x, fromCell.y);
    let best = { x: this.maze.exit.x, y: this.maze.exit.y, d: -1 };
    for (let y = 0; y < this.maze.size; y++) {
      for (let x = 0; x < this.maze.size; x++) {
        const d = dist[y * this.maze.size + x];
        if (d > best.d) best = { x, y, d };
      }
    }
    this.cell = { x: best.x, y: best.y };
    const w = this.maze.worldOf(best.x, best.y);
    this.group.position.set(w.x, 0, w.z);
  }

  activate() {
    this.active = true;
  }

  worldPosition() {
    return this.group.position;
  }

  pingExposure(playerWorldPos) {
    if (!this.active) return;
    this.alert = Math.min(1, this.alert + 0.4);
    const cell = this.maze.cellOfWorld(playerWorldPos.x, playerWorldPos.z);
    this.investigateTarget = cell;
  }

  noiseHeard(playerWorldPos, radius, dt) {
    if (!this.active || radius <= 0) return;
    const d = this.group.position.distanceTo(new THREE.Vector3(playerWorldPos.x, 0, playerWorldPos.z));
    if (d < radius) {
      this.alert = Math.min(1, this.alert + (1 - d / Math.max(radius, 0.01)) * 0.3 * dt);
      const cell = this.maze.cellOfWorld(playerWorldPos.x, playerWorldPos.z);
      this.investigateTarget = cell;
    }
  }

  _pickWanderTarget() {
    const s = this.maze.size;
    for (let tries = 0; tries < 20; tries++) {
      const x = Math.floor(Math.random() * s);
      const y = Math.floor(Math.random() * s);
      const p = this.maze.path(this.cell.x, this.cell.y, x, y);
      if (p && p.length > 3) return { x, y };
    }
    return { x: this.maze.spawn.x, y: this.maze.spawn.y };
  }

  _setPathTo(targetCell) {
    const p = this.maze.path(this.cell.x, this.cell.y, targetCell.x, targetCell.y);
    this.path = p;
    this.pathIndex = 1; // 0 is current cell
  }

  update(dt, player, t) {
    if (!this.active || this.caught) return;

    const playerPos = player.position;
    const toPlayer = new THREE.Vector3(playerPos.x - this.group.position.x, 0, playerPos.z - this.group.position.z);
    const dist = toPlayer.length();

    this.noiseHeard(playerPos, player.noiseRadius, dt);

    // Line-of-sight based alert boost when close-ish and unobstructed.
    this.repathTimer -= dt;
    if (dist < 11 && this.repathTimer <= 0) {
      const blocked = segmentBlocked(this.group.position.x, this.group.position.z, playerPos.x, playerPos.z, this.world.wallBoxes);
      if (!blocked) {
        const losBoost = player.flashlightOn ? 0.09 : 0.045;
        this.alert = Math.min(1, this.alert + losBoost * (1 - dist / 11));
        this.investigateTarget = this.maze.cellOfWorld(playerPos.x, playerPos.z);
      }
      this.repathTimer = 0.35;
    }

    // Ambient alert decay.
    this.alert = Math.max(0, this.alert - dt * 0.02);

    let targetState = this.state;
    if (this.alert >= ALERT_HUNT) targetState = 'hunt';
    else if (this.alert >= ALERT_INVESTIGATE || this.investigateTarget) targetState = 'investigate';
    else targetState = 'patrol';

    if (targetState !== this.state) {
      this.state = targetState;
      this.path = null;
      if (this.state === 'patrol') this.lingerTimer = 0;
    }

    // Pathing per state.
    if (this.state === 'hunt') {
      this.glow.intensity = 22 + Math.sin(t * 20) * 6;
      this._pathStaleTimer = (this._pathStaleTimer ?? 0) - dt;
      if (!this.path || this._pathStaleTimer <= 0) {
        this._setPathTo(this.maze.cellOfWorld(playerPos.x, playerPos.z));
        this._pathStaleTimer = 0.5;
      }
    } else if (this.state === 'investigate') {
      this.glow.intensity = 4;
      if (!this.path && this.investigateTarget) {
        this._setPathTo(this.investigateTarget);
      }
    } else {
      this.glow.intensity = 0;
      if (!this.path) {
        if (!this.wanderTarget || Math.random() < 0.002) this.wanderTarget = this._pickWanderTarget();
        this._setPathTo(this.wanderTarget);
      }
    }

    this._followPath(dt, SPEED[this.state]);

    // Reached investigate target: linger, then clear.
    if (this.state === 'investigate' && (!this.path || this.pathIndex >= (this.path ? this.path.length : 0))) {
      this.lingerTimer += dt;
      if (this.lingerTimer > 3.5) {
        this.investigateTarget = null;
        this.alert = Math.min(this.alert, ALERT_INVESTIGATE - 0.01);
        this.lingerTimer = 0;
        this.path = null;
      }
    }

    // Face the player a bit when close, otherwise face travel direction (handled in _followPath).
    this._updateHeadTexture(t);

    if (dist < CATCH_RADIUS && (this.state === 'hunt' || dist < 0.5)) {
      this.caught = true;
      if (this.onCatch) this.onCatch();
    }
  }

  _followPath(dt, speed) {
    if (!this.path || this.pathIndex >= this.path.length) return;
    const wp = this.path[this.pathIndex];
    const w = this.maze.worldOf(wp.x, wp.y);
    const pos = this.group.position;
    const dx = w.x - pos.x, dz = w.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.12) {
      this.cell = { x: wp.x, y: wp.y };
      this.pathIndex++;
      return;
    }
    const step = Math.min(d, speed * dt);
    pos.x += (dx / d) * step;
    pos.z += (dz / d) * step;
    this.group.rotation.y = Math.atan2(dx, dz);
  }

  _updateHeadTexture(t) {
    if (Math.floor(t * 12) === this._lastFrame) return;
    this._lastFrame = Math.floor(t * 12);
    const ctx = this._staticCanvas.getContext('2d');
    const img = ctx.createImageData(64, 64);
    const glitchRow = Math.floor(Math.random() * 64);
    for (let y = 0; y < 64; y++) {
      const rowGlitch = Math.abs(y - glitchRow) < 3;
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        const base = Math.random() < 0.5 ? 10 : 230;
        const v = rowGlitch ? (Math.random() < 0.5 ? 255 : 0) : base * (0.15 + Math.random() * 0.15);
        img.data[i] = v; img.data[i + 1] = v * 0.85; img.data[i + 2] = v * 0.85;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this._staticTex.needsUpdate = true;
  }
}
