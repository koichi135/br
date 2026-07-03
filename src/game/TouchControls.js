import * as THREE from 'three';

const LOOK_SENSITIVITY = 0.0032;
const JOYSTICK_RADIUS = 52; // px, matches the CSS joystick base size

// Touch-first replacement for mouse-look + WASD: a drag layer rotates the
// camera (mirroring PointerLockControls' own YXZ-euler math so it feels the
// same as desktop), a virtual joystick drives movement, and two buttons
// stand in for F (flashlight) and E (interact).
export class TouchControls {
  constructor(camera) {
    this.camera = camera;
    this.player = null;
    this.enabled = false;
    this.onInteract = null;

    this.moveVec = { x: 0, y: 0 };
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ');

    this._lookPointerId = null;
    this._lookLast = { x: 0, y: 0 };
    this._joystickPointerId = null;
    this._joystickCenter = { x: 0, y: 0 };

    this.root = document.getElementById('touch-controls');
    this.lookLayer = document.getElementById('touch-look-layer');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.flashlightBtn = document.getElementById('touch-flashlight-btn');
    this.interactBtn = document.getElementById('touch-interact-btn');

    this._bind();
  }

  static isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
  }

  setPlayer(player) {
    this.player = player;
  }

  enable() {
    this.enabled = true;
    this.root.classList.remove('hidden');
  }

  disable() {
    this.enabled = false;
    this.root.classList.add('hidden');
    this._resetJoystick();
  }

  setInteractVisible(visible) {
    this.interactBtn.classList.toggle('touch-btn-active', visible);
  }

  _bind() {
    this.lookLayer.addEventListener('pointerdown', (e) => {
      if (this._lookPointerId !== null) return;
      this._lookPointerId = e.pointerId;
      this._lookLast.x = e.clientX;
      this._lookLast.y = e.clientY;
      try { this.lookLayer.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    });
    this.lookLayer.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._lookPointerId || !this.player || this.player.frozen) return;
      const dx = e.clientX - this._lookLast.x;
      const dy = e.clientY - this._lookLast.y;
      this._lookLast.x = e.clientX;
      this._lookLast.y = e.clientY;
      this._applyLook(dx, dy);
    });
    const endLook = (e) => { if (e.pointerId === this._lookPointerId) this._lookPointerId = null; };
    this.lookLayer.addEventListener('pointerup', endLook);
    this.lookLayer.addEventListener('pointercancel', endLook);

    this.joystickBase.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this._joystickPointerId !== null) return;
      this._joystickPointerId = e.pointerId;
      const rect = this.joystickBase.getBoundingClientRect();
      this._joystickCenter.x = rect.left + rect.width / 2;
      this._joystickCenter.y = rect.top + rect.height / 2;
      try { this.joystickBase.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      this._updateJoystick(e.clientX, e.clientY);
    });
    this.joystickBase.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      this._updateJoystick(e.clientX, e.clientY);
    });
    const endJoystick = (e) => {
      if (e.pointerId !== this._joystickPointerId) return;
      this._joystickPointerId = null;
      this._resetJoystick();
    };
    this.joystickBase.addEventListener('pointerup', endJoystick);
    this.joystickBase.addEventListener('pointercancel', endJoystick);

    this.flashlightBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.player) this.player.toggleFlashlight();
    });
    this.interactBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.onInteract) this.onInteract();
    });
  }

  _resetJoystick() {
    this.moveVec.x = 0;
    this.moveVec.y = 0;
    this.joystickKnob.style.transform = 'translate(-50%, -50%)';
  }

  _updateJoystick(clientX, clientY) {
    let dx = clientX - this._joystickCenter.x;
    let dy = clientY - this._joystickCenter.y;
    const dist = Math.hypot(dx, dy);
    if (dist > JOYSTICK_RADIUS) {
      dx = (dx / dist) * JOYSTICK_RADIUS;
      dy = (dy / dist) * JOYSTICK_RADIUS;
    }
    this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.moveVec.x = dx / JOYSTICK_RADIUS;
    this.moveVec.y = dy / JOYSTICK_RADIUS;
  }

  _applyLook(dx, dy) {
    const euler = this._euler;
    euler.setFromQuaternion(this.camera.quaternion);
    euler.y -= dx * LOOK_SENSITIVITY;
    euler.x -= dy * LOOK_SENSITIVITY;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    this.camera.quaternion.setFromEuler(euler);
  }
}
