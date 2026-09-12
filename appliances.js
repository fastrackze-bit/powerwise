// PowerWise Appliance Database & Energy Efficiency Specifications (Consumption Units Focus)
// Standard Reference Wattages (per specifications):
// - AC (non-inverter): 1500W
// - AC (inverter): 1000W
// - Fridge: 150-200W (Reference: 175W)
// - Washing Machine: 500W
// - Water Heater / Geyser: 2000W
// - Ceiling Fan: 75W
// - TV: 100-150W (Reference: 120W)
//
// Formula: (wattage * hours/day * count * 30) / 1000 = units/month (kWh)

export const DEFAULT_APPLIANCES = [
  {
    id: 'ac-non-inverter',
    name: 'AC (Non-Inverter)',
    category: 'cooling',
    icon: 'snowflake',
    wattage: 1500,
    wattageRange: '1500W (Fixed Speed)',
    defaultCount: 1,
    defaultHours: 7,
    maxHours: 24,
    description: 'Fixed-speed compressor running at full 1500W power draw continuously.',
    replacement: {
      actionName: 'switch to an inverter AC',
      title: 'Switch to a 5-Star Inverter AC',
      efficientWattage: 950,
      savingPercent: 37,
      description: 'Variable-speed inverter compressor scales power down automatically once room temperature stabilizes.',
      amazonQuery: 'inverter split ac 1.5 ton 5 star',
      badge: '#1 High-Impact Saving'
    }
  },
  {
    id: 'ac-inverter',
    name: 'AC (Inverter)',
    category: 'cooling',
    icon: 'wind',
    wattage: 1000,
    wattageRange: '1000W (Variable Speed)',
    defaultCount: 0,
    defaultHours: 6,
    maxHours: 24,
    description: 'Modern variable compressor with adaptive cooling cycles.',
    replacement: {
      actionName: 'upgrade to an AI 5-Star Dual Inverter AC',
      title: 'Upgrade to AI 5-Star Dual Inverter AC',
      efficientWattage: 750,
      savingPercent: 25,
      description: 'Next-gen ISEER 5.2+ AI models adjust cooling dynamically based on room occupancy.',
      amazonQuery: '5 star ai dual inverter split ac',
      badge: 'Smart Upgrade'
    }
  },
  {
    id: 'water-heater',
    name: 'Water Heater / Geyser',
    category: 'heating',
    icon: 'flame',
    wattage: 2000,
    wattageRange: '2000W (Heating Element)',
    defaultCount: 1,
    defaultHours: 2,
    maxHours: 12,
    description: 'High-draw 2000W heating coil; even 1-2 hours daily draws substantial units.',
    replacement: {
      actionName: 'switch to a 5-star smart timer geyser',
      title: 'Switch to a 5-Star Smart Timer Geyser',
      efficientWattage: 1200,
      savingPercent: 40,
      description: 'High-density PUF insulation eliminates standby heat loss; automatic timer stops overheating.',
      amazonQuery: '5 star digital timer smart water heater 25l',
      badge: 'High Impact Saving'
    }
  },
  {
    id: 'refrigerator',
    name: 'Refrigerator (Frost-Free)',
    category: 'kitchen',
    icon: 'archive',
    wattage: 175,
    wattageRange: '150 - 200W (ref: 175W)',
    defaultCount: 1,
    defaultHours: 24,
    maxHours: 24,
    description: 'Runs 24/7 with intermittent cycling; average continuous load ~175W.',
    replacement: {
      actionName: 'switch to a 5-star inverter refrigerator',
      title: 'Switch to a 5-Star Inverter Refrigerator',
      efficientWattage: 95,
      savingPercent: 45,
      description: 'Digital inverter compressor adjusts across 7 speed tiers, drawing under 100W on average.',
      amazonQuery: '5 star digital inverter double door refrigerator',
      badge: '24/7 Base Saver'
    }
  },
  {
    id: 'ceiling-fan',
    name: 'Ceiling Fans (Standard)',
    category: 'ventilation',
    icon: 'fan',
    wattage: 75,
    wattageRange: '75W (Induction Motor)',
    defaultCount: 3,
    defaultHours: 12,
    maxHours: 24,
    description: 'Traditional induction fans running throughout the home for 12+ hours daily.',
    replacement: {
      actionName: 'switch to 28W BLDC energy-saving fans',
      title: 'Switch to 28W BLDC Energy-Saving Fans',
      efficientWattage: 28,
      savingPercent: 62,
      description: 'Brushless DC (BLDC) motors draw only 28W at full speed — saving 62% units with zero motor hum.',
      amazonQuery: 'bldc energy saving ceiling fan 28w with remote',
      badge: 'Huge Multiplier'
    }
  },
  {
    id: 'washing-machine',
    name: 'Washing Machine',
    category: 'laundry',
    icon: 'disc',
    wattage: 500,
    wattageRange: '500W (Motor + Spin)',
    defaultCount: 1,
    defaultHours: 1,
    maxHours: 8,
    description: 'Motor agitation, water draining pump, and high-RPM spin cycle.',
    replacement: {
      actionName: 'switch to a 5-star inverter front load washer',
      title: 'Switch to a 5-Star Inverter Front Load',
      efficientWattage: 320,
      savingPercent: 36,
      description: 'Direct-drive brushless inverter motors reduce energy draw by 36% and cut heated wash units.',
      amazonQuery: '5 star inverter front load washing machine',
      badge: 'Eco Efficient'
    }
  },
  {
    id: 'television',
    name: 'Television (LED/Smart)',
    category: 'entertainment',
    icon: 'tv',
    wattage: 120,
    wattageRange: '100 - 150W (ref: 120W)',
    defaultCount: 1,
    defaultHours: 5,
    maxHours: 24,
    description: 'Main living room TV display, smart streaming stick, and audio soundbar.',
    replacement: {
      actionName: 'switch to an Energy-Star smart LED TV',
      title: 'Switch to an Energy-Star Smart LED TV',
      efficientWattage: 65,
      savingPercent: 46,
      description: 'Modern 4K panels with auto-dimming LED backlights and eco-mode cut power draw in half.',
      amazonQuery: 'energy star 4k smart led tv 5 star',
      badge: 'Modern Display'
    }
  }
];

export const EXTRA_APPLIANCES = [
  {
    id: 'microwave',
    name: 'Microwave Oven',
    category: 'kitchen',
    icon: 'box',
    wattage: 1200,
    wattageRange: '1200W',
    defaultCount: 1,
    defaultHours: 0.5,
    replacement: {
      actionName: 'switch to an inverter microwave',
      title: 'Switch to an Inverter Microwave',
      efficientWattage: 800,
      savingPercent: 33,
      description: 'True inverter microwaves deliver continuous gentle power without peak cycling surges.',
      amazonQuery: 'inverter convection microwave oven',
      badge: 'Smart Kitchen'
    }
  },
  {
    id: 'desktop-pc',
    name: 'Desktop PC / Gaming Rig',
    category: 'tech',
    icon: 'monitor',
    wattage: 250,
    wattageRange: '250W',
    defaultCount: 1,
    defaultHours: 4,
    replacement: {
      actionName: 'upgrade to an 80+ Gold efficiency PSU',
      title: 'Upgrade to 80+ Gold Efficiency PSU',
      efficientWattage: 150,
      savingPercent: 40,
      description: 'High-efficiency power conversion reduces heat dissipation and idle power draw.',
      amazonQuery: '80 plus gold power supply unit modular',
      badge: 'Tech Efficiency'
    }
  },
  {
    id: 'ev-charger',
    name: 'EV 2-Wheeler / Car Charger',
    category: 'transport',
    icon: 'zap',
    wattage: 1500,
    wattageRange: '1500W',
    defaultCount: 1,
    defaultHours: 3,
    replacement: {
      actionName: 'switch to a smart scheduled off-peak charger',
      title: 'Switch to Smart Scheduled Off-Peak Charger',
      efficientWattage: 1500,
      savingPercent: 20,
      description: 'Smart scheduling charges vehicle during optimized off-peak hours.',
      amazonQuery: 'smart electric vehicle charger home 16a',
      badge: 'Off-Peak Savings'
    }
  }
];

/**
 * Monthly consumption calculation formula:
 * (wattage * hours/day * count * 30) / 1000 = units/month (kWh)
 */
export function calculateMonthlyUnits(wattage, hoursPerDay, count = 1) {
  if (!wattage || !hoursPerDay || !count) return 0;
  return ((wattage * hoursPerDay * count * 30) / 1000);
}

/**
 * Computes savings analysis for an appliance replacement strictly in units (kWh)
 * Required format: "switch to an inverter AC, save ~X units/month"
 */
export function computeSavingsRecommendation(app) {
  if (!app.replacement) return null;

  const rep = app.replacement;
  const currentUnits = calculateMonthlyUnits(app.wattage, app.hours, app.count);
  const efficientUnits = calculateMonthlyUnits(rep.efficientWattage, app.hours, app.count);
  const savedUnits = Math.max(0, Math.round(currentUnits - efficientUnits));

  // Exact phrasing requirement:
  // "switch to an inverter AC, save ~X units/month"
  const recommendationSentence = `${rep.actionName}, save ~${savedUnits} units/month`;
  const amazonUrl = `https://www.amazon.in/s?k=${encodeURIComponent(rep.amazonQuery)}`;

  return {
    ...rep,
    currentUnits: Math.round(currentUnits),
    efficientUnits: Math.round(efficientUnits),
    savedUnits,
    recommendationSentence,
    amazonUrl
  };
}
