/* ============================================================================
 * AETHERIA STUDIO — Pure WebGL2 Engine, GPU Profiler & Resource Manager
 * ============================================================================ */
(function (global) {
  'use strict';

  const FULLSCREEN_VS = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

  const QUALITY_TIERS = {
    'Ultra':         { id: 'Ultra',         dprMax: 2.0, scale: 1.00, raySteps: 96, particles: 98304, bloomPasses: 4, shadowSteps: 24 },
    'High':          { id: 'High',          dprMax: 1.75, scale: 0.90, raySteps: 72, particles: 65536, bloomPasses: 3, shadowSteps: 18 },
    'Medium':        { id: 'Medium',        dprMax: 1.5, scale: 0.78, raySteps: 54, particles: 32768, bloomPasses: 2, shadowSteps: 12 },
    'Mobile-Smooth': { id: 'Mobile-Smooth', dprMax: 1.25, scale: 0.65, raySteps: 40, particles: 16384, bloomPasses: 2, shadowSteps: 8 }
  };

  class WebGL2Engine {
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      if (!gl) {
        throw new Error('WebGL2 is required for Aetheria Studio.');
      }
      this.gl = gl;

      // Float / half-float render target capability detection
      this.extColorFloat = gl.getExtension('EXT_color_buffer_float');
      this.extColorHalf = gl.getExtension('EXT_color_buffer_half_float');
      this.extFloatLinear = gl.getExtension('OES_texture_float_linear');
      this.extHalfLinear = gl.getExtension('OES_texture_half_float_linear');
      this.extAniso = gl.getExtension('EXT_texture_filter_anisotropic');

      this.hdrFormat = this._detectHDRFormat();
      this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (window.innerWidth < 768);

      // Default quality tier
      this.tierName = this.isMobile ? 'Mobile-Smooth' : 'High';
      this.tier = Object.assign({}, QUALITY_TIERS[this.tierName]);

      // Dynamic resolution PID controller state
      this.dynamicScale = this.tier.scale;
      this.autoScaleEnabled = true;
      this.fpsSmoothed = 60;
      this.frameTimeSmoothed = 16.6;
      this._pidIntegral = 0;

      // Fullscreen empty VAO
      this.emptyVAO = gl.createVertexArray();

      // Tracked GPU resources for zero-leak disposal
      this._programs = new Set();
      this._fbos = new Set();

      this.width = 1;
      this.height = 1;
      this.resize();
    }

    _detectHDRFormat() {
      const gl = this.gl;
      if (this.extColorFloat && this.extFloatLinear) {
        return { internalFormat: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT, filter: gl.LINEAR, isHDR: true };
      }
      if (this.extColorHalf) {
        return {
          internalFormat: gl.RGBA16F,
          format: gl.RGBA,
          type: gl.HALF_FLOAT,
          filter: this.extHalfLinear ? gl.LINEAR : gl.NEAREST,
          isHDR: true
        };
      }
      return { internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR, isHDR: false };
    }

    setQualityTier(name) {
      if (!QUALITY_TIERS[name]) return;
      this.tierName = name;
      this.tier = Object.assign({}, QUALITY_TIERS[name]);
      this.dynamicScale = this.tier.scale;
      this._pidIntegral = 0;
      this.resize();
    }

    updateProfiler(dtSec) {
      const ms = Math.max(1, Math.min(200, dtSec * 1000));
      this.frameTimeSmoothed = this.frameTimeSmoothed * 0.9 + ms * 0.1;
      this.fpsSmoothed = 1000 / Math.max(1, this.frameTimeSmoothed);

      if (!this.autoScaleEnabled) return false;
      const targetMs = this.isMobile ? 22.0 : 18.0; // ~45-55fps floor
      const err = targetMs - this.frameTimeSmoothed;
      this._pidIntegral = Math.max(-50, Math.min(50, this._pidIntegral + err * dtSec));
      const adjustment = (err * 0.002 + this._pidIntegral * 0.0005) * dtSec;
      const minScale = this.isMobile ? 0.5 : 0.65;
      const maxScale = this.tier.scale;
      const next = Math.max(minScale, Math.min(maxScale, this.dynamicScale + adjustment));
      if (Math.abs(next - this.dynamicScale) > 0.04) {
        this.dynamicScale = next;
        this.resize();
        return true;
      }
      return false;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, this.tier.dprMax);
      const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
      const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);
      const w = Math.max(64, Math.floor(cssW * dpr * this.dynamicScale));
      const h = Math.max(64, Math.floor(cssH * dpr * this.dynamicScale));
      if (this.canvas.width !== w || this.canvas.height !== h) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
      this.width = w;
      this.height = h;
      this.gl.viewport(0, 0, w, h);
    }

    compileShader(type, source) {
      const gl = this.gl;
      const sh = gl.createShader(type);
      gl.shaderSource(sh, source);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(sh) || 'Unknown shader compile error';
        const numbered = source
          .split('\n')
          .map((l, i) => `${String(i + 1).padStart(4, ' ')}: ${l}`)
          .join('\n');
        gl.deleteShader(sh);
        const err = new Error(`GLSL ${type === gl.VERTEX_SHADER ? 'VS' : 'FS'} Error:\n${log}\n\n${numbered.slice(0, 1200)}`);
        err.glslLog = log;
        throw err;
      }
      return sh;
    }

    createProgram(vsSource, fsSource, transformFeedbackVaryings = null) {
      const gl = this.gl;
      const vs = this.compileShader(gl.VERTEX_SHADER, vsSource);
      let fs;
      try {
        fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource);
      } catch (e) {
        gl.deleteShader(vs);
        throw e;
      }
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      if (transformFeedbackVaryings && transformFeedbackVaryings.length) {
        gl.transformFeedbackVaryings(prog, transformFeedbackVaryings, gl.INTERLEAVED_ATTRIBS);
      }
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(prog) || 'Program link error';
        gl.deleteProgram(prog);
        const err = new Error(`GLSL Link Error:\n${log}`);
        err.glslLog = log;
        throw err;
      }

      const uniformCache = Object.create(null);
      const wrapper = {
        program: prog,
        vsSource,
        fsSource,
        use: () => gl.useProgram(prog),
        loc: (name) => {
          if (!(name in uniformCache)) {
            uniformCache[name] = gl.getUniformLocation(prog, name);
          }
          return uniformCache[name];
        },
        set1f: (n, v) => { const l = wrapper.loc(n); if (l !== null) gl.uniform1f(l, v); },
        set1i: (n, v) => { const l = wrapper.loc(n); if (l !== null) gl.uniform1i(l, v); },
        set2f: (n, x, y) => { const l = wrapper.loc(n); if (l !== null) gl.uniform2f(l, x, y); },
        set3f: (n, x, y, z) => { const l = wrapper.loc(n); if (l !== null) gl.uniform3f(l, x, y, z); },
        set4f: (n, x, y, z, w) => { const l = wrapper.loc(n); if (l !== null) gl.uniform4f(l, x, y, z, w); },
        setMat4: (n, m) => { const l = wrapper.loc(n); if (l !== null) gl.uniformMatrix4fv(l, false, m); },
        dispose: () => {
          gl.deleteProgram(prog);
          this._programs.delete(wrapper);
        }
      };
      this._programs.add(wrapper);
      return wrapper;
    }

    createFullscreenProgram(fsSource) {
      return this.createProgram(FULLSCREEN_VS, fsSource);
    }

    drawFullscreen() {
      const gl = this.gl;
      gl.bindVertexArray(this.emptyVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);
    }

    createFBO(width, height, opts = {}) {
      const gl = this.gl;
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      const hdr = opts.hdr !== false ? this.hdrFormat : {
        internalFormat: gl.RGBA8, format: gl.RGBA, type: gl.UNSIGNED_BYTE, filter: gl.LINEAR
      };
      const filter = opts.filter || hdr.filter;
      const wrap = opts.wrap || gl.CLAMP_TO_EDGE;

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, hdr.internalFormat, w, h, 0, hdr.format, hdr.type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      let depthRB = null;
      if (opts.depth) {
        depthRB = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRB);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRB);
      }

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE && opts.hdr !== false) {
        // Fallback to RGBA8 if float FBO incomplete on exotic mobile driver
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindRenderbuffer(gl.RENDERBUFFER, null);

      const obj = { fbo, tex, depthRB, width: w, height: h, opts };
      this._fbos.add(obj);
      return obj;
    }

    deleteFBO(obj) {
      if (!obj) return;
      const gl = this.gl;
      if (obj.fbo) gl.deleteFramebuffer(obj.fbo);
      if (obj.tex) gl.deleteTexture(obj.tex);
      if (obj.depthRB) gl.deleteRenderbuffer(obj.depthRB);
      this._fbos.delete(obj);
    }

    getStats() {
      return {
        tier: this.tierName,
        width: this.width,
        height: this.height,
        fps: Math.round(this.fpsSmoothed),
        frameMs: this.frameTimeSmoothed.toFixed(1),
        programs: this._programs.size,
        fbos: this._fbos.size,
        hdr: this.hdrFormat.isHDR
      };
    }
  }

  global.AetheriaEngine = { WebGL2Engine, FULLSCREEN_VS, QUALITY_TIERS };
})(typeof window !== 'undefined' ? window : globalThis);
