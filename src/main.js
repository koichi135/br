import * as THREE from 'three';
import './style.css';
import { Maze } from './game/Maze.js';
import { World } from './game/World.js';
import { Player } from './game/Player.js';
import { Entity } from './game/Entity.js';
import { Terminal } from './game/Terminal.js';
import { AudioManager } from './game/AudioManager.js';
import { PostFX } from './game/PostFX.js';
import { HUD } from './game/HUD.js';

const CODE_TARGET = 4;
const ENTITY_ACTIVATION_DELAY_MS = 16000;

class Game {
  constructor() {
    this.appEl = document.getElementById('app');
    this.resumeHint = document.getElementById('resume-hint');

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.appEl.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 60);

    this.audio = new AudioManager();
    this.hud = new HUD();

    this.state = 'menu'; // menu | playing | ended
    this.overlayOpen = false;
    this.activeTerminal = null;
    this.codes = new Set();

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.postfx) this.postfx.setSize(w, h);
  }

  onKeyDown(e) {
    if (e.code !== 'KeyE' || this.state !== 'playing' || this.overlayOpen) return;
    const term = this.hoveredTerminal;
    if (!term) return;
    this.overlayOpen = true;
    this.activeTerminal = term;
    term.open({
      player: this.player,
      entity: this.entity,
      audio: this.audio,
      codeCount: () => this.codes.size,
      codeNeeded: () => CODE_TARGET,
      onCodeCollected: (code) => {
        this.codes.add(code);
        this.hud.setCodes(this.codes.size, CODE_TARGET);
      },
      onWin: () => this.onWin(),
      onOverlayClosed: () => {
        this.overlayOpen = false;
        this.activeTerminal = null;
      },
    });
  }

  startNewRun() {
    if (this.player) this.player.dispose();
    if (this.activeTerminal) this.activeTerminal.forceClose();
    clearTimeout(this._activationTimer);
    this.resumeHint.classList.add('hidden');
    this.audio.duckAmbient(false);

    this.scene = new THREE.Scene();
    this.postfx = new PostFX(this.renderer, this.scene, this.camera);
    this.onResize();

    this.maze = new Maze();
    this.world = new World(this.scene, this.maze);
    this.scene.add(new THREE.AmbientLight(0x554a2a, 0.55));

    this.player = new Player(this.camera, this.renderer.domElement, this.world);
    const spawnW = this.maze.worldOf(this.maze.spawn.x, this.maze.spawn.y);
    this.player.setSpawn(spawnW.x, spawnW.z);
    this.player.onFootstep = (sprinting) => this.audio.footstep(sprinting);
    this.player.controls.addEventListener('unlock', () => {
      if (this.state === 'playing' && !this.overlayOpen) this.resumeHint.classList.remove('hidden');
    });
    this.player.controls.addEventListener('lock', () => this.resumeHint.classList.add('hidden'));

    this.entity = new Entity(this.scene, this.maze, this.world);
    this.entity.onCatch = () => this.onCaught();

    this.codes = new Set();
    this.overlayOpen = false;
    this.activeTerminal = null;
    this.terminals = this.buildTerminals();

    this.hud.setCodes(0, CODE_TARGET);
    this.hud.setPrompt(null);
    this.hud.show();

    this.state = 'playing';
    this.clock = new THREE.Clock();

    this._activationTimer = setTimeout(() => {
      if (this.entity) this.entity.activate();
    }, ENTITY_ACTIVATION_DELAY_MS);

    this.player.controls.lock();
  }

  buildTerminals() {
    const spots = this.maze.terminals.slice(0, 7);
    const codeSlots = [...spots].sort(() => Math.random() - 0.5).slice(0, CODE_TARGET);
    const codeSlotSet = new Set(codeSlots.map((c) => `${c.x},${c.y}`));
    const usedCodes = new Set();
    const terminals = [];
    for (const cell of spots) {
      const hasCode = codeSlotSet.has(`${cell.x},${cell.y}`);
      let code = null;
      if (hasCode) {
        do { code = String(1000 + Math.floor(Math.random() * 9000)); } while (usedCodes.has(code));
        usedCodes.add(code);
      }
      terminals.push(new Terminal(this.scene, this.maze, cell.x, cell.y, { hasCode, code }));
    }
    terminals.push(new Terminal(this.scene, this.maze, this.maze.exit.x, this.maze.exit.y, { isExit: true }));
    return terminals;
  }

  onCaught() {
    if (this.state !== 'playing') return;
    this.state = 'ended';
    this.player.frozen = true;
    if (this.activeTerminal) { this.activeTerminal.forceClose(); this.overlayOpen = false; }
    this.audio.jumpscareStinger();
    this.audio.duckAmbient(false);
    document.exitPointerLock?.();
    setTimeout(() => this.showEnd(false), 550);
  }

  onWin() {
    if (this.state !== 'playing') return;
    this.state = 'ended';
    this.player.frozen = true;
    this.audio.dialupSweep(2.2);
    document.exitPointerLock?.();
    setTimeout(() => this.showEnd(true), 2400);
  }

  showEnd(won) {
    this.hud.hide();
    this.resumeHint.classList.add('hidden');
    const screen = document.getElementById('end-screen');
    const title = document.getElementById('end-title');
    const msg = document.getElementById('end-message');
    title.className = 'game-title ' + (won ? 'win' : 'lose');
    title.textContent = won ? 'CONNECTION CLOSED' : 'CONNECTION TERMINATED';
    msg.innerHTML = won
      ? '回線を切断しました。あなたは無事に「外」へ戻った……本当に、ここが外なら。<br/>訪問者数: 0000001 （もう増えません）'
      : 'せっかく遊びに来てくれたのに。<br/>もう少しだけ、ここにいて。';
    screen.classList.remove('hidden');
  }

  update() {
    if (this.state !== 'playing' || !this.clock) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    this.player.update(dt);
    this.entity.update(dt, this.player, t);
    this.world.update(dt, t, this.player.position);
    for (const term of this.terminals) term.update(dt);

    const camForward = new THREE.Vector3();
    this.camera.getWorldDirection(camForward);
    let hovered = null;
    if (!this.overlayOpen) {
      for (const term of this.terminals) {
        if (term.canInteract(this.player.position, camForward)) { hovered = term; break; }
      }
    }
    this.hoveredTerminal = hovered;
    this.hud.setPrompt(hovered ? (hovered.isExit ? '[E] ログオフ端末を使う' : '[E] 端末に接続する') : null);

    const distToEntity = this.entity.worldPosition().distanceTo(
      new THREE.Vector3(this.player.position.x, 0, this.player.position.z)
    );
    const proximity = THREE.MathUtils.clamp(1 - distToEntity / 9, 0, 1);
    const danger = Math.max(this.entity.alert * 0.7, this.entity.state === 'hunt' ? proximity : proximity * 0.3);
    this.postfx.setIntensity(THREE.MathUtils.clamp(danger, 0, 1));
    this.audio.setHeartbeatIntensity(this.entity.state === 'hunt' ? Math.max(0.4, proximity) : proximity * 0.5);

    this.hud.setSignal(this.entity.alert);
    this.hud.setBattery(this.player.flashlightBattery);
    this.hud.setStamina(this.player.stamina);
  }

  render() {
    if (!this.postfx || !this.clock) return;
    this.postfx.render(0, this.clock.elapsedTime);
  }
}

const game = new Game();
function animate() {
  requestAnimationFrame(animate);
  game.update();
  game.render();
}
animate();

document.getElementById('start-btn').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  game.audio.init();
  game.startNewRun();
});

document.getElementById('retry-btn').addEventListener('click', () => {
  document.getElementById('end-screen').classList.add('hidden');
  game.startNewRun();
});

game.resumeHint.addEventListener('click', () => {
  if (game.state === 'playing' && game.player) game.player.controls.lock();
});
