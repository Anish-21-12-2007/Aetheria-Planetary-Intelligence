/* ============================================================================
 * AETHERIA — The Future We Build
 * src/scene/Fallback2DView.js
 * Accessible Non-WebGL / Low-Graphics 2D Interactive SVG Schematic
 * Mirrors the exact same ScienceModel calculations as the 3D WebGL2 community.
 * ============================================================================ */
(function (global) {
  'use strict';

  function renderFallback2D(container, evalRes, elementObj, viewKey) {
    if (!container || !evalRes) return;
    const { electricity, storage, water } = evalRes;
    const litCount = Math.round(6 * (storage.nightReliability * 0.6 + storage.solarFraction * 0.4));
    const battPct = storage.usableCapacityKwh > 0
      ? Math.round(Math.min(100, (storage.storedNetKwh / storage.usableCapacityKwh) * 100))
      : 0;
    const waterPct = Math.round(Math.min(100, water.coverageRatio * 100));
    const solarPct = Math.round(Math.min(100, storage.solarFraction * 100));

    let bldgsSvg = '';
    for (let i = 0; i < 6; i++) {
      const x = 60 + i * 74;
      const h = i === 2 ? 96 : (i === 0 ? 78 : 66);
      const y = 250 - h;
      const lit = i < litCount;
      bldgsSvg += `
        <rect x="${x}" y="${y}" width="56" height="${h}" rx="4" fill="#1e293b" stroke="${lit ? '#fbbf24' : '#334155'}" stroke-width="1.5"/>
        <rect x="${x+10}" y="${y+14}" width="14" height="14" rx="2" fill="${lit ? '#fde047' : '#0f172a'}"/>
        <rect x="${x+32}" y="${y+14}" width="14" height="14" rx="2" fill="${lit ? '#fde047' : '#0f172a'}"/>
        <rect x="${x+10}" y="${y+36}" width="14" height="14" rx="2" fill="${lit ? '#fbbf24' : '#0f172a'}"/>
        <rect x="${x+32}" y="${y+36}" width="14" height="14" rx="2" fill="${lit ? '#fbbf24' : '#0f172a'}"/>`;
    }

    container.innerHTML = `
      <svg viewBox="0 0 820 340" role="img" aria-label="2D Community Energy, Storage, and Water Schematic" style="width:100%;height:100%;max-height:360px;display:block;">
        <defs>
          <linearGradient id="sky2d" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#071126"/>
            <stop offset="100%" stop-color="#0f2544"/>
          </linearGradient>
        </defs>
        <rect width="820" height="340" fill="url(#sky2d)"/>
        <text x="24" y="30" fill="#7dd3fc" font-size="13" font-family="system-ui,sans-serif" font-weight="700">
          AETHERIA 2D ACCESSIBLE SYSTEM VIEW (${String(viewKey || 'hub').toUpperCase()})
        </text>
        <text x="24" y="48" fill="#94a3b8" font-size="11" font-family="system-ui,sans-serif">
          Solar: ${electricity.dailySolarKwh} kWh/day (${solarPct}% served) • Battery: ${battPct}% charged (${storage.backupHours}h backup) • Water: ${waterPct}% met
        </text>

        <!-- Solar Array -->
        <rect x="60" y="92" width="140" height="44" rx="6" fill="#0c4a6e" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="130" y="112" text-anchor="middle" fill="#e0f2fe" font-size="11" font-weight="700">SOLAR PV ARRAY</text>
        <text x="130" y="127" text-anchor="middle" fill="#7dd3fc" font-size="10">${electricity.inputs.installedKwp} kWp → ${electricity.dailySolarKwh} kWh/d</text>

        <!-- Community Buildings -->
        ${bldgsSvg}
        <rect x="40" y="250" width="740" height="6" rx="3" fill="#334155"/>
        <text x="260" y="276" text-anchor="middle" fill="#cbd5e1" font-size="11">Powered Community Buildings: ${litCount}/6 (${Math.round(storage.nightReliability * 100)}% night reliability)</text>

        <!-- Battery Substation -->
        <rect x="530" y="122" width="110" height="128" rx="8" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
        <rect x="542" y="${238 - Math.round(battPct * 0.9)}" width="86" height="${Math.round(battPct * 0.9)}" rx="4" fill="${battPct > 45 ? '#10b981' : '#f59e0b'}"/>
        <text x="585" y="142" text-anchor="middle" fill="#ecfdf5" font-size="11" font-weight="700">BATTERY</text>
        <text x="585" y="276" text-anchor="middle" fill="#6ee7b7" font-size="11">${storage.storedNetKwh} / ${storage.usableCapacityKwh} kWh</text>

        <!-- Water Reservoir -->
        <rect x="665" y="122" width="110" height="128" rx="8" fill="#0f172a" stroke="#38bdf8" stroke-width="1.5"/>
        <rect x="677" y="${238 - Math.round(waterPct * 0.9)}" width="86" height="${Math.round(waterPct * 0.9)}" rx="4" fill="#0284c7"/>
        <text x="720" y="142" text-anchor="middle" fill="#e0f2fe" font-size="11" font-weight="700">WATER</text>
        <text x="720" y="276" text-anchor="middle" fill="#7dd3fc" font-size="11">${water.effectiveSupplyL} / ${water.dailyDemandL} L/d</text>
      </svg>`;
  }

  global.AetheriaFallback2D = { renderFallback2D };
})(typeof window !== 'undefined' ? window : globalThis);
