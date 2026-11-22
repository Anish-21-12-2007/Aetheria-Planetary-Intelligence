/* ============================================================================
 * AETHERIA — The Future We Build
 * src/story/StoryEngine.js
 * 4 Original Characters with Inline SVG Portraits & Real-Data Reactive Beats
 * Characters react strictly to calculated ScienceModel outcomes — never fake.
 * ============================================================================ */
(function (global) {
  'use strict';

  const CHARACTERS = {
    maya: {
      name: 'Maya Chen',
      role: 'Community Microgrid Engineer',
      color: '#38bdf8',
      avatar: `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#0c2848" stroke="#38bdf8" stroke-width="1.5"/><circle cx="20" cy="15" r="6" fill="#bae6fd"/><path d="M9 34c1.5-6.5 6-10 11-10s9.5 3.5 11 10" fill="#38bdf8"/></svg>`
    },
    david: {
      name: 'Prof. David Okafor',
      role: 'Aetheria School Principal',
      color: '#f59e0b',
      avatar: `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#362109" stroke="#f59e0b" stroke-width="1.5"/><circle cx="20" cy="15" r="6" fill="#fde68a"/><path d="M9 34c1.5-6.5 6-10 11-10s9.5 3.5 11 10" fill="#f59e0b"/></svg>`
    },
    priya: {
      name: 'Dr. Priya Nair',
      role: 'Water-Systems Specialist',
      color: '#2dd4bf',
      avatar: `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#092d2c" stroke="#2dd4bf" stroke-width="1.5"/><circle cx="20" cy="15" r="6" fill="#99f6e4"/><path d="M9 34c1.5-6.5 6-10 11-10s9.5 3.5 11 10" fill="#2dd4bf"/></svg>`
    },
    elena: {
      name: 'Elena Alvarez',
      role: 'Residents’ Council Representative',
      color: '#a78bfa',
      avatar: `<svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#231642" stroke="#a78bfa" stroke-width="1.5"/><circle cx="20" cy="15" r="6" fill="#ddd6fe"/><path d="M9 34c1.5-6.5 6-10 11-10s9.5 3.5 11 10" fill="#a78bfa"/></svg>`
    }
  };

  function getCharacterBeat(viewKey, state, evalRes, multiDayRes) {
    const { electricity, storage, water, economics } = evalRes;

    if (viewKey === 'materials') {
      if (state.selectedStorageTech === 'lead-acid') {
        return {
          char: CHARACTERS.maya,
          quote: `Our aging Lead-Acid bank only gives 50% usable depth of discharge and wears out fast under daily solar cycling. Compare LFP and Sodium-Ion below to upgrade safely.`
        };
      }
      return {
        char: CHARACTERS.maya,
        quote: `Good call choosing ${state.selectedStorageTech.toUpperCase()}! Notice how raising usable Depth of Discharge to ${Math.round(storage.inputs.depthOfDischarge * 100)}% immediately boosts usable energy in Mission 3 without inflating battery weight.`
      };
    }

    if (viewKey === 'power') {
      if (!electricity.roofFits) {
        return {
          char: CHARACTERS.maya,
          quote: `Wait—${electricity.inputs.installedKwp} kWp needs ${electricity.requiredAreaM2} m², which exceeds our ${electricity.inputs.roofAreaM2} m² roof limit. Either trim appliance hours or expand available area.`
        };
      }
      if (electricity.dailySolarKwh < electricity.dailyDemandKwh * 0.80) {
        return {
          char: CHARACTERS.david,
          quote: `Right now our panels generate ${electricity.dailySolarKwh} kWh/day against ${electricity.dailyDemandKwh} kWh/day of demand. If we don't reach at least 80% solar coverage, the school's computer lab stays vulnerable to grid cuts.`
        };
      }
      return {
        char: CHARACTERS.david,
        quote: `Daytime generation hit ${electricity.dailySolarKwh} kWh/day—our classrooms are powered! Now let’s test whether stored energy keeps the evening study hall lit after sunset.`
      };
    }

    if (viewKey === 'storage') {
      if (storage.unservedNightKwh > 0.5) {
        return {
          char: CHARACTERS.david,
          quote: `Sunset hit and we’re still short ${storage.unservedNightKwh} kWh tonight (${storage.backupHours} hrs backup). ${storage.daytimeSurplusKwh < storage.nighttimeDemandKwh ? 'We need both more daytime solar surplus AND more battery capacity.' : 'Increase battery kWh to capture our daytime solar surplus!'}`
        };
      }
      if (multiDayRes && !multiDayRes.survived) {
        return {
          char: CHARACTERS.maya,
          quote: `Clear nights are covered, but our 3-day storm test still shows ${multiDayRes.outageHours} outage hours across overcast days. Notice the tradeoff: multi-day autonomy costs more upfront ($${economics.totalCapex.toLocaleString()}).`
        };
      }
      return {
        char: CHARACTERS.david,
        quote: `First full night survived—${storage.backupHours} hours of backup with zero blackouts in the study hall! Even the 3-day storm test holds steady.`
      };
    }

    if (viewKey === 'water') {
      if (water.shortfallL > 1) {
        return {
          char: CHARACTERS.priya,
          quote: `We’re losing ${water.leakageLossL} L/day (${water.inputs.leakagePct}% pipe leakage), leaving a ${water.shortfallL} L/day shortfall. Repairing leaks saves both water AND the ${water.pumpingKwhPerDay} kWh/day of pumping power drawn from our microgrid.`
        };
      }
      return {
        char: CHARACTERS.priya,
        quote: `Water balance is secure (+${water.surplusL} L/day surplus) with ${water.pumpingKwhPerDay} kWh/day pumping load coupled cleanly into your electricity plan. Remember: volume alone never proves water safety—treatment testing is still essential.`
      };
    }

    if (viewKey === 'future') {
      if (!economics.withinBudget) {
        return {
          char: CHARACTERS.elena,
          quote: `Residents love the reliability, but $${economics.totalCapex.toLocaleString()} exceeds our $${economics.inputs.budgetCap.toLocaleString()} budget cap by $${economics.budgetDelta.toLocaleString()}. Can we trim waste or adjust capacity to balance affordability and resilience?`
        };
      }
      return {
        char: CHARACTERS.elena,
        quote: `You balanced reliability with affordability—$${economics.totalCapex.toLocaleString()} estimated equipment cost (est. payback: ${economics.simplePaybackYears ? economics.simplePaybackYears + ' yrs' : 'N/A'}) and $${storage.monthlySavings}/mo in grid savings. Ready to export our community plan!`
      };
    }

    // Default Hub beat
    const solved = Object.values(state.missionsCompleted).filter(Boolean).length;
    if (solved === 0) {
      return {
        char: CHARACTERS.elena,
        quote: `Look out at Aetheria tonight—${Math.round((1 - storage.nightReliability) * 100)}% of our nighttime electricity demand is unserved and our water pipes leak ${water.inputs.leakagePct}%. Where should we start rebuilding?`
      };
    }
    return {
      char: CHARACTERS.elena,
      quote: `${solved} of 5 systems verified! Our community now covers ${Math.round(storage.solarFraction * 100)}% of demand with solar and ${storage.backupHours} hours of night backup.`
    };
  }

  global.AetheriaStory = { CHARACTERS, getCharacterBeat };
})(typeof window !== 'undefined' ? window : globalThis);
