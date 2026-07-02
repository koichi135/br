import * as THREE from 'three';

// All textures are generated procedurally on <canvas> so the game ships with
// zero binary assets -- fitting for something that's supposed to feel like
// it was scraped together on a 1998 web host with a 10MB quota.

function canvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function noiseFill(ctx, size, alphaMin, alphaMax, colorFn) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = colorFn();
    const a = alphaMin + Math.random() * (alphaMax - alphaMin);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a * 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function wallTexture() {
  const size = 512;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  // Sickly yellow base, the color every Backrooms description agrees on.
  ctx.fillStyle = '#c9b53a';
  ctx.fillRect(0, 0, size, size);

  // Old dot-matrix wallpaper pattern.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#8f7c1e';
  for (let y = 0; y < size; y += 16) {
    for (let x = 0; x < size; x += 16) {
      if ((x / 16 + y / 16) % 2 === 0) ctx.fillRect(x, y, 8, 8);
    }
  }
  ctx.globalAlpha = 1;

  // Water stains / mildew blotches.
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 18 + Math.random() * 70;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = Math.random() < 0.5;
    grad.addColorStop(0, dark ? 'rgba(60,50,10,0.35)' : 'rgba(140,130,60,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint peeling seams.
  ctx.strokeStyle = 'rgba(40,35,10,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    ctx.moveTo(x, 0);
    for (let y = 0; y <= size; y += 24) {
      x += (Math.random() - 0.5) * 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function carpetTexture() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4b3a1e';
  ctx.fillRect(0, 0, size, size);
  noiseFill(ctx, size, 0.05, 0.22, () => {
    const base = 60 + Math.random() * 40;
    return [base, base * 0.75, base * 0.35];
  });
  // Damp dark patches.
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 10 + Math.random() * 40;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(10,10,5,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function ceilingTexture() {
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc27e';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(90,80,30,0.6)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.strokeStyle = 'rgba(90,80,30,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    const x = Math.random() * size, y = Math.random() * size;
    ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 1.4);
  grad.addColorStop(0, 'rgba(50,40,10,0)');
  grad.addColorStop(1, 'rgba(50,40,10,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A repeating tiled-gif style background, the way half of Geocities looked --
// stars, clouds, or checkerboard tiled behind everything.
export function crtStaticTexture(size = 128) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}
