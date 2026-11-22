import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

const code = fs.readFileSync('src/math/MathCore.js', 'utf8');
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);

const M = sandbox.AetheriaMath;
assert(M, 'AetheriaMath should be exported');

// Vec2
const v2 = new M.Vec2(3, 4);
assert(Math.abs(v2.len() - 5) < 1e-5, 'Vec2 len');
assert(Math.abs(v2.normalize().len() - 1) < 1e-5, 'Vec2 normalize');

// Vec3
const a = new M.Vec3(1, 0, 0);
const b = new M.Vec3(0, 1, 0);
const c = a.cross(b);
assert(Math.abs(c.z - 1) < 1e-5, 'Vec3 cross');
assert(Math.abs(a.dot(b)) < 1e-5, 'Vec3 dot');

// Mat4 multiply + invert
const tr = M.Mat4.translation(2, -3, 5);
const rot = M.Mat4.rotationY(Math.PI / 3);
const mat = tr.multiply(rot);
const inv = mat.invert();
const prod = mat.multiply(inv);
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    const expected = i === j ? 1 : 0;
    assert(Math.abs(prod.m[i * 4 + j] - expected) < 1e-4, `Mat4 invert failed at ${i},${j}`);
  }
}

// Perspective & LookAt
const proj = M.Mat4.perspective(M.deg2rad(60), 16 / 9, 0.1, 100);
assert(proj.m[11] === -1, 'Perspective projection');
const view = M.Mat4.lookAt(new M.Vec3(0, 0, 5), new M.Vec3(0, 0, 0), new M.Vec3(0, 1, 0));
const pt = view.transformPoint(new M.Vec3(0, 0, 0));
assert(Math.abs(pt.z + 5) < 1e-4, 'LookAt transform');

// Quat
const q1 = M.Quat.fromAxisAngle(new M.Vec3(0, 1, 0), 0);
const q2 = M.Quat.fromAxisAngle(new M.Vec3(0, 1, 0), Math.PI / 2);
const qMid = q1.slerp(q2, 0.5);
assert(Math.abs(Math.hypot(qMid.x, qMid.y, qMid.z, qMid.w) - 1) < 1e-5, 'Quat slerp unit');

// Spline
const spline = new M.CatmullRomSpline([[0,0,0],[1,2,0],[2,0,1],[0,-1,2]], true);
const sp = spline.evaluate(0.25);
assert(Number.isFinite(sp.x) && Number.isFinite(sp.y) && Number.isFinite(sp.z), 'Spline finite');
assert(Math.abs(spline.tangent(0.25).len() - 1) < 1e-4, 'Spline tangent normalized');

// Noise
const s3 = M.Noise.simplex3(1.2, 3.4, 5.6);
assert(s3 >= -1.1 && s3 <= 1.1, 'Simplex3 range');
const curl = M.Noise.curl3(0.5, 0.5, 0.5);
assert(Number.isFinite(curl.x), 'Curl3 finite');
const vor = M.Noise.voronoi3(1.1, 2.2, 3.3);
assert(vor >= 0 && vor < 2.0, 'Voronoi3 range');

// Color
const warm = M.Color.blackbody(2000);
const hot = M.Color.blackbody(12000);
assert(warm[0] > warm[2] && hot[2] >= hot[0], 'Blackbody ramp');
const rgb = M.Color.hsvToRgb(0, 1, 1);
assert(rgb[0] === 1 && rgb[1] === 0 && rgb[2] === 0, 'HSV red');
assert(M.Color.acesFilmic(10) <= 1 && M.Color.acesFilmic(10) > 0.9, 'ACES filmic');

console.log('ALL MATH CORE UNIT TESTS PASSED (10/10 groups)');
