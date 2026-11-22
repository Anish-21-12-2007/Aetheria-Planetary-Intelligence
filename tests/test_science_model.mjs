#!/usr/bin/env node
/* ============================================================================
 * AETHERIA — The Future We Build
 * tests/test_science_model.mjs
 * Automated Unit Tests for Pure Scientific & Engineering Calculations (11 Suites)
 * ============================================================================ */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../src/core/ScienceModel.js');
const St = require('../src/core/AppState.js');
const M = require('../src/core/MaterialsData.js');

function approx(actual, expected, tol = 0.01, msg = '') {
  assert.ok(Math.abs(actual - expected) <= tol, `${msg}: expected ${expected} ± ${tol}, got ${actual}`);
}

console.log('Running Aetheria ScienceModel & Data Integrity Tests...');

// 1. Electricity consumption formula
{
  const res = S.computeElectricity({
    appliances: [
      { name: 'LED', watts: 100, hours: 5, qty: 2 },
      { name: 'Fridge', watts: 200, hours: 10, qty: 1 }
    ],
    installedKwp: 3.0, peakSunHours: 5.0, performanceRatio: 0.80,
    panelEfficiency: 0.20, roofAreaM2: 20, includeWaterPump: false
  }, 0);
  approx(res.dailyDemandKwh, 3.0, 0.001, 'Daily electricity demand');
  approx(res.monthlyDemandKwh, 90.0, 0.01, 'Monthly electricity demand');
  approx(res.dailySolarKwh, 12.0, 0.001, 'Daily solar generation');
  approx(res.requiredAreaM2, 15.0, 0.01, 'Required panel area');
  assert.equal(res.roofFits, true);
}

// 2. Solar generation change directly changes grid demand
{
  const lowSolar = St.createInitialState('home'); lowSolar.electricity.installedKwp = 0.8;
  const highSolar = St.createInitialState('home'); highSolar.electricity.installedKwp = 4.0;
  const rLow = S.evaluateSystem(lowSolar);
  const rHigh = S.evaluateSystem(highSolar);
  assert.ok(rHigh.electricity.dailySolarKwh > rLow.electricity.dailySolarKwh);
  assert.ok(rHigh.storage.totalGridOrUnservedKwh < rLow.storage.totalGridOrUnservedKwh);
}

// 3. Battery usable capacity, round-trip losses, backup duration & night shortages
{
  const elec = { dailyDemandKwh: 10.0, dailySolarKwh: 12.0, inputs: { tariffPerKwh: 0.20, gridEmissionsKgPerKwh: 0.40 } };
  const stor = S.computeStorage({
    batteryKwh: 4.0, depthOfDischarge: 0.80, chargeEff: 0.90, dischargeEff: 0.90, nightShare: 0.50, nightHours: 10
  }, elec);
  approx(stor.usableCapacityKwh, 3.2, 0.001, 'Usable capacity');
  approx(stor.maxDeliverableNightKwh, 2.88, 0.01, 'Max deliverable night');
  approx(stor.unservedNightKwh, 2.12, 0.01, 'Unserved night');
  approx(stor.backupHours, 5.76, 0.02, 'Backup hours');
  assert.equal(stor.hourlyProfile.length, 24);
}

// 4. Water consumption, leakage & exact hydraulic pumping energy (Joules -> kWh)
{
  const w = S.computeWater({ people: 10, litersPerPerson: 100, rawSupplyL: 2000, leakagePct: 0, headMeters: 100, pumpEfficiency: 0.50 });
  approx(w.hydraulicEnergyJ, 1961330, 5, 'Exact Joules');
  approx(w.pumpingKwhPerDay, 0.545, 0.002, 'Exact Joules-to-kWh');
  const wLeak = S.computeWater({ people: 10, litersPerPerson: 100, rawSupplyL: 1500, leakagePct: 50, headMeters: 20, pumpEfficiency: 0.60 });
  approx(wLeak.shortfallL, 250, 0.01, 'Shortfall with 50% leakage');
}

// 5. Coupled water pumping energy feeds into electricity demand
{
  const st = St.createInitialState('community');
  st.water.headMeters = 60; const rHigh = S.evaluateSystem(st);
  st.water.headMeters = 10; const rLow = S.evaluateSystem(st);
  assert.ok(rHigh.electricity.dailyDemandKwh > rLow.electricity.dailyDemandKwh);
}

// 6. Scenario comparison deltas & explanations
{
  const base = St.createInitialState('school');
  const cmp = S.compareScenarios(base, St.buildStressedState(base));
  assert.ok(cmp.deltas.dailySolarKwh < 0 && cmp.deltas.dailyDemandKwh > 0 && cmp.reasons.length >= 2);
}

// 7. CapEx & Simple Payback Economics
{
  const st = St.createInitialState('home');
  st.electricity.installedKwp = 3.0;
  st.storage.batteryKwh = 6.0;
  st.economics = { solarCostPerKwp: 1000, batteryCostPerKwh: 300, budgetCap: 5000 };
  const r = S.evaluateSystem(st);
  assert.equal(r.economics.solarCapex, 3000, '3 kWp * $1000');
  assert.equal(r.economics.batteryCapex, 1800, '6 kWh * $300');
  assert.equal(r.economics.totalCapex, 4800, 'Total CapEx');
  assert.equal(r.economics.withinBudget, true, '$4800 <= $5000 budget');
  assert.ok(r.economics.simplePaybackYears > 0, 'Payback years positive');
}

// 8. 72-Hour Continuous "Survive Three Difficult Days" Multi-Day Simulation
{
  const smallBatt = St.createInitialState('home');
  smallBatt.electricity.installedKwp = 2.5;
  smallBatt.storage.batteryKwh = 3.0;
  const bigBatt = St.createInitialState('home');
  bigBatt.electricity.installedKwp = 3.5;
  bigBatt.storage.batteryKwh = 16.0;
  const simSmall = S.simulateMultiDay(smallBatt, [1.0, 0.40, 0.30]);
  const simBig = S.simulateMultiDay(bigBatt, [1.0, 0.40, 0.30]);
  assert.equal(simSmall.hours.length, 72, '72 continuous hours simulated');
  assert.ok(simSmall.outageHours > simBig.outageHours, 'Larger storage survives multi-day storms with fewer outage hours');
  assert.ok(simBig.reliabilityPct > simSmall.reliabilityPct, 'Larger storage improves 72h reliability');
}

// 9. Edge cases: zeros, negatives, NaN never produce NaN or Infinity
{
  const bad = {
    electricity: { appliances: [{ name: 'Bad', watts: -50, hours: NaN, qty: -2 }], installedKwp: -5, peakSunHours: NaN, performanceRatio: 0, panelEfficiency: 0, roofAreaM2: -10, tariffPerKwh: -1 },
    storage: { batteryKwh: -10, depthOfDischarge: 0, chargeEff: 0, dischargeEff: 0, nightShare: 2, nightHours: 0 },
    water: { people: -5, litersPerPerson: NaN, rawSupplyL: -100, leakagePct: 120, headMeters: -5, pumpEfficiency: 0 },
    economics: { solarCostPerKwp: -100, batteryCostPerKwh: NaN, budgetCap: -50 }
  };
  const r = S.evaluateSystem(bad);
  for (const v of [r.electricity.dailyDemandKwh, r.electricity.dailySolarKwh, r.storage.backupHours, r.storage.unservedNightKwh, r.water.pumpingKwhPerDay, r.economics.totalCapex]) {
    assert.ok(Number.isFinite(v) && v >= 0, `Edge-case value must be finite >= 0, got ${v}`);
  }
}

// 10. Periodic table data integrity (all 118 elements, exact electron sums)
{
  assert.equal(M.ELEMENTS.length, 118);
  M.ELEMENTS.forEach((el, idx) => {
    assert.equal(el.z, idx + 1);
    assert.equal(el.shells.reduce((a, b) => a + b, 0), el.z);
  });
}

// 11. Story community initial state starts with real solvable deficits (not trivially pre-solved!)
{
  const comm = St.createInitialState('community');
  const r = S.evaluateSystem(comm);
  assert.ok(r.storage.unservedNightKwh > 5, 'Initial 2045 Aetheria community has real night blackout to solve');
  assert.ok(r.water.shortfallL > 1000, 'Initial 2045 Aetheria community has real water shortfall to solve');
}


// 12. 4-Way Scenario Comparison Invariants
const comm = St.createInitialState("community");
const four = S.compareFourScenarios(comm);
assert.strictEqual(four.scenarios.length, 4);
const [scA, scB, scC, scD] = four.scenarios;
assert.ok(scA.eval.storage.monthlyGridCost >= scB.eval.storage.monthlyGridCost, "Solar-only must not cost more than grid-only");
assert.ok(scB.eval.storage.monthlyGridCost >= scC.eval.storage.monthlyGridCost, "Solar+Storage must not cost more than solar-only");
assert.ok(scC.eval.electricity.dailyDemandKwh > scD.eval.electricity.dailyDemandKwh, "Efficiency scenario must lower daily demand");

// 13. Parametric Sensitivity Analysis Monotonicity
const sens = S.runSensitivityAnalysis(comm);
assert.strictEqual(sens.tariffSweep.length, 5);
assert.strictEqual(sens.batterySweep.length, 5);
assert.strictEqual(sens.solarSweep.length, 5);
assert.ok(sens.solarSweep[4].dailySolarKwh > sens.solarSweep[0].dailySolarKwh, "Higher PSH must produce more solar kWh");
assert.ok(sens.batterySweep[4].nightRelPct >= sens.batterySweep[0].nightRelPct, "Larger battery must not reduce night reliability");

// 14. Deterministic Intelligence Engine & Discovery Challenges
const Intel = require("../src/core/IntelligenceEngine.js");
globalThis.AetheriaScience = S;
const commEval = S.evaluateSystem(comm);
const commStorm = S.simulateMultiDay(comm, [1.0, 0.45, 0.35]);
const analysis = Intel.analyzeSystem(comm, commEval, commStorm, four);
assert.ok(analysis.diagnostics.length >= 3, "Intelligence must produce multi-system diagnostics");
assert.ok(analysis.tradeoffs.length >= 3, "Intelligence must quantify tradeoffs from 4-way comparison");
assert.strictEqual(analysis.externalAiActive, false, "External AI must be disabled by default");
const chals = Intel.evaluateChallenges(comm, commEval, commStorm);
assert.strictEqual(chals.length, 5, "Must evaluate 5 discovery challenges");

// 15. AppState Import Validation & XSS Escaping
assert.strictEqual(St.escapeHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
assert.strictEqual(St.validateAndImportProject("not json").ok, false);
assert.strictEqual(St.validateAndImportProject("{}").ok, false);
const validImp = St.validateAndImportProject(JSON.stringify({ state: comm }));
assert.strictEqual(validImp.ok, true);

console.log("ALL FLAGSHIP SCIENCE, INTELLIGENCE & STATE TESTS PASSED (15/15 suites)");

