export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.codeCounter = document.getElementById('code-counter');
    this.signalMeter = document.getElementById('signal-meter');
    this.signalBars = Array.from(this.signalMeter.children);
    this.batteryFill = document.getElementById('battery-fill');
    this.staminaFill = document.getElementById('stamina-fill');
    this.prompt = document.getElementById('interact-prompt');
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  setCodes(have, need) {
    this.codeCounter.textContent = `${have} / ${need}`;
  }

  setSignal(alert) {
    const active = Math.ceil(alert * this.signalBars.length);
    this.signalBars.forEach((bar, i) => {
      bar.classList.toggle('bar-active', i < active);
      bar.classList.toggle('bar-danger', i < active && alert > 0.7);
    });
  }

  setBattery(pct) {
    this.batteryFill.style.width = `${pct}%`;
    this.batteryFill.classList.toggle('battery-low', pct < 20);
  }

  setStamina(pct) {
    this.staminaFill.style.width = `${pct}%`;
  }

  setPrompt(text) {
    if (!text) {
      this.prompt.classList.add('hidden');
      return;
    }
    this.prompt.textContent = text;
    this.prompt.classList.remove('hidden');
  }
}
