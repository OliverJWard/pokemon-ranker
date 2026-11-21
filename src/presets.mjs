// Formula shortcuts. They reference spa/spd, so a game without a split Special
// stat (Gen I) will need its own set.
export const PRESETS = [
  { id: "bst", label: "Balanced (BST)", formula: "hp + atk + def + spa + spd + spe" },
  { id: "physical", label: "Physical sweeper", formula: "atk*1.5 + spe*1.5 + def*0.25" },
  { id: "special", label: "Special sweeper", formula: "spa*1.5 + spe*1.5 + spd*0.25" },
  { id: "tank", label: "Tank", formula: "hp*1.5 + min(def, spd)*1.5 - spe*0.5" },
  { id: "speed", label: "Pure speed", formula: "spe" },
  { id: "frail", label: "Glass cannon", formula: "max(atk, spa)*2 + spe*1.5 - min(def, spd)*0.5" },
];

export const DEFAULT_FORMULA = PRESETS[0].formula;

export const FUNCTION_SNIPPETS = [
  { label: "min(a, b)", text: "min()", cursor: 4 },
  { label: "max(a, b)", text: "max()", cursor: 4 },
  { label: "abs(a)", text: "abs()", cursor: 4 },
];

export const COMBOS = [
  { label: "Lowest defense", text: "min(def, spd)" },
  { label: "Highest attack", text: "max(atk, spa)" },
  { label: "Bulk (HP × defense)", text: "min(def, spd) * hp" },
  { label: "Attack ÷ defense", text: "max(atk, spa) / min(def, spd)" },
];
