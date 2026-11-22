/* ============================================================================
 * AETHERIA — Planetary Systems Intelligence Platform
 * src/ui/AetheriaApp.js
 * Unified Controller: Multi-Project Workspace, Undo History, Progressive Disclosure,
 * Interactive 3D Digital Twin Picking + Inspector, Aetheria Intelligence (4-Way
 * Scenario Matrix + Parametric Sensitivity + Diagnostics), Scientific Discovery
 * Lab, Story Mode (4 Reactive Characters), 2-Min Judge Demo & PDF/JSON Reports.
 * ============================================================================ */
(function (global) {
  'use strict';

  const DEMO_STEPS = [
    {
      view: 'hub',
      label: 'DEMO 1/5 (0–20s)',
      title: 'The Problem: A School Facing Evening Outages',
      text: 'Loaded the "My School" project (120 students). Click any 3D landmark (School, Solar Array, Battery, Water Tower) to inspect live calculated telemetry.'
    },
    {
      view: 'power',
      label: 'DEMO 2/5 (20–45s)',
      title: 'Mission 2: Power & Solar PV Generation',
      text: 'Increase Solar Capacity (kWp) or edit classroom loads. Watch daily PV generation (kWp × PSH × PR), roof area fit, and the 3D solar rows respond in real time.'
    },
    {
      view: 'storage',
      label: 'DEMO 3/5 (45–70s)',
      title: 'Mission 3: Night Storage & 72-Hour Storm Test',
      text: 'Increase Battery Capacity (kWh) and watch the 24-hour energy chart, 72-hour 3-day storm chart, and lit 3D buildings update live.'
    },
    {
      view: 'intelligence',
      label: 'DEMO 4/5 (70–95s)',
      title: 'Aetheria Intelligence: 4-Way Matrix & Sensitivity',
      text: 'Inspect deterministic root-cause diagnostics, compare Grid-Only vs. Solar vs. Storage vs. Efficiency (-20%), and examine parametric sensitivity curves.'
    },
    {
      view: 'future',
      label: 'DEMO 5/5 (95–120s)',
      title: 'Stress-Test & Preliminary Engineering Report',
      text: 'Inspect editable equipment CapEx & payback, compare baseline vs. weather/demand shocks, and click Report to export a printable analysis with embedded SVG charts.'
    }
  ];

  function bootApp() {
    const Science = global.AetheriaScience;
    const Intel = global.AetheriaIntelligence;
    const StateApi = global.AetheriaState;
    const Materials = global.AetheriaMaterials;
    const StoryApi = global.AetheriaStory;
    const Charts = global.AetheriaCharts;
    const ReportApi = global.AetheriaReport;
    const Fallback2D = global.AetheriaFallback2D;
    const esc = StateApi.escapeHtml;

    let workspace = StateApi.loadWorkspace();
    let state = workspace.projects.find((p) => p.projectId === workspace.activeProjectId) || workspace.projects[0];
    let undoStack = [];
    let currentView = 'hub';
    let demoStepIdx = -1;
    let webglAvailable = false;
    let engine = null, post = null, camera = null, scene3D = null, audio = null;
    let matSearch = '';
    let lastBundle = null;
    let activeInspectorLandmark = null;

    const canvas = document.getElementById('gl-canvas');
    const fallbackEl = document.getElementById('fallback-2d');
    const panelEyebrow = document.getElementById('panel-eyebrow');
    const panelTitle = document.getElementById('panel-title');
    const panelBody = document.getElementById('panel-body');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const prologueOverlay = document.getElementById('prologue-overlay');
    const reportOverlay = document.getElementById('report-overlay');
    const toastEl = document.getElementById('toast');
    const btn2D = document.getElementById('btn-2d');
    const btnAudio = document.getElementById('btn-audio');
    const btnModeToggle = document.getElementById('btn-mode-toggle');
    const btnUndo = document.getElementById('btn-undo');
    const demoBanner = document.getElementById('demo-banner');
    const cycleSlider = document.getElementById('cycle-slider');
    const cycleTimeEl = document.getElementById('cycle-time');
    const btnCyclePlay = document.getElementById('btn-cycle-play');
    const twinInspector = document.getElementById('twin-inspector');
    const twinTitle = document.getElementById('twin-title');
    const twinBody = document.getElementById('twin-body');
    const twinGoto = document.getElementById('twin-goto');
    const importInput = document.getElementById('import-json-input');

    let toastTimer = null;
    function showToast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
    }

    function pushUndo() {
      undoStack.push(StateApi.deepClone(state));
      if (undoStack.length > 25) undoStack.shift();
      if (btnUndo) btnUndo.disabled = undoStack.length === 0;
    }

    function performUndo() {
      if (!undoStack.length) return;
      const prev = undoStack.pop();
      replaceActiveProject(prev);
      if (btnUndo) btnUndo.disabled = undoStack.length === 0;
      showToast('Reverted last parameter change.');
      syncAll();
    }

    function replaceActiveProject(nextState) {
      state = nextState;
      const idx = workspace.projects.findIndex((p) => p.projectId === state.projectId);
      if (idx >= 0) workspace.projects[idx] = state;
      else workspace.projects.push(state);
      workspace.activeProjectId = state.projectId;
    }

    function formatHourLabel(hr) {
      const norm = ((hr % 24) + 24) % 24;
      const hh = Math.floor(norm);
      const mm = Math.floor((norm - hh) * 60);
      const period = norm >= 6 && norm < 10 ? 'Morning'
        : norm >= 10 && norm < 16 ? 'Solar Peak'
        : norm >= 16 && norm < 19 ? 'Dusk' : 'Night';
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} • ${period}`;
    }

    // Attempt WebGL2 initialization with graceful 2D fallback
    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      if (canvas && global.AetheriaEngine && global.AetheriaScene && global.AetheriaPost && global.AetheriaCamera) {
        engine = new global.AetheriaEngine.WebGL2Engine(canvas);
        post = new global.AetheriaPost.PostProcess(engine);
        camera = new global.AetheriaCamera.CameraRig(canvas);
        scene3D = new global.AetheriaScene.AetheriaCommunityScene(engine);
        if (global.AetheriaAudio) audio = new global.AetheriaAudio.AudioEngine(engine.gl);
        webglAvailable = true;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          applyQualityTier('2d', 'WebGL context lost — switched to accessible 2D view.');
        });
      }
    } catch (err) {
      webglAvailable = false;
    }

    function applyQualityTier(tier, reason) {
      if (!webglAvailable) tier = '2d';
      state.qualityTier = tier;
      state.lowGraphics = tier === '2d';
      document.body.classList.toggle('mode-2d', state.lowGraphics);
      if (engine && !state.lowGraphics) {
        engine.dpr = tier === 'balanced' ? 1.0 : Math.min(window.devicePixelRatio || 1, 2.0);
        engine.resize();
        if (post) post.resize(engine.width, engine.height);
      }
      btn2D.textContent = !webglAvailable ? '2D Only'
        : tier === '2d' ? '2D Mode'
        : tier === 'balanced' ? '3D Balanced' : '3D High';
      btn2D.classList.toggle('active', tier !== 'high');
      if (reason) showToast(reason);
      syncAll();
    }

    function set2DMode(on, reason) {
      applyQualityTier(on ? '2d' : 'high', reason);
    }

    if (!webglAvailable || prefersReduced || state.lowGraphics) {
      state.qualityTier = '2d';
      state.lowGraphics = true;
      document.body.classList.add('mode-2d');
      btn2D.textContent = webglAvailable ? '2D Mode' : '2D Only';
      btn2D.classList.add('active');
    }

    const resumeHint = document.getElementById('resume-hint');
    if (state.savedAt && resumeHint) {
      resumeHint.textContent = `Workspace restored (${workspace.projects.length} project${workspace.projects.length > 1 ? 's' : ''}; active: "${state.projectName || state.label}").`;
    }

    function getSelectedElement() {
      const z = Math.max(1, Math.min(118, Math.round(state.selectedElementZ || 14)));
      return Materials.ELEMENTS[z - 1];
    }

    // Core Deterministic Evaluation Pipeline
    function evaluateAll() {
      const evalRes = Science.evaluateSystem(state);
      const multiDayRes = Science.simulateMultiDay(state, state.stormDays || [1.0, 0.45, 0.35]);
      const fourWayRes = Science.compareFourScenarios(state);
      const sensRes = Science.runSensitivityAnalysis(state);
      const intelRes = Intel.analyzeSystem(state, evalRes, multiDayRes, fourWayRes);
      const challenges = Intel.evaluateChallenges(state, evalRes, multiDayRes);

      if (state.selectedStorageTech === 'lfp' || state.selectedStorageTech === 'na-ion') state.missionsCompleted.m1 = true;
      if (evalRes.electricity.dailySolarKwh >= evalRes.electricity.dailyDemandKwh * 0.80 && evalRes.electricity.roofFits) state.missionsCompleted.m2 = true;
      if (evalRes.storage.unservedNightKwh <= 0.5 && evalRes.storage.usableCapacityKwh > 0) state.missionsCompleted.m3 = true;
      if (evalRes.water.shortfallL <= 1.0 && evalRes.water.inputs.leakagePct <= 15) state.missionsCompleted.m4 = true;

      lastBundle = { evalRes, multiDayRes, fourWayRes, sensRes, intelRes, challenges };
      return lastBundle;
    }

    function updateKPIs(evalRes) {
      const { electricity, storage, water } = evalRes;
      const dEl = document.getElementById('kpi-demand');
      const sEl = document.getElementById('kpi-solar');
      const nEl = document.getElementById('kpi-night');
      const wEl = document.getElementById('kpi-water');

      dEl.textContent = `${electricity.dailyDemandKwh} kWh`;
      document.getElementById('kpi-demand-sub').textContent = `${electricity.monthlyDemandKwh} kWh/mo • $${storage.monthlyGridCost}/mo grid`;

      const solarPct = Math.round(storage.solarFraction * 100);
      sEl.textContent = `${solarPct}%`;
      sEl.className = 'kpi-val ' + (solarPct >= 80 ? 'ok' : (solarPct >= 45 ? 'warn' : 'bad'));
      document.getElementById('kpi-solar-sub').textContent = `${electricity.dailySolarKwh} kWh/d PV (${electricity.inputs.installedKwp} kWp)`;

      nEl.textContent = `${storage.backupHours} hrs`;
      nEl.className = 'kpi-val ' + (storage.unservedNightKwh <= 0.5 ? 'ok' : (storage.nightReliability >= 0.6 ? 'warn' : 'bad'));
      document.getElementById('kpi-night-sub').textContent = storage.unservedNightKwh > 0.05
        ? `${storage.unservedNightKwh} kWh unserved/night`
        : 'Night loads fully covered';

      wEl.textContent = water.shortfallL > 0.5 ? `-${water.shortfallL} L` : `+${water.surplusL} L`;
      wEl.className = 'kpi-val ' + (water.shortfallL <= 0.5 ? 'ok' : 'bad');
      document.getElementById('kpi-water-sub').textContent = `${water.pumpingKwhPerDay} kWh/d pump • ${water.inputs.leakagePct}% leak`;
    }

    function updateNavBadges() {
      const mapDone = {
        materials: state.missionsCompleted.m1,
        power: state.missionsCompleted.m2,
        storage: state.missionsCompleted.m3,
        water: state.missionsCompleted.m4,
        future: state.missionsCompleted.m5
      };
      document.querySelectorAll('.step-btn').forEach((btn) => {
        const v = btn.dataset.view;
        btn.classList.toggle('active', v === currentView);
        btn.classList.toggle('done', !!mapDone[v]);
      });
      btnModeToggle.textContent = state.mode === 'story' ? 'Practical Mode' : 'Story Mode';
    }

    // =========================================================================
    // DIGITAL TWIN LANDMARK INSPECTOR (Reads Real Simulation State)
    // =========================================================================
    function inspectLandmark(lmId) {
      if (!lastBundle) return;
      activeInspectorLandmark = lmId;
      const { evalRes, multiDayRes } = lastBundle;
      const { electricity, storage, water, economics } = evalRes;

      const specs = {
        school: {
          title: 'Aetheria School & Learning Center',
          view: 'power',
          html: `
            <div><strong>Total Community Load:</strong> ${electricity.dailyDemandKwh} kWh/day</div>
            <div><strong>Nighttime Reliability:</strong> ${Math.round(storage.nightReliability * 100)}% (${storage.backupHours} hrs backup)</div>
            <div><strong>Evening Status:</strong> ${storage.unservedNightKwh > 0.5 ? `<span style="color:#fda4af;">Short ${storage.unservedNightKwh} kWh/night</span>` : '<span style="color:#6ee7b7;">Classrooms & study hall lit</span>'}</div>`
        },
        clinic: {
          title: 'Community Clinic & Cold Chain',
          view: 'storage',
          html: `
            <div><strong>72h Storm Autonomy:</strong> ${multiDayRes.survived ? '<span style="color:#6ee7b7;">Survived (0h outage)</span>' : `<span style="color:#fda4af;">${multiDayRes.outageHours}h outage risk</span>`}</div>
            <div><strong>72h Reliability:</strong> ${multiDayRes.reliabilityPct}% (${multiDayRes.totalUnmetKwh} kWh unmet)</div>
            <div><strong>Priority Storage:</strong> ${storage.usableCapacityKwh} kWh usable (${(state.selectedStorageTech || 'lfp').toUpperCase()})</div>`
        },
        solar: {
          title: 'Solar Microgrid Array',
          view: 'power',
          html: `
            <div><strong>Installed Capacity:</strong> ${electricity.inputs.installedKwp} kWp (${electricity.requiredAreaM2} m² / ${electricity.inputs.roofAreaM2} m² roof)</div>
            <div><strong>Daily PV Output:</strong> ${electricity.dailySolarKwh} kWh/day (PSH ${electricity.inputs.peakSunHours}, PR ${electricity.inputs.performanceRatio})</div>
            <div><strong>PV Equipment CapEx:</strong> $${economics.solarCapex.toLocaleString()} ($${economics.inputs.solarCostPerKwp}/kWp)</div>`
        },
        battery: {
          title: 'Battery Storage Substation',
          view: 'storage',
          html: `
            <div><strong>Nominal / Usable:</strong> ${storage.inputs.batteryKwh} kWh / ${storage.usableCapacityKwh} kWh (${Math.round(storage.inputs.depthOfDischarge * 100)}% DoD)</div>
            <div><strong>Stored Surplus → Night:</strong> ${storage.storedNetKwh} kWh → ${storage.maxDeliverableNightKwh} kWh deliverable</div>
            <div><strong>Round-Trip Loss:</strong> ${storage.roundTripLossKwh} kWh/day • CapEx $${economics.batteryCapex.toLocaleString()}</div>`
        },
        water: {
          title: 'Water Tower, Dam & Reservoir',
          view: 'water',
          html: `
            <div><strong>Demand vs. Effective Supply:</strong> ${water.dailyDemandL} L/d vs. ${water.effectiveSupplyL} L/d</div>
            <div><strong>Pipe Leakage Loss:</strong> ${water.inputs.leakagePct}% (${water.leakageLossL} L/day lost)</div>
            <div><strong>Coupled Pumping Load:</strong> ${water.pumpingKwhPerDay} kWh/day (${water.inputs.headMeters} m head)</div>`
        }
      };

      const info = specs[lmId];
      if (!info) return;
      twinTitle.textContent = info.title;
      twinBody.innerHTML = info.html;
      twinGoto.dataset.view = info.view;
      twinInspector.classList.remove('hidden');
      document.querySelectorAll('.lm-pill').forEach((p) => p.classList.toggle('active', p.dataset.lm === lmId));
      if (scene3D && camera) {
        const viewMap = { school: 'hub', clinic: 'hub', solar: 'power', battery: 'storage', water: 'water' };
        scene3D.focusView(viewMap[lmId] || 'hub', camera);
      }
    }

    function syncAll(skipPanelRerender) {
      const bundle = evaluateAll();
      const elObj = getSelectedElement();
      updateKPIs(bundle.evalRes);
      updateNavBadges();
      if (scene3D) scene3D.syncFromEvaluation(bundle.evalRes, elObj);
      if (state.lowGraphics || !webglAvailable) {
        Fallback2D.renderFallback2D(fallbackEl, bundle.evalRes, elObj, currentView);
      }
      if (activeInspectorLandmark && !twinInspector.classList.contains('hidden')) {
        inspectLandmark(activeInspectorLandmark);
      }
      replaceActiveProject(state);
      StateApi.saveWorkspace(workspace);
      if (!skipPanelRerender) renderPanel(bundle);
    }

    function navigate(viewKey) {
      currentView = viewKey;
      if (scene3D && camera) {
        const camView = (viewKey === 'intelligence' || viewKey === 'lab') ? 'future' : viewKey;
        scene3D.focusView(camView, camera);
        if (cycleSlider && cycleTimeEl && !scene3D.autoCycle) {
          cycleSlider.value = scene3D.targetCycleHour.toFixed(2);
          cycleTimeEl.textContent = formatHourLabel(scene3D.targetCycleHour);
        }
      }
      syncAll();
    }

    function appendCharacterCard(viewKey, evalRes, multiDayRes) {
      if (state.mode !== 'story' || !StoryApi) return;
      if (viewKey === 'intelligence' || viewKey === 'lab') return;
      const beat = StoryApi.getCharacterBeat(viewKey, state, evalRes, multiDayRes);
      if (!beat || !beat.char) return;
      const card = document.createElement('div');
      card.className = 'char-card';
      card.id = 'story-char-card';
      card.style.borderLeftColor = beat.char.color;
      card.innerHTML = `
        <div class="char-avatar">${beat.char.avatar}</div>
        <div>
          <div class="char-meta">${esc(beat.char.name)} <span class="char-role">• ${esc(beat.char.role)}</span></div>
          <p class="char-quote">“${esc(beat.quote)}”</p>
        </div>`;
      panelBody.appendChild(card);
    }

    // =========================================================================
    // RENDER EACH VIEW INSIDE WORKSPACE PANEL
    // =========================================================================
    function renderPanel(bundle) {
      panelBody.innerHTML = '';
      appendCharacterCard(currentView, bundle.evalRes, bundle.multiDayRes);
      if (currentView === 'hub') renderHub(bundle);
      else if (currentView === 'materials') renderMaterials();
      else if (currentView === 'power') renderPower(bundle.evalRes);
      else if (currentView === 'storage') renderStorage(bundle.evalRes, bundle.multiDayRes);
      else if (currentView === 'water') renderWater(bundle.evalRes);
      else if (currentView === 'intelligence') renderIntelligence(bundle);
      else if (currentView === 'lab') renderLab(bundle);
      else renderFuture(bundle);
    }

    function renderHub(bundle) {
      const { evalRes, intelRes } = bundle;
      const isStory = state.mode === 'story';
      panelEyebrow.textContent = isStory ? 'AETHERIA 2045 • STORY MODE' : 'DECISION-SUPPORT WORKSPACE';
      panelTitle.textContent = isStory ? 'Community Rebuild Hub' : 'Projects & System Map';

      // Multi-Project Manager Card
      const projCard = document.createElement('div');
      projCard.className = 'card';
      projCard.id = 'project-manager-card';
      projCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">Named Projects (${workspace.projects.length} Saved Locally)</h3>
          <span class="badge fact">Offline-First</span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <select id="proj-select" style="flex:1;background:rgba(2,6,18,0.85);color:#fff;border:1px solid var(--border);border-radius:7px;padding:6px 8px;font-size:12px;">
            ${workspace.projects.map((p) => `<option value="${esc(p.projectId)}" ${p.projectId === state.projectId ? 'selected' : ''}>${esc(p.projectName || p.label)}</option>`).join('')}
          </select>
          <button id="proj-dup" class="btn" title="Duplicate active project">Duplicate</button>
          <button id="proj-del" class="btn" title="Delete active project" ${workspace.projects.length <= 1 ? 'disabled' : ''}>Del</button>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <input id="proj-name-inp" type="text" value="${esc(state.projectName || state.label)}" placeholder="Project Name" style="flex:1;background:rgba(2,6,18,0.85);color:#fff;border:1px solid var(--border);border-radius:7px;padding:5px 8px;font-size:11.5px;">
          <button id="proj-rename" class="btn">Rename</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          <button class="btn ${state.id === 'home' ? 'primary' : ''}" data-tpl="home">+ Home Template</button>
          <button class="btn ${state.id === 'school' ? 'primary' : ''}" data-tpl="school">+ School Template</button>
          <button class="btn ${state.id === 'community' ? 'primary' : ''}" data-tpl="community">+ Community</button>
          <button id="proj-import" class="btn">Import JSON</button>
        </div>`;

      projCard.querySelector('#proj-select').addEventListener('change', (ev) => {
        const target = workspace.projects.find((p) => p.projectId === ev.target.value);
        if (target) {
          workspace.activeProjectId = target.projectId;
          state = target;
          undoStack = [];
          if (btnUndo) btnUndo.disabled = true;
          showToast(`Switched to "${state.projectName || state.label}"`);
          syncAll();
        }
      });
      projCard.querySelector('#proj-rename').addEventListener('click', () => {
        const val = projCard.querySelector('#proj-name-inp').value.trim();
        if (val) {
          pushUndo();
          state.projectName = val.slice(0, 60);
          showToast(`Renamed project to "${state.projectName}"`);
          syncAll();
        }
      });
      projCard.querySelector('#proj-dup').addEventListener('click', () => {
        const copy = StateApi.deepClone(state);
        copy.projectId = 'proj_' + Math.random().toString(36).slice(2, 9);
        copy.projectName = (state.projectName || state.label) + ' (Copy)';
        workspace.projects.push(copy);
        workspace.activeProjectId = copy.projectId;
        state = copy;
        showToast(`Created "${copy.projectName}"`);
        syncAll();
      });
      projCard.querySelector('#proj-del').addEventListener('click', () => {
        if (workspace.projects.length <= 1) return;
        workspace.projects = workspace.projects.filter((p) => p.projectId !== state.projectId);
        state = workspace.projects[0];
        workspace.activeProjectId = state.projectId;
        showToast('Project deleted.');
        syncAll();
      });
      projCard.querySelector('#proj-import').addEventListener('click', () => importInput && importInput.click());
      projCard.querySelectorAll('[data-tpl]').forEach((b) => {
        b.addEventListener('click', () => {
          pushUndo();
          const modeKeep = state.mode;
          const tierKeep = state.qualityTier;
          const fresh = StateApi.createInitialState(b.dataset.tpl);
          fresh.projectId = state.projectId;
          fresh.mode = modeKeep;
          fresh.qualityTier = tierKeep;
          fresh.lowGraphics = tierKeep === '2d';
          replaceActiveProject(fresh);
          showToast(`Loaded template: ${state.label}`);
          syncAll();
        });
      });
      panelBody.appendChild(projCard);

      // Quick Intelligence Status Banner
      const warnCount = intelRes.warnings.length;
      const iqCard = document.createElement('div');
      iqCard.className = 'card';
      iqCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <h3 style="margin:0;">Aetheria Intelligence Summary</h3>
          <span class="badge ${warnCount ? 'model' : 'ok'}">${warnCount ? warnCount + ' Alert' + (warnCount > 1 ? 's' : '') : 'Healthy'}</span>
        </div>
        <p style="font-size:11.5px;">${esc(intelRes.diagnostics[0] ? intelRes.diagnostics[0].summary : 'System evaluated.')}</p>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button class="btn primary" id="hub-go-intel">Open Intelligence &amp; Sensitivity &rarr;</button>
          <button class="btn" id="hub-go-lab">Discovery Lab</button>
        </div>`;
      iqCard.querySelector('#hub-go-intel').addEventListener('click', () => navigate('intelligence'));
      iqCard.querySelector('#hub-go-lab').addEventListener('click', () => navigate('lab'));
      panelBody.appendChild(iqCard);

      // Connected Mission Map
      const mapCard = document.createElement('div');
      mapCard.className = 'card';
      const rows = [
        { k: 'materials', n: '1. Materials & Chemistry',     d: `Selected: ${(state.selectedStorageTech || 'lfp').toUpperCase()} • 118-Element Lab`, done: state.missionsCompleted.m1 },
        { k: 'power',     n: '2. Power & Solar PV',          d: `Demand: ${evalRes.electricity.dailyDemandKwh} kWh/d • Solar: ${evalRes.electricity.dailySolarKwh} kWh/d`, done: state.missionsCompleted.m2 },
        { k: 'storage',   n: '3. Night Storage & 72h Storm', d: `Backup: ${evalRes.storage.backupHours} hrs • Unserved: ${evalRes.storage.unservedNightKwh} kWh`, done: state.missionsCompleted.m3 },
        { k: 'water',     n: '4. Water–Energy Nexus',        d: `Status: ${evalRes.water.status} • Pumping: ${evalRes.water.pumpingKwhPerDay} kWh/d`, done: state.missionsCompleted.m4 },
        { k: 'future',    n: '5. Scenarios, CapEx & Report', d: `Est. CapEx: $${evalRes.economics.totalCapex.toLocaleString()} • Payback: ${evalRes.economics.simplePaybackYears || 'N/A'} yrs`, done: state.missionsCompleted.m5 }
      ];
      mapCard.innerHTML = '<h3>Connected Systems Pipeline</h3>' + rows.map((r) => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-weight:700;color:#fff;font-size:12px;">${r.n} ${r.done ? '<span class="badge ok">Verified</span>' : ''}</div>
            <div style="font-size:11px;color:#94a3b8;">${r.d}</div>
          </div>
          <button class="btn" data-go="${r.k}">Open &rarr;</button>
        </div>`).join('');
      mapCard.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
      panelBody.appendChild(mapCard);
    }

    // =========================================================================
    // AETHERIA INTELLIGENCE VIEW (Diagnostics, 4-Way Matrix, Sensitivity, AI Adapter)
    // =========================================================================
    function renderIntelligence(bundle) {
      const { fourWayRes, sensRes, intelRes } = bundle;
      panelEyebrow.textContent = 'AETHERIA INTELLIGENCE • DETERMINISTIC SOLVER';
      panelTitle.textContent = 'Diagnostics, 4-Way Matrix & Sensitivity';

      // Engine status + Warnings
      const statusCard = document.createElement('div');
      statusCard.className = 'card';
      statusCard.id = 'intel-diagnostics-card';
      statusCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">Root-Cause System Diagnostics</h3>
          <span class="badge ok">Local Physics</span>
        </div>
        <p style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${esc(Intel.AIAdapter.getStatusText())}</p>
        ${intelRes.warnings.map((w) => `
          <div class="diag-item ${w.level}">
            <div style="font-weight:700;font-size:11.5px;color:#fff;">⚠ ${esc(w.title)}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${esc(w.detail)}</div>
          </div>`).join('')}
        ${intelRes.diagnostics.map((d) => `
          <div class="diag-item ${d.level}">
            <div style="font-weight:700;font-size:11.5px;color:#fff;">${esc(d.system)}: ${esc(d.summary)}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${esc(d.explanation)}</div>
          </div>`).join('')}`;
      panelBody.appendChild(statusCard);

      // 4-Way Architectural Scenario Matrix
      const matrixCard = document.createElement('div');
      matrixCard.className = 'card';
      matrixCard.id = 'four-way-card';
      matrixCard.innerHTML = `
        <h3>4-Way Architectural Comparison (Consistent Assumptions)</h3>
        <div style="margin-bottom:8px;">${Charts.renderFourWayMatrixSVG(fourWayRes)}</div>
        <table class="data-table">
          <thead><tr><th>Scenario</th><th>Solar %</th><th>Unmet</th><th>Grid/mo</th><th>CapEx</th></tr></thead>
          <tbody>
            ${fourWayRes.scenarios.map((s) => `
              <tr>
                <td><strong>${esc(s.label)}</strong></td>
                <td>${Math.round(s.eval.storage.solarFraction * 100)}%</td>
                <td>${s.eval.storage.unservedNightKwh} kWh</td>
                <td>$${s.eval.storage.monthlyGridCost}</td>
                <td>$${s.eval.economics.totalCapex.toLocaleString()}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <ul style="margin:8px 0 0;padding-left:16px;font-size:11px;color:#cbd5e1;">
          ${intelRes.tradeoffs.map((t) => `<li>${esc(t)}</li>`).join('')}
        </ul>`;
      panelBody.appendChild(matrixCard);

      // Parametric Sensitivity Analysis
      const sensCard = document.createElement('div');
      sensCard.className = 'card';
      sensCard.id = 'sensitivity-card';
      sensCard.innerHTML = `
        <h3>Parametric Sensitivity Analysis</h3>
        ${Charts.renderSensitivitySVG(sensRes)}
        <table class="data-table" style="margin-top:8px;">
          <thead><tr><th>Tariff Scale</th><th>$/kWh</th><th>Annual Grid Cost</th><th>Payback</th></tr></thead>
          <tbody>
            ${sensRes.tariffSweep.map((t) => `
              <tr><td>${t.label}</td><td>$${t.tariff}</td><td>$${t.annualGridCost.toLocaleString()}/yr</td><td>${t.paybackYrs !== null ? t.paybackYrs + ' yrs' : 'N/A'}</td></tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:10.5px;color:#94a3b8;margin-top:6px;"><em>${esc(sensRes.disclaimer)}</em></p>`;
      panelBody.appendChild(sensCard);

      // Optional External AI Adapter (Strictly Opt-In, Disabled by Default)
      const aiCard = document.createElement('div');
      aiCard.className = 'card';
      aiCard.innerHTML = `
        <details>
          <summary style="cursor:pointer;font-weight:700;color:#7dd3fc;font-size:12px;">Optional External AI Provider Interface (Disabled by Default)</summary>
          <p style="font-size:11px;color:#94a3b8;margin-top:6px;">Aetheria never requires a paid AI key, never hardcodes credentials, and never sends your project data without explicit permission. Core diagnostics above are 100% deterministic local physics.</p>
          <div style="font-size:11px;color:#cbd5e1;">Status: <strong>${esc(Intel.AIAdapter.getStatusText())}</strong></div>
        </details>`;
      panelBody.appendChild(aiCard);
    }

    // =========================================================================
    // SCIENTIFIC DISCOVERY LAB (Predict -> Experiment -> Verify)
    // =========================================================================
    function renderLab(bundle) {
      const chals = bundle.challenges;
      const solvedCount = chals.filter((c) => c.solved).length;
      panelEyebrow.textContent = 'SCIENTIFIC DISCOVERY LAB';
      panelTitle.textContent = `Experiment Challenges (${solvedCount} / ${chals.length} Verified)`;

      const intro = document.createElement('div');
      intro.className = 'card';
      intro.innerHTML = `
        <p style="margin:0;">Each challenge evaluates your live project using real physics equations—allowing <strong>multiple valid engineering solutions</strong> (efficiency, solar sizing, battery chemistry, or leak repair).</p>`;
      panelBody.appendChild(intro);

      chals.forEach((c) => {
        const box = document.createElement('div');
        box.className = 'challenge-box' + (c.solved ? ' solved' : '');
        box.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;">
            <strong>${esc(c.title)}</strong>
            <span class="badge ${c.solved ? 'ok' : 'model'}">${c.solved ? 'Verified' : 'In Progress'}</span>
          </div>
          <p style="margin:0 0 4px;color:#e2e8f0;"><em>Hypothesis:</em> ${esc(c.hypothesis)}</p>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;"><strong>Criterion:</strong> ${esc(c.criterion)}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-top:6px;">
            <span style="font-family:var(--mono);font-size:11px;color:${c.solved ? '#6ee7b7' : '#fde68a'};">${esc(c.currentMetric)}</span>
            <button class="btn primary" data-go="${c.actionView}" style="padding:4px 9px;font-size:11px;">Experiment &rarr;</button>
          </div>`;
        box.querySelector('[data-go]').addEventListener('click', () => navigate(c.actionView));
        panelBody.appendChild(box);
      });
    }

    function renderMaterials() {
      panelEyebrow.textContent = 'MISSION 1 • MATERIALS LAB';
      panelTitle.textContent = 'Discover the Building Blocks';

      const el = getSelectedElement();
      const keyZ = [14, 29, 3, 26, 11, 6, 13, 15];

      const matCard = document.createElement('div');
      matCard.className = 'card';
      matCard.innerHTML = `
        <h3>Core Sustainability Elements &amp; 118-Element Search</h3>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;">
          ${keyZ.map((z) => {
            const e = Materials.ELEMENTS[z - 1];
            return `<button class="btn ${e.z === el.z ? 'primary' : ''}" data-z="${e.z}" style="padding:4px 8px;font-size:11px;">${e.sym} (${e.name})</button>`;
          }).join('')}
        </div>
        <div class="field" style="margin-bottom:8px;">
          <input id="mat-search" type="text" placeholder="Search all 118 elements (e.g. Silicon, Cu, 26, Battery)..." value="${esc(matSearch)}">
        </div>
        <div id="pt-mini-grid" class="pt-mini-grid"></div>`;
      panelBody.appendChild(matCard);

      const gridEl = matCard.querySelector('#pt-mini-grid');
      function fillGrid() {
        const q = matSearch.trim().toLowerCase();
        const matches = Materials.ELEMENTS.filter((e) =>
          !q || e.name.toLowerCase().includes(q) || e.sym.toLowerCase().includes(q) || String(e.z) === q || e.role.toLowerCase().includes(q)
        ).slice(0, 36);
        gridEl.innerHTML = matches.map((e) => `
          <button class="pt-chip ${e.z === el.z ? 'active' : ''}" data-z="${e.z}" style="border-color:${e.hex}66;">
            <small>${e.z}</small><strong style="color:${e.hex};">${e.sym}</strong><small>${e.name.slice(0,7)}</small>
          </button>`).join('');
        gridEl.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
          state.selectedElementZ = parseInt(b.dataset.z, 10);
          syncAll();
        }));
      }
      fillGrid();
      matCard.querySelectorAll('div > [data-z]').forEach((b) => b.addEventListener('click', () => {
        state.selectedElementZ = parseInt(b.dataset.z, 10);
        syncAll();
      }));
      matCard.querySelector('#mat-search').addEventListener('input', (e) => {
        matSearch = e.target.value;
        fillGrid();
      });

      const infoCard = document.createElement('div');
      infoCard.className = 'card';
      const infra = el.infra;
      infoCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;">
          <h3 style="margin:0;">#${el.z} ${el.name} (${el.sym})</h3>
          <span class="badge fact">${el.category} • ${el.mass} u</span>
        </div>
        <p><strong>Electron Shells:</strong> <code>[${el.shells.join(', ')}]</code> &bull; <strong>Standard Phase:</strong> ${el.phase}</p>
        <p><strong>Infrastructure Role:</strong> ${el.role}</p>
        ${infra ? `
          <p><strong>Conductivity:</strong> ${infra.conductivity}</p>
          <p><strong>Abundance &amp; Cost:</strong> ${infra.abundance} &bull; ${infra.costTier}</p>
          <p><strong>Safety &amp; Recycling:</strong> ${infra.safety} &bull; ${infra.recyclability}</p>
          <div class="formula-box" style="margin-top:6px;"><strong>System Reality:</strong> ${infra.systemTruth}</div>
        ` : '<p style="font-size:11px;color:#94a3b8;">Source: IUPAC/NIST atomic weights &amp; OpenStax Chemistry 2e.</p>'}`;
      panelBody.appendChild(infoCard);

      const chCard = document.createElement('div');
      chCard.className = 'challenge-box' + (state.missionsCompleted.m1 ? ' solved' : '');
      chCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong>Mission 1 Challenge: Choose Community Storage Chemistry</strong>
          <span class="badge ${state.missionsCompleted.m1 ? 'ok' : 'model'}">${state.missionsCompleted.m1 ? 'Solved' : 'Action Needed'}</span>
        </div>
        <p style="margin:0 0 8px;">Select a safe, long-life chemistry for daily solar cycling:</p>
        ${Materials.STORAGE_TECHNOLOGIES.map((t) => `
          <div style="padding:8px;margin-bottom:6px;border-radius:8px;border:1px solid ${state.selectedStorageTech === t.id ? '#38bdf8' : 'var(--border)'};background:rgba(2,6,18,0.55);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <strong>${t.name}</strong>
              <button class="btn ${state.selectedStorageTech === t.id ? 'primary' : ''}" data-tech="${t.id}" style="padding:4px 9px;font-size:11px;">${state.selectedStorageTech === t.id ? 'Selected' : 'Select'}</button>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:3px;">Elements: ${t.keyElements.join(', ')} • Usable DoD: ${Math.round(t.usableDoD*100)}% • Eff: ${Math.round(t.roundTripEff*100)}% • Life: ${t.cycleLife}</div>
            <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${t.safety}. <em>Best for:</em> ${t.bestFor}.</div>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span style="font-size:11.5px;color:${state.missionsCompleted.m1 ? '#6ee7b7' : '#fde68a'};">
            ${state.selectedStorageTech === 'lead-acid' ? 'Hint: Try LFP or Sodium-Ion for higher Depth of Discharge and cycle life.' : 'Verified! Chemistry DoD & efficiency applied to Mission 3.'}
          </span>
          <button class="btn primary" id="m1-next">Mission 2 &rarr;</button>
        </div>`;
      chCard.querySelectorAll('[data-tech]').forEach((b) => b.addEventListener('click', () => {
        const tech = Materials.STORAGE_TECHNOLOGIES.find((x) => x.id === b.dataset.tech);
        if (tech) {
          pushUndo();
          state.selectedStorageTech = tech.id;
          state.storage.depthOfDischarge = tech.usableDoD;
          const legEff = Math.sqrt(tech.roundTripEff);
          state.storage.chargeEff = Math.round(legEff * 100) / 100;
          state.storage.dischargeEff = Math.round(legEff * 100) / 100;
          state.missionsCompleted.m1 = (tech.id === 'lfp' || tech.id === 'na-ion');
          showToast(`Selected ${tech.name} (DoD ${Math.round(tech.usableDoD*100)}%)`);
          syncAll();
        }
      }));
      chCard.querySelector('#m1-next').addEventListener('click', () => navigate('power'));
      panelBody.appendChild(chCard);
    }

    function renderPower(evalRes) {
      panelEyebrow.textContent = 'MISSION 2 • ELECTRICITY & SOLAR PV';
      panelTitle.textContent = 'Power the Community';

      const e = state.electricity;
      const er = evalRes.electricity;

      const appCard = document.createElement('div');
      appCard.className = 'card';
      appCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">1. Electricity Demand (${er.dailyDemandKwh} kWh/day)</h3>
          <button id="add-app" class="btn" style="padding:3px 8px;font-size:11px;">+ Add Load</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Appliance</th><th>W</th><th>Hrs</th><th>Qty</th><th>kWh/d</th><th></th></tr></thead>
          <tbody>
            ${e.appliances.map((a, idx) => `
              <tr>
                <td><input type="text" data-app="${idx}" data-f="name" value="${esc(a.name)}" style="width:112px;"></td>
                <td><input type="number" min="0" step="10" data-app="${idx}" data-f="watts" value="${a.watts}"></td>
                <td><input type="number" min="0" max="24" step="0.5" data-app="${idx}" data-f="hours" value="${a.hours}"></td>
                <td><input type="number" min="0" step="1" data-app="${idx}" data-f="qty" value="${a.qty}" style="width:42px;"></td>
                <td style="font-family:var(--mono);color:#7dd3fc;">${er.itemized[idx] ? er.itemized[idx].dailyKwh : 0}</td>
                <td><button class="btn" data-del="${idx}" style="padding:2px 6px;font-size:10px;" aria-label="Remove load">×</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p style="font-size:11px;color:#94a3b8;margin-top:6px;">Includes coupled water pumping load: <strong>${er.waterPumpKwh} kWh/day</strong> (from Mission 4).</p>`;
      appCard.querySelector('#add-app').addEventListener('click', () => {
        pushUndo();
        state.electricity.appliances.push({ name: 'New Appliance', watts: 100, hours: 4, qty: 1 });
        syncAll();
      });
      appCard.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
        pushUndo();
        state.electricity.appliances.splice(parseInt(b.dataset.del, 10), 1);
        syncAll();
      }));
      appCard.querySelectorAll('[data-app]').forEach((inp) => inp.addEventListener('change', () => {
        pushUndo();
        const i = parseInt(inp.dataset.app, 10);
        const f = inp.dataset.f;
        state.electricity.appliances[i][f] = f === 'name' ? inp.value.slice(0, 60) : Science.safeNum(inp.value, 0, 0, f === 'hours' ? 24 : 500000);
        syncAll();
      }));
      panelBody.appendChild(appCard);

      const pvCard = document.createElement('div');
      pvCard.className = 'card';
      pvCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">2. Solar PV Sizing &amp; Local Resource</h3>
          <button id="btn-adv-toggle" class="btn" style="padding:3px 8px;font-size:10.5px;">${state.advancedMode ? 'Hide Advanced' : 'Advanced Inputs'}</button>
        </div>
        <div class="field-grid">
          <div class="field">
            <label>Installed Solar (kWp) <span>${e.installedKwp} kWp</span></label>
            <input id="inp-kwp" type="number" min="0" max="5000" step="0.5" value="${e.installedKwp}">
          </div>
          <div class="field">
            <label>Available Roof Area (m²) <span>${er.requiredAreaM2} m² used</span></label>
            <input id="inp-roof" type="number" min="0" max="100000" step="5" value="${e.roofAreaM2}">
          </div>
          <div class="field">
            <label>Peak Sun Hours (kWh/m²/d)</label>
            <input id="inp-psh" type="number" min="0.5" max="10" step="0.1" value="${e.peakSunHours}">
          </div>
          <div class="field">
            <label>Electricity Tariff ($/kWh)</label>
            <input id="inp-tariff" type="number" min="0" max="2" step="0.01" value="${e.tariffPerKwh}">
          </div>
        </div>
        ${state.advancedMode ? `
          <div class="field-grid" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);">
            <div class="field">
              <label>Performance Ratio (PR)</label>
              <input id="inp-pr" type="number" min="0.4" max="0.92" step="0.02" value="${e.performanceRatio}">
            </div>
            <div class="field">
              <label>Grid CO₂ Factor (kg/kWh)</label>
              <input id="inp-co2" type="number" min="0" max="1.2" step="0.02" value="${e.gridEmissionsKgPerKwh}">
            </div>
          </div>` : ''}
        <p style="font-size:11px;color:${er.roofFits ? '#6ee7b7' : '#fda4af'};margin-top:6px;">
          ${er.roofFits ? `✓ Panel area (${er.requiredAreaM2} m² at 20% eff) fits within ${e.roofAreaM2} m² roof.` : `⚠ Needs ${er.requiredAreaM2} m², exceeding ${e.roofAreaM2} m² roof (max ${er.maxRoofKwp} kWp).`}
        </p>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
          <div style="font-size:11px;font-weight:700;color:#7dd3fc;margin-bottom:4px;">Optional: Live NASA POWER Solar Climatology Lookup</div>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <input id="nasa-lat" type="number" step="0.1" value="16.5" placeholder="Lat" style="width:74px;background:rgba(2,6,18,0.8);color:#fff;border:1px solid var(--border);border-radius:6px;padding:4px 6px;font-size:11px;">
            <input id="nasa-lon" type="number" step="0.1" value="80.6" placeholder="Lon" style="width:74px;background:rgba(2,6,18,0.8);color:#fff;border:1px solid var(--border);border-radius:6px;padding:4px 6px;font-size:11px;">
            <button id="btn-nasa" class="btn" style="padding:4px 9px;font-size:11px;">Fetch NASA POWER</button>
          </div>
          <div id="nasa-status" style="font-size:10.5px;color:#94a3b8;margin-top:4px;">Source: ${esc(e.solarSourceLabel || 'Editable demonstration assumption')}</div>
        </div>
        <div class="formula-box" style="margin-top:8px;">
          Daily PV = ${e.installedKwp} kWp × ${e.peakSunHours} PSH × ${e.performanceRatio} PR = <strong>${er.dailySolarKwh} kWh/day</strong><br>
          Est. Monthly Grid Bill: <strong>$${evalRes.storage.monthlyGridCost}</strong> (Saves $${evalRes.storage.monthlySavings}/mo vs. $${evalRes.storage.monthlyBaselineCost})
        </div>`;

      pvCard.querySelector('#btn-adv-toggle').addEventListener('click', () => {
        state.advancedMode = !state.advancedMode;
        syncAll();
      });
      const bindNum = (id, pathKey, min, max) => {
        const elInp = pvCard.querySelector(id);
        if (!elInp) return;
        elInp.addEventListener('change', (ev) => {
          pushUndo();
          state.electricity[pathKey] = Science.safeNum(ev.target.value, state.electricity[pathKey], min, max);
          if (pathKey === 'peakSunHours') state.electricity.solarSourceLabel = `User-edited (${state.electricity.peakSunHours} kWh/m²/day)`;
          syncAll();
        });
      };
      bindNum('#inp-kwp', 'installedKwp', 0, 5000);
      bindNum('#inp-roof', 'roofAreaM2', 0, 100000);
      bindNum('#inp-psh', 'peakSunHours', 0.5, 10);
      bindNum('#inp-pr', 'performanceRatio', 0.4, 0.92);
      bindNum('#inp-tariff', 'tariffPerKwh', 0, 2);
      bindNum('#inp-co2', 'gridEmissionsKgPerKwh', 0, 1.2);

      pvCard.querySelector('#btn-nasa').addEventListener('click', async () => {
        const statusEl = pvCard.querySelector('#nasa-status');
        statusEl.textContent = 'Querying NASA Langley POWER Climatology API...';
        const res = await Science.fetchNasaPowerSolar(pvCard.querySelector('#nasa-lat').value, pvCard.querySelector('#nasa-lon').value);
        if (res.ok) {
          pushUndo();
          state.electricity.peakSunHours = res.annualPeakSunHours;
          state.electricity.solarSourceLabel = `${res.period} (${res.lat}°, ${res.lon}°; range ${res.minMonthPsh}–${res.maxMonthPsh})`;
          showToast(`NASA POWER: ${res.annualPeakSunHours} kWh/m²/day loaded!`);
          syncAll();
        } else {
          statusEl.textContent = res.error;
          showToast('Offline: kept editable solar assumption.');
        }
      });
      panelBody.appendChild(pvCard);

      const ch = document.createElement('div');
      ch.className = 'challenge-box' + (state.missionsCompleted.m2 ? ' solved' : '');
      const ratio = er.dailyDemandKwh > 0 ? Math.round((er.dailySolarKwh / er.dailyDemandKwh) * 100) : 100;
      ch.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong>Mission 2 Challenge: Size the Solar Microgrid</strong>
          <span class="badge ${state.missionsCompleted.m2 ? 'ok' : 'model'}">${state.missionsCompleted.m2 ? 'Solved' : ratio + '% of target'}</span>
        </div>
        <p style="margin:0 0 8px;">Generate ≥ 80% of daily electricity demand (${Math.round(er.dailyDemandKwh * 0.8 * 10)/10} kWh/d) within roof limits.</p>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:11px;color:${state.missionsCompleted.m2 ? '#6ee7b7' : '#fde68a'};">
            ${state.missionsCompleted.m2 ? 'Target achieved! Test nighttime storage next.' : 'Increase Solar kWp or trim appliance hours.'}
          </span>
          <button class="btn primary" id="m2-next">Mission 3 &rarr;</button>
        </div>`;
      ch.querySelector('#m2-next').addEventListener('click', () => navigate('storage'));
      panelBody.appendChild(ch);
    }

    function renderStorage(evalRes, multiDayRes) {
      panelEyebrow.textContent = 'MISSION 3 • BATTERY STORAGE & STORM AUTONOMY';
      panelTitle.textContent = 'Survive the Night';

      const s = state.storage;
      const sr = evalRes.storage;
      const storm = state.stormDays || [1.0, 0.45, 0.35];

      const ctrlCard = document.createElement('div');
      ctrlCard.className = 'card';
      ctrlCard.innerHTML = `
        <h3>Battery Bank &amp; Night Load Parameters</h3>
        <div class="field-grid">
          <div class="field">
            <label>Battery Capacity (kWh)</label>
            <input id="st-cap" type="number" min="0" max="50000" step="1" value="${s.batteryKwh}">
          </div>
          <div class="field">
            <label>Depth of Discharge (0.1–0.95)</label>
            <input id="st-dod" type="number" min="0.1" max="0.95" step="0.05" value="${s.depthOfDischarge}">
          </div>
          <div class="field">
            <label>Night Load Share (0.05–0.90)</label>
            <input id="st-nshare" type="number" min="0.05" max="0.90" step="0.05" value="${s.nightShare}">
          </div>
          <div class="field">
            <label>Charge / Discharge Eff</label>
            <input id="st-eff" type="number" min="0.60" max="0.98" step="0.01" value="${s.chargeEff}">
          </div>
        </div>
        <div class="formula-box" style="margin-top:8px;">
          Usable Capacity = ${s.batteryKwh} × ${s.depthOfDischarge} = <strong>${sr.usableCapacityKwh} kWh</strong><br>
          Daytime Surplus = ${sr.daytimeSurplusKwh} kWh → Stored = ${sr.storedNetKwh} kWh → Deliverable = <strong>${sr.maxDeliverableNightKwh} kWh</strong><br>
          Night Demand = ${sr.nighttimeDemandKwh} kWh • Unserved = <strong>${sr.unservedNightKwh} kWh</strong> • Loss = ${sr.roundTripLossKwh} kWh
        </div>`;
      const bindS = (id, key, min, max, bothEff) => {
        ctrlCard.querySelector(id).addEventListener('change', (ev) => {
          pushUndo();
          const val = Science.safeNum(ev.target.value, state.storage[key], min, max);
          state.storage[key] = val;
          if (bothEff) state.storage.dischargeEff = val;
          syncAll();
        });
      };
      bindS('#st-cap', 'batteryKwh', 0, 50000);
      bindS('#st-dod', 'depthOfDischarge', 0.1, 0.95);
      bindS('#st-nshare', 'nightShare', 0.05, 0.90);
      bindS('#st-eff', 'chargeEff', 0.60, 0.98, true);
      panelBody.appendChild(ctrlCard);

      const chartCard = document.createElement('div');
      chartCard.className = 'card';
      chartCard.innerHTML = `
        <h3>24-Hour Energy Flow (Solar vs. Load vs. Battery SoC)</h3>
        ${Charts.render24hChartSVG(sr.hourlyProfile, sr.usableCapacityKwh)}
        <div style="display:flex;gap:12px;font-size:10.5px;color:#94a3b8;margin-top:4px;">
          <span style="color:#38bdf8;">■ Solar kW</span>
          <span style="color:#f59e0b;">■ Load kW</span>
          <span style="color:#f43f5e;">■ Unmet Night</span>
          <span style="color:#10b981;">— Battery SoC</span>
        </div>`;
      panelBody.appendChild(chartCard);

      const stormCard = document.createElement('div');
      stormCard.className = 'card';
      stormCard.id = 'storm-72h-card';
      stormCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">72-Hour “Survive Three Difficult Days” Storm Test</h3>
          <span class="badge ${multiDayRes.survived ? 'ok' : 'bad'}" id="storm-badge">${multiDayRes.survived ? 'Survived (0h outage)' : multiDayRes.outageHours + 'h Outage'}</span>
        </div>
        <div class="field-grid-3" style="margin-bottom:8px;">
          <div class="field"><label>Day 1 (%)</label><input id="storm-d1" type="number" min="10" max="120" step="5" value="${Math.round(storm[0] * 100)}"></div>
          <div class="field"><label>Day 2 (%)</label><input id="storm-d2" type="number" min="10" max="120" step="5" value="${Math.round(storm[1] * 100)}"></div>
          <div class="field"><label>Day 3 (%)</label><input id="storm-d3" type="number" min="10" max="120" step="5" value="${Math.round(storm[2] * 100)}"></div>
        </div>
        ${Charts.render72hStormChartSVG(multiDayRes, sr.usableCapacityKwh)}
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#cbd5e1;margin-top:6px;">
          <span>Unmet (72h): <strong id="storm-unserved">${multiDayRes.totalUnmetKwh} kWh</strong></span>
          <span>72h Reliability: <strong>${multiDayRes.reliabilityPct}%</strong></span>
        </div>`;
      ['#storm-d1', '#storm-d2', '#storm-d3'].forEach((sel, idx) => {
        stormCard.querySelector(sel).addEventListener('change', (ev) => {
          pushUndo();
          if (!state.stormDays) state.stormDays = [1.0, 0.45, 0.35];
          state.stormDays[idx] = Science.safeNum(ev.target.value, 50, 10, 120) / 100;
          syncAll();
        });
      });
      panelBody.appendChild(stormCard);

      const ch = document.createElement('div');
      ch.className = 'challenge-box' + (state.missionsCompleted.m3 ? ' solved' : '');
      ch.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong>Mission 3 Challenge: Eliminate Night Blackouts</strong>
          <span class="badge ${state.missionsCompleted.m3 ? 'ok' : 'bad'}">${state.missionsCompleted.m3 ? 'Solved' : sr.unservedNightKwh + ' kWh Unserved'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <span style="font-size:11px;color:${state.missionsCompleted.m3 ? '#6ee7b7' : '#fde68a'};">
            ${state.missionsCompleted.m3 ? `Success! ${sr.backupHours}h backup covers night loads.` : 'Increase battery kWh (and solar kWp if surplus is low).'}
          </span>
          <button class="btn primary" id="m3-next">Mission 4 &rarr;</button>
        </div>`;
      ch.querySelector('#m3-next').addEventListener('click', () => navigate('water'));
      panelBody.appendChild(ch);
    }

    function renderWater(evalRes) {
      panelEyebrow.textContent = 'MISSION 4 • WATER–ENERGY NEXUS';
      panelTitle.textContent = 'Every Drop Matters';

      const w = state.water;
      const wr = evalRes.water;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>Water Supply, Leakage &amp; Hydraulic Pumping</h3>
        <div class="field-grid">
          <div class="field"><label>People Served</label><input id="w-ppl" type="number" min="0" max="500000" step="1" value="${w.people}"></div>
          <div class="field"><label>Use per Person (L/d)</label><input id="w-lpp" type="number" min="0" max="1000" step="5" value="${w.litersPerPerson}"></div>
          <div class="field"><label>Raw Supply (L/d)</label><input id="w-sup" type="number" min="0" max="10000000" step="100" value="${w.rawSupplyL}"></div>
          <div class="field"><label>Pipe Leakage (%)</label><input id="w-leak" type="number" min="0" max="90" step="1" value="${w.leakagePct}"></div>
          <div class="field"><label>Pumping Head (m)</label><input id="w-head" type="number" min="0" max="500" step="2" value="${w.headMeters}"></div>
          <div class="field"><label>Pump Eff (0.1–0.95)</label><input id="w-eff" type="number" min="0.1" max="0.95" step="0.05" value="${w.pumpEfficiency}"></div>
        </div>
        <div class="formula-box" style="margin-top:8px;">
          Demand = ${w.people} × ${w.litersPerPerson} L = <strong>${wr.dailyDemandL} L/d</strong><br>
          Effective Supply = ${w.rawSupplyL} × (1 − ${w.leakagePct}%) = <strong>${wr.effectiveSupplyL} L/d</strong> (${wr.leakageLossL} L lost)<br>
          Hydraulic Energy = (1000 × 9.80665 × ${(wr.pumpedVolumeL/1000).toFixed(2)} m³ × ${w.headMeters} m) / ${w.pumpEfficiency} = <strong>${wr.pumpingKwhPerDay} kWh/day</strong>
        </div>
        <p style="font-size:11px;color:#94a3b8;margin-top:6px;"><em>Coupled note:</em> Pumping electricity (${wr.pumpingKwhPerDay} kWh/d) feeds automatically into Mission 2 demand. Reservoir visuals reflect volume only—never potability.</p>`;
      const bindW = (id, key, min, max) => {
        card.querySelector(id).addEventListener('change', (ev) => {
          pushUndo();
          state.water[key] = Science.safeNum(ev.target.value, state.water[key], min, max);
          syncAll();
        });
      };
      bindW('#w-ppl', 'people', 0, 500000);
      bindW('#w-lpp', 'litersPerPerson', 0, 1000);
      bindW('#w-sup', 'rawSupplyL', 0, 10000000);
      bindW('#w-leak', 'leakagePct', 0, 90);
      bindW('#w-head', 'headMeters', 0, 500);
      bindW('#w-eff', 'pumpEfficiency', 0.1, 0.95);
      panelBody.appendChild(card);

      const ch = document.createElement('div');
      ch.className = 'challenge-box' + (state.missionsCompleted.m4 ? ' solved' : '');
      ch.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <strong>Mission 4 Challenge: Fix Leaks &amp; Secure Water</strong>
          <span class="badge ${state.missionsCompleted.m4 ? 'ok' : 'bad'}">${state.missionsCompleted.m4 ? 'Solved' : wr.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <span style="font-size:11px;color:${state.missionsCompleted.m4 ? '#6ee7b7' : '#fde68a'};">
            ${state.missionsCompleted.m4 ? 'Water security verified!' : 'Reduce leakage ≤ 15% and eliminate water shortfall.'}
          </span>
          <button class="btn primary" id="m4-next">Mission 5 &rarr;</button>
        </div>`;
      ch.querySelector('#m4-next').addEventListener('click', () => navigate('future'));
      panelBody.appendChild(ch);
    }

    function renderFuture(bundle) {
      const { evalRes } = bundle;
      panelEyebrow.textContent = 'MISSION 5 • ECONOMICS, STRESS-TEST & REPORT';
      panelTitle.textContent = 'Test the Future';

      const st = state.stressScenario;
      const econ = evalRes.economics;
      const ecIn = state.economics || { solarCostPerKwp: 1000, batteryCostPerKwh: 300, budgetCap: 100000 };
      const stressedState = StateApi.buildStressedState(state);
      const cmp = Science.compareScenarios(state, stressedState);
      state.missionsCompleted.m5 = true;
      updateNavBadges();

      const capexCard = document.createElement('div');
      capexCard.className = 'card';
      capexCard.id = 'capex-card';
      capexCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <h3 style="margin:0;">Affordability &amp; Equipment CapEx Estimate</h3>
          <span class="badge ${econ.withinBudget ? 'ok' : 'bad'}" id="capex-badge">${econ.withinBudget ? 'Within Budget' : '+$' + econ.budgetDelta.toLocaleString() + ' Over'}</span>
        </div>
        <div class="field-grid-3">
          <div class="field"><label>Solar ($/kWp)</label><input id="ec-sol" type="number" min="100" max="10000" step="50" value="${ecIn.solarCostPerKwp}"></div>
          <div class="field"><label>Battery ($/kWh)</label><input id="ec-bat" type="number" min="50" max="5000" step="20" value="${ecIn.batteryCostPerKwh}"></div>
          <div class="field"><label>Budget Cap ($)</label><input id="ec-cap" type="number" min="500" max="5000000" step="500" value="${ecIn.budgetCap}"></div>
        </div>
        <div class="formula-box" style="margin-top:8px;">
          Est. Equipment CapEx = $${econ.solarCapex.toLocaleString()} (PV) + $${econ.batteryCapex.toLocaleString()} (Battery) = <strong id="capex-total">$${econ.totalCapex.toLocaleString()}</strong><br>
          Est. Annual Grid Savings = $${econ.annualSavings.toLocaleString()}/yr &bull; Simple Payback: <strong id="capex-payback">${econ.simplePaybackYears !== null ? econ.simplePaybackYears + ' yrs' : 'N/A'}</strong>
        </div>
        <p style="font-size:10.5px;color:#94a3b8;margin-top:4px;"><em>Editable equipment-only benchmark. Excludes installation labor, inverters, wiring, permitting, and O&amp;M.</em></p>`;
      const bindEc = (id, key, min, max) => {
        capexCard.querySelector(id).addEventListener('change', (ev) => {
          pushUndo();
          if (!state.economics) state.economics = { solarCostPerKwp: 1000, batteryCostPerKwh: 300, budgetCap: 100000 };
          state.economics[key] = Science.safeNum(ev.target.value, state.economics[key], min, max);
          syncAll();
        });
      };
      bindEc('#ec-sol', 'solarCostPerKwp', 100, 10000);
      bindEc('#ec-bat', 'batteryCostPerKwh', 50, 5000);
      bindEc('#ec-cap', 'budgetCap', 500, 5000000);
      panelBody.appendChild(capexCard);

      const ctrl = document.createElement('div');
      ctrl.className = 'card';
      ctrl.innerHTML = `
        <h3>Stress-Test Your Plan Against Real-World Shocks</h3>
        <div class="field-grid">
          <div class="field"><label>Solar Weather (${Math.round(st.solarMultiplier * 100)}%)</label><input id="st-sol" type="range" min="0.4" max="1.3" step="0.05" value="${st.solarMultiplier}"></div>
          <div class="field"><label>Demand Growth (${Math.round(st.demandMultiplier * 100)}%)</label><input id="st-dem" type="range" min="0.7" max="1.6" step="0.05" value="${st.demandMultiplier}"></div>
          <div class="field"><label>Electricity Tariff (${Math.round(st.tariffMultiplier * 100)}%)</label><input id="st-tar" type="range" min="0.7" max="2.0" step="0.05" value="${st.tariffMultiplier}"></div>
          <div class="field"><label>Water Supply (${Math.round(st.waterSupplyMultiplier * 100)}%)</label><input id="st-wat" type="range" min="0.5" max="1.3" step="0.05" value="${st.waterSupplyMultiplier}"></div>
          <div class="field"><label>Battery Upgrade (${Math.round(st.batteryMultiplier * 100)}%)</label><input id="st-bat" type="range" min="0.5" max="2.0" step="0.1" value="${st.batteryMultiplier}"></div>
          <div class="field"><label>Night Load Shift (${st.nightShareDelta >= 0 ? '+' : ''}${Math.round(st.nightShareDelta * 100)}%)</label><input id="st-ns" type="range" min="-0.15" max="0.25" step="0.02" value="${st.nightShareDelta}"></div>
        </div>`;
      const bindSt = (id, key) => {
        ctrl.querySelector(id).addEventListener('input', (ev) => {
          state.stressScenario[key] = parseFloat(ev.target.value);
          syncAll();
        });
      };
      bindSt('#st-sol', 'solarMultiplier');
      bindSt('#st-dem', 'demandMultiplier');
      bindSt('#st-tar', 'tariffMultiplier');
      bindSt('#st-wat', 'waterSupplyMultiplier');
      bindSt('#st-bat', 'batteryMultiplier');
      bindSt('#st-ns', 'nightShareDelta');
      panelBody.appendChild(ctrl);

      const cmpCard = document.createElement('div');
      cmpCard.className = 'card';
      const fmtD = (v, u) => `<span style="color:${v > 0.05 ? '#fbbf24' : (v < -0.05 ? '#34d399' : '#94a3b8')}">${v >= 0 ? '+' : ''}${v}${u}</span>`;
      cmpCard.innerHTML = `
        <h3>Side-by-Side Comparison (Baseline vs. Stress-Test)</h3>
        <div style="margin-bottom:8px;">
          ${Charts.renderComparisonBarSVG(cmp)}
          <div style="display:flex;gap:12px;font-size:10.5px;color:#94a3b8;margin-top:3px;">
            <span style="color:#38bdf8;">■ Baseline Plan</span>
            <span style="color:#f59e0b;">■ Stress-Test</span>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>Metric</th><th>Baseline</th><th>Modified</th><th>Change</th></tr></thead>
          <tbody>
            <tr><td>Daily Demand</td><td>${cmp.base.electricity.dailyDemandKwh} kWh</td><td>${cmp.mod.electricity.dailyDemandKwh} kWh</td><td>${fmtD(cmp.deltas.dailyDemandKwh, ' kWh')}</td></tr>
            <tr><td>Solar Generation</td><td>${cmp.base.electricity.dailySolarKwh} kWh</td><td>${cmp.mod.electricity.dailySolarKwh} kWh</td><td>${fmtD(cmp.deltas.dailySolarKwh, ' kWh')}</td></tr>
            <tr><td>Unserved Night</td><td>${cmp.base.storage.unservedNightKwh} kWh</td><td>${cmp.mod.storage.unservedNightKwh} kWh</td><td>${fmtD(cmp.deltas.unservedNightKwh, ' kWh')}</td></tr>
            <tr><td>Backup Duration</td><td>${cmp.base.storage.backupHours} hrs</td><td>${cmp.mod.storage.backupHours} hrs</td><td>${fmtD(cmp.deltas.backupHours, ' h')}</td></tr>
            <tr><td>Monthly Grid Cost</td><td>$${cmp.base.storage.monthlyGridCost}</td><td>$${cmp.mod.storage.monthlyGridCost}</td><td>${fmtD(cmp.deltas.monthlyGridCost, '$')}</td></tr>
            <tr><td>Water Shortfall</td><td>${cmp.base.water.shortfallL} L/d</td><td>${cmp.mod.water.shortfallL} L/d</td><td>${fmtD(cmp.deltas.waterShortfallL, ' L')}</td></tr>
          </tbody>
        </table>
        <div style="margin-top:8px;font-size:11.5px;color:#e2e8f0;">
          <strong>Why the results changed:</strong>
          <ul style="margin:4px 0 0;padding-left:16px;">${cmp.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        </div>`;
      panelBody.appendChild(cmpCard);

      const fin = document.createElement('div');
      fin.className = 'challenge-box solved';
      fin.innerHTML = `
        <h3 style="margin:0 0 6px;color:#fff;">“The future wasn’t something you discovered. It was something you designed.”</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
          <button id="fin-report" class="btn primary">Export Preliminary Report (PDF)</button>
          <button id="fin-intel" class="btn">View 4-Way Matrix &amp; Sensitivity</button>
          <button id="fin-hub" class="btn">Workspace Hub</button>
        </div>`;
      fin.querySelector('#fin-report').addEventListener('click', openReportModal);
      fin.querySelector('#fin-intel').addEventListener('click', () => navigate('intelligence'));
      fin.querySelector('#fin-hub').addEventListener('click', () => navigate('hub'));
      panelBody.appendChild(fin);
    }

    // =========================================================================
    // PRINTABLE REPORT MODAL & JSON EXPORT / IMPORT
    // =========================================================================
    function openReportModal() {
      const b = evaluateAll();
      const cmp = Science.compareScenarios(state, StateApi.buildStressedState(state));
      const html = ReportApi.buildReportHTML(state, b.evalRes, cmp, b.multiDayRes, b.fourWayRes, b.sensRes, b.intelRes);
      document.getElementById('report-preview').innerHTML = html;
      document.getElementById('print-report').innerHTML = html;
      reportOverlay.classList.remove('hidden');
    }

    document.getElementById('btn-export-top').addEventListener('click', openReportModal);
    document.getElementById('btn-close-report').addEventListener('click', () => reportOverlay.classList.add('hidden'));
    document.getElementById('btn-print-pdf').addEventListener('click', () => window.print());
    document.getElementById('btn-dl-json').addEventListener('click', () => {
      const b = evaluateAll();
      const blob = new Blob([JSON.stringify({
        state,
        results: b.evalRes,
        storm72h: b.multiDayRes,
        fourWayComparison: b.fourWayRes,
        sensitivity: b.sensRes,
        intelligence: b.intelRes
      }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `aetheria-project-${state.id}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded structured project JSON.');
    });

    if (importInput) {
      importInput.addEventListener('change', (ev) => {
        const file = ev.target.files && ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const res = StateApi.validateAndImportProject(String(reader.result || ''));
          if (res.ok) {
            workspace.projects.push(res.project);
            workspace.activeProjectId = res.project.projectId;
            state = res.project;
            showToast(`Imported "${res.project.projectName}"`);
            syncAll();
          } else {
            showToast(res.error);
          }
          importInput.value = '';
        };
        reader.readAsText(file);
      });
    }

    // =========================================================================
    // 3D CANVAS CLICK PICKING + LANDMARK PILLS + 24H CYCLE SCRUBBER
    // =========================================================================
    if (canvas) {
      let downX = 0, downY = 0;
      canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
      canvas.addEventListener('click', (e) => {
        if (!webglAvailable || state.lowGraphics || !scene3D || !camera) return;
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return; // Ignore orbit drags
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
        const hit = scene3D.pickLandmark(ndcX, ndcY, camera);
        if (hit) inspectLandmark(hit.id);
      });
    }
    document.querySelectorAll('.lm-pill').forEach((p) => {
      p.addEventListener('click', () => inspectLandmark(p.dataset.lm));
    });
    document.getElementById('twin-close').addEventListener('click', () => {
      twinInspector.classList.add('hidden');
      activeInspectorLandmark = null;
      document.querySelectorAll('.lm-pill').forEach((p) => p.classList.remove('active'));
    });
    twinGoto.addEventListener('click', () => {
      if (twinGoto.dataset.view) navigate(twinGoto.dataset.view);
    });

    if (cycleSlider) {
      cycleSlider.addEventListener('input', (ev) => {
        const hr = parseFloat(ev.target.value);
        if (scene3D) {
          scene3D.autoCycle = false;
          scene3D.setCycleHour(hr);
          if (lastBundle) scene3D.syncFromEvaluation(lastBundle.evalRes, getSelectedElement());
        }
        if (btnCyclePlay) { btnCyclePlay.textContent = 'Play 24h'; btnCyclePlay.classList.remove('active'); }
        if (cycleTimeEl) cycleTimeEl.textContent = formatHourLabel(hr);
      });
    }
    if (btnCyclePlay) {
      btnCyclePlay.addEventListener('click', () => {
        if (!scene3D) return;
        scene3D.autoCycle = !scene3D.autoCycle;
        btnCyclePlay.textContent = scene3D.autoCycle ? 'Pause 24h' : 'Play 24h';
        btnCyclePlay.classList.toggle('active', scene3D.autoCycle);
      });
    }

    // =========================================================================
    // 2-MINUTE LIVE JUDGE DEMONSTRATION
    // =========================================================================
    function startJudgeDemo() {
      welcomeOverlay.classList.add('hidden');
      prologueOverlay.classList.add('hidden');
      const tierKeep = state.qualityTier;
      const demoProj = StateApi.createInitialState('school', 'Judge Demo — My School');
      demoProj.projectId = state.projectId;
      demoProj.mode = 'story';
      demoProj.qualityTier = tierKeep;
      demoProj.lowGraphics = tierKeep === '2d';
      replaceActiveProject(demoProj);
      demoStepIdx = 0;
      applyDemoStep();
    }

    function applyDemoStep() {
      if (demoStepIdx < 0 || demoStepIdx >= DEMO_STEPS.length) {
        demoBanner.classList.remove('visible');
        demoStepIdx = -1;
        return;
      }
      const step = DEMO_STEPS[demoStepIdx];
      document.getElementById('demo-step-lbl').textContent = step.label;
      document.getElementById('demo-title').textContent = step.title;
      document.getElementById('demo-text').textContent = step.text;
      document.getElementById('demo-next').textContent = demoStepIdx === DEMO_STEPS.length - 1 ? 'Open Report' : 'Next Step →';
      demoBanner.classList.add('visible');
      navigate(step.view);
    }

    document.getElementById('btn-demo').addEventListener('click', startJudgeDemo);
    document.getElementById('btn-start-demo').addEventListener('click', startJudgeDemo);
    document.getElementById('demo-next').addEventListener('click', () => {
      if (demoStepIdx === DEMO_STEPS.length - 1) {
        demoBanner.classList.remove('visible');
        demoStepIdx = -1;
        openReportModal();
      } else {
        demoStepIdx++;
        applyDemoStep();
      }
    });
    document.getElementById('demo-close').addEventListener('click', () => {
      demoBanner.classList.remove('visible');
      demoStepIdx = -1;
    });

    // =========================================================================
    // WELCOME, PROLOGUE & TOP BAR NAVIGATION WIRING
    // =========================================================================
    document.getElementById('btn-start-story').addEventListener('click', () => {
      state.mode = 'story';
      welcomeOverlay.classList.add('hidden');
      prologueOverlay.classList.remove('hidden');
      syncAll();
    });
    document.getElementById('btn-start-planner').addEventListener('click', () => {
      state.mode = 'planner';
      welcomeOverlay.classList.add('hidden');
      navigate('hub');
    });
    document.getElementById('btn-begin-m1').addEventListener('click', () => {
      prologueOverlay.classList.add('hidden');
      navigate('materials');
    });
    document.getElementById('btn-skip-prologue').addEventListener('click', () => {
      prologueOverlay.classList.add('hidden');
      navigate('hub');
    });

    document.querySelectorAll('.step-btn').forEach((btn) => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });

    btnUndo.addEventListener('click', performUndo);

    btnModeToggle.addEventListener('click', () => {
      state.mode = state.mode === 'story' ? 'planner' : 'story';
      showToast(state.mode === 'story' ? 'Switched to Story Mode (2045)' : 'Switched to Practical Workspace');
      syncAll();
    });

    btn2D.addEventListener('click', () => {
      if (!webglAvailable) { showToast('WebGL2 unavailable; 2D accessible mode is active.'); return; }
      const next = state.qualityTier === 'high' ? 'balanced' : state.qualityTier === 'balanced' ? '2d' : 'high';
      const labels = { high: '3D High Quality', balanced: '3D Balanced Performance', '2d': '2D Accessible Mode' };
      applyQualityTier(next, `Switched to ${labels[next]}`);
    });

    btnAudio.addEventListener('click', () => {
      if (!audio) { showToast('Audio available in WebGL2 mode.'); return; }
      audio.toggle();
      btnAudio.textContent = audio.isPlaying ? 'Audio On' : 'Muted';
      btnAudio.classList.toggle('active', audio.isPlaying);
    });

    window.addEventListener('resize', () => {
      if (engine && post) { engine.resize(); post.resize(engine.width, engine.height); }
    });

    // Clean test hook for automated E2E verification
    global.__AETHERIA_APP__ = {
      getState: () => state,
      getWorkspace: () => workspace,
      evaluate: () => Science.evaluateSystem(state),
      simulateStorm: () => Science.simulateMultiDay(state, state.stormDays || [1.0, 0.45, 0.35]),
      navigate,
      inspectLandmark,
      undo: performUndo,
      openReportModal,
      startJudgeDemo,
      set2DMode,
      setCycleHour: (h) => {
        if (scene3D) { scene3D.setCycleHour(h); if (lastBundle) scene3D.syncFromEvaluation(lastBundle.evalRes, getSelectedElement()); }
        if (cycleSlider) cycleSlider.value = h;
        if (cycleTimeEl) cycleTimeEl.textContent = formatHourLabel(h);
      },
      isWebGLActive: () => webglAvailable && !state.lowGraphics
    };

    syncAll();
    if (scene3D && camera) scene3D.focusView('hub', camera);

    let lastT = performance.now(), simT = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastT) * 0.001));
      lastT = now;
      simT += dt;
      if (webglAvailable && !state.lowGraphics && engine && post && scene3D && camera) {
        camera.update(dt, engine.width / Math.max(1, engine.height));
        post.beginScene();
        scene3D.render(simT, dt, camera, engine);
        post.endAndComposite();
        if (scene3D.autoCycle && cycleSlider && cycleTimeEl) {
          cycleSlider.value = scene3D.cycleHour.toFixed(2);
          cycleTimeEl.textContent = formatHourLabel(scene3D.cycleHour);
          if (lastBundle) scene3D.syncFromEvaluation(lastBundle.evalRes, getSelectedElement());
        }
      }
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootApp);
  else bootApp();
})(typeof window !== 'undefined' ? window : globalThis);
