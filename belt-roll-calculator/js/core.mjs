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
