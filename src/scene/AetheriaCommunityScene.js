/* ============================================================================
 * AETHERIA — The Future We Build
 * src/scene/AetheriaCommunityScene.js
 * Architectural & Atmospheric Data-Driven 3D Community of Aetheria (2045)
 *
 * Landmarks & Data-Driven Visual Feedback:
 *   - Aetheria School (pitched roof + skylight + rooftop PV)
 *   - Community Clinic (arched medical pavilion + priority beacon)
 *   - Terraced Residential Homes + Boulevard Streetlamps (lit ratio = uPowerCov)
 *   - Tilted Solar Microgrid Array Rows (span & glow = uSolarScale)
 *   - Modular Battery Substation (segmented vertical SoC bars = uBatteryFill)
 *   - Coastal Water Reservoir, Concrete Dam, Elevated Tower & Animated Water Conduit
 *   - Animated Glowing Energy Conduits (Solar -> Battery -> Community)
 *   - Rolling Distant Hills, Soft Ambient Occlusion & Live 24-Hour Sun/Moon Arc
 * ============================================================================ */
(function (global) {
  'use strict';

  const COMMUNITY_FS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform float uTime;
uniform vec3 uCamPos;
uniform mat4 uInvViewProj;
uniform int uSceneMode;       // 0 = Aetheria Community, 1 = Materials Atomic Lab
uniform float uCycleHour;     // 0..24 hour of day (drives sun arc, sky & lighting)
uniform float uPowerCov;      // 0..1 fraction of buildings powered
uniform float uSolarScale;    // 0..1 installed solar array scale & output
uniform float uBatteryFill;   // 0..1 battery substation state of charge
uniform float uWaterLevel;    // 0..1 reservoir & tower water coverage
uniform float uAtomicZ;
uniform float uShellCount;
uniform vec3 uMatAccent;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345)); p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdTorus(vec3 p, vec2 t) {
  return length(vec2(length(p.xz) - t.x, p.y)) - t.y;
}

float sdHouse(vec3 p, vec3 size, float roofH) {
  float body = sdBox(p, size);
  vec3 rp = p - vec3(0.0, size.y, 0.0);
  float roof = max(abs(rp.x) - size.x - 0.06, max(abs(rp.z) * (roofH / max(size.z, 0.1)) + rp.y - roofH, -rp.y));
  return min(body, roof);
}

// matId:
// 1 = Terrain / Hills & Roads
// 2 = Buildings (School, Clinic, Homes with dynamic illuminated windows)
// 3 = Photovoltaic Solar Arrays (Aluminum frames + silicon cell panels)
// 4 = Battery Energy Storage Substation (Modular racks + glowing SoC pillars)
// 5 = Coastal Water Reservoir Surface
// 6 = Water Tower, Dam Wall & Pipe Infrastructure
vec2 mapCommunity(vec3 p) {
  // 1. Sculpted terrain: flat community plateau + coastal reservoir basin (x > 2.8) + distant rolling hills
  float distTown = length(p.xz);
  float hills = smoothstep(5.5, 16.0, distTown) * (1.35 * noise2(p.xz * 0.18) + 0.55 * noise2(p.xz * 0.42));
  float basin = smoothstep(2.4, 3.8, p.x) * smoothstep(4.2, 1.4, abs(p.z)) * 0.72;
  float groundY = -1.25 + hills - basin;
  vec2 res = vec2((p.y - groundY) * 0.78, 1.0);

  // 2. Coastal Water Reservoir Surface (height dynamically rises/falls with uWaterLevel!)
  float waterY = -1.86 + uWaterLevel * 0.56;
  float wave = 0.015 * sin(p.x * 5.0 + uTime * 2.0) * cos(p.z * 4.5 - uTime * 1.6);
  float dWater = max(p.y - (waterY + wave), max(2.6 - p.x, abs(p.z) - 4.0));
  if (dWater < res.x) res = vec2(dWater, 5.0);

  // 3. Concrete Reservoir Dam Wall, Elevated Water Tower & Town Water Conduit Pipe
  float dam = sdBox(p - vec3(2.62, -1.35, 0.0), vec3(0.14, 0.42, 3.4));
  float towerLeg = sdCylinder(p - vec3(3.15, -0.35, -1.95), 0.20, 0.95);
  float towerTank = sdCylinder(p - vec3(3.15, 0.72, -1.95), 0.62, 0.44);
  float pipe = sdBox(p - vec3(1.65, -1.16, -1.35), vec3(1.45, 0.07, 0.07));
  float waterInfra = min(min(dam, pipe), min(towerLeg, towerTank));
  if (waterInfra < res.x) res = vec2(waterInfra, 6.0);

  // 4. Architectural Community Landmarks
  // Aetheria School (Center hero with pitched roof)
  float school = sdHouse(p - vec3(-0.45, -0.62, -0.65), vec3(1.22, 0.62, 0.74), 0.44);
  // Community Clinic (Left with domed medical roof)
  float clinicBody = sdBox(p - vec3(-2.55, -0.72, 0.65), vec3(0.76, 0.52, 0.64));
  float clinicDome = length((p - vec3(-2.55, -0.18, 0.65)) * vec3(1.0, 1.4, 1.0)) - 0.48;
  float clinic = min(clinicBody, clinicDome);
  // Residential Terraced Homes with sloped roofs
  float h1 = sdHouse(p - vec3(-2.55, -0.82, -1.65), vec3(0.68, 0.42, 0.52), 0.28);
  float h2 = sdHouse(p - vec3(-0.75, -0.78, 1.55), vec3(0.66, 0.46, 0.48), 0.30);
  float h3 = sdHouse(p - vec3(0.95, -0.82, 1.50), vec3(0.62, 0.42, 0.48), 0.28);
  float h4 = sdHouse(p - vec3(-3.85, -0.84, -0.45), vec3(0.56, 0.40, 0.54), 0.26);
  float h5 = sdHouse(p - vec3(1.25, -0.76, -1.95), vec3(0.64, 0.48, 0.50), 0.30);
  float bldgs = min(min(school, clinic), min(min(h1, h2), min(h3, min(h4, h5))));
  if (bldgs < res.x) res = vec2(bldgs, 2.0);

  // 5. Tilted Photovoltaic Solar Microgrid Rows (physically expand with uSolarScale!)
  if (uSolarScale > 0.02) {
    float spanX = 0.45 + uSolarScale * 1.55;
    // School south-facing rooftop PV panel
    vec3 rpv = p - vec3(-0.45, 0.32, -0.35); rpv.yz *= rot(0.45);
    float dRoofPV = sdBox(rpv, vec3(min(1.08, spanX * 0.72), 0.035, 0.42));
    // Two terraced community solar microgrid rows in foreground
    vec3 g1 = p - vec3(-2.15, -0.92, 2.35); g1.yz *= rot(0.42);
    float dG1 = sdBox(g1, vec3(spanX, 0.04, 0.42));
    vec3 g2 = p - vec3(-2.15, -0.92, 3.25); g2.yz *= rot(0.42);
    float dG2 = sdBox(g2, vec3(spanX, 0.04, 0.42));
    float dSolar = min(dRoofPV, min(dG1, dG2));
    if (dSolar < res.x) res = vec2(dSolar, 3.0);
  }

  // 6. Modular Battery Energy Storage Substation (twin cabinets near town center)
  float bat1 = sdBox(p - vec3(1.38, -0.80, -0.25), vec3(0.48, 0.44, 0.32));
  float bat2 = sdBox(p - vec3(1.38, -0.80, 0.42), vec3(0.48, 0.44, 0.24));
  float batt = min(bat1, bat2);
  if (batt < res.x) res = vec2(batt, 4.0);

  return res;
}

vec2 mapMaterialAtom(vec3 p) {
  vec2 res = vec2(p.y + 2.8, 1.0);
  float nucR = 0.25 + pow(uAtomicZ, 0.333) * 0.075;
  vec3 np = p; np.xz *= rot(uTime * 0.5);
  float dNuc = length(np) - nucR;
  if (dNuc < res.x) res = vec2(dNuc, 2.0);

  int shells = int(clamp(uShellCount, 1.0, 7.0));
  for (int i = 0; i < 7; i++) {
    if (i >= shells) break;
    float fi = float(i);
    float rad = 0.85 + fi * 0.32;
    vec3 sp = p;
    sp.xy *= rot(0.45 * fi + 0.2);
    sp.yz *= rot(0.60 * fi - 0.3 + uTime * 0.14 * (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0));
    float dRing = sdTorus(sp, vec2(rad, 0.015));
    if (dRing < res.x) res = vec2(dRing, 3.0);
    float ang = uTime * (1.5 - fi * 0.14) + fi * 1.9;
    float dE = length(sp - vec3(cos(ang) * rad, 0.0, sin(ang) * rad)) - 0.075;
    if (dE < res.x) res = vec2(dE, 4.0);
  }
  return res;
}

vec2 mapWorld(vec3 p) { return uSceneMode == 1 ? mapMaterialAtom(p) : mapCommunity(p); }

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.006, -0.006);
  return normalize(
    e.xyy * mapWorld(p + e.xyy).x + e.yyx * mapWorld(p + e.yyx).x +
    e.yxy * mapWorld(p + e.yxy).x + e.xxx * mapWorld(p + e.xxx).x
  );
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 farP = uInvViewProj * vec4(ndc, 1.0, 1.0);
  vec3 rd = normalize(farP.xyz / farP.w - uCamPos);
  vec3 ro = uCamPos;

  // Continuous 24-hour Solar Arc & Atmospheric Sky Color
  float sunAng = ((uCycleHour - 6.0) / 12.0) * 3.14159265;
  float sunElev = sin(sunAng); // -1 midnight .. +1 noon
  float dayFactor = smoothstep(-0.18, 0.35, sunElev);
  float duskFactor = exp(-pow(sunElev * 4.5, 2.0));
  vec3 sunDir = normalize(vec3(cos(sunAng) * 0.85, max(0.12, abs(sunElev) * 0.85 + 0.15), 0.45));

  vec3 nightSky = mix(vec3(0.02, 0.032, 0.075), vec3(0.008, 0.012, 0.034), clamp(rd.y + 0.2, 0.0, 1.0));
  vec3 duskSky  = mix(vec3(0.62, 0.28, 0.16), vec3(0.10, 0.14, 0.34), clamp(rd.y * 1.4, 0.0, 1.0));
  vec3 daySky   = mix(vec3(0.38, 0.62, 0.88), vec3(0.09, 0.28, 0.62), clamp(rd.y + 0.1, 0.0, 1.0));
  vec3 bg = uSceneMode == 1
    ? mix(vec3(0.012, 0.018, 0.042), vec3(0.025, 0.022, 0.06), clamp(0.5 - ndc.y * 0.5, 0.0, 1.0))
    : mix(mix(nightSky, daySky, dayFactor), duskSky, duskFactor * 0.72);

  if (uSceneMode == 0) {
    // Twinkling stars at night
    if (dayFactor < 0.65) {
      vec2 suv = vec2(atan(rd.z, rd.x), asin(clamp(rd.y, -1.0, 1.0))) * 85.0;
      float sr = hash21(floor(suv));
      if (sr > 0.974 && rd.y > 0.04) {
        bg += vec3(0.85, 0.92, 1.0) * smoothstep(0.22, 0.02, length(fract(suv) - 0.5)) * (1.0 - dayFactor);
      }
    }
    // Sun / Moon disc & corona
    float mu = max(dot(rd, sunDir), 0.0);
    vec3 orbCol = mix(vec3(0.75, 0.88, 1.15), vec3(2.2, 1.55, 0.85), dayFactor);
    bg += orbCol * (pow(mu, 18.0) * 0.35 + pow(mu, 220.0) * 1.6);
  }

  float t = 0.0, matId = 0.0;
  for (int i = 0; i < 86; i++) {
    vec2 h = mapWorld(ro + rd * t);
    if (h.x < 0.005) { matId = h.y; break; }
    t += clamp(h.x * 0.85, 0.015, 0.62);
    if (t > 42.0) break;
  }

  vec3 col = bg;
  if (matId > 0.5) {
    vec3 p = ro + rd * t;
    vec3 N = calcNormal(p);
    vec3 V = -rd;
    float diff = max(dot(N, sunDir), 0.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float spec = pow(max(dot(N, normalize(sunDir + V)), 0.0), 64.0);
    float ao = clamp(mapWorld(p + N * 0.22).x / 0.22, 0.28, 1.0);
    float ambient = mix(0.20, 0.45, dayFactor);

    if (uSceneMode == 1) {
      if (matId < 1.5) {
        float grid = smoothstep(0.94, 0.99, max(abs(sin(p.x * 2.0)), abs(sin(p.z * 2.0))));
        col = vec3(0.018, 0.024, 0.045) + uMatAccent * (grid * 0.25 + exp(-length(p.xz) * 0.35) * 0.35);
      } else if (matId < 2.5) {
        col = uMatAccent * (0.45 + diff * 0.85) + vec3(1.6) * spec * 0.8 + uMatAccent * fres;
      } else if (matId < 3.5) {
        col = uMatAccent * (0.8 + fres * 0.9);
      } else {
        col = mix(uMatAccent, vec3(2.0, 2.2, 2.4), 0.65) * 1.3;
      }
    } else {
      if (matId < 1.5) {
        // Landscaped Community Ground, Paved Central Boulevard & Animated Energy Flow Conduits!
        vec3 grass = mix(vec3(0.038, 0.062, 0.088), vec3(0.15, 0.28, 0.22), dayFactor);
        float roadMask = smoothstep(0.42, 0.32, abs(p.z - 0.55)) * smoothstep(4.6, 3.8, abs(p.x + 0.8));
        vec3 baseGround = mix(grass, vec3(0.09, 0.11, 0.15), roadMask);

        // Glowing Golden-Cyan Energy Conduit flowing from Solar Field -> Battery -> Town
        float conduitLine = smoothstep(0.12, 0.03, abs(p.z - 0.55)) * smoothstep(3.2, 2.4, abs(p.x + 0.5));
        float pulse = 0.5 + 0.5 * sin(p.x * 5.0 - uTime * (dayFactor > 0.4 ? 5.0 : -4.0));
        vec3 flowCol = dayFactor > 0.4 ? vec3(1.6, 1.15, 0.32) : vec3(0.18, 1.25, 0.88);
        float flowStrength = dayFactor > 0.4 ? uSolarScale : (uBatteryFill * uPowerCov);

        // Warm Boulevard Streetlamps (only lit when power is available at night!)
        float lampX = abs(fract((p.x + 0.5) * 0.65) - 0.5);
        float lampGlow = exp(-lampX * 14.0) * exp(-abs(p.z - 0.95) * 5.0) * (1.0 - dayFactor) * uPowerCov;

        col = baseGround * (ambient + diff * 0.85) * ao
            + flowCol * conduitLine * pulse * flowStrength * 1.15
            + vec3(1.85, 1.25, 0.52) * lampGlow * 0.85;
      } else if (matId < 2.5) {
        // Architectural Buildings (Cream-Slate Walls, Dark Terracotta/Slate Pitched Roofs, Live Lit Windows)
        float isRoof = step(0.55, N.y);
        vec3 wallCol = mix(vec3(0.10, 0.13, 0.21), vec3(0.56, 0.60, 0.66), dayFactor);
        vec3 roofCol = mix(vec3(0.06, 0.08, 0.14), vec3(0.24, 0.28, 0.36), dayFactor);
        vec3 baseBldg = mix(wallCol, roofCol, isRoof);

        float wx = smoothstep(0.54, 0.72, abs(sin(p.x * 10.5 + p.z * 10.5)));
        float wy = smoothstep(0.54, 0.72, abs(sin(p.y * 12.0)));
        float bldgHash = hash21(floor(vec2(p.x * 1.1 + p.z * 0.9, p.y * 3.0)));
        float isPowered = step(bldgHash, uPowerCov);
        vec3 winGlow = mix(vec3(0.02, 0.03, 0.06), vec3(2.2, 1.5, 0.58), isPowered);

        // Clinic roof priority medical beacon (left building around x=-2.55, z=0.65)
        float clinicBeacon = exp(-length(p - vec3(-2.55, 0.26, 0.65)) * 7.0) * (0.4 + 0.6 * uPowerCov);

        col = baseBldg * (ambient + diff * 0.9) * ao
            + winGlow * wx * wy * (1.0 - isRoof) * mix(1.25, 0.28, dayFactor)
            + vec3(0.25, 1.45, 1.85) * clinicBeacon * 1.5;
      } else if (matId < 3.5) {
        // Photovoltaic Silicon Solar Arrays with Crisp Silver Cell Grid & Sun Specular
        float cells = smoothstep(0.88, 0.98, max(abs(sin(p.x * 20.0)), abs(sin(p.z * 20.0))));
        vec3 pvCol = vec3(0.04, 0.18, 0.52) * (ambient + diff * 1.15) + vec3(0.75, 0.9, 1.15) * cells * 0.45;
        col = pvCol + vec3(1.8, 1.6, 1.1) * spec * 1.35 + vec3(0.3, 0.85, 1.45) * fres * (0.35 + uSolarScale * 0.65);
      } else if (matId < 4.5) {
        // Modular Battery Substation with Segmented Vertical State-of-Charge LED Bars
        float barH = clamp((p.y + 1.22) / 0.82, 0.0, 1.0);
        float seg = smoothstep(0.18, 0.35, abs(sin(barH * 18.0)));
        float charged = step(barH, uBatteryFill) * seg;
        vec3 barCol = mix(vec3(1.15, 0.22, 0.24), vec3(0.14, 1.45, 0.82), smoothstep(0.15, 0.75, uBatteryFill));
        float strip = smoothstep(0.70, 0.88, abs(sin(p.x * 14.0)));
        col = vec3(0.11, 0.15, 0.22) * (ambient + diff * 0.9) * ao + barCol * charged * strip * 1.45;
      } else if (matId < 5.5) {
        // Reflective Undulating Coastal Reservoir Water Surface
        vec3 wDeep = mix(vec3(0.02, 0.09, 0.20), vec3(0.05, 0.36, 0.68), dayFactor);
        vec3 envRefl = mix(nightSky, daySky, dayFactor);
        col = mix(wDeep, envRefl, clamp(0.25 + fres * 0.7, 0.0, 0.9)) + vec3(1.8, 1.65, 1.35) * spec * 1.1;
      } else {
        // Concrete Dam, Elevated Water Tower (with glowing cyan level ring!) & Animated Water Pipeline
        vec3 conc = mix(vec3(0.14, 0.17, 0.22), vec3(0.55, 0.58, 0.62), dayFactor);
        float tankRing = exp(-abs(p.y - (0.35 + uWaterLevel * 0.72)) * 22.0) * step(2.4, p.x);
        float pipeFlow = (0.5 + 0.5 * sin(p.x * 8.0 + uTime * 5.0)) * step(p.y, -1.0) * step(p.x, 2.5);
        col = conc * (ambient + diff * 0.9) * ao + vec3(0.22, 1.25, 2.0) * (tankRing * 1.4 + pipeFlow * uWaterLevel * 0.85);
      }
    }

    float fog = 1.0 - exp(-t * t * 0.0012);
    col = mix(col, bg, clamp(fog, 0.0, 0.92));
  }

  fragColor = vec4(max(col, vec3(0.0)), 1.0);
}`;

  const CAMERA_PRESETS = {
    hub:       { yaw: 0.58, pitch: 0.36, distance: 9.2, target: [0.0, -0.5, 0.2] },
    materials: { yaw: 0.45, pitch: 0.24, distance: 6.0, target: [0.0, 0.0, 0.0] },
    power:     { yaw: 0.42, pitch: 0.42, distance: 7.4, target: [-1.2, -0.4, 1.1] },
    storage:   { yaw: -0.42, pitch: 0.32, distance: 6.6, target: [0.9, -0.6, 0.0] },
    water:     { yaw: -0.78, pitch: 0.32, distance: 7.4, target: [2.6, -0.7, -0.6] },
    future:    { yaw: 0.68, pitch: 0.40, distance: 9.8, target: [0.0, -0.5, 0.2] }
  };

  class AetheriaCommunityScene {
    constructor(engine) {
      this.engine = engine;
      this.program = engine.createFullscreenProgram(COMMUNITY_FS);
      this.sceneMode = 0;
      this.cycleHour = 21.0;       // Start at 21:00 evening ("The Last Light")
      this.targetCycleHour = 21.0;
      this.autoCycle = false;
      this.powerCov = 0.4;
      this.solarScale = 0.4;
      this.batteryFill = 0.5;
      this.waterLevel = 0.6;
      this.atomicZ = 14;
      this.shellCount = 3;
      this.matAccent = [0.18, 0.83, 0.75];
    }

    focusView(viewKey, camera) {
      const cfg = CAMERA_PRESETS[viewKey] || CAMERA_PRESETS.hub;
      this.sceneMode = viewKey === 'materials' ? 1 : 0;
      if (!this.autoCycle) {
        if (viewKey === 'power') this.targetCycleHour = 12.5;      // High noon solar peak
        else if (viewKey === 'storage') this.targetCycleHour = 21.5; // Night storage test
        else if (viewKey === 'water') this.targetCycleHour = 10.0;   // Bright morning coastal light
        else if (viewKey === 'future') this.targetCycleHour = 17.5;  // Golden hour resilience vista
        else this.targetCycleHour = 20.5;                            // Dramatic evening hub
      }
      if (camera && camera.flyTo) camera.flyTo(cfg.yaw, cfg.pitch, cfg.distance, cfg.target, 1.0);
    }


    // Interactive 3D Digital Twin Ray-Sphere Picking for Community Landmarks
    pickLandmark(ndcX, ndcY, camera) {
      if (this.sceneMode !== 0 || !camera || !camera.invViewProjMatrix) return null;
      const m = camera.invViewProjMatrix.m;
      const unproject = (x, y, z) => {
        const w = m[3] * x + m[7] * y + m[11] * z + m[15];
        const invW = Math.abs(w) > 1e-6 ? 1 / w : 1;
        return [
          (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW,
          (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW,
          (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW
        ];
      };
      const nearPt = unproject(ndcX, ndcY, -1);
      const farPt = unproject(ndcX, ndcY, 1);
      let dx = farPt[0] - nearPt[0], dy = farPt[1] - nearPt[1], dz = farPt[2] - nearPt[2];
      const len = Math.hypot(dx, dy, dz) || 1;
      dx /= len; dy /= len; dz /= len;
      const ox = camera.position.x, oy = Math.max(-0.8, camera.position.y), oz = camera.position.z;

      const landmarks = [
        { id: "school",  name: "Aetheria School",            pos: [-0.45, -0.55, -0.65], r: 1.35 },
        { id: "clinic",  name: "Community Clinic",           pos: [-2.55, -0.55,  0.65], r: 1.05 },
        { id: "solar",   name: "Solar Microgrid Array",      pos: [-1.40, -0.95,  3.15], r: 2.00 },
        { id: "battery", name: "Battery Storage Substation", pos: [ 1.15, -0.70, -0.10], r: 1.15 },
        { id: "water",   name: "Water Tower & Reservoir",    pos: [ 3.15, -0.10, -1.60], r: 1.55 }
      ];

      let best = null, bestT = 1e9;
      for (const lm of landmarks) {
        const lx = lm.pos[0] - ox, ly = lm.pos[1] - oy, lz = lm.pos[2] - oz;
        const tca = lx * dx + ly * dy + lz * dz;
        if (tca < 0) continue;
        const d2 = (lx * lx + ly * ly + lz * lz) - tca * tca;
        if (d2 <= lm.r * lm.r && tca < bestT) {
          bestT = tca;
          best = lm;
        }
      }
      return best;
    }

    setCycleHour(hr) {
      this.cycleHour = hr;
      this.targetCycleHour = hr;
    }

    syncFromEvaluation(evalRes, elementObj) {
      if (evalRes) {
        const isNight = this.cycleHour < 6 || this.cycleHour >= 18;
        this.powerCov = isNight
          ? Math.max(0.08, Math.min(1.0, evalRes.storage.nightReliability))
          : Math.max(0.15, Math.min(1.0, evalRes.storage.solarFraction * 0.7 + 0.3));
        this.solarScale = Math.max(0.0, Math.min(1.0, evalRes.electricity.dailySolarKwh / Math.max(1.0, evalRes.electricity.dailyDemandKwh)));
        this.batteryFill = evalRes.storage.usableCapacityKwh > 0
          ? Math.max(0.0, Math.min(1.0, evalRes.storage.storedNetKwh / evalRes.storage.usableCapacityKwh))
          : 0.0;
        this.waterLevel = Math.max(0.06, Math.min(1.0, evalRes.water.coverageRatio));
      }
      if (elementObj) {
        this.atomicZ = elementObj.z;
        this.shellCount = elementObj.shells.length;
        this.matAccent = elementObj.rgb;
      }
    }

    render(timeSec, dt, camera, engine) {
      if (this.autoCycle && this.sceneMode === 0) {
        this.cycleHour = (this.cycleHour + dt * 2.2) % 24.0;
        this.targetCycleHour = this.cycleHour;
      } else {
        this.cycleHour += (this.targetCycleHour - this.cycleHour) * Math.min(1, dt * 3.5);
      }
      const gl = engine.gl;
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
      this.program.use();
      this.program.set1f('uTime', timeSec);
      this.program.set3f('uCamPos', camera.position.x, Math.max(-0.8, camera.position.y), camera.position.z);
      this.program.setMat4('uInvViewProj', camera.invViewProjMatrix.m);
      this.program.set1i('uSceneMode', this.sceneMode);
      this.program.set1f('uCycleHour', this.cycleHour);
      this.program.set1f('uPowerCov', this.powerCov);
      this.program.set1f('uSolarScale', this.solarScale);
      this.program.set1f('uBatteryFill', this.batteryFill);
      this.program.set1f('uWaterLevel', this.waterLevel);
      this.program.set1f('uAtomicZ', this.atomicZ);
      this.program.set1f('uShellCount', this.shellCount);
      this.program.set3f('uMatAccent', this.matAccent[0], this.matAccent[1], this.matAccent[2]);
      engine.drawFullscreen();
    }

    dispose() { if (this.program) { this.program.dispose(); this.program = null; } }
  }

  global.AetheriaScene = { AetheriaCommunityScene, CAMERA_PRESETS };
})(typeof window !== 'undefined' ? window : globalThis);
