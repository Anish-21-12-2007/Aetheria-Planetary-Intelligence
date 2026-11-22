/* ============================================================================
 * AETHERIA STUDIO — Pure Zero-Dependency 3D Math, Spline, Noise & Color Core
 * ============================================================================ */
(function (global) {
  'use strict';

  const EPS = 1e-6;
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0 || EPS), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const deg2rad = (d) => (d * Math.PI) / 180;

  // --- Vec2 ---
  class Vec2 {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
    }
    clone() { return new Vec2(this.x, this.y); }
    set(x, y) { this.x = x; this.y = y; return this; }
    add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
    scale(s) { return new Vec2(this.x * s, this.y * s); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    lenSq() { return this.x * this.x + this.y * this.y; }
    len() { return Math.hypot(this.x, this.y); }
    normalize() {
      const l = this.len();
      return l > EPS ? new Vec2(this.x / l, this.y / l) : new Vec2(0, 0);
    }
    lerp(v, t) { return new Vec2(lerp(this.x, v.x, t), lerp(this.y, v.y, t)); }
    toArray() { return [this.x, this.y]; }
  }

  // --- Vec3 ---
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone() { return new Vec3(this.x, this.y, this.z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(v) { return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z); }
    scale(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) {
      return new Vec3(
        this.y * v.z - this.z * v.y,
        this.z * v.x - this.x * v.z,
        this.x * v.y - this.y * v.x
      );
    }
    lenSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
    len() { return Math.hypot(this.x, this.y, this.z); }
    dist(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
    normalize() {
      const l = this.len();
      return l > EPS ? new Vec3(this.x / l, this.y / l, this.z / l) : new Vec3(0, 0, 0);
    }
    lerp(v, t) {
      return new Vec3(lerp(this.x, v.x, t), lerp(this.y, v.y, t), lerp(this.z, v.z, t));
    }
    reflect(n) {
      const d = 2 * this.dot(n);
      return new Vec3(this.x - d * n.x, this.y - d * n.y, this.z - d * n.z);
    }
    toArray() { return [this.x, this.y, this.z]; }
    static fromArray(a) { return new Vec3(a[0] || 0, a[1] || 0, a[2] || 0); }
  }

  // --- Vec4 ---
  class Vec4 {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x; this.y = y; this.z = z; this.w = w;
    }
    clone() { return new Vec4(this.x, this.y, this.z, this.w); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w; }
    len() { return Math.hypot(this.x, this.y, this.z, this.w); }
    normalize() {
      const l = this.len();
      return l > EPS ? new Vec4(this.x / l, this.y / l, this.z / l, this.w / l) : new Vec4(0, 0, 0, 0);
    }
    toArray() { return [this.x, this.y, this.z, this.w]; }
  }

  // --- Mat4 (Column-major Float32Array for WebGL2) ---
  class Mat4 {
    constructor(elements) {
      this.m = new Float32Array(16);
      if (elements) {
        this.m.set(elements);
      } else {
        this.m[0] = 1; this.m[5] = 1; this.m[10] = 1; this.m[15] = 1;
      }
    }
    clone() { return new Mat4(this.m); }
    static identity() { return new Mat4(); }

    static perspective(fovRad, aspect, near, far) {
      const out = new Mat4();
      const f = 1.0 / Math.tan(fovRad * 0.5);
      const nf = 1.0 / (near - far);
      const m = out.m;
      m[0] = f / (aspect || 1);
      m[1] = 0; m[2] = 0; m[3] = 0;
      m[4] = 0; m[5] = f; m[6] = 0; m[7] = 0;
      m[8] = 0; m[9] = 0; m[10] = (far + near) * nf; m[11] = -1;
      m[12] = 0; m[13] = 0; m[14] = 2 * far * near * nf; m[15] = 0;
      return out;
    }

    static lookAt(eye, target, up) {
      const z = eye.sub(target).normalize();
      let x = up.cross(z);
      if (x.lenSq() < EPS) {
        x = new Vec3(1, 0, 0).cross(z);
      }
      x = x.normalize();
      const y = z.cross(x).normalize();
      const out = new Mat4();
      const m = out.m;
      m[0] = x.x; m[1] = y.x; m[2] = z.x; m[3] = 0;
      m[4] = x.y; m[5] = y.y; m[6] = z.y; m[7] = 0;
      m[8] = x.z; m[9] = y.z; m[10] = z.z; m[11] = 0;
      m[12] = -x.dot(eye);
      m[13] = -y.dot(eye);
      m[14] = -z.dot(eye);
      m[15] = 1;
      return out;
    }

    static translation(x, y, z) {
      const out = new Mat4();
      out.m[12] = x; out.m[13] = y; out.m[14] = z;
      return out;
    }

    static scaling(x, y, z) {
      const out = new Mat4();
      out.m[0] = x; out.m[5] = y; out.m[10] = z;
      return out;
    }

    static rotationX(rad) {
      const out = new Mat4(), c = Math.cos(rad), s = Math.sin(rad);
      out.m[5] = c; out.m[6] = s; out.m[9] = -s; out.m[10] = c;
      return out;
    }

    static rotationY(rad) {
      const out = new Mat4(), c = Math.cos(rad), s = Math.sin(rad);
      out.m[0] = c; out.m[2] = -s; out.m[8] = s; out.m[10] = c;
      return out;
    }

    static rotationZ(rad) {
      const out = new Mat4(), c = Math.cos(rad), s = Math.sin(rad);
      out.m[0] = c; out.m[1] = s; out.m[4] = -s; out.m[5] = c;
      return out;
    }

    multiply(b) {
      const out = new Mat4();
      const a = this.m, bm = b.m, o = out.m;
      for (let col = 0; col < 4; col++) {
        const b0 = bm[col * 4], b1 = bm[col * 4 + 1], b2 = bm[col * 4 + 2], b3 = bm[col * 4 + 3];
        o[col * 4 + 0] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
        o[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
        o[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
        o[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
      }
      return out;
    }

    invert() {
      const m = this.m;
      const inv = new Float32Array(16);
      inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
      inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
      inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
      inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
      inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
      inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
      inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
      inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
      inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
      inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
      inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
      inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
      inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
      inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
      inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
      inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];

      let det = m[0]*inv[0] + m[1]*inv[4] + m[2]*inv[8] + m[3]*inv[12];
      if (Math.abs(det) < EPS) return Mat4.identity();
      det = 1.0 / det;
      for (let i = 0; i < 16; i++) inv[i] *= det;
      return new Mat4(inv);
    }

    transformPoint(v) {
      const m = this.m;
      const w = m[3] * v.x + m[7] * v.y + m[11] * v.z + m[15] || 1;
      return new Vec3(
        (m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12]) / w,
        (m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13]) / w,
        (m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14]) / w
      );
    }
  }

  // --- Quat ---
  class Quat {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x; this.y = y; this.z = z; this.w = w;
    }
    static identity() { return new Quat(0, 0, 0, 1); }
    static fromAxisAngle(axis, rad) {
      const a = axis.normalize();
      const s = Math.sin(rad * 0.5);
      return new Quat(a.x * s, a.y * s, a.z * s, Math.cos(rad * 0.5));
    }
    static fromEuler(pitch, yaw, roll) {
      const cx = Math.cos(pitch * 0.5), sx = Math.sin(pitch * 0.5);
      const cy = Math.cos(yaw * 0.5), sy = Math.sin(yaw * 0.5);
      const cz = Math.cos(roll * 0.5), sz = Math.sin(roll * 0.5);
      return new Quat(
        sx * cy * cz - cx * sy * sz,
        cx * sy * cz + sx * cy * sz,
        cx * cy * sz - sx * sy * cz,
        cx * cy * cz + sx * sy * sz
      );
    }
    normalize() {
      const l = Math.hypot(this.x, this.y, this.z, this.w) || 1;
      return new Quat(this.x / l, this.y / l, this.z / l, this.w / l);
    }
    multiply(q) {
      return new Quat(
        this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
        this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
        this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
        this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z
      );
    }
    slerp(q, t) {
      let cosHalf = this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
      let qx = q.x, qy = q.y, qz = q.z, qw = q.w;
      if (cosHalf < 0) {
        cosHalf = -cosHalf; qx = -qx; qy = -qy; qz = -qz; qw = -qw;
      }
      if (cosHalf >= 0.9995) {
        return new Quat(
          lerp(this.x, qx, t), lerp(this.y, qy, t),
          lerp(this.z, qz, t), lerp(this.w, qw, t)
        ).normalize();
      }
      const halfTheta = Math.acos(clamp(cosHalf, -1, 1));
      const sinHalf = Math.sin(halfTheta);
      const rA = Math.sin((1 - t) * halfTheta) / sinHalf;
      const rB = Math.sin(t * halfTheta) / sinHalf;
      return new Quat(
        this.x * rA + qx * rB, this.y * rA + qy * rB,
        this.z * rA + qz * rB, this.w * rA + qw * rB
      );
    }
    toMat4() {
      const { x, y, z, w } = this;
      const xx = x * x, yy = y * y, zz = z * z;
      const xy = x * y, xz = x * z, yz = y * z;
      const wx = w * x, wy = w * y, wz = w * z;
      return new Mat4([
        1 - 2*(yy + zz), 2*(xy + wz),     2*(xz - wy),     0,
        2*(xy - wz),     1 - 2*(xx + zz), 2*(yz + wx),     0,
        2*(xz + wy),     2*(yz - wx),     1 - 2*(xx + yy), 0,
        0,               0,               0,               1
      ]);
    }
  }

  // --- Catmull-Rom Spline ---
  class CatmullRomSpline {
    constructor(points, closed = true) {
      this.points = points.map((p) => (p instanceof Vec3 ? p : new Vec3(p[0], p[1], p[2])));
      this.closed = closed;
    }
    evaluate(t) {
      const pts = this.points;
      const n = pts.length;
      if (n === 0) return new Vec3();
      if (n === 1) return pts[0].clone();
      const segs = this.closed ? n : n - 1;
      const u = (((t % 1) + 1) % 1) * segs;
      const i = Math.floor(u);
      const f = u - i;
      const get = (idx) => {
        if (this.closed) return pts[((idx % n) + n) % n];
        return pts[clamp(idx, 0, n - 1)];
      };
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const f2 = f * f, f3 = f2 * f;
      const c = (a, b, c2, d) =>
        0.5 * ((2 * b) + (-a + c2) * f + (2 * a - 5 * b + 4 * c2 - d) * f2 + (-a + 3 * b - 3 * c2 + d) * f3);
      return new Vec3(
        c(p0.x, p1.x, p2.x, p3.x),
        c(p0.y, p1.y, p2.y, p3.y),
        c(p0.z, p1.z, p2.z, p3.z)
      );
    }
    tangent(t) {
      const dt = 0.001;
      return this.evaluate(t + dt).sub(this.evaluate(t - dt)).normalize();
    }
  }

  // --- 3D Simplex, Curl & Voronoi Noise ---
  const Noise = (() => {
    const perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let seed = 1337;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      const j = seed % (i + 1);
      const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    const F3 = 1 / 3, G3 = 1 / 6;

    function simplex3(xin, yin, zin) {
      let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
        else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
        else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
      } else {
        if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
        else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
        else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
      }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
      const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;

      const dotG = (gi, x, y, z) => { const g = grad3[gi % 12]; return g[0]*x + g[1]*y + g[2]*z; };
      let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
      if (t0 > 0) { t0 *= t0; n0 = t0*t0 * dotG(perm[ii + perm[jj + perm[kk]]], x0, y0, z0); }
      let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
      if (t1 > 0) { t1 *= t1; n1 = t1*t1 * dotG(perm[ii+i1 + perm[jj+j1 + perm[kk+k1]]], x1, y1, z1); }
      let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
      if (t2 > 0) { t2 *= t2; n2 = t2*t2 * dotG(perm[ii+i2 + perm[jj+j2 + perm[kk+k2]]], x2, y2, z2); }
      let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
      if (t3 > 0) { t3 *= t3; n3 = t3*t3 * dotG(perm[ii+1 + perm[jj+1 + perm[kk+1]]], x3, y3, z3); }
      return 32.0 * (n0 + n1 + n2 + n3);
    }

    function fbm3(x, y, z, octaves = 4) {
      let val = 0, amp = 0.5, freq = 1;
      for (let o = 0; o < octaves; o++) {
        val += amp * simplex3(x * freq, y * freq, z * freq);
        freq *= 2.02;
        amp *= 0.5;
      }
      return val;
    }

    function curl3(x, y, z) {
      const e = 0.01;
      const n1 = simplex3(x, y + e, z), n2 = simplex3(x, y - e, z);
      const a = (n1 - n2) / (2 * e);
      const n3 = simplex3(x, y, z + e), n4 = simplex3(x, y, z - e);
      const b = (n3 - n4) / (2 * e);
      const n5 = simplex3(x + e, y, z), n6 = simplex3(x - e, y, z);
      const c = (n5 - n6) / (2 * e);
      return new Vec3(a - b, b - c, c - a);
    }

    function voronoi3(x, y, z) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
      let minDist = 1e9;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const cx = ix + dx, cy = iy + dy, cz = iz + dz;
            const h1 = perm[(cx & 255) + perm[(cy & 255) + perm[cz & 255]]] / 255;
            const h2 = perm[((cx + 37) & 255) + perm[((cy + 17) & 255) + perm[(cz + 53) & 255]]] / 255;
            const h3 = perm[((cx + 71) & 255) + perm[((cy + 89) & 255) + perm[(cz + 113) & 255]]] / 255;
            const d = Math.hypot(cx + h1 - x, cy + h2 - y, cz + h3 - z);
            if (d < minDist) minDist = d;
          }
        }
      }
      return minDist;
    }

    return { simplex3, fbm3, curl3, voronoi3 };
  })();

  // --- Color Utilities (Blackbody, HSV, ACES) ---
  const Color = {
    blackbody(kelvin) {
      const t = clamp(kelvin, 1000, 40000) / 100;
      let r, g, b;
      if (t <= 66) {
        r = 255;
        g = clamp(99.4708025861 * Math.log(t) - 161.1195681661, 0, 255);
        b = t <= 19 ? 0 : clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307, 0, 255);
      } else {
        r = clamp(329.698727446 * Math.pow(t - 60, -0.1332047592), 0, 255);
        g = clamp(288.1221695283 * Math.pow(t - 60, -0.0755148492), 0, 255);
        b = 255;
      }
      return [r / 255, g / 255, b / 255];
    },
    hsvToRgb(h, s, v) {
      const hh = (((h % 1) + 1) % 1) * 6;
      const i = Math.floor(hh);
      const f = hh - i;
      const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: return [v, t, p];
        case 1: return [q, v, p];
        case 2: return [p, v, t];
        case 3: return [p, q, v];
        case 4: return [t, p, v];
        default: return [v, p, q];
      }
    },
    acesFilmic(x) {
      const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1);
    }
  };

  global.AetheriaMath = {
    EPS, clamp, lerp, smoothstep, deg2rad,
    Vec2, Vec3, Vec4, Mat4, Quat, CatmullRomSpline, Noise, Color
  };
})(typeof window !== 'undefined' ? window : globalThis);
