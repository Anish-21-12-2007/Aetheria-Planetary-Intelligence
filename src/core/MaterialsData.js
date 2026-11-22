/* ============================================================================
 * AETHERIA — The Future We Build
 * src/core/MaterialsData.js
 * Verified 118-Element Periodic Table + Practical Infrastructure Material Profiles
 * Sources: IUPAC / NIST Atomic Weights, USGS Mineral Commodity Summaries,
 * US Department of Energy (NREL/EERE), OpenStax Chemistry 2e.
 * ============================================================================ */
(function (global) {
  'use strict';

  const CATEGORY_META = {
    NM: { name: 'Reactive Nonmetal', hex: '#38bdf8', rgb: [0.22, 0.74, 0.97] },
    NG: { name: 'Noble Gas',         hex: '#a78bfa', rgb: [0.65, 0.55, 0.98] },
    AM: { name: 'Alkali Metal',      hex: '#f43f5e', rgb: [0.96, 0.25, 0.37] },
    AE: { name: 'Alkaline Earth',    hex: '#fb923c', rgb: [0.98, 0.57, 0.24] },
    MD: { name: 'Metalloid',         hex: '#2dd4bf', rgb: [0.18, 0.83, 0.75] },
    HL: { name: 'Halogen',           hex: '#84cc16', rgb: [0.52, 0.80, 0.09] },
    TM: { name: 'Transition Metal',  hex: '#f59e0b', rgb: [0.96, 0.62, 0.04] },
    PT: { name: 'Post-Transition',   hex: '#60a5fa', rgb: [0.38, 0.65, 0.98] },
    LN: { name: 'Lanthanide',        hex: '#ec4899', rgb: [0.93, 0.28, 0.60] },
    AC: { name: 'Actinide',          hex: '#fb7185', rgb: [0.98, 0.44, 0.52] }
  };

  // [Z, sym, name, atomicMass, cat, col(1-18), row(1-9), phase, infrastructureRole]
  const RAW_118 = [
    [1,'H','Hydrogen','1.008','NM',1,1,'Gas','Green hydrogen fuel cells, ammonia production, and energy storage research'],
    [2,'He','Helium','4.0026','NG',18,1,'Gas','Cryogenic coolant for MRI magnets and semiconductor leak testing'],
    [3,'Li','Lithium','6.94','AM',1,2,'Solid','Charge-carrying ions in LFP and NMC rechargeable battery cells'],
    [4,'Be','Beryllium','9.0122','AE',2,2,'Solid','Precision aerospace optics and non-sparking copper-beryllium contacts'],
    [5,'B','Boron','10.81','MD',13,2,'Solid','P-type dopant in silicon solar cells and borosilicate glass'],
    [6,'C','Carbon','12.011','NM',14,2,'Solid','Graphite battery anodes, activated carbon water filters, and structural steel'],
    [7,'N','Nitrogen','14.007','NM',15,2,'Gas','Inert blanketing gas in electronics manufacturing and plant nutrition'],
    [8,'O','Oxygen','15.999','NM',16,2,'Gas','Forms oxide cathodes (LFP/NMC), water (H2O), and silica glass (SiO2)'],
    [9,'F','Fluorine','18.998','HL',17,2,'Gas','Electrolyte salts (LiPF6) and durable weather-resistant solar backsheets'],
    [10,'Ne','Neon','20.180','NG',18,2,'Gas','Excimer laser gas mixtures used in semiconductor photolithography'],
    [11,'Na','Sodium','22.990','AM',1,3,'Solid','Emerging sodium-ion grid batteries using abundant sea-salt resources'],
    [12,'Mg','Magnesium','24.305','AE',2,3,'Solid','Lightweight structural aluminum alloys and water-mineral chemistry'],
    [13,'Al','Aluminum','26.982','PT',13,3,'Solid','Solar panel frames, overhead transmission lines, and battery foil collectors'],
    [14,'Si','Silicon','28.085','MD',14,3,'Solid','Crystalline photovoltaic solar cells, power inverters, and microcontrollers'],
    [15,'P','Phosphorus','30.974','NM',15,3,'Solid','Phosphate lattice in thermally stable LFP batteries and n-type solar doping'],
    [16,'S','Sulfur','32.06','NM',16,3,'Solid','Sulfuric acid electrolyte in lead-acid batteries and vulcanized rubber seals'],
    [17,'Cl','Chlorine','35.45','HL',17,3,'Gas','Municipal water disinfection and purification of electronic-grade silicon'],
    [18,'Ar','Argon','39.948','NG',18,3,'Gas','Inert atmosphere for growing monocrystalline silicon ingots and welding'],
    [19,'K','Potassium','39.098','AM',1,4,'Solid','Alkaline battery electrolytes (KOH) and agricultural soil nutrients'],
    [20,'Ca','Calcium','40.078','AE',2,4,'Solid','Portland cement concrete foundations and water hardness minerals'],
    [21,'Sc','Scandium','44.956','TM',3,4,'Solid','High-strength aluminum-scandium alloys and solid-oxide fuel cells'],
    [22,'Ti','Titanium','47.867','TM',4,4,'Solid','Corrosion-resistant desalination heat exchangers and medical implants'],
    [23,'V','Vanadium','50.942','TM',5,4,'Solid','Long-duration vanadium redox flow batteries for utility microgrids'],
    [24,'Cr','Chromium','51.996','TM',6,4,'Solid','Stainless steel corrosion resistance in water pumps and pipes'],
    [25,'Mn','Manganese','54.938','TM',7,4,'Solid','Low-cost cathode stabilizer in NMC/LMFP batteries and steelmaking'],
    [26,'Fe','Iron','55.845','TM',8,4,'Solid','LFP battery cathodes, structural steel towers, and transformer cores'],
    [27,'Co','Cobalt','58.933','TM',9,4,'Solid','High-energy NMC battery cathodes (actively reduced for cost/ethics)'],
    [28,'Ni','Nickel','58.693','TM',10,4,'Solid','High-capacity NMC battery cathodes, stainless steel, and electrolyzers'],
    [29,'Cu','Copper','63.546','TM',11,4,'Solid','Building wiring, solar busbars, motor windings, and battery anode foil'],
    [30,'Zn','Zinc','65.38','TM',12,4,'Solid','Galvanized corrosion protection for solar racking and zinc-air cells'],
    [31,'Ga','Gallium','69.723','PT',13,4,'Solid','High-efficiency GaN power inverters and LED solid-state lighting'],
    [32,'Ge','Germanium','72.630','MD',14,4,'Solid','Infrared thermal imaging optics and specialty space solar cells'],
    [33,'As','Arsenic','74.922','MD',15,4,'Solid','Compound GaAs high-frequency communications semiconductors'],
    [34,'Se','Selenium','78.971','NM',16,4,'Solid','Thin-film CIGS solar absorbers and industrial glass decolorizers'],
    [35,'Br','Bromine','79.904','HL',17,4,'Liquid','Zinc-bromine flow batteries and electrical flame retardants'],
    [36,'Kr','Krypton','83.798','NG',18,4,'Gas','Insulating window glazing fill gas and satellite Hall thrusters'],
    [37,'Rb','Rubidium','85.468','AM',1,5,'Solid','Precision timing oscillators for telecommunications and grid sync'],
    [38,'Sr','Strontium','87.62','AE',2,5,'Solid','Ferrite ceramic magnets in electric motors and optical lattice clocks'],
    [39,'Y','Yttrium','88.906','TM',3,5,'Solid','White LED phosphors, YBCO superconductors, and oxygen sensors'],
    [40,'Zr','Zirconium','91.224','TM',4,5,'Solid','Corrosion-resistant ceramic membranes and nuclear fuel cladding'],
    [41,'Nb','Niobium','92.906','TM',5,5,'Solid','High-strength pipeline steel alloys and superconducting MRI wire'],
    [42,'Mo','Molybdenum','95.95','TM',6,5,'Solid','Back-contact electrical layers in thin-film solar cells and steel alloys'],
    [43,'Tc','Technetium','(98)','TM',7,5,'Solid','Synthetic radioactive isotope used in hospital diagnostic imaging'],
    [44,'Ru','Ruthenium','101.07','TM',8,5,'Solid','Water-splitting electrolysis catalysts and wear-resistant contacts'],
    [45,'Rh','Rhodium','102.91','TM',9,5,'Solid','Emissions-control catalysts and high-temperature thermocouples'],
    [46,'Pd','Palladium','106.42','TM',10,5,'Solid','Hydrogen purification membranes and multilayer ceramic capacitors'],
    [47,'Ag','Silver','107.87','TM',11,5,'Solid','Conductive front-grid paste on crystalline silicon solar cells'],
    [48,'Cd','Cadmium','112.41','TM',12,5,'Solid','Thin-film CdTe utility solar panels (requires closed-loop recycling)'],
    [49,'In','Indium','114.82','PT',13,5,'Solid','Transparent conductive ITO coatings for solar cells and displays'],
    [50,'Sn','Tin','118.71','PT',14,5,'Solid','Lead-free electronic solder joining solar ribbons and circuit boards'],
    [51,'Sb','Antimony','121.76','MD',15,5,'Solid','Clarifying agent in solar cover glass and flame-retardant housings'],
    [52,'Te','Tellurium','127.60','MD',16,5,'Solid','CdTe thin-film solar panels and thermoelectric cooling modules'],
    [53,'I','Iodine','126.90','HL',17,5,'Solid','Perovskite solar cell research and water purification tablets'],
    [54,'Xe','Xenon','131.29','NG',18,5,'Gas','Ion propulsion thrusters and high-intensity solar simulator lamps'],
    [55,'Cs','Cesium','132.91','AM',1,6,'Solid','Primary SI time standard atomic clocks synchronizing power grids'],
    [56,'Ba','Barium','137.33','AE',2,6,'Solid','Ceramic dielectrics in high-voltage capacitors and superconductors'],
    [57,'La','Lanthanum','138.91','LN',3,8,'Solid','Nickel-metal-hydride (NiMH) hybrid vehicle battery anodes'],
    [58,'Ce','Cerium','140.12','LN',4,8,'Solid','Precision glass polishing and catalytic water/exhaust oxidation'],
    [59,'Pr','Praseodymium','140.91','LN',5,8,'Solid','High-strength permanent magnets in wind turbine generators'],
    [60,'Nd','Neodymium','144.24','LN',6,8,'Solid','NdFeB permanent magnets in efficient EV motors and wind turbines'],
    [61,'Pm','Promethium','(145)','LN',7,8,'Solid','Radioactive research isotope used in specialized betavoltaic cells'],
    [62,'Sm','Samarium','150.36','LN',8,8,'Solid','High-temperature SmCo permanent magnets for industrial motors'],
    [63,'Eu','Europium','151.96','LN',9,8,'Solid','Red and blue phosphors in energy-efficient LED lighting'],
    [64,'Gd','Gadolinium','157.25','LN',10,8,'Solid','MRI contrast agents and magnetic refrigeration research'],
    [65,'Tb','Terbium','158.93','LN',11,8,'Solid','Green LED phosphors and high-temperature motor magnet additive'],
    [66,'Dy','Dysprosium','162.50','LN',12,8,'Solid','Prevents demagnetization in hot EV and wind-turbine NdFeB magnets'],
    [67,'Ho','Holmium','164.93','LN',13,8,'Solid','Magnetic flux concentrators and medical solid-state lasers'],
    [68,'Er','Erbium','167.26','LN',14,8,'Solid','Optical fiber amplifiers carrying low-energy global communications'],
    [69,'Tm','Thulium','168.93','LN',15,8,'Solid','Portable medical X-ray sources and eye-safe fiber lasers'],
    [70,'Yb','Ytterbium','173.05','LN',16,8,'Solid','High-efficiency industrial fiber lasers and optical atomic clocks'],
    [71,'Lu','Lutetium','174.97','LN',17,8,'Solid','Medical PET scanner scintillators and specialty optical glass'],
    [72,'Hf','Hafnium','178.49','TM',4,6,'Solid','High-k gate dielectric reducing leakage in modern low-power chips'],
    [73,'Ta','Tantalum','180.95','TM',5,6,'Solid','Compact, long-life electrolytic capacitors in power electronics'],
    [74,'W','Tungsten','183.84','TM',6,6,'Solid','Microchip vertical interconnects and high-temperature wear parts'],
    [75,'Re','Rhenium','186.21','TM',7,6,'Solid','High-efficiency gas turbine superalloys and industrial catalysts'],
    [76,'Os','Osmium','190.23','TM',8,6,'Solid','Ultra-hard electrical contact alloys and specialized catalysts'],
    [77,'Ir','Iridium','192.22','TM',9,6,'Solid','Anode catalysts in PEM green-hydrogen water electrolyzers'],
    [78,'Pt','Platinum','195.08','TM',10,6,'Solid','Fuel-cell membrane catalysts and precision temperature sensors'],
    [79,'Au','Gold','196.97','TM',11,6,'Solid','Corrosion-free microelectronic contacts and infrared shielding'],
    [80,'Hg','Mercury','200.59','TM',12,6,'Liquid','Legacy fluorescent lamps (being phased out in favor of LEDs)'],
    [81,'Tl','Thallium','204.38','PT',13,6,'Solid','Infrared optical detectors (strictly regulated due to toxicity)'],
    [82,'Pb','Lead','207.2','PT',14,6,'Solid','Recyclable lead-acid backup batteries (requires strict recycling)'],
    [83,'Bi','Bismuth','208.98','PT',15,6,'Solid','Non-toxic lead replacement in plumbing alloys and thermoelectrics'],
    [84,'Po','Polonium','(209)','PT',16,6,'Solid','Rare radioactive element used in industrial static eliminators'],
    [85,'At','Astatine','(210)','HL',17,6,'Solid','Extremely rare radioactive element studied for targeted oncology'],
    [86,'Rn','Radon','(222)','NG',18,6,'Gas','Naturally occurring radioactive soil gas monitored for indoor air safety'],
    [87,'Fr','Francium','(223)','AM',1,7,'Solid','Short-lived radioactive alkali metal used only in atomic physics'],
    [88,'Ra','Radium','(226)','AE',2,7,'Solid','Historic radioluminescent element now limited to medical isotopes'],
    [89,'Ac','Actinium','(227)','AC',3,9,'Solid','Targeted alpha-particle cancer radiotherapy research'],
    [90,'Th','Thorium','232.04','AC',4,9,'Solid','Studied as a fertile nuclear fuel in molten-salt reactor research'],
    [91,'Pa','Protactinium','231.04','AC',5,9,'Solid','Trace actinide used in ocean-sediment radiometric dating'],
    [92,'U','Uranium','238.03','AC',6,9,'Solid','Low-carbon nuclear fission power generation fuel'],
    [93,'Np','Neptunium','(237)','AC',7,9,'Solid','Synthetic actinide precursor for deep-space Pu-238 radioisotope heat'],
    [94,'Pu','Plutonium','(244)','AC',8,9,'Solid','Pu-238 radioisotope power systems for deep-space planetary rovers'],
    [95,'Am','Americium','(243)','AC',9,9,'Solid','Household ionization smoke detectors and space RTG research'],
    [96,'Cm','Curium','(247)','AC',10,9,'Solid','Alpha-particle X-ray spectrometers on Mars surface rovers'],
    [97,'Bk','Berkelium','(247)','AC',11,9,'Solid','Synthetic research target used to create heavier elements'],
    [98,'Cf','Californium','(251)','AC',12,9,'Solid','Portable neutron source for reactor startup and materials analysis'],
    [99,'Es','Einsteinium','(252)','AC',13,9,'Solid','Synthetic research actinide used in heavy-element chemistry'],
    [100,'Fm','Fermium','(257)','AC',14,9,'Solid','Synthetic research element produced in high-flux reactors'],
    [101,'Md','Mendelevium','(258)','AC',15,9,'Solid','Synthetic actinide studied atom-by-atom in nuclear physics'],
    [102,'No','Nobelium','(259)','AC',16,9,'Solid','Synthetic actinide studied in heavy-ion traps'],
    [103,'Lr','Lawrencium','(266)','AC',17,9,'Solid','Final actinide studied for relativistic electron behavior'],
    [104,'Rf','Rutherfordium','(267)','TM',4,7,'Solid','Synthetic transactinide element (research only)'],
    [105,'Db','Dubnium','(268)','TM',5,7,'Solid','Synthetic transactinide element (research only)'],
    [106,'Sg','Seaborgium','(269)','TM',6,7,'Solid','Synthetic transactinide element (research only)'],
    [107,'Bh','Bohrium','(270)','TM',7,7,'Solid','Synthetic transactinide element (research only)'],
    [108,'Hs','Hassium','(277)','TM',8,7,'Solid','Synthetic transactinide element (research only)'],
    [109,'Mt','Meitnerium','(278)','TM',9,7,'Solid','Synthetic transactinide element (research only)'],
    [110,'Ds','Darmstadtium','(281)','TM',10,7,'Solid','Synthetic transactinide element (research only)'],
    [111,'Rg','Roentgenium','(282)','TM',11,7,'Solid','Synthetic transactinide element (research only)'],
    [112,'Cn','Copernicium','(285)','TM',12,7,'Gas','Synthetic transactinide element (research only)'],
    [113,'Nh','Nihonium','(286)','PT',13,7,'Solid','Synthetic superheavy element (research only)'],
    [114,'Fl','Flerovium','(289)','PT',14,7,'Solid','Synthetic superheavy element (research only)'],
    [115,'Mc','Moscovium','(290)','PT',15,7,'Solid','Synthetic superheavy element (research only)'],
    [116,'Lv','Livermorium','(293)','PT',16,7,'Solid','Synthetic superheavy element (research only)'],
    [117,'Ts','Tennessine','(294)','HL',17,7,'Solid','Synthetic superheavy element (research only)'],
    [118,'Og','Oganesson','(294)','NG',18,7,'Solid','Heaviest synthesized element (Z=118; research only)']
  ];

  function computeShells(Z) {
    const order = [
      [1,2],[2,2],[2,6],[3,2],[3,6],[4,2],[3,10],[4,6],[5,2],
      [4,10],[5,6],[6,2],[4,14],[5,10],[6,6],[7,2],[5,14],[6,10],[7,6]
    ];
    const shells = [0,0,0,0,0,0,0];
    let rem = Z;
    for (let i = 0; i < order.length && rem > 0; i++) {
      const add = Math.min(rem, order[i][1]);
      shells[order[i][0] - 1] += add;
      rem -= add;
    }
    return shells.filter((n) => n > 0);
  }

  // Deep verified infrastructure material dossiers (highlighting tradeoffs & component-to-system truth)
  const INFRA_MATERIALS = {
    14: {
      systemRole: 'Solar PV Cells & Power Inverters',
      conductivity: 'Semiconductor (1.12 eV bandgap — ideal for sunlight)',
      abundance: 'Very High (~27.7% of Earth’s crust as quartz SiO2)',
      costTier: 'Low raw material; moderate refining energy cost',
      safety: 'Non-toxic, chemically stable',
      recyclability: 'High glass/aluminum recovery; silicon wafer recycling expanding',
      systemTruth: 'Silicon alone is not a solar panel. A working PV module combines purified doped Silicon wafers, Silver/Copper grid fingers, EVA encapsulant, tempered glass, an Aluminum frame, and a power inverter.'
    },
    29: {
      systemRole: 'Electrical Wiring, Motors & Solar Busbars',
      conductivity: 'Very High (5.96 × 10⁷ S/m — 2nd only to Silver)',
      abundance: 'Moderate (~60 ppm crustal; concentrated in ore deposits)',
      costTier: 'Moderate to High (price-sensitive with global electrification)',
      safety: 'Safe, ductile, fire-resistant conductors',
      recyclability: 'Excellent (>95% endlessly recyclable without quality loss)',
      systemTruth: 'Copper carries electricity with low resistive heat loss (I²R), connecting PV arrays, battery banks, inverters, and water pump motors.'
    },
    3: {
      systemRole: 'Rechargeable Battery Charge Carrier (LFP / NMC)',
      conductivity: 'Metal (used as Li⁺ ions in electrolyte, not bare metal)',
      abundance: 'Low-to-Moderate (~20 ppm crustal; brines & spodumene rock)',
      costTier: 'Moderate (volatile supply chain)',
      safety: 'Depends on cell chemistry: LFP is highly thermally stable; NMC requires stricter thermal management',
      recyclability: 'Growing hydrometallurgical & direct recycling (80–95% Li recovery possible)',
      systemTruth: 'A lithium atom alone is not a battery. Complete cells pair a cathode (e.g., LiFePO4), graphite Carbon anode, polymer separator, liquid electrolyte, Copper/Aluminum foils, and a Battery Management System (BMS).'
    },
    26: {
      systemRole: 'LFP Battery Cathodes, Transformers & Structural Steel',
      conductivity: 'Moderate Metal (1.0 × 10⁷ S/m) + Strong Ferromagnetism',
      abundance: 'Very High (~5.0% of Earth’s crust)',
      costTier: 'Very Low',
      safety: 'Non-toxic; Iron-phosphate (LiFePO4) resists thermal runaway',
      recyclability: 'Excellent (most recycled metal on Earth)',
      systemTruth: 'Replacing scarce Cobalt with abundant Iron and Phosphorus in LFP batteries dramatically lowers community battery costs and improves fire safety.'
    },
    11: {
      systemRole: 'Sodium-Ion Stationary Storage Batteries',
      conductivity: 'Metal (used as Na⁺ ions in emerging Na-ion cells)',
      abundance: 'Very High (~2.3% of Earth’s crust + ocean salt)',
      costTier: 'Very Low',
      safety: 'High (can ship at 0V; strong cold-weather performance)',
      recyclability: 'High (uses Aluminum foils on both electrodes, avoiding Copper)',
      systemTruth: 'Sodium-ion batteries have lower energy density (~120–160 Wh/kg) than lithium-ion, making them heavier for cars but promising for affordable stationary community backup.'
    },
    6: {
      systemRole: 'Battery Graphite Anodes & Activated Carbon Water Filters',
      conductivity: 'Graphite is conductive; diamond is an insulator',
      abundance: 'High (biosphere, carbonate rock, graphite)',
      costTier: 'Low to Moderate (battery-grade purification adds cost)',
      safety: 'Chemically stable and non-toxic',
      recyclability: 'Moderate (anode graphite recycling is developing)',
      systemTruth: 'Layered graphite safely intercalates Lithium ions during charging, while porous activated carbon adsorbs organic contaminants in water treatment.'
    },
    13: {
      systemRole: 'Solar Frames, High-Voltage Cables & Battery Foils',
      conductivity: 'High (3.77 × 10⁷ S/m — ~61% of Copper at 30% the weight)',
      abundance: 'Very High (~8.2% of Earth’s crust — most abundant metal)',
      costTier: 'Low to Moderate (primary smelting is electricity-intensive)',
      safety: 'Non-toxic, naturally corrosion-resistant oxide skin',
      recyclability: 'Excellent (recycling uses ~95% less energy than primary smelting)',
      systemTruth: 'Aluminum provides lightweight corrosion-resistant solar mounting frames and long-distance power lines where weight matters more than compact volume.'
    },
    15: {
      systemRole: 'Phosphate Bonds in LFP Batteries & Solar Cell Doping',
      conductivity: 'Nonmetal Insulator (used as dopant or phosphate compound)',
      abundance: 'Moderate (~1,050 ppm crustal; phosphate rock)',
      costTier: 'Low',
      safety: 'Phosphate compounds (PO4³⁻) form strong oxygen bonds that improve battery safety',
      recyclability: 'Recoverable from LFP black mass and wastewater streams',
      systemTruth: 'Strong P–O covalent bonds in LiFePO4 prevent oxygen release during overheating—the key reason LFP is favored for schools and homes.'
    }
  };

  // Complete storage technology comparison (real engineering tradeoffs, not single-element myths)
  const STORAGE_TECHNOLOGIES = [
    {
      id: 'lfp',
      name: 'Lithium Iron Phosphate (LFP)',
      keyElements: ['Li', 'Fe', 'P', 'O', 'C', 'Cu', 'Al'],
      usableDoD: 0.85,
      roundTripEff: 0.90,
      cycleLife: '3,000 – 6,000 cycles',
      safety: 'High (strong P–O bonds resist thermal runaway)',
      costProfile: 'Medium upfront, lowest cost per lifetime kWh',
      bestFor: 'Homes, schools, and daily solar cycling'
    },
    {
      id: 'na-ion',
      name: 'Sodium-Ion (Na-ion)',
      keyElements: ['Na', 'Fe', 'Mn', 'C', 'Al'],
      usableDoD: 0.85,
      roundTripEff: 0.86,
      cycleLife: '2,000 – 4,000 cycles',
      safety: 'High (tolerant of cold temperatures and 0V transport)',
      costProfile: 'Low raw-material risk; emerging commercial scale',
      bestFor: 'Budget stationary community storage where weight is not critical'
    },
    {
      id: 'lead-acid',
      name: 'Sealed Lead-Acid (AGM / VRLA)',
      keyElements: ['Pb', 'S', 'O'],
      usableDoD: 0.50,
      roundTripEff: 0.78,
      cycleLife: '500 – 1,000 cycles',
      safety: 'Moderate (heavy, toxic lead requires mandatory recycling)',
      costProfile: 'Lowest upfront purchase, higher replacement cost over 10 years',
      bestFor: 'Rarely-cycled emergency backup when upfront budget is severely limited'
    }
  ];

  const ELEMENTS = RAW_118.map((r) => {
    const cat = CATEGORY_META[r[4]];
    return {
      z: r[0], sym: r[1], name: r[2], mass: r[3],
      catCode: r[4], category: cat.name, hex: cat.hex, rgb: cat.rgb,
      col: r[5], row: r[6], phase: r[7], role: r[8],
      shells: computeShells(r[0]),
      infra: INFRA_MATERIALS[r[0]] || null
    };
  });

  const api = { ELEMENTS, CATEGORY_META, INFRA_MATERIALS, STORAGE_TECHNOLOGIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.AetheriaMaterials = api;
})(typeof window !== 'undefined' ? window : globalThis);
