import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CELL_SIZE, WALL_HEIGHT, N, W, E, S } from './Maze.js';
import { wallTexture, carpetTexture, ceilingTexture } from './Textures.js';

const WALL_THICK = 0.28;

export class World {
  constructor(scene, maze) {
    this.scene = scene;
    this.maze = maze;
    this.wallBoxes = []; // {minX,maxX,minZ,maxZ}
    this.lights = []; // flicker state
    this.group = new THREE.Group();
    scene.add(this.group);

    this._wallGeoms = [];
    this.buildFloorCeiling();
    this.buildWalls();
    this.buildPillars();
    this.flushWallMesh();
    this.buildLights();
    this.buildFog();
  }

  buildFog() {
    this.scene.fog = new THREE.FogExp2(0x1c1808, 0.045);
    this.scene.background = new THREE.Color(0x0a0800);
  }

  buildFloorCeiling() {
    const size = this.maze.size * CELL_SIZE;
    const carpet = carpetTexture();
    carpet.repeat.set(size / 2, size / 2);
    const floorGeo = new THREE.PlaneGeometry(size, size);
    const floorMat = new THREE.MeshStandardMaterial({ map: carpet, roughness: 1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.group.add(floor);

    const ceilTex = ceilingTexture();
    ceilTex.repeat.set(size / 2, size / 2);
    const ceilGeo = new THREE.PlaneGeometry(size, size);
    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 1 });
    const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT;
    this.group.add(ceiling);
  }

  // Walls and pillars all share one texture, so instead of one Mesh per
  // segment (hundreds of draw calls) we bake each box's transform into its
  // geometry and merge everything into a single static mesh.
  addWallBox(cx, cz, w, d, rotY) {
    const geo = new THREE.BoxGeometry(w, WALL_HEIGHT, d);
    geo.rotateY(rotY);
    geo.translate(cx, WALL_HEIGHT / 2, cz);
    this._wallGeoms.push(geo);

    const halfW = (rotY === 0 ? w : d) / 2;
    const halfD = (rotY === 0 ? d : w) / 2;
    this.wallBoxes.push({
      minX: cx - halfW, maxX: cx + halfW,
      minZ: cz - halfD, maxZ: cz + halfD,
    });
  }

  buildWalls() {
    const m = this.maze;
    const s = CELL_SIZE;
    const span = s + WALL_THICK;
    for (let y = 0; y < m.size; y++) {
      for (let x = 0; x < m.size; x++) {
        const { x: wx, z: wz } = m.worldOf(x, y);
        if (!m.isOpen(x, y, N)) {
          this.addWallBox(wx, wz - s / 2, span, WALL_THICK, 0);
        }
        if (!m.isOpen(x, y, W)) {
          this.addWallBox(wx - s / 2, wz, span, WALL_THICK, Math.PI / 2);
        }
        if (x === m.size - 1 && !m.isOpen(x, y, E)) {
          this.addWallBox(wx + s / 2, wz, span, WALL_THICK, Math.PI / 2);
        }
        if (y === m.size - 1 && !m.isOpen(x, y, S)) {
          this.addWallBox(wx, wz + s / 2, span, WALL_THICK, 0);
        }
      }
    }
  }

  buildPillars() {
    const m = this.maze;
    for (const room of m.pillarRooms) {
      const { x: wx, z: wz } = m.worldOf(room.x, room.y);
      const cx = wx + CELL_SIZE / 2;
      const cz = wz + CELL_SIZE / 2;
      const size = 0.55;
      this.addWallBox(cx, cz, size, size, 0);
    }
  }

  flushWallMesh() {
    const merged = mergeGeometries(this._wallGeoms, false);
    const mat = new THREE.MeshStandardMaterial({
      map: (() => { const t = wallTexture(); t.repeat.set(2, 1); return t; })(),
      roughness: 0.95,
    });
    const mesh = new THREE.Mesh(merged, mat);
    this.group.add(mesh);
    this._wallGeoms = null;
  }

  buildLights() {
    const m = this.maze;
    const chosen = new Map();
    const step = 3;
    for (let y = 1; y < m.size; y += step) {
      for (let x = 1; x < m.size; x += step) {
        chosen.set(x + ',' + y, { x, y });
      }
    }
    chosen.set(m.spawn.x + ',' + m.spawn.y, m.spawn);

    const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
    const fixtureGeo = new THREE.PlaneGeometry(1.6, 0.35);

    for (const { x, y } of chosen.values()) {
      const { x: wx, z: wz } = m.worldOf(x, y);
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat.clone());
      fixture.rotation.x = Math.PI / 2;
      fixture.position.set(wx, WALL_HEIGHT - 0.05, wz);
      this.group.add(fixture);

      const light = new THREE.PointLight(0xfff1c0, 22, CELL_SIZE * 3.4, 2);
      light.position.set(wx, WALL_HEIGHT - 0.3, wz);
      this.group.add(light);

      this.lights.push({
        light,
        fixture,
        baseIntensity: 22,
        phase: Math.random() * Math.PI * 2,
        broken: Math.random() < 0.18,
        flickerSpeed: 4 + Math.random() * 10,
      });
    }
  }

  update(dt, t, playerPos) {
    for (const l of this.lights) {
      if (l.broken) {
        const flicker = Math.random() < 0.06 ? Math.random() * 0.3 : 1.0;
        const strobe = Math.sin(t * l.flickerSpeed + l.phase) > 0.7 ? 0.2 : 1.0;
        const k = Math.min(flicker, strobe);
        l.light.intensity = l.baseIntensity * k;
        l.fixture.material.opacity = 0.4 + 0.6 * k;
      } else {
        const hum = 0.94 + 0.06 * Math.sin(t * 6 + l.phase);
        l.light.intensity = l.baseIntensity * hum;
      }
    }
    if (playerPos) this._cullLights(playerPos);
  }

  // Forward rendering cost scales with the number of *live* lights, and this
  // maze can have dozens of fixtures -- so only the handful nearest the
  // player actually light anything each frame. The rest sit dark (their
  // fixture mesh still renders) until the player wanders close enough.
  _cullLights(playerPos) {
    for (const l of this.lights) {
      const dx = l.light.position.x - playerPos.x;
      const dz = l.light.position.z - playerPos.z;
      l._distSq = dx * dx + dz * dz;
    }
    this.lights.sort((a, b) => a._distSq - b._distSq);
    const maxActive = 7;
    this.lights.forEach((l, i) => { l.light.visible = i < maxActive; });
  }

  // Nearby wall boxes for cheap collision checks.
  wallsNear(x, z, radius) {
    const out = [];
    for (const b of this.wallBoxes) {
      if (x + radius < b.minX || x - radius > b.maxX) continue;
      if (z + radius < b.minZ || z - radius > b.maxZ) continue;
      out.push(b);
    }
    return out;
  }
}
