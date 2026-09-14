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


export function applyCalculatorEntry(expr, key, freshInput = false) {
  const current = String(expr ?? '0');
  const k = String(key ?? '');
  const isDigit = /^\d$/.test(k);
  const isDecimal = k === '.';
  const isOperator = ['+','−','×','÷','^'].includes(k);
  if (freshInput && (isDigit || isDecimal)) {
    return { expr: isDecimal ? '0.' : k, freshInput: false };
  }
  if (current === '0' && isDigit) return { expr: k, freshInput: false };
  return { expr: current + k, freshInput: freshInput && !isOperator ? freshInput : false };
}


// Build 04.26 — practical engineering tools
export const WIRE_TABLE = Object.freeze([
 {size:'14 AWG',mm2:2.08,ampCu:20,ampAl:null,rCu:3.07},{size:'12 AWG',mm2:3.31,ampCu:25,ampAl:20,rCu:1.93},{size:'10 AWG',mm2:5.26,ampCu:35,ampAl:30,rCu:1.21},{size:'8 AWG',mm2:8.37,ampCu:50,ampAl:40,rCu:.764},{size:'6 AWG',mm2:13.3,ampCu:65,ampAl:50,rCu:.491},{size:'4 AWG',mm2:21.2,ampCu:85,ampAl:65,rCu:.308},{size:'3 AWG',mm2:26.7,ampCu:100,ampAl:75,rCu:.245},{size:'2 AWG',mm2:33.6,ampCu:115,ampAl:90,rCu:.194},{size:'1 AWG',mm2:42.4,ampCu:130,ampAl:100,rCu:.154},{size:'1/0 AWG',mm2:53.5,ampCu:150,ampAl:120,rCu:.122},{size:'2/0 AWG',mm2:67.4,ampCu:175,ampAl:135,rCu:.0967},{size:'3/0 AWG',mm2:85.0,ampCu:200,ampAl:155,rCu:.0766},{size:'4/0 AWG',mm2:107.2,ampCu:230,ampAl:180,rCu:.0608}
]);
function wireResistance(row,material){return row.rCu*(material==='aluminum'?1.64:1)}
function distanceFeet(distance,unit){const d=Number(distance);return unit==='m'?d*3.280839895:d}
function wireFactor(system){return system==='three'?Math.sqrt(3):2}
export function wireVoltageDrop({row,current,distance,distanceUnit='ft',material='copper',system='single',voltage=120}){
 const I=Number(current),L=distanceFeet(distance,distanceUnit),V=Number(voltage);if(!row||![I,L,V].every(Number.isFinite)||V<=0)return {volts:NaN,percent:NaN};
 const volts=wireFactor(system)*L*I*wireResistance(row,material)/1000;return {volts,percent:volts/V*100};
}
export function calculateWireSize({voltage,current,system='single',distance=0,distanceUnit='ft',material='copper',targetDrop=3,continuous=false}={}){
 const V=Number(voltage),I=Number(current),drop=Number(targetDrop);if(!(V>0)||!(I>=0)||!(Number(distance)>=0)||!(drop>0))return {ok:false,error:'invalidInput'};
 const ampNeed=I*(continuous?1.25:1), ampKey=material==='aluminum'?'ampAl':'ampCu';
 const ampRow=WIRE_TABLE.find(r=>Number.isFinite(r[ampKey])&&r[ampKey]>=ampNeed)||WIRE_TABLE.at(-1);
 const dropRow=WIRE_TABLE.find(r=>wireVoltageDrop({row:r,current:I,distance,distanceUnit,material,system,voltage:V}).percent<=drop)||WIRE_TABLE.at(-1);
 const recommended=ampRow.mm2>=dropRow.mm2?ampRow:dropRow, vd=wireVoltageDrop({row:recommended,current:I,distance,distanceUnit,material,system,voltage:V});
 const L=distanceFeet(distance,distanceUnit),R=wireResistance(recommended,material)*L/1000;const loss=system==='three'?3*I*I*R:2*I*I*R;
 return {ok:true,recommended,ampRow,dropRow,ampacity:recommended[ampKey],ampNeed,voltageDrop:vd.volts,dropPercent:vd.percent,loadVoltage:V-vd.volts,lossWatts:loss,limiting:dropRow.mm2>ampRow.mm2?'voltageDrop':'ampacity'};
}
export function checkWireCapacity({size,voltage=120,system='single',distance=null,distanceUnit='ft',material='copper',targetDrop=3}={}){
 const row=WIRE_TABLE.find(r=>r.size===size);if(!row)return {ok:false,error:'unknownSize'};const ampacity=row[material==='aluminum'?'ampAl':'ampCu'];
 let dropLimited=null;if(distance!==null&&distance!==''&&Number(distance)>0&&Number(voltage)>0){const L=distanceFeet(distance,distanceUnit),R=wireResistance(row,material),factor=wireFactor(system);dropLimited=(Number(voltage)*(Number(targetDrop)/100)*1000)/(factor*L*R)}
 return {ok:true,row,ampacity,dropLimited,recommendedMax:dropLimited==null?ampacity:Math.min(ampacity??Infinity,dropLimited)};
}
export const THREAD_TABLE = Object.freeze([
 {standard:'Metric',size:'M3 × 0.5',majorMm:3,pitchMm:.5,tapDrillMm:2.5,drill:'2.5 mm'},{standard:'Metric',size:'M4 × 0.7',majorMm:4,pitchMm:.7,tapDrillMm:3.3,drill:'3.3 mm'},{standard:'Metric',size:'M5 × 0.8',majorMm:5,pitchMm:.8,tapDrillMm:4.2,drill:'4.2 mm'},{standard:'Metric',size:'M6 × 1.0',majorMm:6,pitchMm:1,tapDrillMm:5,drill:'5.0 mm'},{standard:'Metric',size:'M8 × 1.25',majorMm:8,pitchMm:1.25,tapDrillMm:6.8,drill:'6.8 mm'},{standard:'Metric',size:'M10 × 1.5',majorMm:10,pitchMm:1.5,tapDrillMm:8.5,drill:'8.5 mm'},{standard:'Metric',size:'M12 × 1.75',majorMm:12,pitchMm:1.75,tapDrillMm:10.2,drill:'10.2 mm'},{standard:'Metric',size:'M14 × 2.0',majorMm:14,pitchMm:2,tapDrillMm:12,drill:'12.0 mm'},{standard:'Metric',size:'M16 × 2.0',majorMm:16,pitchMm:2,tapDrillMm:14,drill:'14.0 mm'},
 {standard:'UNC',size:'#4-40 UNC',majorMm:2.845,pitchMm:25.4/40,tapDrillMm:2.261,drill:'#43 (0.0890 in)'},{standard:'UNC',size:'#6-32 UNC',majorMm:3.505,pitchMm:25.4/32,tapDrillMm:2.705,drill:'#36 (0.1065 in)'},{standard:'UNC',size:'#8-32 UNC',majorMm:4.166,pitchMm:25.4/32,tapDrillMm:3.454,drill:'#29 (0.1360 in)'},{standard:'UNC',size:'#10-24 UNC',majorMm:4.826,pitchMm:25.4/24,tapDrillMm:3.797,drill:'#25 (0.1495 in)'},{standard:'UNC',size:'1/4-20 UNC',majorMm:6.35,pitchMm:25.4/20,tapDrillMm:5.105,drill:'#7 (0.2010 in)'},{standard:'UNC',size:'5/16-18 UNC',majorMm:7.938,pitchMm:25.4/18,tapDrillMm:6.528,drill:'F (0.2570 in)'},{standard:'UNC',size:'3/8-16 UNC',majorMm:9.525,pitchMm:25.4/16,tapDrillMm:7.938,drill:'5/16 in'},{standard:'UNC',size:'1/2-13 UNC',majorMm:12.7,pitchMm:25.4/13,tapDrillMm:10.716,drill:'27/64 in'},
 {standard:'UNF',size:'#10-32 UNF',majorMm:4.826,pitchMm:25.4/32,tapDrillMm:4.039,drill:'#21 (0.1590 in)'},{standard:'UNF',size:'1/4-28 UNF',majorMm:6.35,pitchMm:25.4/28,tapDrillMm:5.410,drill:'#3 (0.2130 in)'},{standard:'UNF',size:'5/16-24 UNF',majorMm:7.938,pitchMm:25.4/24,tapDrillMm:6.909,drill:'I (0.2720 in)'},{standard:'UNF',size:'3/8-24 UNF',majorMm:9.525,pitchMm:25.4/24,tapDrillMm:8.433,drill:'Q (0.3320 in)'},{standard:'UNF',size:'1/2-20 UNF',majorMm:12.7,pitchMm:25.4/20,tapDrillMm:11.509,drill:'29/64 in'}
]);
export function threadRecommendation(standard='Metric',size=''){return THREAD_TABLE.find(t=>t.standard===standard&&(t.size===size||!size))||THREAD_TABLE.find(t=>t.standard===standard)||THREAD_TABLE[0]}
export function identifyThread({diameter,diameterUnit='mm',pitch,pitchUnit='mm'}={}){
 const d=Number(diameter)*(diameterUnit==='in'?25.4:1),p=Number(pitch);if(!(d>0)||!(p>0))return [];
 const pitchMm=pitchUnit==='tpi'?25.4/p:p;
 return THREAD_TABLE.map(t=>{const dErr=Math.abs(t.majorMm-d)/t.majorMm,pErr=Math.abs(t.pitchMm-pitchMm)/t.pitchMm;const score=dErr*.6+pErr*.4;return {...t,diameterErrorMm:d-t.majorMm,pitchErrorMm:pitchMm-t.pitchMm,confidence:Math.max(0,Math.round((1-score*5)*100))}}).sort((a,b)=>Math.abs(a.diameterErrorMm)*.6+Math.abs(a.pitchErrorMm)*.4-(Math.abs(b.diameterErrorMm)*.6+Math.abs(b.pitchErrorMm)*.4)).slice(0,5);
}
