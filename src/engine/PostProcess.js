/* ============================================================================
 * AETHERIA — The Future We Build
 * src/engine/PostProcess.js
 * Clean, Purposeful HDR Bloom & AgX Tone-Mapping Pipeline (Mobile + Desktop)
 * ============================================================================ */
(function (global) {
  'use strict';

  const BRIGHT_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform vec2 uTexel;
uniform float uThreshold;
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 sampleSoft(vec2 uv) {
  vec3 c = clamp(texture(uScene, uv).rgb, vec3(0.0), vec3(8.0));
  float l = luma(c);
  float w = smoothstep(uThreshold, uThreshold + 0.5, l);
  return (c * w) / (1.0 + l * 0.45);
}
void main() {
  vec3 c0 = sampleSoft(vUv);
  vec3 c1 = sampleSoft(vUv + vec2( uTexel.x,  uTexel.y));
  vec3 c2 = sampleSoft(vUv + vec2(-uTexel.x,  uTexel.y));
  vec3 c3 = sampleSoft(vUv + vec2( uTexel.x, -uTexel.y));
  vec3 c4 = sampleSoft(vUv + vec2(-uTexel.x, -uTexel.y));
  fragColor = vec4((c0 * 2.0 + c1 + c2 + c3 + c4) / 6.0, 1.0);
}`;

  const BLUR_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uOffset;
void main() {
  vec2 d = uTexel * uOffset;
  vec3 sum = texture(uTex, vUv + vec2( d.x,  d.y)).rgb
           + texture(uTex, vUv + vec2(-d.x,  d.y)).rgb
           + texture(uTex, vUv + vec2( d.x, -d.y)).rgb
           + texture(uTex, vUv + vec2(-d.x, -d.y)).rgb
           + texture(uTex, vUv).rgb * 2.0;
  fragColor = vec4(sum / 6.0, 1.0);
}`;

  const COMPOSITE_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uExposure;

vec3 acesToneMap(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec3 col = texture(uScene, vUv).rgb;
  vec3 bloom = texture(uBloom, vUv).rgb;
  col += bloom * uBloomStrength;
  col = acesToneMap(max(col, vec3(0.0)) * uExposure);
  float r = length(vUv - 0.5);
  col *= 1.0 - smoothstep(0.45, 1.15, r) * 0.25;
  col = pow(col, vec3(1.0 / 2.2));
  fragColor = vec4(col, 1.0);
}`;

  class PostProcess {
    constructor(engine) {
      this.engine = engine;
      this.params = { bloomStrength: 0.42, bloomThreshold: 0.82, exposure: 1.06 };
      this.progBright = engine.createFullscreenProgram(BRIGHT_FS);
      this.progBlur = engine.createFullscreenProgram(BLUR_FS);
      this.progComposite = engine.createFullscreenProgram(COMPOSITE_FS);
      this.sceneFBO = null; this.bloomA = null; this.bloomB = null;
      this.resize(engine.width, engine.height);
    }

    resize(w, h) {
      const e = this.engine;
      if (this.sceneFBO && this.sceneFBO.width === w && this.sceneFBO.height === h) return;
      e.deleteFBO(this.sceneFBO); e.deleteFBO(this.bloomA); e.deleteFBO(this.bloomB);
      this.sceneFBO = e.createFBO(w, h, { hdr: true, depth: false });
      const bw = Math.max(32, Math.floor(w * 0.5)), bh = Math.max(32, Math.floor(h * 0.5));
      this.bloomA = e.createFBO(bw, bh, { hdr: true, depth: false });
      this.bloomB = e.createFBO(bw, bh, { hdr: true, depth: false });
    }

    beginScene() {
      const gl = this.engine.gl;
      this.resize(this.engine.width, this.engine.height);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFBO.fbo);
      gl.viewport(0, 0, this.sceneFBO.width, this.sceneFBO.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    endAndComposite() {
      const e = this.engine, gl = e.gl;
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.fbo);
      gl.viewport(0, 0, this.bloomA.width, this.bloomA.height);
      this.progBright.use();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
      this.progBright.set1i('uScene', 0);
      this.progBright.set2f('uTexel', 1 / this.sceneFBO.width, 1 / this.sceneFBO.height);
      this.progBright.set1f('uThreshold', this.params.bloomThreshold);
      e.drawFullscreen();

      let readFBO = this.bloomA, writeFBO = this.bloomB;
      this.progBlur.use();
      this.progBlur.set2f('uTexel', 1 / this.bloomA.width, 1 / this.bloomA.height);
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO.fbo);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, readFBO.tex);
        this.progBlur.set1i('uTex', 0);
        this.progBlur.set1f('uOffset', 1.2 + i * 1.4);
        e.drawFullscreen();
        const tmp = readFBO; readFBO = writeFBO; writeFBO = tmp;
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, e.width, e.height);
      this.progComposite.use();
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.sceneFBO.tex);
      this.progComposite.set1i('uScene', 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, readFBO.tex);
      this.progComposite.set1i('uBloom', 1);
      this.progComposite.set1f('uBloomStrength', this.params.bloomStrength);
      this.progComposite.set1f('uExposure', this.params.exposure);
      e.drawFullscreen();
    }

    dispose() {
      const e = this.engine;
      e.deleteFBO(this.sceneFBO); e.deleteFBO(this.bloomA); e.deleteFBO(this.bloomB);
      this.progBright.dispose(); this.progBlur.dispose(); this.progComposite.dispose();
    }
  }

  global.AetheriaPost = { PostProcess };
})(typeof window !== 'undefined' ? window : globalThis);
