/* ============================================================================
 * AETHERIA — The Future We Build
 * src/core/ScienceModel.js
 * Pure, UI-Independent, Dimensionally Consistent Engineering & Physics Engine
 *
 * Covers:
 *   1. Water Supply, Leakage & Hydraulic Pumping Energy (E = rho*g*V*h / eta)
 *   2. Electricity Demand & Solar PV Generation (with optional NASA POWER API)
 *   3. Battery Storage, Round-Trip Losses & 24-Hour Day/Night Reliability
 *   4. 72-Hour Multi-Day "3 Difficult Days" Continuous Autonomy Simulation
 *   5. Transparent Editable Capital Cost (CapEx) & Simple Payback Economics
 *   6. Side-by-Side Scenario Stress-Testing & Cause-Effect Delta Analysis
 *
 * Notice: Educational & preliminary planning model. Not a substitute for
 * certified electrical, structural, or hydraulic engineering design.
 * ============================================================================ */
(function (global) {
  'use strict';

  const WATER_DENSITY_KG_M3 = 1000.0;
  const GRAVITY_M_S2 = 9.80665;
  const JOULES_PER_KWH = 3600000.0;

  function safeNum(val, fallback, min, max) {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    let out = n;
    if (typeof min === 'number' && out < min) out = min;
    if (typeof max === 'number' && out > max) out = max;
    return out;
  }

  function round2(n) { return Math.round(n * 100) / 100; }
  function round3(n) { return Math.round(n * 1000) / 1000; }

  function computeWater(waterInput) {
    const w = waterInput || {};
    const people = safeNum(w.people, 4, 0, 1000000);
    const litersPerPerson = safeNum(w.litersPerPerson, 110, 0, 2000);
    const rawSupplyL = safeNum(w.rawSupplyL, 600, 0, 1e9);
    const leakagePct = safeNum(w.leakagePct, 15, 0, 95);
    const headMeters = safeNum(w.headMeters, 20, 0, 1000);
    const pumpEfficiency = safeNum(w.pumpEfficiency, 0.60, 0.10, 0.95);

    const dailyDemandL = people * litersPerPerson;
    const leakageLossL = rawSupplyL * (leakagePct / 100);
    const effectiveSupplyL = Math.max(0, rawSupplyL - leakageLossL);
    const waterBalanceL = effectiveSupplyL - dailyDemandL;
    const shortfallL = Math.max(0, -waterBalanceL);
    const surplusL = Math.max(0, waterBalanceL);

    const deliveredL = Math.min(effectiveSupplyL, dailyDemandL);
    const pumpedVolumeL = leakagePct < 99.9
      ? Math.min(rawSupplyL, deliveredL / Math.max(0.05, 1 - leakagePct / 100))
      : rawSupplyL;
    const volumeM3 = pumpedVolumeL / 1000.0;
    const hydraulicEnergyJ = (WATER_DENSITY_KG_M3 * GRAVITY_M_S2 * volumeM3 * headMeters) / pumpEfficiency;
    const pumpingKwhPerDay = hydraulicEnergyJ / JOULES_PER_KWH;
    const coverageRatio = dailyDemandL > 0 ? Math.min(1, effectiveSupplyL / dailyDemandL) : 1;

    return {
      inputs: { people, litersPerPerson, rawSupplyL, leakagePct, headMeters, pumpEfficiency },
      dailyDemandL: round2(dailyDemandL),
      leakageLossL: round2(leakageLossL),
      effectiveSupplyL: round2(effectiveSupplyL),
      waterBalanceL: round2(waterBalanceL),
      shortfallL: round2(shortfallL),
      surplusL: round2(surplusL),
      pumpedVolumeL: round2(pumpedVolumeL),
      hydraulicEnergyJ: Math.round(hydraulicEnergyJ),
      pumpingKwhPerDay: round3(pumpingKwhPerDay),
      coverageRatio: round3(coverageRatio),
      status: shortfallL <= 0.01 ? 'Sufficient' : 'Shortfall'
    };
  }

  function computeElectricity(elecInput, waterPumpKwh) {
    const e = elecInput || {};
    const appliances = Array.isArray(e.appliances) ? e.appliances : [];
    let applianceDailyKwh = 0;
    let peakConnectedKw = 0;

    const itemized = appliances.map((a) => {
      const watts = safeNum(a.watts, 0, 0, 500000);
      const hours = safeNum(a.hours, 0, 0, 24);
      const qty = safeNum(a.qty, 0, 0, 10000);
      const kwh = (watts / 1000) * hours * qty;
      applianceDailyKwh += kwh;
      peakConnectedKw += (watts / 1000) * qty;
      return { name: String(a.name || 'Load'), watts, hours, qty, dailyKwh: round3(kwh) };
    });

    const includePump = e.includeWaterPump !== false;
    const pumpKwh = includePump ? safeNum(waterPumpKwh, 0, 0, 100000) : 0;
    const dailyDemandKwh = applianceDailyKwh + pumpKwh;
    const monthlyDemandKwh = dailyDemandKwh * 30;

    const installedKwp = safeNum(e.installedKwp, 0, 0, 50000);
    const peakSunHours = safeNum(e.peakSunHours, 5.0, 0, 12);
    const performanceRatio = safeNum(e.performanceRatio, 0.78, 0.30, 0.95);
    const panelEfficiency = safeNum(e.panelEfficiency, 0.20, 0.08, 0.35);
    const roofAreaM2 = safeNum(e.roofAreaM2, 40, 0, 1e6);
    const tariffPerKwh = safeNum(e.tariffPerKwh, 0.14, 0, 5);
    const gridEmissionsKgPerKwh = safeNum(e.gridEmissionsKgPerKwh, 0.40, 0, 1.5);

    const requiredAreaM2 = installedKwp / panelEfficiency;
    const roofFits = roofAreaM2 <= 0 ? true : requiredAreaM2 <= roofAreaM2 + 0.01;
    const maxRoofKwp = roofAreaM2 * panelEfficiency;
    const dailySolarKwh = installedKwp * peakSunHours * performanceRatio;
    const monthlySolarKwh = dailySolarKwh * 30;

    return {
      inputs: {
        installedKwp, peakSunHours, performanceRatio, panelEfficiency,
        roofAreaM2, tariffPerKwh, gridEmissionsKgPerKwh, includeWaterPump: includePump
      },
      itemized,
      applianceDailyKwh: round3(applianceDailyKwh),
      waterPumpKwh: round3(pumpKwh),
      dailyDemandKwh: round3(dailyDemandKwh),
      monthlyDemandKwh: round2(monthlyDemandKwh),
      peakConnectedKw: round2(peakConnectedKw),
      dailySolarKwh: round3(dailySolarKwh),
      monthlySolarKwh: round2(monthlySolarKwh),
      requiredAreaM2: round2(requiredAreaM2),
      maxRoofKwp: round2(maxRoofKwp),
      roofFits
    };
  }

  function computeStorage(storInput, elecResult) {
    const s = storInput || {};
    const batteryKwh = safeNum(s.batteryKwh, 0, 0, 500000);
    const depthOfDischarge = safeNum(s.depthOfDischarge, 0.85, 0.10, 0.98);
    const chargeEff = safeNum(s.chargeEff, 0.95, 0.50, 0.99);
    const dischargeEff = safeNum(s.dischargeEff, 0.95, 0.50, 0.99);
    const nightShare = safeNum(s.nightShare, 0.40, 0.05, 0.95);
    const nightHours = safeNum(s.nightHours, 12, 4, 20);

    const dailyDemandKwh = elecResult.dailyDemandKwh;
    const dailySolarKwh = elecResult.dailySolarKwh;
    const usableCapacityKwh = batteryKwh * depthOfDischarge;
    const daytimeDemandKwh = dailyDemandKwh * (1 - nightShare);
    const nighttimeDemandKwh = dailyDemandKwh * nightShare;

    const directSolarUsedKwh = Math.min(daytimeDemandKwh, dailySolarKwh);
    const daytimeUnservedKwh = Math.max(0, daytimeDemandKwh - directSolarUsedKwh);
    const daytimeSurplusKwh = Math.max(0, dailySolarKwh - directSolarUsedKwh);

    const maxRawNeededToFill = chargeEff > 0 ? (usableCapacityKwh / chargeEff) : 0;
    const solarUsedForChargingKwh = Math.min(daytimeSurplusKwh, maxRawNeededToFill);
    const storedNetKwh = solarUsedForChargingKwh * chargeEff;
    const chargeLossKwh = solarUsedForChargingKwh - storedNetKwh;
    const curtailedOrExportedKwh = Math.max(0, daytimeSurplusKwh - solarUsedForChargingKwh);

    const maxDeliverableNightKwh = storedNetKwh * dischargeEff;
    const deliveredNightKwh = Math.min(nighttimeDemandKwh, maxDeliverableNightKwh);
    const energyDrawnFromBatteryKwh = dischargeEff > 0 ? (deliveredNightKwh / dischargeEff) : 0;
    const dischargeLossKwh = energyDrawnFromBatteryKwh - deliveredNightKwh;
    const roundTripLossKwh = chargeLossKwh + dischargeLossKwh;

    const unservedNightKwh = Math.max(0, nighttimeDemandKwh - deliveredNightKwh);
    const totalGridOrUnservedKwh = daytimeUnservedKwh + unservedNightKwh;
    const totalSolarServedKwh = directSolarUsedKwh + deliveredNightKwh;
    const solarFraction = dailyDemandKwh > 0 ? Math.min(1, totalSolarServedKwh / dailyDemandKwh) : 1;
    const nightReliability = nighttimeDemandKwh > 0 ? Math.min(1, deliveredNightKwh / nighttimeDemandKwh) : 1;

    const avgNightLoadKw = nightHours > 0 ? (nighttimeDemandKwh / nightHours) : 0;
    const backupHours = avgNightLoadKw > 0.0001
      ? Math.min(72, maxDeliverableNightKwh / avgNightLoadKw)
      : (maxDeliverableNightKwh > 0 ? 24 : 0);

    const tariff = elecResult.inputs.tariffPerKwh;
    const ef = elecResult.inputs.gridEmissionsKgPerKwh;
    const monthlyBaselineCost = dailyDemandKwh * 30 * tariff;
    const monthlyGridCost = totalGridOrUnservedKwh * 30 * tariff;
    const monthlySavings = Math.max(0, monthlyBaselineCost - monthlyGridCost);
    const monthlyCo2AvoidedKg = totalSolarServedKwh * 30 * ef;

    const hourlyProfile = [];
    let soc = usableCapacityKwh > 0 ? Math.min(usableCapacityKwh, storedNetKwh * 0.5) : 0;
    const dayH = Math.max(1, 24 - nightHours);
    const avgDayLoadKw = daytimeDemandKwh / dayH;
    const solarWeights = [];
    let wSum = 0;
    for (let h = 0; h < 24; h++) {
      const w = (h >= 6 && h <= 17) ? Math.sin(((h - 5.5) / 12.0) * Math.PI) : 0;
      solarWeights.push(w); wSum += w;
    }
    for (let h = 0; h < 24; h++) {
      const isDay = h >= 6 && h < 18;
      const genKw = wSum > 0 ? (dailySolarKwh * (solarWeights[h] / wSum)) : 0;
      const loadKw = isDay ? avgDayLoadKw : avgNightLoadKw;
      let unmetKw = 0;
      if (genKw >= loadKw) {
        const surplus = genKw - loadKw;
        soc += Math.max(0, Math.min(usableCapacityKwh - soc, surplus * chargeEff));
      } else {
        const deficit = loadKw - genKw;
        const served = Math.min(deficit, soc * dischargeEff);
        soc = Math.max(0, soc - (dischargeEff > 0 ? served / dischargeEff : 0));
        unmetKw = Math.max(0, deficit - served);
      }
      hourlyProfile.push({
        hour: h, solarKw: round3(genKw), loadKw: round3(loadKw), socKwh: round3(soc), unmetKw: round3(unmetKw)
      });
    }

    return {
      inputs: { batteryKwh, depthOfDischarge, chargeEff, dischargeEff, nightShare, nightHours },
      usableCapacityKwh: round3(usableCapacityKwh),
      daytimeDemandKwh: round3(daytimeDemandKwh),
      nighttimeDemandKwh: round3(nighttimeDemandKwh),
      directSolarUsedKwh: round3(directSolarUsedKwh),
      daytimeSurplusKwh: round3(daytimeSurplusKwh),
      storedNetKwh: round3(storedNetKwh),
      maxDeliverableNightKwh: round3(maxDeliverableNightKwh),
      deliveredNightKwh: round3(deliveredNightKwh),
      unservedNightKwh: round3(unservedNightKwh),
      daytimeUnservedKwh: round3(daytimeUnservedKwh),
      totalGridOrUnservedKwh: round3(totalGridOrUnservedKwh),
      totalSolarServedKwh: round3(totalSolarServedKwh),
      curtailedOrExportedKwh: round3(curtailedOrExportedKwh),
      roundTripLossKwh: round3(roundTripLossKwh),
      solarFraction: round3(solarFraction),
      nightReliability: round3(nightReliability),
      backupHours: round2(backupHours),
      monthlyBaselineCost: round2(monthlyBaselineCost),
      monthlyGridCost: round2(monthlyGridCost),
      monthlySavings: round2(monthlySavings),
      monthlyCo2AvoidedKg: round2(monthlyCo2AvoidedKg),
      hourlyProfile
    };
  }

  /**
   * 4. Transparent Editable Capital Cost (CapEx) & Simple Payback Model
   * Explicitly separates equipment estimate from excluded items (permitting, civil works, financing).
   */
  function computeEconomics(econInput, elecResult, storResult) {
    const ec = econInput || {};
    const solarCostPerKwp = safeNum(ec.solarCostPerKwp, 1100, 0, 20000);
    const batteryCostPerKwh = safeNum(ec.batteryCostPerKwh, 320, 0, 5000);
    const budgetCap = safeNum(ec.budgetCap, 12000, 0, 1e8);

    const solarCapex = elecResult.inputs.installedKwp * solarCostPerKwp;
    const batteryCapex = storResult.inputs.batteryKwh * batteryCostPerKwh;
    const totalCapex = solarCapex + batteryCapex;
    const annualSavings = storResult.monthlySavings * 12;
    const simplePaybackYears = annualSavings > 1 ? (totalCapex / annualSavings) : null;
    const withinBudget = budgetCap <= 0 ? true : totalCapex <= budgetCap;

    return {
      inputs: { solarCostPerKwp, batteryCostPerKwh, budgetCap },
      solarCapex: Math.round(solarCapex),
      batteryCapex: Math.round(batteryCapex),
      totalCapex: Math.round(totalCapex),
      annualSavings: round2(annualSavings),
      simplePaybackYears: simplePaybackYears !== null ? round2(simplePaybackYears) : null,
      withinBudget,
      budgetDelta: Math.round(totalCapex - budgetCap)
    };
  }

  /**
   * 5. 72-Hour Continuous Multi-Day Simulation ("Survive Three Difficult Days")
   * Tracks continuous battery SoC across 3 days with variable solar multipliers (e.g. [1.0, 0.45, 0.35]).
   */
  function simulateMultiDay(state, daySolarMultipliers) {
    const evalRes = evaluateSystem(state);
    const mults = Array.isArray(daySolarMultipliers) && daySolarMultipliers.length
      ? daySolarMultipliers
      : [1.0, 0.45, 0.35];

    const s = evalRes.storage.inputs;
    const usable = evalRes.storage.usableCapacityKwh;
    const baseSolar = evalRes.electricity.dailySolarKwh;
    const dailyDemand = evalRes.electricity.dailyDemandKwh;
    const dayH = Math.max(1, 24 - s.nightHours);
    const avgDayLoadKw = (dailyDemand * (1 - s.nightShare)) / dayH;
    const avgNightLoadKw = (dailyDemand * s.nightShare) / Math.max(1, s.nightHours);

    const solarWeights = [];
    let wSum = 0;
    for (let h = 0; h < 24; h++) {
      const w = (h >= 6 && h <= 17) ? Math.sin(((h - 5.5) / 12.0) * Math.PI) : 0;
      solarWeights.push(w); wSum += w;
    }

    let soc = usable * 0.75; // Start Day 1 morning at 75% usable charge
    const hours = [];
    let totalUnmetKwh = 0;
    let totalDemandKwh = 0;
    let outageHours = 0;

    for (let d = 0; d < mults.length; d++) {
      const daySolar = baseSolar * safeNum(mults[d], 1.0, 0, 2);
      for (let h = 0; h < 24; h++) {
        const isDay = h >= 6 && h < 18;
        const genKw = wSum > 0 ? (daySolar * (solarWeights[h] / wSum)) : 0;
        const loadKw = isDay ? avgDayLoadKw : avgNightLoadKw;
        totalDemandKwh += loadKw;
        let unmetKw = 0;
        if (genKw >= loadKw) {
          const surplus = genKw - loadKw;
          soc += Math.max(0, Math.min(usable - soc, surplus * s.chargeEff));
        } else {
          const deficit = loadKw - genKw;
          const served = Math.min(deficit, soc * s.dischargeEff);
          soc = Math.max(0, soc - (s.dischargeEff > 0 ? served / s.dischargeEff : 0));
          unmetKw = Math.max(0, deficit - served);
        }
        if (unmetKw > 0.02) outageHours++;
        totalUnmetKwh += unmetKw;
        hours.push({
          idx: d * 24 + h, day: d + 1, hour: h,
          solarKw: round3(genKw), loadKw: round3(loadKw), socKwh: round3(soc), unmetKw: round3(unmetKw)
        });
      }
    }

    const reliabilityPct = totalDemandKwh > 0 ? round2((1 - totalUnmetKwh / totalDemandKwh) * 100) : 100;
    return {
      daySolarMultipliers: mults,
      hours,
      totalDemandKwh: round2(totalDemandKwh),
      totalUnmetKwh: round2(totalUnmetKwh),
      outageHours,
      reliabilityPct,
      survived: outageHours === 0
    };
  }

  function evaluateSystem(state) {
    const water = computeWater(state.water);
    const electricity = computeElectricity(state.electricity, water.pumpingKwhPerDay);
    const storage = computeStorage(state.storage, electricity);
    const economics = computeEconomics(state.economics, electricity, storage);
    const waterPumpAtRisk = water.pumpingKwhPerDay > 0.05 && storage.totalGridOrUnservedKwh > electricity.dailyDemandKwh * 0.45 && storage.unservedNightKwh > 0.5;
    return { water, electricity, storage, economics, waterPumpAtRisk };
  }

  /**
   * 6. 4-Way Architectural Scenario Matrix (Consistent Assumptions)
   * A: Grid-Only | B: Solar-Only | C: Solar + Storage (Current) | D: Efficiency (-20%) + Solar + Storage
   */
  function compareFourScenarios(state) {
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const sA = clone(state); sA.electricity.installedKwp = 0; sA.storage.batteryKwh = 0;
    const sB = clone(state); sB.storage.batteryKwh = 0;
    const sC = clone(state);
    const sD = clone(state);
    sD.electricity.appliances = (sD.electricity.appliances || []).map((a) => ({ ...a, hours: round2(a.hours * 0.80) }));

    return {
      methodology: "All 4 scenarios share identical solar resource (PSH), tariff, water load, and unit CapEx assumptions.",
      scenarios: [
        { key: "A", label: "A. Grid-Only Baseline",      eval: evaluateSystem(sA) },
        { key: "B", label: "B. Solar-Supported Only",    eval: evaluateSystem(sB) },
        { key: "C", label: "C. Solar + Storage (Yours)", eval: evaluateSystem(sC) },
        { key: "D", label: "D. Efficiency (-20%) + All", eval: evaluateSystem(sD) }
      ]
    };
  }

  /**
   * 7. Parametric Sensitivity Analysis (One-at-a-Time Deterministic Sweeps)
   * Explicitly educational parametric sweep — not a forecast of future prices or weather.
   */
  function runSensitivityAnalysis(state) {
    const clone = (o) => JSON.parse(JSON.stringify(o));
    const base = evaluateSystem(state);

    // 1. Electricity Tariff Sweep (0.5x to 1.5x) -> Annual Grid Cost & Simple Payback
    const tariffSweep = [0.5, 0.75, 1.0, 1.25, 1.5].map((m) => {
      const s = clone(state);
      s.electricity.tariffPerKwh = round3(state.electricity.tariffPerKwh * m);
      const r = evaluateSystem(s);
      return { mult: m, label: Math.round(m * 100) + "%", tariff: s.electricity.tariffPerKwh, annualGridCost: round2(r.storage.monthlyGridCost * 12), paybackYrs: r.economics.simplePaybackYears };
    });

    // 2. Battery Capacity Sweep (0x to 2.0x) -> Night Reliability % & Unserved kWh
    const batterySweep = [0, 0.5, 1.0, 1.5, 2.0].map((m) => {
      const s = clone(state);
      s.storage.batteryKwh = round2(Math.max(0, state.storage.batteryKwh * m));
      const r = evaluateSystem(s);
      return { mult: m, label: Math.round(m * 100) + "%", batteryKwh: s.storage.batteryKwh, nightRelPct: round2(r.storage.nightReliability * 100), unservedNightKwh: r.storage.unservedNightKwh, totalCapex: r.economics.totalCapex };
    });

    // 3. Solar Resource (PSH) Sweep (0.6x to 1.3x) -> Solar Fraction % & Daily Solar kWh
    const solarSweep = [0.6, 0.8, 1.0, 1.15, 1.3].map((m) => {
      const s = clone(state);
      s.electricity.peakSunHours = round2(Math.max(0.5, state.electricity.peakSunHours * m));
      const r = evaluateSystem(s);
      return { mult: m, label: Math.round(m * 100) + "%", psh: s.electricity.peakSunHours, solarFractionPct: round2(r.storage.solarFraction * 100), dailySolarKwh: r.electricity.dailySolarKwh };
    });

    return {
      disclaimer: "Simplified one-at-a-time parametric sensitivity sweep under fixed model assumptions; does not forecast future prices or climate.",
      baseAnnualGridCost: round2(base.storage.monthlyGridCost * 12),
      tariffSweep,
      batterySweep,
      solarSweep
    };
  }

  function compareScenarios(baseState, modState) {
    const base = evaluateSystem(baseState);
    const mod = evaluateSystem(modState);

    const deltas = {
      dailyDemandKwh: round3(mod.electricity.dailyDemandKwh - base.electricity.dailyDemandKwh),
      dailySolarKwh: round3(mod.electricity.dailySolarKwh - base.electricity.dailySolarKwh),
      unservedNightKwh: round3(mod.storage.unservedNightKwh - base.storage.unservedNightKwh),
      backupHours: round2(mod.storage.backupHours - base.storage.backupHours),
      monthlyGridCost: round2(mod.storage.monthlyGridCost - base.storage.monthlyGridCost),
      waterShortfallL: round2(mod.water.shortfallL - base.water.shortfallL),
      pumpingKwhPerDay: round3(mod.water.pumpingKwhPerDay - base.water.pumpingKwhPerDay),
      totalCapex: mod.economics.totalCapex - base.economics.totalCapex,
      solarFractionPct: round2((mod.storage.solarFraction - base.storage.solarFraction) * 100)
    };

    const reasons = [];
    if (Math.abs(deltas.dailySolarKwh) > 0.05) {
      reasons.push(deltas.dailySolarKwh < 0
        ? `Lower solar output (${deltas.dailySolarKwh} kWh/day) reduced daytime surplus available to charge storage.`
        : `Higher solar output (+${deltas.dailySolarKwh} kWh/day) increased direct daytime coverage and battery charging.`);
    }
    if (Math.abs(deltas.dailyDemandKwh) > 0.05) {
      reasons.push(deltas.dailyDemandKwh > 0
        ? `Higher electricity demand (+${deltas.dailyDemandKwh} kWh/day) raised nighttime load and grid import.`
        : `Reduced electricity demand (${deltas.dailyDemandKwh} kWh/day) lowered grid cost and extended battery backup.`);
    }
    if (Math.abs(deltas.unservedNightKwh) > 0.05) {
      reasons.push(deltas.unservedNightKwh > 0
        ? `Unserved nighttime demand increased by +${deltas.unservedNightKwh} kWh/night because storage or daytime surplus could not cover evening loads.`
        : `Unserved nighttime demand improved by ${deltas.unservedNightKwh} kWh/night.`);
    }
    if (Math.abs(deltas.waterShortfallL) > 1) {
      reasons.push(deltas.waterShortfallL > 0
        ? `Water shortfall grew by +${deltas.waterShortfallL} L/day due to tighter supply, higher demand, or leakage.`
        : `Water shortfall decreased by ${Math.abs(deltas.waterShortfallL)} L/day.`);
    }
    if (!reasons.length) reasons.push('Modified scenario matches baseline outputs under current assumptions.');

    return { base, mod, deltas, reasons };
  }

  async function fetchNasaPowerSolar(lat, lon) {
    const clampedLat = safeNum(lat, NaN, -90, 90);
    const clampedLon = safeNum(lon, NaN, -180, 180);
    if (!Number.isFinite(clampedLat) || !Number.isFinite(clampedLon)) {
      return { ok: false, error: 'Enter valid latitude (-90 to 90) and longitude (-180 to 180).' };
    }
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN&community=RE&longitude=${clampedLon.toFixed(4)}&latitude=${clampedLat.toFixed(4)}&format=JSON`;
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), 7000) : null;
      const res = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (timer) clearTimeout(timer);
      if (!res.ok) return { ok: false, error: `NASA POWER API returned HTTP ${res.status}. Using editable local assumptions.` };
      const data = await res.json();
      const series = data && data.properties && data.properties.parameter && data.properties.parameter.ALLSKY_SFC_SW_DWN;
      if (!series || typeof series.ANN !== 'number' || series.ANN < 0) {
        return { ok: false, error: 'NASA POWER response lacked valid irradiance data. Using editable assumptions.' };
      }
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      const vals = months.map((m) => series[m]).filter((v) => typeof v === 'number' && v >= 0);
      return {
        ok: true,
        annualPeakSunHours: round2(series.ANN),
        minMonthPsh: vals.length ? round2(Math.min(...vals)) : round2(series.ANN),
        maxMonthPsh: vals.length ? round2(Math.max(...vals)) : round2(series.ANN),
        units: 'kWh/m²/day (Peak Sun Hours)',
        period: 'NASA POWER 20-year Solar Climatology (ALLSKY_SFC_SW_DWN)',
        attribution: 'Data obtained from the NASA Langley Research Center POWER Project (power.larc.nasa.gov).',
        lat: clampedLat, lon: clampedLon
      };
    } catch (err) {
      return {
        ok: false,
        error: 'Offline or NASA POWER unreachable. Continuing with editable demonstration solar assumptions (no data fabricated).'
      };
    }
  }

  const api = {
    WATER_DENSITY_KG_M3, GRAVITY_M_S2, JOULES_PER_KWH, safeNum,
    computeWater, computeElectricity, computeStorage, computeEconomics,
    simulateMultiDay, evaluateSystem, compareScenarios, compareFourScenarios, runSensitivityAnalysis, fetchNasaPowerSolar
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AetheriaScience = api;
})(typeof window !== 'undefined' ? window : globalThis);
