import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const CrtShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0 }, // 0..1, driven by danger/exposure
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;

      // Occasional horizontal glitch displacement, worse at high intensity.
      float glitchLine = step(0.996 - uIntensity * 0.03, rand(vec2(floor(uv.y * 90.0), floor(uTime * 8.0))));
      float shift = (rand(vec2(floor(uTime * 30.0), 1.0)) - 0.5) * 0.06 * glitchLine * (0.4 + uIntensity);
      uv.x += shift;

      float aberration = 0.0018 + uIntensity * 0.006;
      float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
      vec3 color = vec3(r, g, b);

      // Scanlines.
      float scan = sin(uv.y * uResolution.y * 1.4 - uTime * 40.0) * 0.5 + 0.5;
      color *= mix(1.0, 0.82 + 0.18 * scan, 0.35 + uIntensity * 0.25);

      // Vignette, tightens with intensity.
      vec2 centered = uv - 0.5;
      float vig = 1.0 - dot(centered, centered) * (1.1 + uIntensity * 1.4);
      color *= clamp(vig, 0.0, 1.0);

      // Grain.
      float grain = (rand(uv * uResolution.xy + uTime) - 0.5) * (0.06 + uIntensity * 0.12);
      color += grain;

      // Sickly tint toward yellow-green, stronger with intensity.
      vec3 tint = vec3(0.96, 0.98, 0.82);
      color = mix(color, color * tint, 0.5 + uIntensity * 0.3);

      // Random full-row tear flashes at extreme intensity.
      float tear = step(0.9985, rand(vec2(uTime * 5.0, 3.0))) * uIntensity;
      color = mix(color, vec3(1.0), tear * 0.8);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.crtPass = new ShaderPass(CrtShader);
    this.crtPass.renderToScreen = true;
    this.composer.addPass(this.crtPass);
    this.intensity = 0;
  }

  setSize(w, h) {
    this.composer.setSize(w, h);
    this.crtPass.uniforms.uResolution.value.set(w, h);
  }

  setIntensity(v) {
    this.intensity = v;
  }

  render(dt, t) {
    this.crtPass.uniforms.uTime.value = t;
    this.crtPass.uniforms.uIntensity.value = this.intensity;
    this.composer.render(dt);
  }
}
