/* ============================================================================
 * AETHERIA STUDIO — Mobile-First Damped Orbit, Free-Fly, Autopilot & Gyro Rig
 * ============================================================================ */
(function (global) {
  'use strict';

  const { Vec3, Mat4, CatmullRomSpline, clamp, lerp } = global.AetheriaMath;

  class CameraRig {
    constructor(canvas) {
      this.canvas = canvas;
      this.mode = 'orbit'; // 'orbit' | 'autopilot' | 'gyro'

      // Spherical orbit targets
      this.yaw = 0.4;
      this.pitch = 0.25;
      this.distance = 7.5;
      this.target = new Vec3(0, 0, 0);

      // Smoothed current values
      this.curYaw = this.yaw;
      this.curPitch = this.pitch;
      this.curDistance = this.distance;
      this.curTarget = this.target.clone();
      this.position = new Vec3(0, 2, 7.5);
      this.prevPosition = this.position.clone();
      this.velocity = 0;

      this.fov = 52 * (Math.PI / 180);
      this.near = 0.08;
      this.far = 250.0;

      // Normalized pointer & ripple state
      this.pointer = { x: 0.5, y: 0.5, down: false, strength: 0 };
      this.ripples = []; // { x, y, time }

      // Spline autopilot
      this.spline = null;
      this.splineTarget = new Vec3(0, 0, 0);
      this.splineTime = 0;

      // One-shot spline flight (for architectural focus points & sequencer)
      this.flight = null;

      // Gyroscope offsets
      this.gyro = { enabled: false, yawOffset: 0, pitchOffset: 0 };

      // Keyboard WASD state
      this.keys = Object.create(null);

      // Touch / pointer tracking
      this._pointers = new Map();
      this._pinchDist = 0;
      this._lastCenter = null;

      this._bindEvents();
    }

    configureForWorld(cfg) {
      this.yaw = cfg.yaw ?? 0.4;
      this.pitch = cfg.pitch ?? 0.22;
      this.distance = cfg.distance ?? 7.5;
      this.target = Vec3.fromArray(cfg.target || [0, 0, 0]);
      this.curYaw = this.yaw;
      this.curPitch = this.pitch;
      this.curDistance = this.distance;
      this.curTarget = this.target.clone();
      this.spline = cfg.spline ? new CatmullRomSpline(cfg.spline, true) : null;
      this.splineTarget = Vec3.fromArray(cfg.splineTarget || cfg.target || [0, 0, 0]);
      this.flight = null;
    }

    flyTo(yaw, pitch, distance, targetArr, duration = 1.6) {
      this.mode = 'orbit';
      this.flight = {
        elapsed: 0,
        duration,
        startYaw: this.curYaw,
        startPitch: this.curPitch,
        startDist: this.curDistance,
        startTarget: this.curTarget.clone(),
        endYaw: yaw,
        endPitch: pitch,
        endDist: distance,
        endTarget: Vec3.fromArray(targetArr || [0, 0, 0])
      };
    }

    setMode(mode) {
      this.mode = mode;
      if (mode === 'gyro') {
        this._enableGyro();
      }
    }

    _enableGyro() {
      this.gyro.enabled = true;
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(() => {});
      }
    }

    getSnapshot() {
      return {
        yaw: Number(this.curYaw.toFixed(3)),
        pitch: Number(this.curPitch.toFixed(3)),
        distance: Number(this.curDistance.toFixed(3)),
        target: [
          Number(this.curTarget.x.toFixed(3)),
          Number(this.curTarget.y.toFixed(3)),
          Number(this.curTarget.z.toFixed(3))
        ]
      };
    }

    _bindEvents() {
      const c = this.canvas;
      c.style.touchAction = 'none';

      c.addEventListener('pointerdown', (e) => {
        c.setPointerCapture(e.pointerId);
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this._updatePointerNorm(e.clientX, e.clientY);
        this.pointer.down = true;
        this.pointer.strength = 1.0;
        this.ripples.push({ x: this.pointer.x, y: this.pointer.y, age: 0 });
        if (this.ripples.length > 6) this.ripples.shift();
        if (this._pointers.size === 2) {
          this._pinchDist = this._getPinchDist();
          this._lastCenter = this._getCenter();
        }
        if (this.flight) this.flight = null;
      });

      c.addEventListener('pointermove', (e) => {
        this._updatePointerNorm(e.clientX, e.clientY);
        if (!this._pointers.has(e.pointerId)) return;
        const prev = this._pointers.get(e.pointerId);
        const dx = e.clientX - prev.x;
        const dy = e.clientY - prev.y;
        this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (this._pointers.size === 1) {
          if (this.mode === 'autopilot') this.mode = 'orbit';
          this.yaw -= dx * 0.0065;
          this.pitch = clamp(this.pitch + dy * 0.0055, -1.38, 1.38);
        } else if (this._pointers.size === 2) {
          const dist = this._getPinchDist();
          const center = this._getCenter();
          if (this._pinchDist > 0) {
            const ratio = this._pinchDist / Math.max(10, dist);
            this.distance = clamp(this.distance * ratio, 1.8, 35.0);
          }
          if (this._lastCenter) {
            const cdx = (center.x - this._lastCenter.x) * 0.006 * (this.distance * 0.15);
            const cdy = (center.y - this._lastCenter.y) * 0.006 * (this.distance * 0.15);
            const right = new Vec3(Math.cos(this.curYaw), 0, -Math.sin(this.curYaw));
            this.target = this.target.sub(right.scale(cdx)).add(new Vec3(0, cdy, 0));
          }
          this._pinchDist = dist;
          this._lastCenter = center;
        }
      });

      const onUp = (e) => {
        this._pointers.delete(e.pointerId);
        if (this._pointers.size === 0) this.pointer.down = false;
        if (this._pointers.size < 2) { this._pinchDist = 0; this._lastCenter = null; }
      };
      c.addEventListener('pointerup', onUp);
      c.addEventListener('pointercancel', onUp);

      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.mode === 'autopilot') this.mode = 'orbit';
        const factor = Math.exp(e.deltaY * 0.0011);
        this.distance = clamp(this.distance * factor, 1.8, 35.0);
      }, { passive: false });

      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) return;
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      window.addEventListener('deviceorientation', (e) => {
        if (!this.gyro.enabled || e.gamma == null || e.beta == null) return;
        this.gyro.yawOffset = clamp(e.gamma / 45, -1, 1) * 0.45;
        this.gyro.pitchOffset = clamp((e.beta - 45) / 45, -1, 1) * 0.35;
      });
    }

    _updatePointerNorm(cx, cy) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = clamp((cx - rect.left) / Math.max(1, rect.width), 0, 1);
      this.pointer.y = clamp(1.0 - (cy - rect.top) / Math.max(1, rect.height), 0, 1);
    }

    _getPinchDist() {
      const pts = Array.from(this._pointers.values());
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }

    _getCenter() {
      const pts = Array.from(this._pointers.values());
      return { x: (pts[0].x + pts[1].x) * 0.5, y: (pts[0].y + pts[1].y) * 0.5 };
    }

    update(dt, aspect) {
      this.prevPosition.copy(this.position);

      // Update ripples
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        this.ripples[i].age += dt;
        if (this.ripples[i].age > 4.0) this.ripples.splice(i, 1);
      }
      if (!this.pointer.down) {
        this.pointer.strength = Math.max(0, this.pointer.strength - dt * 1.8);
      }

      // WASD free-fly target translation
      const moveSpeed = dt * Math.max(2.0, this.curDistance * 0.55);
      const fwd = new Vec3(-Math.sin(this.curYaw), 0, -Math.cos(this.curYaw));
      const right = new Vec3(Math.cos(this.curYaw), 0, -Math.sin(this.curYaw));
      if (this.keys['KeyW']) this.target = this.target.add(fwd.scale(moveSpeed));
      if (this.keys['KeyS']) this.target = this.target.sub(fwd.scale(moveSpeed));
      if (this.keys['KeyD']) this.target = this.target.add(right.scale(moveSpeed));
      if (this.keys['KeyA']) this.target = this.target.sub(right.scale(moveSpeed));
      if (this.keys['KeyE']) this.target.y += moveSpeed;
      if (this.keys['KeyQ']) this.target.y -= moveSpeed;

      // Handle smooth spline flight
      if (this.flight) {
        this.flight.elapsed += dt;
        const u = clamp(this.flight.elapsed / this.flight.duration, 0, 1);
        const ease = u * u * (3 - 2 * u);
        this.yaw = lerp(this.flight.startYaw, this.flight.endYaw, ease);
        this.pitch = lerp(this.flight.startPitch, this.flight.endPitch, ease);
        this.distance = lerp(this.flight.startDist, this.flight.endDist, ease);
        this.target = this.flight.startTarget.lerp(this.flight.endTarget, ease);
        if (u >= 1) this.flight = null;
      }

      if (this.mode === 'autopilot' && this.spline) {
        this.splineTime = (this.splineTime + dt * 0.045) % 1;
        const pos = this.spline.evaluate(this.splineTime);
        this.position = this.position.lerp(pos, 1 - Math.exp(-dt * 4.5));
        this.curTarget = this.curTarget.lerp(this.splineTarget, 1 - Math.exp(-dt * 4.5));
      } else {
        const damp = 1 - Math.exp(-dt * 7.5);
        this.curYaw = lerp(this.curYaw, this.yaw + (this.mode === 'gyro' ? this.gyro.yawOffset : 0), damp);
        this.curPitch = lerp(this.curPitch, clamp(this.pitch + (this.mode === 'gyro' ? this.gyro.pitchOffset : 0), -1.42, 1.42), damp);
        this.curDistance = lerp(this.curDistance, this.distance, damp);
        this.curTarget = this.curTarget.lerp(this.target, damp);

        const cp = Math.cos(this.curPitch);
        this.position.set(
          this.curTarget.x + Math.sin(this.curYaw) * cp * this.curDistance,
          this.curTarget.y + Math.sin(this.curPitch) * this.curDistance,
          this.curTarget.z + Math.cos(this.curYaw) * cp * this.curDistance
        );
      }

      this.velocity = this.position.dist(this.prevPosition) / Math.max(0.001, dt);
      this.viewMatrix = Mat4.lookAt(this.position, this.curTarget, new Vec3(0, 1, 0));
      this.projMatrix = Mat4.perspective(this.fov, aspect || 1, this.near, this.far);
      this.viewProjMatrix = this.projMatrix.multiply(this.viewMatrix);
      this.invViewProjMatrix = this.viewProjMatrix.invert();
    }
  }

  global.AetheriaCamera = { CameraRig };
})(typeof window !== 'undefined' ? window : globalThis);
