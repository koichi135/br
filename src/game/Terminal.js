import * as THREE from 'three';
import { CELL_SIZE, WALL_HEIGHT, N, E, S, W } from './Maze.js';
import * as geocities from '../sites/geocities.js';
import * as chatroom from '../sites/chatroom.js';
import * as searchengine from '../sites/searchengine.js';
import * as error404 from '../sites/error404.js';
import * as webring from '../sites/webring.js';
import { buildLocked, buildReady } from '../sites/logoff.js';

const SITES = [geocities, chatroom, searchengine, error404, webring];
const INTERACT_RANGE = 2.4;

function facingForCell(maze, x, y) {
  const closed = [];
  if (!maze.isOpen(x, y, N)) closed.push(N);
  if (!maze.isOpen(x, y, E)) closed.push(E);
  if (!maze.isOpen(x, y, S)) closed.push(S);
  if (!maze.isOpen(x, y, W)) closed.push(W);
  if (closed.length === 0) return N;
  return closed[Math.floor(Math.random() * closed.length)];
}

export class Terminal {
  constructor(scene, maze, cellX, cellY, { hasCode = false, code = null, isExit = false } = {}) {
    this.maze = maze;
    this.hasCode = hasCode;
    this.code = code;
    this.isExit = isExit;
    this.collected = false;
    this.isOpen = false;
    this.site = isExit ? null : SITES[Math.floor(Math.random() * SITES.length)];

    const dir = facingForCell(maze, cellX, cellY);
    const center = maze.worldOf(cellX, cellY);
    const inset = CELL_SIZE / 2 - 0.55;
    let px = center.x, pz = center.z, rotY = 0;
    if (dir === N) { pz = center.z - inset; rotY = 0; }
    if (dir === S) { pz = center.z + inset; rotY = Math.PI; }
    if (dir === E) { px = center.x + inset; rotY = -Math.PI / 2; }
    if (dir === W) { px = center.x - inset; rotY = Math.PI / 2; }

    const group = new THREE.Group();
    group.position.set(px, 0, pz);
    group.rotation.y = rotY;

    const deskMat = new THREE.MeshStandardMaterial({ color: 0x35291a, roughness: 0.9 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.6), deskMat);
    desk.position.set(0, 0.375, 0);
    group.add(desk);

    const caseColor = isExit ? 0xcabf8e : 0xd8d2c0;
    const caseMat = new THREE.MeshStandardMaterial({ color: caseColor, roughness: 0.7 });
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.5), caseMat);
    monitor.position.set(0, 0.98, -0.02);
    group.add(monitor);

    this._canvas = document.createElement('canvas');
    this._canvas.width = 128; this._canvas.height = 96;
    this._tex = new THREE.CanvasTexture(this._canvas);
    const screenMat = new THREE.MeshBasicMaterial({ map: this._tex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.34), screenMat);
    screen.position.set(0, 1.0, 0.235);
    group.add(screen);

    const glowColor = isExit ? 0x30ff70 : 0x4fa8ff;
    this._glow = new THREE.PointLight(glowColor, 6, 2.6, 2);
    this._glow.position.set(0, 1.0, 0.3);
    group.add(this._glow);

    const keebMat = new THREE.MeshStandardMaterial({ color: 0xc9c3ae, roughness: 0.8 });
    const keeb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.18), keebMat);
    keeb.position.set(0, 0.775, 0.15);
    group.add(keeb);

    scene.add(group);
    this.group = group;
    this.interactPoint = new THREE.Vector3(px, 1.0, pz);
    this._forward = new THREE.Vector3(0, 0, 1).applyEuler(group.rotation);

    this._t = Math.random() * 100;
  }

  update(dt) {
    this._t += dt;
    if (Math.floor(this._t * 6) === this._lastFrame) return;
    this._lastFrame = Math.floor(this._t * 6);
    const ctx = this._canvas.getContext('2d');
    const w = this._canvas.width, h = this._canvas.height;
    const hue = this.isExit ? '80, 255, 130' : '90, 170, 255';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = `rgba(${hue}, ${0.12 + Math.random() * 0.1})`;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(${hue}, ${Math.random() * 0.25})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * 20, 1);
    }
    ctx.fillStyle = `rgba(${hue}, 0.9)`;
    ctx.font = '10px monospace';
    ctx.fillText(this.isExit ? 'LOG OFF' : 'CONNECT', 6, 14);
    this._tex.needsUpdate = true;
    this._glow.intensity = 5 + Math.random() * 3;
  }

  canInteract(playerPos, camForward) {
    const d = this.interactPoint.distanceTo(playerPos);
    if (d > INTERACT_RANGE) return false;
    const toTerm = this.interactPoint.clone().sub(playerPos).setY(0).normalize();
    const fwd = camForward.clone().setY(0).normalize();
    return toTerm.dot(fwd) > 0.35;
  }

  open(ctx) {
    if (this.isOpen) return;
    this.isOpen = true;
    ctx.player.frozen = true;
    ctx.player.controls.unlock();
    ctx.audio.playStatic();
    ctx.audio.duckAmbient(true);

    let content;
    if (this.isExit) {
      content = ctx.codeCount() >= ctx.codeNeeded()
        ? buildReady()
        : buildLocked(ctx.codeCount(), ctx.codeNeeded());
    } else {
      content = this.site.build(this.hasCode && !this.collected, this.code);
    }

    const overlay = document.createElement('div');
    overlay.className = 'retro-overlay';
    overlay.innerHTML = `
      <div class="crt-frame">
        <div class="retro-window">
          <div class="retro-titlebar"><span>${content.title}</span><button class="retro-close" aria-label="close">×</button></div>
          <div class="retro-body ${content.theme}">${content.bodyHTML}</div>
        </div>
      </div>
      <div class="crt-flash"></div>
    `;
    document.body.appendChild(overlay);
    this._overlayEl = overlay;

    const finish = () => this.close(ctx);
    overlay.querySelector('.retro-close').addEventListener('click', finish);
    this._escHandler = (e) => { if (e.code === 'Escape') finish(); };
    window.addEventListener('keydown', this._escHandler);

    if (this.isExit && ctx.codeCount() >= ctx.codeNeeded()) {
      const btn = overlay.querySelector('#logoff-btn');
      if (btn) btn.addEventListener('click', () => { this.close(ctx); ctx.onWin(); });
    }

    if (!this.isExit && this.hasCode && !this.collected) {
      this.collected = true;
      ctx.onCodeCollected(this.code);
    }

    this._pingTimer = setInterval(() => {
      ctx.entity.pingExposure(ctx.player.position);
    }, 4000 + Math.random() * 2000);

    this._jumpTimer = setTimeout(() => this._jumpscare(ctx), 5000 + Math.random() * 6000);
  }

  _jumpscare(ctx) {
    if (!this.isOpen || !this._overlayEl) return;
    const flash = this._overlayEl.querySelector('.crt-flash');
    if (flash) {
      flash.classList.add('flash-active');
      ctx.audio.jumpscareStinger();
      ctx.entity.pingExposure(ctx.player.position);
      ctx.entity.alert = Math.min(1, ctx.entity.alert + 0.5);
      setTimeout(() => flash.classList.remove('flash-active'), 160);
    }
    this._jumpTimer = setTimeout(() => this._jumpscare(ctx), 7000 + Math.random() * 8000);
  }

  close(ctx) {
    if (!this.isOpen) return;
    this.isOpen = false;
    clearInterval(this._pingTimer);
    clearTimeout(this._jumpTimer);
    window.removeEventListener('keydown', this._escHandler);
    if (this._overlayEl) { this._overlayEl.remove(); this._overlayEl = null; }
    ctx.audio.duckAmbient(false);
    ctx.player.frozen = false;
    ctx.player.controls.lock();
    if (ctx.onOverlayClosed) ctx.onOverlayClosed();
  }

  // Teardown without side effects (audio/pointer-lock) -- used when the run
  // ends abruptly (caught/won) while an overlay happens to be open.
  forceClose() {
    this.isOpen = false;
    clearInterval(this._pingTimer);
    clearTimeout(this._jumpTimer);
    if (this._escHandler) window.removeEventListener('keydown', this._escHandler);
    if (this._overlayEl) { this._overlayEl.remove(); this._overlayEl = null; }
  }
}
