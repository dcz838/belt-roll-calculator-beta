import test from "node:test";
import assert from "node:assert/strict";
import {
  MM_PER_INCH,
  calculateInventoryBalance,
  calculateRoll,
  convertDimension,
  csvCell,
  validateBeltRecord,
} from "../js/core.mjs";

test("OD calculation matches the reference workbook", () => {
  const result = calculateRoll({
    unit: "MM",
    mode: "od",
    thickness: 1,
    coreDiameter: 10,
    remaining: 10.1,
  });
  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.lengthNative - 1.578650308428864) < 1e-12);
  assert.ok(Math.abs(result.turns - 0.05) < 1e-12);
  assert.equal(result.outsideDiameter, 10.1);
});

test("turn calculation matches the documented formula", () => {
  const result = calculateRoll({
    unit: "MM",
    mode: "turns",
    thickness: 1,
    coreDiameter: 10,
    remaining: 3,
  });
  assert.equal(result.ok, true);
  assert.ok(Math.abs(result.lengthNative - Math.PI * 3 * 12) < 1e-12);
  assert.equal(result.turns, 3);
  assert.equal(result.outsideDiameter, 16);
});

test("inch inputs produce the same physical result as converted millimeters", () => {
  const metric = calculateRoll({ unit: "MM", mode: "od", thickness: 2, coreDiameter: 100, remaining: 300 });
  const imperial = calculateRoll({
    unit: "IN",
    mode: "od",
    thickness: 2 / MM_PER_INCH,
    coreDiameter: 100 / MM_PER_INCH,
    remaining: 300 / MM_PER_INCH,
  });
  assert.ok(Math.abs(metric.lengthM - imperial.lengthM) < 1e-10);
});

test("invalid calculator inputs return stable error codes", () => {
  assert.equal(calculateRoll({ unit: "MM", mode: "od", thickness: "", coreDiameter: 10, remaining: 20 }).error, "required");
  assert.equal(calculateRoll({ unit: "MM", mode: "od", thickness: 1, coreDiameter: 10, remaining: 10 }).error, "odGreaterThanCore");
  assert.equal(calculateRoll({ unit: "MM", mode: "turns", thickness: -1, coreDiameter: 10, remaining: 2 }).error, "positive");
});

test("unit conversion is reversible", () => {
  const inches = convertDimension(254, "MM", "IN");
  assert.equal(inches, 10);
  assert.equal(convertDimension(inches, "IN", "MM"), 254);
});

test("inventory never permits negative balance", () => {
  assert.deepEqual(calculateInventoryBalance({ operation: "use", before: 10, amount: 4 }), { ok: true, after: 6 });
  assert.equal(calculateInventoryBalance({ operation: "use", before: 10, amount: 11 }).error, "insufficientStock");
  assert.equal(calculateInventoryBalance({ operation: "add", before: 10, amount: -1 }).error, "positiveAmount");
  assert.equal(calculateInventoryBalance({ operation: "set", before: 10, amount: -1 }).error, "nonNegativeAmount");
});

test("belt records require safe numeric values", () => {
  const valid = { name: "Blue", width: 25, thickness: 4, stock: 10, minStock: 2 };
  assert.equal(validateBeltRecord(valid).ok, true);
  assert.equal(validateBeltRecord({ ...valid, name: "" }).error, "beltNameRequired");
  assert.equal(validateBeltRecord({ ...valid, thickness: 0 }).error, "thicknessPositive");
});

test("CSV cells quote commas, quotes, and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});
