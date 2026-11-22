/* ============================================================================
 * AETHERIA — Planetary Systems Intelligence Platform
 * src/core/AppState.js
 * Multi-Project Decision-Support Workspace, Undo History, Schema Migration,
 * Safe JSON Import Validation & XSS-Safe Escaping.
 * ============================================================================ */
(function (global) {
  'use strict';

  const STORAGE_KEY_V3 = 'aetheria_workspace_v3';
  const LEGACY_KEY_V2 = 'aetheria_future_plan_v2';

  const TEMPLATES = {
    home: {
      id: 'home',
      label: 'My Home',
      description: 'Demonstration household (4 people) with lighting, fridge, fans, laptop, and evening cooking.',
      selectedElementZ: 14,
      selectedStorageTech: 'lfp',
      economics: { solarCostPerKwp: 1100, batteryCostPerKwh: 320, budgetCap: 6000 },
      electricity: {
        appliances: [
          { name: 'LED Lighting (8 bulbs)', watts: 80, hours: 6, qty: 1 },
          { name: 'Refrigerator (avg duty)', watts: 150, hours: 10, qty: 1 },
          { name: 'Ceiling Fans', watts: 65, hours: 8, qty: 3 },
          { name: 'Laptop & Wi-Fi Router', watts: 75, hours: 6, qty: 1 },
          { name: 'Induction / Kettle', watts: 1200, hours: 1.5, qty: 1 }
        ],
        installedKwp: 2.0,
        peakSunHours: 5.2,
        solarSourceLabel: 'Editable demo assumption (5.2 kWh/m²/day)',
        performanceRatio: 0.78,
        panelEfficiency: 0.20,
        roofAreaM2: 25,
        tariffPerKwh: 0.14,
        gridEmissionsKgPerKwh: 0.40,
        includeWaterPump: true
      },
      storage: {
        batteryKwh: 5.0,
        depthOfDischarge: 0.85,
        chargeEff: 0.95,
        dischargeEff: 0.95,
        nightShare: 0.45,
        nightHours: 12
      },
      water: {
        people: 4,
        litersPerPerson: 110,
        rawSupplyL: 600,
        leakagePct: 12,
        headMeters: 15,
        pumpEfficiency: 0.60
      }
    },

    school: {
      id: 'school',
      label: 'My School',
      description: 'Community school (120 students) with classrooms, computer lab, evening study lighting, and water pump.',
      selectedElementZ: 14,
      selectedStorageTech: 'lfp',
      economics: { solarCostPerKwp: 1050, batteryCostPerKwh: 300, budgetCap: 18000 },
      electricity: {
        appliances: [
          { name: 'Classroom LED Lights', watts: 40, hours: 8, qty: 30 },
          { name: 'Computer Lab Workstations', watts: 140, hours: 6, qty: 20 },
          { name: 'Classroom Fans / Ventilation', watts: 70, hours: 7, qty: 16 },
          { name: 'Evening Study Hall Lighting', watts: 500, hours: 4, qty: 1 },
          { name: 'Science Lab & Projector', watts: 450, hours: 4, qty: 1 }
        ],
        installedKwp: 6.5,
        peakSunHours: 5.0,
        solarSourceLabel: 'Editable demo assumption (5.0 kWh/m²/day)',
        performanceRatio: 0.78,
        panelEfficiency: 0.20,
        roofAreaM2: 80,
        tariffPerKwh: 0.16,
        gridEmissionsKgPerKwh: 0.42,
        includeWaterPump: true
      },
      storage: {
        batteryKwh: 12.0,
        depthOfDischarge: 0.85,
        chargeEff: 0.95,
        dischargeEff: 0.95,
        nightShare: 0.32,
        nightHours: 10
      },
      water: {
        people: 120,
        litersPerPerson: 25,
        rawSupplyL: 3800,
        leakagePct: 18,
        headMeters: 22,
        pumpEfficiency: 0.62
      }
    },

    community: {
      id: 'community',
      label: 'My Community (Aetheria 2045)',
      description: 'Small weak-grid neighborhood (350 residents, school, clinic, and shared water tower) facing blackouts and leaks.',
      selectedElementZ: 14,
      selectedStorageTech: 'lead-acid',
      economics: { solarCostPerKwp: 980, batteryCostPerKwh: 290, budgetCap: 110000 },
      electricity: {
        appliances: [
          { name: 'Residential Homes (60 units)', watts: 450, hours: 6, qty: 60 },
          { name: 'Community Clinic & Cold Chain', watts: 1800, hours: 24, qty: 1 },
          { name: 'School & Learning Center', watts: 3200, hours: 8, qty: 1 },
          { name: 'Streetlights & Evening Plaza', watts: 2200, hours: 10, qty: 1 }
        ],
        installedKwp: 36.0,
        peakSunHours: 5.1,
        solarSourceLabel: 'Editable demo assumption (5.1 kWh/m²/day)',
        performanceRatio: 0.78,
        panelEfficiency: 0.20,
        roofAreaM2: 360,
        tariffPerKwh: 0.18,
        gridEmissionsKgPerKwh: 0.45,
        includeWaterPump: true
      },
      storage: {
        batteryKwh: 70.0,
        depthOfDischarge: 0.50,
        chargeEff: 0.88,
        dischargeEff: 0.88,
        nightShare: 0.44,
        nightHours: 12
      },
      water: {
        people: 350,
        litersPerPerson: 90,
        rawSupplyL: 36000,
        leakagePct: 24,
        headMeters: 28,
        pumpEfficiency: 0.58
      }
    }
  };

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function createInitialState(templateId, customName) {
    const base = deepClone(TEMPLATES[templateId] || TEMPLATES.community);
    base.projectId = 'proj_' + Math.random().toString(36).slice(2, 9);
    base.projectName = customName || base.label;
    base.mode = 'welcome';
    base.advancedMode = false;
    base.qualityTier = 'high'; // 'high' | 'balanced' | '2d'
    base.activeMission = 0;
    base.missionsCompleted = { m1: false, m2: false, m3: false, m4: false, m5: false };
    base.milestonesUnlocked = { firstLight: false, firstNight: false, waterSaved: false };
    base.stressScenario = {
      solarMultiplier: 0.75,
      demandMultiplier: 1.20,
      nightShareDelta: 0.08,
      tariffMultiplier: 1.25,
      waterSupplyMultiplier: 0.80,
      batteryMultiplier: 1.00
    };
    base.stormDays = [1.0, 0.45, 0.35];
    base.lowGraphics = false;
    base.savedAt = null;
    return base;
  }

  function sanitizeProject(raw) {
    if (!raw || typeof raw !== 'object' || !raw.electricity || !raw.storage || !raw.water) return null;
    const tpl = TEMPLATES[raw.id] || TEMPLATES.community;
    const p = deepClone(raw);
    if (!p.projectId) p.projectId = 'proj_' + Math.random().toString(36).slice(2, 9);
    if (!p.projectName || typeof p.projectName !== 'string') p.projectName = p.label || tpl.label;
    if (!p.economics) p.economics = deepClone(tpl.economics);
    if (!Array.isArray(p.stormDays) || p.stormDays.length < 3) p.stormDays = [1.0, 0.45, 0.35];
    if (!p.missionsCompleted) p.missionsCompleted = { m1: false, m2: false, m3: false, m4: false, m5: false };
    if (!p.stressScenario) {
      p.stressScenario = { solarMultiplier: 0.75, demandMultiplier: 1.20, nightShareDelta: 0.08, tariffMultiplier: 1.25, waterSupplyMultiplier: 0.80, batteryMultiplier: 1.00 };
    }
    if (!Array.isArray(p.electricity.appliances)) p.electricity.appliances = deepClone(tpl.electricity.appliances);
    p.electricity.appliances = p.electricity.appliances.slice(0, 40).map((a) => ({
      name: String(a && a.name ? a.name : 'Load').slice(0, 60),
      watts: Math.max(0, Number(a && a.watts) || 0),
      hours: Math.min(24, Math.max(0, Number(a && a.hours) || 0)),
      qty: Math.max(0, Math.round(Number(a && a.qty) || 0))
    }));
    if (!p.qualityTier) p.qualityTier = p.lowGraphics ? '2d' : 'high';
    return p;
  }

  function buildStressedState(state) {
    const mod = deepClone(state);
    const st = state.stressScenario || {};
    mod.electricity.peakSunHours = Math.max(0.5, state.electricity.peakSunHours * (st.solarMultiplier || 1));
    mod.electricity.appliances = state.electricity.appliances.map((a) => ({
      ...a, hours: Math.min(24, a.hours * (st.demandMultiplier || 1))
    }));
    mod.electricity.tariffPerKwh = state.electricity.tariffPerKwh * (st.tariffMultiplier || 1);
    mod.storage.nightShare = Math.min(0.9, Math.max(0.05, state.storage.nightShare + (st.nightShareDelta || 0)));
    mod.storage.batteryKwh = Math.max(0, state.storage.batteryKwh * (st.batteryMultiplier || 1));
    mod.water.rawSupplyL = Math.max(0, state.water.rawSupplyL * (st.waterSupplyMultiplier || 1));
    return mod;
  }

  // Multi-Project Workspace Storage (with automatic migration from v2)
  function loadWorkspace() {
    try {
      const rawV3 = localStorage.getItem(STORAGE_KEY_V3);
      if (rawV3) {
        const ws = JSON.parse(rawV3);
        if (ws && Array.isArray(ws.projects) && ws.projects.length > 0) {
          ws.projects = ws.projects.map(sanitizeProject).filter(Boolean);
          if (ws.projects.length > 0) {
            if (!ws.projects.some((p) => p.projectId === ws.activeProjectId)) {
              ws.activeProjectId = ws.projects[0].projectId;
            }
            return ws;
          }
        }
      }
      // Migrate legacy single-plan v2 if present
      const rawV2 = localStorage.getItem(LEGACY_KEY_V2);
      if (rawV2) {
        const migrated = sanitizeProject(JSON.parse(rawV2));
        if (migrated) {
          return { version: 3, activeProjectId: migrated.projectId, projects: [migrated] };
        }
      }
    } catch (e) {}
    const initial = createInitialState('community', 'Aetheria 2045 Baseline');
    return { version: 3, activeProjectId: initial.projectId, projects: [initial] };
  }

  function saveWorkspace(ws) {
    try {
      const payload = deepClone(ws);
      const now = new Date().toISOString();
      payload.projects.forEach((p) => { if (p.projectId === payload.activeProjectId) p.savedAt = now; });
      localStorage.setItem(STORAGE_KEY_V3, JSON.stringify(payload));
      return { ok: true, savedAt: now };
    } catch (e) {
      return { ok: false, error: 'Browser storage unavailable; projects remain active for this session.' };
    }
  }

  // Backwards-compatible single-state helpers
  function loadState() {
    const ws = loadWorkspace();
    return ws.projects.find((p) => p.projectId === ws.activeProjectId) || ws.projects[0];
  }

  function saveState(state) {
    const ws = loadWorkspace();
    const idx = ws.projects.findIndex((p) => p.projectId === state.projectId);
    if (idx >= 0) ws.projects[idx] = deepClone(state);
    else ws.projects.push(deepClone(state));
    ws.activeProjectId = state.projectId;
    return saveWorkspace(ws);
  }

  function clearSavedState() {
    try {
      localStorage.removeItem(STORAGE_KEY_V3);
      localStorage.removeItem(LEGACY_KEY_V2);
    } catch (e) {}
  }

  function validateAndImportProject(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const candidate = parsed && parsed.state ? parsed.state : parsed;
      const clean = sanitizeProject(candidate);
      if (!clean) return { ok: false, error: 'Invalid project JSON: missing electricity, storage, or water sections.' };
      clean.projectId = 'proj_' + Math.random().toString(36).slice(2, 9);
      clean.projectName = (clean.projectName || clean.label || 'Imported Plan') + ' (Imported)';
      return { ok: true, project: clean };
    } catch (e) {
      return { ok: false, error: 'Could not parse JSON file.' };
    }
  }

  const api = {
    STORAGE_KEY: STORAGE_KEY_V3, TEMPLATES, deepClone, escapeHtml,
    createInitialState, sanitizeProject, buildStressedState,
    loadWorkspace, saveWorkspace, loadState, saveState, clearSavedState, validateAndImportProject
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AetheriaState = api;
})(typeof window !== 'undefined' ? window : globalThis);
