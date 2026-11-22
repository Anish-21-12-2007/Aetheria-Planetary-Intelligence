/* ============================================================================
 * AETHERIA — Planetary Systems Intelligence Platform
 * src/ui/Charts.js
 * Clean, Reusable, Accessible Inline SVG Charts (Workspace + PDF Report)
 * Includes: 24h Energy Flow, 72h Storm, Baseline vs Stress, 4-Way Matrix,
 * and Parametric Sensitivity Curves.
 * ============================================================================ */
(function (global) {
  'use strict';

  function render24hChartSVG(hourlyProfile, usableCapacityKwh) {
    const prof = hourlyProfile || [];
    const maxKw = Math.max(0.5, ...prof.map((p) => Math.max(p.solarKw, p.loadKw)));
    const maxSoc = Math.max(1, usableCapacityKwh || 1);
    const bars = prof.map((p, i) => {
      const x = 14 + i * 16.5;
      const sh = Math.round((p.solarKw / maxKw) * 76);
      const lh = Math.round((p.loadKw / maxKw) * 76);
      const uh = Math.round((p.unmetKw / maxKw) * 76);
      return `
        <rect x="${x}" y="${92 - sh}" width="6" height="${sh}" fill="#38bdf8" opacity="0.88"/>
        <rect x="${x + 6}" y="${92 - lh}" width="6" height="${lh}" fill="#f59e0b" opacity="0.85"/>
        ${uh > 0 ? `<rect x="${x + 6}" y="${92 - uh}" width="6" height="${uh}" fill="#f43f5e"/>` : ''}`;
    }).join('');
    const socPts = prof.map((p, i) => `${18 + i * 16.5},${92 - Math.round((p.socKwh / maxSoc) * 76)}`).join(' ');

    return `
      <svg viewBox="0 0 420 114" role="img" aria-label="24-Hour Solar, Load, and Battery Charge Chart" style="width:100%;height:auto;background:#060e1f;border-radius:8px;border:1px solid #1e293b;">
        ${bars}
        <polyline fill="none" stroke="#10b981" stroke-width="2.2" points="${socPts}"/>
        <line x1="12" y1="92" x2="410" y2="92" stroke="#475569" stroke-width="1"/>
        <text x="16" y="106" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">00:00</text>
        <text x="114" y="106" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">06:00</text>
        <text x="208" y="106" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">12:00</text>
        <text x="304" y="106" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">18:00</text>
        <text x="384" y="106" fill="#94a3b8" font-size="9" font-family="system-ui,sans-serif">23:00</text>
      </svg>`;
  }

  function render72hStormChartSVG(multiDayRes, usableCapacityKwh) {
    const hrs = (multiDayRes && multiDayRes.hours) || [];
    const maxSoc = Math.max(1, usableCapacityKwh || 1);
    const maxKw = Math.max(0.5, ...hrs.map((h) => Math.max(h.solarKw, h.loadKw)));
    const socPts = hrs.map((h, i) => `${14 + i * 5.5},${88 - Math.round((h.socKwh / maxSoc) * 72)}`).join(' ');
    const unmetBars = hrs.map((h, i) => {
      if (h.unmetKw <= 0.01) return '';
      const uh = Math.max(4, Math.round((h.unmetKw / maxKw) * 72));
      return `<rect x="${12 + i * 5.5}" y="${88 - uh}" width="4" height="${uh}" fill="#f43f5e" opacity="0.88"/>`;
    }).join('');
    return `
      <svg viewBox="0 0 420 110" role="img" aria-label="72-Hour 3-Day Storm Battery Autonomy Chart" style="width:100%;height:auto;background:#060e1f;border-radius:8px;border:1px solid #1e293b;">
        <line x1="146" y1="10" x2="146" y2="88" stroke="#334155" stroke-dasharray="3 3"/>
        <line x1="278" y1="10" x2="278" y2="88" stroke="#334155" stroke-dasharray="3 3"/>
        ${unmetBars}
        <polyline fill="none" stroke="#10b981" stroke-width="2" points="${socPts}"/>
        <line x1="12" y1="88" x2="410" y2="88" stroke="#475569" stroke-width="1"/>
        <text x="56" y="102" fill="#7dd3fc" font-size="9" font-family="system-ui,sans-serif">Day 1</text>
        <text x="192" y="102" fill="#fde68a" font-size="9" font-family="system-ui,sans-serif">Day 2</text>
        <text x="328" y="102" fill="#fda4af" font-size="9" font-family="system-ui,sans-serif">Day 3</text>
      </svg>`;
  }

  function renderComparisonBarSVG(cmp) {
    const items = [
      { lbl: 'Demand (kWh)', b: cmp.base.electricity.dailyDemandKwh, m: cmp.mod.electricity.dailyDemandKwh },
      { lbl: 'Solar (kWh)',  b: cmp.base.electricity.dailySolarKwh,  m: cmp.mod.electricity.dailySolarKwh },
      { lbl: 'Unmet Night',  b: cmp.base.storage.unservedNightKwh,   m: cmp.mod.storage.unservedNightKwh }
    ];
    const maxV = Math.max(1, ...items.flatMap((x) => [x.b, x.m]));
    const rows = items.map((it, idx) => {
      const y = 14 + idx * 34;
      const bw = Math.round((it.b / maxV) * 240);
      const mw = Math.round((it.m / maxV) * 240);
      return `
        <text x="8" y="${y + 10}" fill="#cbd5e1" font-size="10" font-family="system-ui,sans-serif">${it.lbl}</text>
        <rect x="115" y="${y}" width="${bw}" height="9" rx="2" fill="#38bdf8"/>
        <text x="${120 + bw}" y="${y + 8}" fill="#7dd3fc" font-size="9">${it.b}</text>
        <rect x="115" y="${y + 12}" width="${mw}" height="9" rx="2" fill="#f59e0b"/>
        <text x="${120 + mw}" y="${y + 20}" fill="#fde68a" font-size="9">${it.m}</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 420 122" role="img" aria-label="Baseline vs Stress-Test Bar Comparison" style="width:100%;height:auto;background:#060e1f;border-radius:8px;border:1px solid #1e293b;">
        ${rows}
      </svg>`;
  }

  function renderFourWayMatrixSVG(fourWayRes) {
    const list = (fourWayRes && fourWayRes.scenarios) || [];
    const maxCost = Math.max(1, ...list.map((s) => s.eval.storage.monthlyGridCost));
    const colors = ['#f43f5e', '#f59e0b', '#38bdf8', '#10b981'];
    const rows = list.map((s, idx) => {
      const y = 12 + idx * 27;
      const w = Math.max(4, Math.round((s.eval.storage.monthlyGridCost / maxCost) * 195));
      const pct = Math.round(s.eval.storage.solarFraction * 100);
      const shortLbl = { A: "A. Grid-Only", B: "B. Solar-Only", C: "C. Solar + Storage", D: "D. Efficiency (-20%)" }[s.key] || s.label.slice(0, 20);
      return `
        <text x="8" y="${y + 11}" fill="#e2e8f0" font-size="9.5" font-family="system-ui,sans-serif">${shortLbl}</text>
        <rect x="148" y="${y + 2}" width="${w}" height="12" rx="3" fill="${colors[idx % 4]}"/>
        <text x="${154 + w}" y="${y + 11}" fill="#cbd5e1" font-size="9">$${s.eval.storage.monthlyGridCost}/mo (${pct}% PV)</text>`;
    }).join('');
    return `
      <svg viewBox="0 0 420 124" role="img" aria-label="4-Way Scenario Monthly Grid Cost Comparison" style="width:100%;height:auto;background:#060e1f;border-radius:8px;border:1px solid #1e293b;">
        ${rows}
      </svg>`;
  }

  function renderSensitivitySVG(sensRes) {
    if (!sensRes) return '';
    const bList = sensRes.batterySweep || [];
    const sList = sensRes.solarSweep || [];
    const batPts = bList.map((pt, i) => `${28 + i * 40},${86 - Math.round((pt.nightRelPct / 100) * 62)}`).join(' ');
    const solPts = sList.map((pt, i) => `${232 + i * 40},${86 - Math.round((pt.solarFractionPct / 100) * 62)}`).join(' ');
    return `
      <svg viewBox="0 0 420 112" role="img" aria-label="Parametric Sensitivity Curves for Battery Capacity and Solar Resource" style="width:100%;height:auto;background:#060e1f;border-radius:8px;border:1px solid #1e293b;">
        <text x="20" y="15" fill="#7dd3fc" font-size="9.5" font-weight="700" font-family="system-ui,sans-serif">Battery Scale → Night Reliability %</text>
        <line x1="22" y1="86" x2="196" y2="86" stroke="#475569" stroke-width="1"/>
        <polyline fill="none" stroke="#10b981" stroke-width="2.2" points="${batPts}"/>
        ${bList.map((pt, i) => `<circle cx="${28 + i * 40}" cy="${86 - Math.round((pt.nightRelPct / 100) * 62)}" r="3" fill="#34d399"/><text x="${20 + i * 40}" y="100" fill="#94a3b8" font-size="8.5">${pt.label}</text>`).join('')}

        <line x1="210" y1="10" x2="210" y2="102" stroke="#1e293b" stroke-width="1"/>

        <text x="224" y="15" fill="#fde68a" font-size="9.5" font-weight="700" font-family="system-ui,sans-serif">Solar PSH Scale → Solar Coverage %</text>
        <line x1="226" y1="86" x2="400" y2="86" stroke="#475569" stroke-width="1"/>
        <polyline fill="none" stroke="#38bdf8" stroke-width="2.2" points="${solPts}"/>
        ${sList.map((pt, i) => `<circle cx="${232 + i * 40}" cy="${86 - Math.round((pt.solarFractionPct / 100) * 62)}" r="3" fill="#7dd3fc"/><text x="${224 + i * 40}" y="100" fill="#94a3b8" font-size="8.5">${pt.label}</text>`).join('')}
      </svg>`;
  }

  global.AetheriaCharts = {
    render24hChartSVG,
    render72hStormChartSVG,
    renderComparisonBarSVG,
    renderFourWayMatrixSVG,
    renderSensitivitySVG
  };
})(typeof window !== 'undefined' ? window : globalThis);
