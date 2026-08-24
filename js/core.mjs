export const MM_PER_INCH = 25.4;

const finite = (value) => Number.isFinite(Number(value));

export function convertDimension(value, fromUnit, toUnit) {
  const number = Number(value);
  if (!Number.isFinite(number) || fromUnit === toUnit) return number;
  return fromUnit === "MM" ? number / MM_PER_INCH : number * MM_PER_INCH;
}

export function calculateRoll({ unit, mode, thickness, coreDiameter, remaining }) {
  const normalizedUnit = unit === "IN" ? "IN" : "MM";
  const normalizedMode = mode === "turns" ? "turns" : "od";
  const rawValues = [thickness, coreDiameter, remaining];
  if (rawValues.some((value) => value === null || value === undefined || String(value).trim() === "")) {
    return { ok: false, error: "required" };
  }
  const values = rawValues.map(Number);
  const [beltThickness, core, remainingValue] = values;

  if (!values.every(finite)) {
    return { ok: false, error: "required" };
  }
  if (beltThickness <= 0 || core <= 0 || remainingValue <= 0) {
    return { ok: false, error: "positive" };
  }
  if (normalizedMode === "od" && remainingValue <= core) {
    return { ok: false, error: "odGreaterThanCore" };
  }

  let lengthNative;
  let turns;
  let outsideDiameter;

  if (normalizedMode === "od") {
    lengthNative = Math.PI * (remainingValue ** 2 - core ** 2) / (4 * beltThickness);
    turns = (remainingValue - core) / (2 * beltThickness);
    outsideDiameter = remainingValue;
  } else {
    turns = remainingValue;
    lengthNative = Math.PI * turns * (core + beltThickness * (turns - 1));
    outsideDiameter = core + 2 * beltThickness * turns;
  }

  const lengthMm = normalizedUnit === "MM" ? lengthNative : lengthNative * MM_PER_INCH;
  const outsideDiameterMm = normalizedUnit === "MM"
    ? outsideDiameter
    : outsideDiameter * MM_PER_INCH;

  return {
    ok: true,
    unit: normalizedUnit,
    mode: normalizedMode,
    lengthNative,
    lengthMm,
    lengthM: lengthMm / 1000,
    lengthIn: lengthMm / MM_PER_INCH,
    lengthFt: lengthMm / (MM_PER_INCH * 12),
    lengthYd: lengthMm / (MM_PER_INCH * 36),
    turns,
    outsideDiameter,
    outsideDiameterMm,
  };
}

export function calculateInventoryBalance({ operation, before, amount }) {
  const startingBalance = Number(before);
  const quantity = Number(amount);

  if (!Number.isFinite(startingBalance) || startingBalance < 0) {
    return { ok: false, error: "invalidBalance" };
  }
  if (!Number.isFinite(quantity)) {
    return { ok: false, error: "requiredAmount" };
  }
  if (operation === "set") {
    return quantity < 0
      ? { ok: false, error: "nonNegativeAmount" }
      : { ok: true, after: quantity };
  }
  if (quantity <= 0) {
    return { ok: false, error: "positiveAmount" };
  }
  if (operation === "add") {
    return { ok: true, after: startingBalance + quantity };
  }
  if (operation === "use") {
    return quantity > startingBalance
      ? { ok: false, error: "insufficientStock" }
      : { ok: true, after: startingBalance - quantity };
  }
  return { ok: false, error: "invalidOperation" };
}

export function validateBeltRecord(record) {
  const name = String(record.name ?? "").trim();
  const width = Number(record.width);
  const thickness = Number(record.thickness);
  const stock = Number(record.stock);
  const minStock = Number(record.minStock);

  if (!name) return { ok: false, error: "beltNameRequired" };
  if (!Number.isFinite(width) || width <= 0) return { ok: false, error: "widthPositive" };
  if (!Number.isFinite(thickness) || thickness <= 0) return { ok: false, error: "thicknessPositive" };
  if (!Number.isFinite(stock) || stock < 0) return { ok: false, error: "stockNonNegative" };
  if (!Number.isFinite(minStock) || minStock < 0) return { ok: false, error: "minStockNonNegative" };
  return { ok: true };
}

export function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function gcdInteger(a, b) {
  let x = Math.abs(Math.trunc(Number(a) || 0));
  let y = Math.abs(Math.trunc(Number(b) || 0));
  while (y) [x, y] = [y, x % y];
  return x || 1;
}

export function parseFraction(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const match = text.match(/^(\d+)\/(\d+)$/);
  if (!match) return NaN;
  const denominator = Number(match[2]);
  return denominator ? Number(match[1]) / denominator : NaN;
}

export function compoundImperialToInches({ feet = 0, inches = 0, fraction = "", numerator = "", denominator = "", mode = "fraction" } = {}) {
  const ft = Number(feet) || 0;
  const inch = Number(String(inches).replace(',', '.')) || 0;
  if (mode === "decimal") return ft * 12 + inch;
  let frac = 0;
  if (numerator !== "" || denominator !== "") {
    const num = Number(numerator) || 0;
    const den = Number(denominator);
    if (num && (!Number.isFinite(den) || den <= 0 || num >= den)) return NaN;
    frac = num && den ? num / den : 0;
  } else {
    frac = parseFraction(fraction);
    if (!Number.isFinite(frac)) return NaN;
  }
  return ft * 12 + inch + frac;
}

export function inchesToCompoundImperial(totalInches, mode = "fraction", denominator = 64) {
  let total = Math.max(0, Number(totalInches) || 0);
  let feet = Math.floor(total / 12);
  let inches = total - feet * 12;
  if (mode === "decimal") return { feet, inches: Number(inches.toFixed(6)), fraction: "" };
  let whole = Math.floor(inches);
  let numerator = Math.round((inches - whole) * denominator);
  if (numerator >= denominator) { whole += 1; numerator = 0; }
  if (whole >= 12) { feet += Math.floor(whole / 12); whole %= 12; }
  let fraction = "";
  if (numerator) {
    const divisor = gcdInteger(numerator, denominator);
    fraction = `${numerator / divisor}/${denominator / divisor}`;
  }
  return { feet, inches: whole, fraction };
}

export const ENGINEERING_UNITS = Object.freeze({
  length:{units:{km:1000,m:1,cm:.01,mm:.001,mi:1609.344,yd:.9144,ft:.3048,in:.0254,'ft+in':null}},
  volume:{units:{'m³':1,L:.001,mL:.000001,'ft³':.0283168466,'in³':.000016387064,'US gal':.003785411784,'US qt':.000946352946,'US pt':.000473176473}},
  temperature:{units:{'°C':'c','°F':'f',K:'k'}},
  pressure:{units:{Pa:1,kPa:1000,MPa:1e6,bar:1e5,psi:6894.757293,atm:101325,inHg:3386.389,mmHg:133.322}},
  speed:{units:{'m/s':1,'km/h':.277777778,mph:.44704,'ft/s':.3048,knot:.514444}},
  weight:{units:{kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125,'metric ton':1000}},
  area:{units:{'mm²':1e-6,'cm²':1e-4,'m²':1,'in²':.00064516,'ft²':.09290304,acre:4046.8564224}},
  force:{units:{N:1,kN:1000,kgf:9.80665,lbf:4.4482216153}},
  torque:{units:{'N·m':1,'kgf·m':9.80665,'lb-ft':1.3558179483,'lb-in':.112984829}},
  power:{units:{W:1,kW:1000,hp:745.699872,'BTU/hr':.29307107}},
  flow:{units:{'L/min':1,'L/s':60,'m³/h':16.6666667,GPM:3.785411784,CFM:28.3168466}}
});

export function convertEngineeringValue(value, category, fromUnit, toUnit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  if (fromUnit === toUnit) return n;
  const def = ENGINEERING_UNITS[category];
  if (!def || !(fromUnit in def.units) || !(toUnit in def.units)) return NaN;
  if (category === 'temperature') {
    const toC = fromUnit === '°C' ? n : fromUnit === '°F' ? (n - 32) * 5 / 9 : n - 273.15;
    return toUnit === '°C' ? toC : toUnit === '°F' ? toC * 9 / 5 + 32 : toC + 273.15;
  }
  const fromFactor = def.units[fromUnit], toFactor = def.units[toUnit];
  if (!Number.isFinite(fromFactor) || !Number.isFinite(toFactor)) return NaN;
  return n * fromFactor / toFactor;
}
