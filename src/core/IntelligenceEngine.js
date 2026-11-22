/* ============================================================================
 * AETHERIA — Planetary Systems Intelligence Platform
 * src/core/IntelligenceEngine.js
 * Deterministic Systems Reasoning Engine + Scientific Discovery Challenges
 * + Optional Provider-Independent AI Adapter (Disabled by Default, Zero Fake AI)
 * ============================================================================ */
(function (global) {
  'use strict';

  function round2(n) { return Math.round(n * 100) / 100; }

  /**
   * Deterministic Reasoning Engine over verified ScienceModel outputs.
   * Identifies root causes, validates unrealistic inputs, quantifies tradeoffs,
   * and generates tailored engineering investigation questions.
   */
  function analyzeSystem(state, evalRes, multiDayRes, fourWayRes) {
    const { electricity, storage, water, economics } = evalRes;
    const diagnostics = [];
    const warnings = [];
    const tradeoffs = [];
    const investigationQuestions = [];

    // 1. Input Validation & Physical Constraint Warnings
    if (!electricity.roofFits) {
      warnings.push({
        level: 'critical',
        title: 'Roof Area Constraint Exceeded',
        detail: `${electricity.inputs.installedKwp} kWp requires ${electricity.requiredAreaM2} m² (at ${Math.round(electricity.inputs.panelEfficiency * 100)}% module efficiency), exceeding available ${electricity.inputs.roofAreaM2} m². Maximum fitting capacity is ${electricity.maxRoofKwp} kWp.`
      });
    }
    if (electricity.inputs.performanceRatio > 0.86) {
      warnings.push({
        level: 'warn',
        title: 'Optimistic PV Performance Ratio',
        detail: `PR of ${electricity.inputs.performanceRatio} is above typical real-world installed averages (0.75–0.84) once inverter, wiring, thermal, and soiling losses are included.`
      });
    }
    if (water.inputs.leakagePct >= 25) {
      warnings.push({
        level: 'warn',
        title: 'Severe Distribution Pipe Leakage',
        detail: `${water.inputs.leakagePct}% leakage wastes ${water.leakageLossL} L/day before reaching residents and forces unnecessary hydraulic pumping energy (${water.pumpingKwhPerDay} kWh/day).`
      });
    }
    if (storage.usableCapacityKwh > electricity.dailyDemandKwh * 3.5 && electricity.dailySolarKwh < electricity.dailyDemandKwh * 0.9) {
      warnings.push({
        level: 'warn',
        title: 'Oversized Battery Relative to Solar Generation',
        detail: `Usable storage (${storage.usableCapacityKwh} kWh) is much larger than daily solar surplus (${storage.daytimeSurplusKwh} kWh). The battery cannot recharge fully on solar alone.`
      });
    }
    if (evalRes.waterPumpAtRisk) {
      warnings.push({
        level: 'critical',
        title: 'Water Pumping Continuity At Risk',
        detail: `Unserved electricity (${storage.totalGridOrUnservedKwh} kWh/day) threatens reliable operation of the ${water.pumpingKwhPerDay} kWh/day water pump.`
      });
    }
    if (!economics.withinBudget) {
      warnings.push({
        level: 'warn',
        title: 'Equipment CapEx Exceeds Budget Cap',
        detail: `Estimated equipment CapEx ($${economics.totalCapex.toLocaleString()}) exceeds the $${economics.inputs.budgetCap.toLocaleString()} budget cap by $${economics.budgetDelta.toLocaleString()}.`
      });
    }

    // 2. Root-Cause Diagnostics (Exact Quantitative Explanations)
    if (storage.unservedNightKwh > 0.5) {
      const solarBottleneck = storage.daytimeSurplusKwh * storage.inputs.chargeEff * storage.inputs.dischargeEff < storage.nighttimeDemandKwh;
      const batteryBottleneck = storage.usableCapacityKwh * storage.inputs.dischargeEff < storage.nighttimeDemandKwh;
      let cause = '';
      if (solarBottleneck && batteryBottleneck) {
        cause = `Both daytime solar surplus (${storage.daytimeSurplusKwh} kWh) AND usable battery capacity (${storage.usableCapacityKwh} kWh) are below the ${storage.nighttimeDemandKwh} kWh nighttime load.`;
      } else if (solarBottleneck) {
        cause = `Daytime solar surplus (${storage.daytimeSurplusKwh} kWh) is too small to refill the battery for ${storage.nighttimeDemandKwh} kWh of nighttime load. Increasing PV kWp or reducing daytime waste is required.`;
      } else {
        cause = `Daytime solar surplus (${storage.daytimeSurplusKwh} kWh) is sufficient, but usable battery capacity (${storage.usableCapacityKwh} kWh at ${Math.round(storage.inputs.depthOfDischarge * 100)}% DoD) caps nighttime delivery.`;
      }
      diagnostics.push({
        level: 'critical',
        system: 'Nighttime Storage',
        summary: `Night shortfall of ${storage.unservedNightKwh} kWh (${storage.backupHours} hrs backup)`,
        explanation: cause
      });
    } else {
      diagnostics.push({
        level: 'ok',
        system: 'Nighttime Storage',
        summary: `Clear-night demand fully covered (${storage.backupHours} hrs backup)`,
        explanation: `Stored daytime solar (${storage.storedNetKwh} kWh) covers all ${storage.nighttimeDemandKwh} kWh of nighttime load with ${storage.roundTripLossKwh} kWh in round-trip losses.`
      });
    }

    if (multiDayRes && !multiDayRes.survived) {
      diagnostics.push({
        level: 'warn',
        system: '72-Hour Storm Resilience',
        summary: `${multiDayRes.outageHours} outage hours across 3-day storm (${multiDayRes.reliabilityPct}% reliability)`,
        explanation: `Under [${multiDayRes.daySolarMultipliers.map((m) => Math.round(m * 100) + '%').join(' / ')}] solar days, ${multiDayRes.totalUnmetKwh} kWh goes unmet. Achieving full 3-day autonomy requires either load shedding of non-essential appliances or higher battery/PV CapEx.`
      });
    } else if (multiDayRes) {
      diagnostics.push({
        level: 'ok',
        system: '72-Hour Storm Resilience',
        summary: `Survived 3-day storm sequence with 0 outage hours`,
        explanation: `Battery reserves carried the community through overcast Days 2 and 3 without interrupting essential electricity.`
      });
    }

    if (water.shortfallL > 1) {
      diagnostics.push({
        level: 'critical',
        system: 'Water–Energy Nexus',
        summary: `Water deficit of ${water.shortfallL} L/day (${water.inputs.leakagePct}% pipe leakage)`,
        explanation: `Cutting leakage to 10% would recover ${Math.max(0, Math.round(water.inputs.rawSupplyL * (water.inputs.leakagePct - 10) / 100))} L/day of clean supply without drilling new sources.`
      });
    } else {
      diagnostics.push({
        level: 'ok',
        system: 'Water–Energy Nexus',
        summary: `Water supply balanced (+${water.surplusL} L/day surplus)`,
        explanation: `Hydraulic pumping (${water.pumpingKwhPerDay} kWh/day for ${water.inputs.headMeters} m lift) is coupled directly into daily electricity demand.`
      });
    }

    // 3. Quantified Tradeoffs from 4-Way Scenario Comparison
    if (fourWayRes && fourWayRes.scenarios && fourWayRes.scenarios.length === 4) {
      const [sA, sB, sC, sD] = fourWayRes.scenarios;
      const effSaveMo = round2(sC.eval.storage.monthlyGridCost - sD.eval.storage.monthlyGridCost);
      const effUnmetDrop = round2(sC.eval.storage.unservedNightKwh - sD.eval.storage.unservedNightKwh);
      tradeoffs.push(
        `Adding battery storage (Scenario C vs. Solar-Only Scenario B) cuts unserved nighttime load from ${sB.eval.storage.unservedNightKwh} kWh to ${sC.eval.storage.unservedNightKwh} kWh, at +$${(sC.eval.economics.totalCapex - sB.eval.economics.totalCapex).toLocaleString()} equipment CapEx.`
      );
      tradeoffs.push(
        `Demand-side efficiency (-20% appliance hours in Scenario D) saves an extra $${Math.max(0, effSaveMo)}/mo and lowers unserved night demand by ${Math.max(0, effUnmetDrop)} kWh without buying extra hardware.`
      );
      tradeoffs.push(
        `Compared to Grid-Only (Scenario A: $${sA.eval.storage.monthlyGridCost}/mo), your current plan cuts monthly grid expense to $${sC.eval.storage.monthlyGridCost}/mo (est. simple payback: ${sC.eval.economics.simplePaybackYears !== null ? sC.eval.economics.simplePaybackYears + ' yrs' : 'N/A'}).`
      );
    }

    // 4. Tailored Next-Step Questions for Real-World Planning
    investigationQuestions.push(`Does the physical roof structure support ${electricity.inputs.installedKwp} kWp (~${Math.round(electricity.inputs.installedKwp * 65)} kg of panels + racking) with minimal shading?`);
    investigationQuestions.push(`What is the peak simultaneous surge load (e.g., water pump startup + induction/refrigerator) for inverter kW sizing?`);
    investigationQuestions.push(`Have local seasonal low-sun months (monsoon/winter) been checked via NASA POWER or local meteorological records?`);
    investigationQuestions.push(`Has the community's water source undergone microbiological and chemical potability testing beyond volume balance?`);

    return {
      engineLabel: 'Aetheria Deterministic Intelligence (Local Physics & Constraint Solver)',
      externalAiActive: AIAdapter.isConfigured(),
      diagnostics,
      warnings,
      tradeoffs,
      investigationQuestions
    };
  }

  /**
   * Scientific Discovery Challenges (Predict -> Experiment -> Verify)
   * Every challenge evaluates real ScienceModel equations and allows multiple valid solutions.
   */
  function evaluateChallenges(state, evalRes, multiDayRes) {
    const Science = global.AetheriaScience;
    // Challenge 1: Blackout Challenge (55% cloudy solar day — maintain >= 70% electricity coverage)
    const cloudyState = JSON.parse(JSON.stringify(state));
    cloudyState.electricity.peakSunHours = Math.max(0.5, state.electricity.peakSunHours * 0.55);
    const cloudyEval = Science.evaluateSystem(cloudyState);
    const cloudyCovPct = Math.round(cloudyEval.storage.solarFraction * 100);

    // Challenge 2: Storage Challenge (Eliminate clear-night unserved load <= 0.5 kWh)
    const storageSolved = evalRes.storage.unservedNightKwh <= 0.5 && evalRes.storage.usableCapacityKwh > 0;

    // Challenge 3: Water-Energy Challenge (0 L shortfall AND leakage <= 15%)
    const waterSolved = evalRes.water.shortfallL <= 1.0 && evalRes.water.inputs.leakagePct <= 15;

    // Challenge 4: Efficiency vs. Investment Challenge (Within CapEx budget AND >= 75% solar coverage)
    const effSolved = evalRes.economics.withinBudget && evalRes.storage.solarFraction >= 0.75 && evalRes.electricity.roofFits;

    // Challenge 5: 72-Hour Storm Resilience Challenge (0 outage hours across 3-day storm)
    const stormSolved = !!(multiDayRes && multiDayRes.survived);

    return [
      {
        id: 'blackout',
        title: '1. The Blackout Challenge (55% Cloudy Day)',
        hypothesis: 'If sunlight drops to 55% during a cloudy spell, can your microgrid still serve at least 70% of daily demand?',
        criterion: 'Solar + Storage coverage ≥ 70% under 0.55× Peak Sun Hours.',
        currentMetric: `${cloudyCovPct}% served under 55% sun`,
        solved: cloudyCovPct >= 70,
        actionView: 'power',
        hint: 'Either increase PV kWp (within roof limits), boost battery storage, or trim non-essential appliance hours.'
      },
      {
        id: 'storage',
        title: '2. The Night Storage Challenge',
        hypothesis: 'Can stored daytime surplus power evening loads all night without grid fallback?',
        criterion: 'Unserved nighttime demand ≤ 0.5 kWh/night.',
        currentMetric: `${evalRes.storage.unservedNightKwh} kWh unserved (${evalRes.storage.backupHours}h backup)`,
        solved: storageSolved,
        actionView: 'storage',
        hint: 'Select high-DoD chemistry (LFP or Sodium-Ion in Mission 1) and size battery kWh to match night load.'
      },
      {
        id: 'water',
        title: '3. The Water–Energy Nexus Challenge',
        hypothesis: 'How much pumping electricity and water supply do you recover by cutting pipe leakage?',
        criterion: 'Water shortfall ≤ 1 L/day AND pipe leakage ≤ 15%.',
        currentMetric: `${evalRes.water.shortfallL} L shortfall • ${evalRes.water.inputs.leakagePct}% leak • ${evalRes.water.pumpingKwhPerDay} kWh/d pump`,
        solved: waterSolved,
        actionView: 'water',
        hint: 'Reduce pipe leakage in Mission 4 or improve pump efficiency to save both water and electricity.'
      },
      {
        id: 'efficiency',
        title: '4. The Efficiency vs. Investment Challenge',
        hypothesis: 'Can you achieve ≥ 75% solar coverage while staying inside your equipment CapEx budget and roof limit?',
        criterion: 'Total CapEx ≤ Budget Cap, Roof Fits, and Solar Coverage ≥ 75%.',
        currentMetric: `$${evalRes.economics.totalCapex.toLocaleString()} / $${evalRes.economics.inputs.budgetCap.toLocaleString()} • ${Math.round(evalRes.storage.solarFraction * 100)}% solar`,
        solved: effSolved,
        actionView: 'future',
        hint: 'Trims to wasted appliance hours in Mission 2 often beat buying oversized batteries.'
      },
      {
        id: 'resilience',
        title: '5. The 72-Hour Storm Resilience Challenge',
        hypothesis: 'Can your community survive 3 consecutive days of declining sunlight [100%, 45%, 35%] with zero outages?',
        criterion: '0 outage hours across the 72-hour continuous simulation.',
        currentMetric: multiDayRes ? `${multiDayRes.outageHours} outage hrs (${multiDayRes.reliabilityPct}% reliability)` : 'N/A',
        solved: stormSolved,
        actionView: 'storage',
        hint: 'Increase battery reserve and solar margin—or reduce non-essential loads—and watch the 72h chart in Mission 3.'
      }
    ];
  }

  /**
   * Optional Provider-Independent AI Adapter Interface
   * - Disabled by default; never stores credentials in source or localStorage.
   * - Never fakes AI responses or claims an AI model is active when unconfigured.
   */
  const AIAdapter = {
    _endpoint: null,
    _apiKey: null,
    _model: null,
    isConfigured() { return Boolean(this._endpoint && this._apiKey); },
    configure(endpoint, apiKey, model) {
      this._endpoint = endpoint ? String(endpoint).trim() : null;
      this._apiKey = apiKey ? String(apiKey).trim() : null;
      this._model = model ? String(model).trim() : 'custom-provider';
    },
    clear() { this._endpoint = null; this._apiKey = null; this._model = null; },
    getStatusText() {
      return this.isConfigured()
        ? `User-configured external endpoint active (${this._model}). Data is sent only when you click Ask.`
        : 'Deterministic Physics Intelligence Active (100% local, offline, no API key required).';
    }
  };

  const api = { analyzeSystem, evaluateChallenges, AIAdapter };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AetheriaIntelligence = api;
})(typeof window !== 'undefined' ? window : globalThis);
