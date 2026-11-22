# AETHERIA — Planetary Systems Intelligence Platform

**Tagline:** *Explore. Simulate. Solve. Turn science into solutions.*

Aetheria is an offline-capable interactive scientific computing and decision-support platform for exploring, simulating, and planning interconnected **solar power, battery storage, materials, and water-energy infrastructure**—combining a deterministic physics simulation engine, an interactive 3D digital-twin-style community (with adaptive quality and automatic 2D SVG fallback), reactive storytelling, and professional preliminary report export.

## Core Capabilities

1. **Interactive 3D Digital Twin & Landmark Inspector (`src/scene/AetheriaCommunityScene.js`)**:
   - Features the **Aetheria School**, **Community Clinic**, **Terraced Residential Homes**, **Tilted Solar Microgrid Rows**, **Battery Storage Substation**, **Coastal Reservoir, Dam, Water Tower & Pipeline**, **Glowing Energy Conduits**, and a **Live 24-Hour Sun/Moon Cycle**.
   - Click directly on any 3D landmark (or use the `INSPECT:` pills) to open a live telemetry inspector reading real calculated outputs.
   - Cycles smoothly across **3D High**, **3D Balanced**, and **2D Accessible SVG Mode** (activated automatically on non-WebGL or `prefers-reduced-motion` devices).
2. **Deterministic Simulation Engine (`src/core/ScienceModel.js`)**:
   - **Electricity & Solar PV**: `Daily Demand = Σ(W/1000 × h × qty) + Water Pumping kWh`; `Daily PV = kWp × PSH × PR`; optional live [NASA POWER Climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) (`ALLSKY_SFC_SW_DWN`) with graceful offline fallback.
   - **24-Hour & 72-Hour Storm Autonomy**: Continuous state-of-charge tracking across 3 consecutive variable-sun days (`[100%, 45%, 35%]` editable).
   - **Water–Energy Nexus**: Daily water demand, pipe leakage, and exact idealized hydraulic pumping energy (`E = ρ·g·V·h / η`, Joules → kWh via `/ 3,600,000`) coupled into electricity demand.
   - **4-Way Architectural Scenario Matrix**: Compares **A. Grid-Only**, **B. Solar-Only**, **C. Solar + Storage (Current)**, and **D. Efficiency (-20%) + Solar + Storage** under identical assumptions.
   - **Parametric Sensitivity Analysis**: One-at-a-time deterministic sweeps across Electricity Tariff, Battery Capacity, and Solar Resource (PSH).
   - **Editable CapEx & Simple Payback**: Equipment-only capital cost benchmarks separated transparently from excluded items (labor, inverters, wiring, permitting, O&M).
3. **Aetheria Intelligence (`src/core/IntelligenceEngine.js`)**:
   - **100% Local Deterministic Reasoning**: Root-cause diagnostics (identifying PV surplus vs. battery capacity vs. DoD bottlenecks), physical input validation warnings, quantified tradeoffs, and tailored engineering investigation questions—no paid AI key required.
   - **Optional Provider-Independent AI Adapter**: Clean, disabled-by-default interface that never hardcodes credentials, never fabricates AI responses, and never transmits data without explicit user opt-in.
4. **Scientific Discovery Lab & Reactive Story Mode (`src/story/StoryEngine.js`)**:
   - **5 Predict → Experiment → Verify Challenges** (Blackout, Night Storage, Water–Energy, Efficiency vs. Investment, and 72-Hour Storm Resilience) allowing multiple valid engineering solutions.
   - **Story Mode (2045)** featuring 4 original characters (**Maya Chen**, **Prof. David Okafor**, **Dr. Priya Nair**, **Elena Alvarez**) reacting dynamically to your real calculated numbers, plus a **2-Minute Live Judge Demo**.
5. **Multi-Project Decision Workspace & Report Export (`src/core/AppState.js`, `src/ui/ReportBuilder.js`)**:
   - Create, duplicate, rename, delete, switch, and import/export multiple named projects locally (`localStorage` v3 with automatic v2 migration), with **Undo history**, progressive disclosure (`Advanced Inputs`), and XSS-safe HTML escaping.
   - Export a printable **Preliminary Engineering Analysis Report (Print-to-PDF)** containing 5 embedded SVG charts, full inputs/assumptions, 4-way matrix, sensitivity analysis, tradeoffs, limitations, and citations—plus structured JSON export.

## Architecture & Build (15 Clean Modules → Single `index.html`)

- `src/core/`: `MaterialsData.js`, `ScienceModel.js`, `IntelligenceEngine.js`, `AppState.js`
- `src/story/`: `StoryEngine.js`
- `src/scene/`: `AetheriaCommunityScene.js`, `Fallback2DView.js`
- `src/engine/`, `src/math/`, `src/audio/`: `WebGL2Engine.js`, `PostProcess.js`, `CameraRig.js`, `MathCore.js`, `AudioEngine.js`
- `src/ui/`: `Charts.js`, `ReportBuilder.js`, `AetheriaApp.js`, `styles.css`, `index.template.html`

### Rebuild & Verify Locally

```bash
# 1. Build single-file index.html (runs JS syntax & GLSL 300 es static linting)
python3 build.py

# 2. Run automated math, physics, intelligence & state unit tests (25 suites)
node tests/test_math.mjs
node tests/test_science_model.mjs

# 3. Run headless Chromium end-to-end verification (Tests A through P)
python3 tests/e2e_verify.py
```

## Deploy for Free on GitHub Pages

1. Upload this repository to GitHub.
2. Open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. The included `.github/workflows/pages.yml` automatically publishes `index.html`.

## Scientific Honesty & Limitations

- Aetheria is a **simplified educational digital-twin-style simulation and preliminary planning tool**—not a certified site engineering design.
- Equipment CapEx benchmarks exclude installation labor, racking, inverters, wire sizing, permitting, maintenance, and financing; hydraulic calculations exclude pipe friction losses and water-quality potability testing.
- References: IUPAC/NIST atomic & physical constants, NASA Langley Research Center POWER Project (`https://power.larc.nasa.gov/`), US DOE/NREL PV performance factors, OpenStax University Physics & Chemistry 2e.

## License

MIT License — see [LICENSE](LICENSE).
