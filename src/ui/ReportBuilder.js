/* ============================================================================
 * AETHERIA — Planetary Systems Intelligence Platform
 * src/ui/ReportBuilder.js
 * Professional Preliminary Engineering Analysis Report (Print-to-PDF & JSON)
 * Includes: Embedded SVG Charts, 4-Way Matrix, Sensitivity, Tradeoffs,
 * Deterministic Intelligence Insights, Limitations & Investigation Questions.
 * ============================================================================ */
(function (global) {
  'use strict';

  function esc(s) {
    return global.AetheriaState ? global.AetheriaState.escapeHtml(s) : String(s == null ? '' : s);
  }

  function buildReportHTML(state, evalRes, comparison, multiDayRes, fourWayRes, sensRes, intelRes) {
    const { electricity, storage, water, economics } = evalRes;
    const Charts = global.AetheriaCharts;
    const nowStr = new Date().toLocaleString();
    const appRows = electricity.itemized.map((a) => `
      <tr>
        <td>${esc(a.name)}</td>
        <td>${a.watts} W</td>
        <td>${a.hours} h/d</td>
        <td>${a.qty}</td>
        <td><strong>${a.dailyKwh} kWh/d</strong></td>
      </tr>`).join('');

    const chart24h = Charts ? `
      <div style="margin:10px 0;">
        <div style="font-size:11px;font-weight:700;margin-bottom:4px;">24-Hour Solar, Load &amp; Battery State-of-Charge Profile</div>
        ${Charts.render24hChartSVG(storage.hourlyProfile, storage.usableCapacityKwh)}
      </div>` : '';

    const stormHtml = multiDayRes ? `
      <p><strong>72-Hour Storm Autonomy Test (${(state.stormDays || [1, 0.45, 0.35]).map((m) => Math.round(m * 100) + '%').join(' / ')} solar):</strong>
        Status: <strong>${multiDayRes.survived ? 'Survived (0 outage hours)' : multiDayRes.outageHours + ' outage hours'}</strong> &bull;
        Total Unmet: ${multiDayRes.totalUnmetKwh} kWh &bull; 72h Reliability: ${multiDayRes.reliabilityPct}%.</p>
      ${Charts ? `<div style="margin:8px 0;">${Charts.render72hStormChartSVG(multiDayRes, storage.usableCapacityKwh)}</div>` : ''}` : '';

    const econHtml = economics ? `
      <h3>4. Estimated Equipment CapEx &amp; Simple Payback</h3>
      <table>
        <thead><tr><th>Component</th><th>Editable Unit Cost</th><th>Capacity</th><th>Estimated Equipment Cost</th></tr></thead>
        <tbody>
          <tr><td>Solar PV Array</td><td>$${economics.inputs.solarCostPerKwp.toLocaleString()}/kWp</td><td>${electricity.inputs.installedKwp} kWp</td><td><strong>$${economics.solarCapex.toLocaleString()}</strong></td></tr>
          <tr><td>Battery Bank (${esc((state.selectedStorageTech || 'lfp').toUpperCase())})</td><td>$${economics.inputs.batteryCostPerKwh.toLocaleString()}/kWh</td><td>${storage.inputs.batteryKwh} kWh</td><td><strong>$${economics.batteryCapex.toLocaleString()}</strong></td></tr>
          <tr><td colspan="3"><strong>Total Estimated Equipment CapEx</strong> (vs. Budget Cap $${economics.inputs.budgetCap.toLocaleString()})</td><td><strong>$${economics.totalCapex.toLocaleString()} (${economics.withinBudget ? 'Within Budget' : '+$' + economics.budgetDelta.toLocaleString() + ' Over'})</strong></td></tr>
        </tbody>
      </table>
      <p><strong>Simple Payback Estimate:</strong> ${economics.simplePaybackYears !== null ? economics.simplePaybackYears + ' years' : 'N/A'} based on $${economics.annualSavings.toLocaleString()}/year estimated grid savings.
        <em>Excludes installation labor, racking, inverters, wiring, permitting, O&amp;M, and financing.</em></p>` : '';

    const fourWayHtml = fourWayRes ? `
      <h3>5. Four-Way Architectural Scenario Comparison</h3>
      <p style="font-size:11.5px;">${esc(fourWayRes.methodology)}</p>
      ${Charts ? `<div style="margin:8px 0;">${Charts.renderFourWayMatrixSVG(fourWayRes)}</div>` : ''}
      <table>
        <thead><tr><th>Scenario</th><th>Demand</th><th>Solar Served</th><th>Unmet Night</th><th>Monthly Grid</th><th>Est. CapEx</th></tr></thead>
        <tbody>
          ${fourWayRes.scenarios.map((s) => `
            <tr>
              <td><strong>${esc(s.label)}</strong></td>
              <td>${s.eval.electricity.dailyDemandKwh} kWh</td>
              <td>${Math.round(s.eval.storage.solarFraction * 100)}%</td>
              <td>${s.eval.storage.unservedNightKwh} kWh</td>
              <td>$${s.eval.storage.monthlyGridCost}/mo</td>
              <td>$${s.eval.economics.totalCapex.toLocaleString()}</td>
            </tr>`).join('')}
        </tbody>
      </table>` : '';

    const sensHtml = sensRes ? `
      <h3>6. Parametric Sensitivity Analysis</h3>
      <p style="font-size:11.5px;"><em>${esc(sensRes.disclaimer)}</em></p>
      ${Charts ? `<div style="margin:8px 0;">${Charts.renderSensitivitySVG(sensRes)}</div>` : ''}
      <table>
        <thead><tr><th>Tariff Scale</th><th>Tariff ($/kWh)</th><th>Est. Annual Grid Cost</th><th>Simple Payback</th></tr></thead>
        <tbody>
          ${sensRes.tariffSweep.map((t) => `
            <tr><td>${t.label}</td><td>$${t.tariff}</td><td>$${t.annualGridCost.toLocaleString()}/yr</td><td>${t.paybackYrs !== null ? t.paybackYrs + ' yrs' : 'N/A'}</td></tr>`).join('')}
        </tbody>
      </table>` : '';

    const cmpHtml = comparison ? `
      <h3>7. Stress-Test Comparison (Baseline vs. Modified Shock)</h3>
      ${Charts ? `<div style="margin:8px 0;">${Charts.renderComparisonBarSVG(comparison)}</div>` : ''}
      <table>
        <thead><tr><th>Metric</th><th>Baseline Plan</th><th>Stress-Test</th><th>Delta</th></tr></thead>
        <tbody>
          <tr><td>Daily Electricity Demand</td><td>${comparison.base.electricity.dailyDemandKwh} kWh</td><td>${comparison.mod.electricity.dailyDemandKwh} kWh</td><td>${comparison.deltas.dailyDemandKwh >= 0 ? '+' : ''}${comparison.deltas.dailyDemandKwh} kWh</td></tr>
          <tr><td>Daily Solar Generation</td><td>${comparison.base.electricity.dailySolarKwh} kWh</td><td>${comparison.mod.electricity.dailySolarKwh} kWh</td><td>${comparison.deltas.dailySolarKwh >= 0 ? '+' : ''}${comparison.deltas.dailySolarKwh} kWh</td></tr>
          <tr><td>Unserved Night Demand</td><td>${comparison.base.storage.unservedNightKwh} kWh</td><td>${comparison.mod.storage.unservedNightKwh} kWh</td><td>${comparison.deltas.unservedNightKwh >= 0 ? '+' : ''}${comparison.deltas.unservedNightKwh} kWh</td></tr>
          <tr><td>Estimated Backup Duration</td><td>${comparison.base.storage.backupHours} hrs</td><td>${comparison.mod.storage.backupHours} hrs</td><td>${comparison.deltas.backupHours >= 0 ? '+' : ''}${comparison.deltas.backupHours} hrs</td></tr>
          <tr><td>Est. Monthly Grid Expense</td><td>$${comparison.base.storage.monthlyGridCost}</td><td>$${comparison.mod.storage.monthlyGridCost}</td><td>${comparison.deltas.monthlyGridCost >= 0 ? '+' : ''}$${comparison.deltas.monthlyGridCost}</td></tr>
          <tr><td>Water Shortfall</td><td>${comparison.base.water.shortfallL} L/d</td><td>${comparison.mod.water.shortfallL} L/d</td><td>${comparison.deltas.waterShortfallL >= 0 ? '+' : ''}${comparison.deltas.waterShortfallL} L/d</td></tr>
        </tbody>
      </table>` : '';

    const intelHtml = intelRes ? `
      <h3>8. Aetheria Intelligence — Key Tradeoffs &amp; Suggested Next Investigations</h3>
      <ul>${intelRes.tradeoffs.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      <p><strong>Recommended Real-World Engineering Questions Before Procurement:</strong></p>
      <ul>${intelRes.investigationQuestions.map((q) => `<li>${esc(q)}</li>`).join('')}</ul>` : '';

    return `
      <div style="border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-bottom:12px;">
        <h1 style="margin:0;font-size:20px;">AETHERIA — Planetary Systems Intelligence | Preliminary Plan Report</h1>
        <p style="margin:4px 0 0;font-size:12px;">Project: <strong>${esc(state.projectName || state.label)}</strong> (${esc(state.label)}) &bull; Chemistry: <strong>${esc((state.selectedStorageTech || 'lfp').toUpperCase())}</strong> &bull; Generated: ${esc(nowStr)}</p>
        <p style="margin:3px 0 0;font-size:11px;color:#64748b;">Simplified educational digital-twin-style simulation — not a certified site engineering design.</p>
      </div>

      <h3>1. Electricity Demand &amp; Solar Generation</h3>
      <table>
        <thead><tr><th>Appliance / Load</th><th>Power</th><th>Daily Hours</th><th>Qty</th><th>Daily Energy</th></tr></thead>
        <tbody>
          ${appRows}
          <tr><td>Water Pumping (Idealized Hydraulic)</td><td colspan="3">Head: ${water.inputs.headMeters} m &bull; Eff: ${Math.round(water.inputs.pumpEfficiency * 100)}%</td><td><strong>${electricity.waterPumpKwh} kWh/d</strong></td></tr>
          <tr><td colspan="4"><strong>Total Daily Electricity Demand</strong></td><td><strong>${electricity.dailyDemandKwh} kWh/d (${electricity.monthlyDemandKwh} kWh/mo)</strong></td></tr>
        </tbody>
      </table>
      <p><strong>Solar PV Configuration:</strong> ${electricity.inputs.installedKwp} kWp installed (${electricity.requiredAreaM2} m² required vs. ${electricity.inputs.roofAreaM2} m² available) &bull; Solar Resource: ${electricity.inputs.peakSunHours} kWh/m²/day (${esc(state.electricity.solarSourceLabel || 'Editable assumption')}) &bull; Performance Ratio: ${electricity.inputs.performanceRatio}.</p>
      <p><strong>Solar Output &amp; Operating Savings:</strong> ${electricity.dailySolarKwh} kWh/day generated &bull; ${Math.round(storage.solarFraction * 100)}% of demand served by solar &bull; Remaining grid/unserved: ${storage.totalGridOrUnservedKwh} kWh/day &bull; Est. Monthly Grid Cost: $${storage.monthlyGridCost} (est. savings: $${storage.monthlySavings}/mo at $${electricity.inputs.tariffPerKwh}/kWh) &bull; Est. CO₂ Avoided: ${storage.monthlyCo2AvoidedKg} kg/mo (at ${electricity.inputs.gridEmissionsKgPerKwh} kg CO₂/kWh).</p>

      <h3>2. Battery Storage, Nighttime Reliability &amp; 72-Hour Storm Test</h3>
      <p><strong>Battery Bank:</strong> ${storage.inputs.batteryKwh} kWh nominal &bull; Depth of Discharge: ${Math.round(storage.inputs.depthOfDischarge * 100)}% (${storage.usableCapacityKwh} kWh usable) &bull; Charge/Discharge Efficiencies: ${Math.round(storage.inputs.chargeEff * 100)}% / ${Math.round(storage.inputs.dischargeEff * 100)}%.</p>
      <p><strong>Night Performance:</strong> Nighttime demand (${Math.round(storage.inputs.nightShare * 100)}% share): ${storage.nighttimeDemandKwh} kWh/night &bull; Deliverable from storage: ${storage.maxDeliverableNightKwh} kWh &bull; Unserved nighttime demand: <strong>${storage.unservedNightKwh} kWh</strong> &bull; Estimated backup duration: <strong>${storage.backupHours} hours</strong> &bull; Round-trip efficiency loss: ${storage.roundTripLossKwh} kWh/day.</p>
      ${chart24h}
      ${stormHtml}

      <h3>3. Water Supply &amp; Hydraulic Energy</h3>
      <p><strong>Water Balance:</strong> ${water.inputs.people} people × ${water.inputs.litersPerPerson} L/person = ${water.dailyDemandL} L/day demand &bull; Raw supply: ${water.inputs.rawSupplyL} L/day minus ${water.inputs.leakagePct}% leakage (${water.leakageLossL} L/day) = <strong>${water.effectiveSupplyL} L/day effective supply</strong> &bull; Status: <strong>${water.status}</strong> (${water.shortfallL > 0 ? 'Shortfall of ' + water.shortfallL + ' L/d' : 'Surplus of ' + water.surplusL + ' L/d'}).</p>
      <p><strong>Idealized Pumping Energy:</strong> ${water.pumpingKwhPerDay} kWh/day (${water.hydraulicEnergyJ.toLocaleString()} J) using E = (1000 kg/m³ × 9.80665 m/s² × V × h) / η.</p>

      ${econHtml}
      ${fourWayHtml}
      ${sensHtml}
      ${cmpHtml}
      ${intelHtml}

      <h3>9. Transparent Formulas, Sources &amp; Engineering Disclaimer</h3>
      <p style="font-size:11.5px;">
        <strong>Formulas:</strong> Daily Demand = Σ(W/1000 × h × qty) + Pump kWh; Daily PV = kWp × PSH × PR; Usable Storage = Capacity × DoD; Hydraulic Energy = (ρ·g·V·h / η) / 3,600,000; Simple Payback = Total Equipment CapEx / Annual Grid Savings.<br>
        <strong>References:</strong> IUPAC/NIST atomic &amp; physical constants, NASA POWER Solar Climatology (power.larc.nasa.gov), US DOE/NREL PV performance factors, OpenStax University Physics &amp; Chemistry 2e.<br>
        <strong>Important Limitation:</strong> This report is a simplified digital-twin-style educational and preliminary planning estimate. Installation labor, inverter surge ratings, wire sizing, pipe friction losses, structural loading, and water potability testing require licensed engineers before construction.
      </p>`;
  }

  global.AetheriaReport = { buildReportHTML };
})(typeof window !== 'undefined' ? window : globalThis);
