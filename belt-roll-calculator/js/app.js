import {
  calculateInventoryBalance,
  calculateRoll,
  convertDimension,
  csvCell,
  validateBeltRecord,
} from "./core.mjs";

const BUILD = "2026.07.22.01";
const STORAGE_KEY = "brc_data";

const translations = {
  en: {
    calculator: "Calculator", inventory: "Inventory", logs: "Logs", users: "Users", settings: "Settings", about: "About",
    input: "Input", result: "Result", units: "Units", thickness: "Thickness", core: "Core Diameter", calculateBy: "Calculate By",
    odLabel: "OD", turns: "Turns", remainingOD: "Remaining OD", remainingTurns: "Remaining Turns", copy: "Copy Result", clear: "Clear",
    inventoryAction: "Inventory Action", metric: "Metric", imperial: "Imperial", length: "Length", estimatedTurns: "Estimated Turns",
    estimatedOD: "Estimated OD", belt: "Belt", useBeltThickness: "Use selected belt thickness", addBelt: "Add Belt", beltDetail: "Belt Detail",
    name: "Name", part: "Part Number", width: "Width", color: "Color", application: "Application", stock: "Stock (m)", minStock: "Min Stock (m)",
    location: "Location", notes: "Notes", save: "Save", delete: "Delete", editBelt: "Edit Belt", login: "Login", logout: "Log out",
    user: "User", username: "Username", pin: "4-digit PIN", addUser: "Add User", changePin: "Change PIN", admin: "Admin", standard: "Standard",
    passwordProtection: "Inventory Password Protection", saveSettings: "Save Settings", operation: "Operation", amountM: "Amount (m)", confirm: "Confirm",
    cancel: "Cancel", before: "Before", after: "After", useStock: "Use Stock", addStock: "Add Stock", setBalance: "Set Balance",
    setWarning: "Set Balance will overwrite the current inventory balance.", search: "Search", searchLogs: "Search logs", exportCsv: "Export CSV",
    clearLogs: "Clear Logs", dataBackup: "Data Backup", backupHelp: "Export before moving devices or clearing browser data. Keep backups private because they include local user PINs.",
    exportBackup: "Export Backup", importBackup: "Import Backup", localDataNote: "Inventory data is stored on this device. Export regular backups.",
    required: "Enter thickness, core diameter, and the remaining value.", positive: "All input values must be greater than zero.",
    odGreaterThanCore: "Remaining OD must be greater than the core diameter.", wrongPin: "Wrong PIN.", adminOnly: "Administrator access is required.",
    saved: "Saved.", loggedIn: "Logged in.", loggedOut: "Logged out.", loginRequired: "Log in before changing protected inventory.",
    logEmpty: "No inventory logs yet.", inventoryEmpty: "No belts have been added yet.", noBeltSelected: "Select a belt first.", copied: "Result copied.",
    lowStock: "Low stock", inStock: "In stock", beltsCount: "Belts", totalStock: "Total Stock", lowCount: "Low Stock",
    insufficientStock: "This operation would make inventory negative.", positiveAmount: "Enter an amount greater than zero.",
    nonNegativeAmount: "Balance cannot be negative.", requiredAmount: "Enter an inventory amount.", invalidOperation: "Choose a valid inventory operation.",
    beltNameRequired: "Belt name is required.", widthPositive: "Width must be greater than zero.", thicknessPositive: "Thickness must be greater than zero.",
    stockNonNegative: "Stock cannot be negative.", minStockNonNegative: "Minimum stock cannot be negative.", confirmDeleteBelt: "Delete this belt?",
    confirmClearLogs: "Clear all inventory logs? This cannot be undone.", confirmImport: "Replace current local data with this backup?",
    invalidBackup: "This file is not a valid Belt Roll Calculator backup.", imported: "Backup imported.", exported: "File exported.",
    newPin: "Enter a new 4-digit PIN", invalidPin: "PIN must contain exactly four digits.", duplicateName: "That username already exists.",
    confirmDeleteUser: "Delete this user?", usernameRequired: "Username is required.", noResults: "No matching records.", guest: "Guest", calculatedLength: "Calculated length",
    availableStock: "Available stock", stockAfterUse: "Stock after use", selectedBelt: "Selected belt", pinHidden: "PIN protected",
  },
  zh: {
    calculator: "计算器", inventory: "库存", logs: "日志", users: "用户", settings: "设置", about: "关于", input: "输入", result: "结果",
    units: "单位", thickness: "皮带厚度", core: "卷芯直径", calculateBy: "计算方式", odLabel: "外径", turns: "圈数", remainingOD: "剩余外径",
    remainingTurns: "剩余圈数", copy: "复制结果", clear: "清除", inventoryAction: "库存操作", metric: "公制", imperial: "英制", length: "长度",
    estimatedTurns: "预估圈数", estimatedOD: "预估外径", belt: "皮带", useBeltThickness: "使用所选皮带厚度", addBelt: "添加皮带",
    beltDetail: "皮带详情", name: "名称", part: "料号", width: "宽度", color: "颜色", application: "用途", stock: "库存（米）",
    minStock: "最低库存（米）", location: "位置", notes: "备注", save: "保存", delete: "删除", editBelt: "编辑皮带", login: "登录",
    logout: "退出", user: "用户", username: "用户名", pin: "4位数字密码", addUser: "添加用户", changePin: "更改密码", admin: "管理员",
    standard: "普通用户", passwordProtection: "库存更新密码保护", saveSettings: "保存设置", operation: "操作", amountM: "数量（米）",
    confirm: "确认", cancel: "取消", before: "操作前", after: "操作后", useStock: "使用库存", addStock: "增加库存", setBalance: "设定余额",
    setWarning: "设定余额将覆盖当前库存。", search: "搜索", searchLogs: "搜索日志", exportCsv: "导出 CSV", clearLogs: "清除日志",
    dataBackup: "数据备份", backupHelp: "更换设备或清除浏览器数据前，请导出备份。", exportBackup: "导出备份", importBackup: "导入备份",
    localDataNote: "库存数据保存在此设备上。请定期导出备份。", required: "请输入厚度、卷芯直径和剩余值。", positive: "所有输入值必须大于零。",
    odGreaterThanCore: "剩余外径必须大于卷芯直径。", wrongPin: "密码错误。", adminOnly: "需要管理员权限。", saved: "已保存。",
    loggedIn: "已登录。", loggedOut: "已退出。", loginRequired: "修改受保护的库存前请先登录。", logEmpty: "暂无库存日志。",
    inventoryEmpty: "尚未添加皮带。", noBeltSelected: "请先选择皮带。", copied: "结果已复制。", lowStock: "库存不足", inStock: "库存正常",
    beltsCount: "皮带", totalStock: "总库存", lowCount: "低库存", insufficientStock: "此操作会导致负库存。", positiveAmount: "请输入大于零的数量。",
    nonNegativeAmount: "余额不能为负数。", requiredAmount: "请输入库存数量。", beltNameRequired: "必须填写皮带名称。", widthPositive: "宽度必须大于零。",
    thicknessPositive: "厚度必须大于零。", stockNonNegative: "库存不能为负数。", minStockNonNegative: "最低库存不能为负数。",
    confirmDeleteBelt: "删除这条皮带记录？", confirmClearLogs: "清除所有库存日志？此操作无法撤销。", confirmImport: "用此备份替换当前本地数据？",
    invalidBackup: "此文件不是有效的皮带卷计算器备份。", imported: "备份已导入。", exported: "文件已导出。", newPin: "输入新的4位密码",
    invalidPin: "密码必须是4位数字。", duplicateName: "该用户名已存在。", confirmDeleteUser: "删除此用户？", usernameRequired: "必须填写用户名。", noResults: "没有匹配记录。",
    guest: "访客", calculatedLength: "计算长度", availableStock: "可用库存", stockAfterUse: "使用后库存", selectedBelt: "所选皮带", pinHidden: "密码已保护",
  },
  es: {
    calculator: "Calculadora", inventory: "Inventario", logs: "Registros", users: "Usuarios", settings: "Ajustes", about: "Acerca de",
    input: "Datos", result: "Resultado", units: "Unidades", thickness: "Espesor", core: "Diámetro del núcleo", calculateBy: "Calcular por",
    odLabel: "DE", turns: "Vueltas", remainingOD: "Diámetro exterior restante", remainingTurns: "Vueltas restantes", copy: "Copiar resultado",
    clear: "Borrar", inventoryAction: "Acción de inventario", metric: "Métrico", imperial: "Imperial", length: "Longitud", estimatedTurns: "Vueltas estimadas",
    estimatedOD: "Diámetro exterior estimado", belt: "Banda", useBeltThickness: "Usar espesor de la banda seleccionada", addBelt: "Agregar banda",
    beltDetail: "Detalle de banda", name: "Nombre", part: "Número de parte", width: "Ancho", color: "Color", application: "Aplicación",
    stock: "Existencias (m)", minStock: "Mínimo (m)", location: "Ubicación", notes: "Notas", save: "Guardar", delete: "Eliminar",
    editBelt: "Editar banda", login: "Iniciar sesión", logout: "Cerrar sesión", user: "Usuario", username: "Usuario", pin: "PIN de 4 dígitos",
    addUser: "Agregar usuario", changePin: "Cambiar PIN", admin: "Administrador", standard: "Estándar", passwordProtection: "Protección de inventario",
    saveSettings: "Guardar ajustes", operation: "Operación", amountM: "Cantidad (m)", confirm: "Confirmar", cancel: "Cancelar", before: "Antes",
    after: "Después", useStock: "Usar existencias", addStock: "Agregar existencias", setBalance: "Establecer saldo",
    setWarning: "Establecer saldo reemplazará el inventario actual.", search: "Buscar", searchLogs: "Buscar registros", exportCsv: "Exportar CSV",
    clearLogs: "Borrar registros", dataBackup: "Copia de seguridad", backupHelp: "Exporte una copia antes de cambiar de dispositivo o borrar el navegador.",
    exportBackup: "Exportar copia", importBackup: "Importar copia", localDataNote: "Los datos se guardan en este dispositivo. Exporte copias regularmente.",
    required: "Ingrese espesor, diámetro del núcleo y valor restante.", positive: "Todos los valores deben ser mayores que cero.",
    odGreaterThanCore: "El diámetro restante debe ser mayor que el núcleo.", wrongPin: "PIN incorrecto.", adminOnly: "Se requiere acceso de administrador.",
    saved: "Guardado.", loggedIn: "Sesión iniciada.", loggedOut: "Sesión cerrada.", loginRequired: "Inicie sesión antes de modificar inventario protegido.",
    logEmpty: "No hay registros de inventario.", inventoryEmpty: "Todavía no hay bandas.", noBeltSelected: "Seleccione una banda.", copied: "Resultado copiado.",
    lowStock: "Existencias bajas", inStock: "En existencia", beltsCount: "Bandas", totalStock: "Existencias totales", lowCount: "Existencias bajas",
    insufficientStock: "Esta operación dejaría inventario negativo.", positiveAmount: "Ingrese una cantidad mayor que cero.", nonNegativeAmount: "El saldo no puede ser negativo.",
    requiredAmount: "Ingrese una cantidad.", beltNameRequired: "El nombre es obligatorio.", widthPositive: "El ancho debe ser mayor que cero.",
    thicknessPositive: "El espesor debe ser mayor que cero.", stockNonNegative: "Las existencias no pueden ser negativas.",
    minStockNonNegative: "El mínimo no puede ser negativo.", confirmDeleteBelt: "¿Eliminar esta banda?", confirmClearLogs: "¿Borrar todos los registros?",
    confirmImport: "¿Reemplazar los datos locales con esta copia?", invalidBackup: "Este archivo no es una copia válida.", imported: "Copia importada.",
    exported: "Archivo exportado.", newPin: "Ingrese un PIN nuevo de 4 dígitos", invalidPin: "El PIN debe tener cuatro dígitos.",
    duplicateName: "Ese usuario ya existe.", confirmDeleteUser: "¿Eliminar este usuario?", usernameRequired: "El nombre de usuario es obligatorio.", noResults: "No hay resultados.", guest: "Invitado",
    calculatedLength: "Longitud calculada", availableStock: "Existencias disponibles", stockAfterUse: "Existencias después del uso", selectedBelt: "Banda seleccionada",
    pinHidden: "PIN protegido",
  },
};

const defaultData = () => ({
  schemaVersion: 3,
  users: [{ id: "u-admin", name: "Raymond", pin: "0921", role: "admin" }],
  settings: { passwordProtection: true },
  belts: [{
    id: "b1", name: "Blue Pull Belt", part: "", width: 25, thickness: 4, color: "Blue",
    application: "Pull Belt", stock: 135.6, minStock: 20, location: "Rack A", notes: "Sample",
  }],
  logs: [],
});

const $ = (id) => document.getElementById(id);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const uniqueId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;

let language = localStorage.getItem("brc_lang") || "en";
let units = localStorage.getItem("brc_units") === "IN" ? "IN" : "MM";
let mode = localStorage.getItem("brc_mode") === "turns" ? "turns" : "od";
let selectedId = localStorage.getItem("brc_belt") || "b1";
let currentUserId = sessionStorage.getItem("brc_user") || "";
let data = loadData();
let lastResult = null;
let lastFocused = null;
let toastTimer = null;
let lastLogoTap = 0;
let pendingPasswordProtection = data.settings.passwordProtection;

function normalizeData(candidate) {
  const fallback = defaultData();
  const users = Array.isArray(candidate?.users)
    ? candidate.users
      .filter((item) => item && String(item.name ?? "").trim() && /^\d{4}$/.test(String(item.pin ?? "")))
      .map((item) => ({
        id: String(item.id || uniqueId("u")),
        name: String(item.name).trim().slice(0, 50),
        pin: String(item.pin),
        role: item.role === "admin" ? "admin" : "standard",
      }))
    : fallback.users;
  if (!users.some((item) => item.role === "admin")) users.unshift(...fallback.users);
  const belts = Array.isArray(candidate?.belts)
    ? candidate.belts.map((item) => ({
      id: String(item.id || uniqueId("b")),
      name: String(item.name ?? "").trim().slice(0, 100),
      part: String(item.part ?? "").slice(0, 100),
      width: Number(item.width) || 0,
      thickness: Number(item.thickness) || 0,
      color: String(item.color ?? "").slice(0, 100),
      application: String(item.application ?? "").slice(0, 150),
      stock: Math.max(0, Number(item.stock) || 0),
      minStock: Math.max(0, Number(item.minStock) || 0),
      location: String(item.location ?? "").slice(0, 150),
      notes: String(item.notes ?? "").slice(0, 500),
    })).filter((item) => item.name)
    : fallback.belts;
  const logs = Array.isArray(candidate?.logs) ? candidate.logs.slice(-5000).map((item) => {
    const legacyTimestamp = item.createdAt || [item.date, item.time].filter(Boolean).join(" ");
    const parsedTimestamp = new Date(legacyTimestamp);
    return {
      id: String(item.id || uniqueId("log")),
      createdAt: Number.isNaN(parsedTimestamp.valueOf()) ? String(legacyTimestamp || new Date().toISOString()) : parsedTimestamp.toISOString(),
      beltId: String(item.beltId || ""),
      belt: String(item.belt ?? "Unknown").slice(0, 100),
      part: String(item.part ?? "").slice(0, 100),
      action: ["add", "use", "set"].includes(item.action) ? item.action : "set",
      user: String(item.user ?? "Unknown").slice(0, 50),
      amount: Number(item.amount) || 0,
      before: Number(item.before) || 0,
      after: Number(item.after) || 0,
      note: String(item.note ?? "").slice(0, 500),
      protected: Boolean(item.protected),
    };
  }) : [];

  return {
    schemaVersion: 3,
    users: users.length ? users : fallback.users,
    settings: { passwordProtection: candidate?.settings?.passwordProtection !== false },
    belts,
    logs,
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : defaultData();
  } catch {
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function tr(key) {
  return translations[language]?.[key] ?? translations.en[key] ?? key;
}

function currentUser() {
  return data.users.find((item) => item.id === currentUserId) || null;
}

function isAdmin() {
  return currentUser()?.role === "admin";
}

function selectedBelt() {
  return data.belts.find((item) => item.id === selectedId) || null;
}

function formatNumber(value, maximumFractionDigits = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return number.toLocaleString(undefined, { maximumFractionDigits, minimumFractionDigits: Math.abs(number) < 10 ? Math.min(3, maximumFractionDigits) : 0 });
}

function inputNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return Number(number.toFixed(6)).toString();
}

function toast(message) {
  const node = $("toast");
  window.clearTimeout(toastTimer);
  node.textContent = message;
  node.style.display = "block";
  toastTimer = window.setTimeout(() => { node.style.display = "none"; }, 2200);
}

function translateStatic() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  $("lang").value = language;
  document.querySelectorAll("[data-i]").forEach((node) => { node.textContent = tr(node.dataset.i); });
  document.querySelectorAll("[data-i-placeholder]").forEach((node) => { node.placeholder = tr(node.dataset.iPlaceholder); });
}

function setLanguage(nextLanguage) {
  language = translations[nextLanguage] ? nextLanguage : "en";
  localStorage.setItem("brc_lang", language);
  translateStatic();
  updateModeControls();
  render();
}

function setPage(pageId) {
  if (["logs", "users", "settings"].includes(pageId) && !isAdmin()) {
    toast(tr("adminOnly"));
    return;
  }
  document.querySelectorAll(".page").forEach((node) => node.classList.toggle("active", node.id === pageId));
  document.querySelectorAll(".tab").forEach((node) => node.classList.toggle("active", node.dataset.page === pageId));
  render();
}

function renderAccess() {
  const admin = isAdmin();
  document.querySelectorAll(".admin-tab, .admin-only").forEach((node) => { node.hidden = !admin; });
  const user = currentUser();
  $("loginBtn").textContent = user ? `${user.name} · ${tr("logout")}` : tr("login");
  const activePage = document.querySelector(".page.active")?.id;
  if (!admin && ["logs", "users", "settings"].includes(activePage)) setPage("calculator");
}

function updateModeControls() {
  $("remainingLabel").textContent = mode === "od" ? tr("remainingOD") : tr("remainingTurns");
  $("remainingUnit").textContent = mode === "od" ? (units === "MM" ? "mm" : "in") : tr("turns").toLowerCase();
  document.querySelectorAll(".dimension-unit").forEach((node) => { node.textContent = units === "MM" ? "mm" : "in"; });
  $("uMM").classList.toggle("active", units === "MM");
  $("uIN").classList.toggle("active", units === "IN");
  $("mOD").classList.toggle("active", mode === "od");
  $("mTurns").classList.toggle("active", mode === "turns");
  $("turnsLabel").textContent = tr("estimatedTurns");
  $("odResultLabel").textContent = `${tr("estimatedOD")} (${units === "MM" ? "mm" : "in"})`;
  $("labMM").textContent = `${tr("length")} (mm)`;
  $("labM").textContent = `${tr("length")} (m)`;
  $("labIN").textContent = `${tr("length")} (in)`;
  $("labFT").textContent = `${tr("length")} (ft)`;
  $("labYD").textContent = `${tr("length")} (yd)`;
}

function resetResultDisplay() {
  ["valMM", "valM", "valIN", "valFT", "valYD", "turnsVal", "odResultVal"].forEach((id) => { $(id).textContent = "-"; });
  $("copyBtn").disabled = true;
  $("invActionBtn").disabled = true;
}

function calculate() {
  updateModeControls();
  const result = calculateRoll({
    unit: units,
    mode,
    thickness: $("thickness").value,
    coreDiameter: $("core").value,
    remaining: $("remaining").value,
  });
  lastResult = result.ok ? result : null;
  $("warn").replaceChildren();

  if (!result.ok) {
    resetResultDisplay();
    const warning = el("div", "warning", tr(result.error));
    $("warn").append(warning);
    return result;
  }

  $("valMM").textContent = formatNumber(result.lengthMm);
  $("valM").textContent = formatNumber(result.lengthM);
  $("valIN").textContent = formatNumber(result.lengthIn);
  $("valFT").textContent = formatNumber(result.lengthFt);
  $("valYD").textContent = formatNumber(result.lengthYd);
  $("turnsVal").textContent = formatNumber(result.turns);
  $("odResultVal").textContent = formatNumber(result.outsideDiameter);
  $("copyBtn").disabled = false;
  $("invActionBtn").disabled = !selectedBelt();

  const belt = selectedBelt();
  if (belt) {
    const stockAfter = belt.stock - result.lengthM;
    const noteClass = stockAfter < 0 ? "warning" : "success-note";
    const note = stockAfter < 0
      ? `${tr("insufficientStock")} ${tr("availableStock")}: ${formatNumber(belt.stock)} m.`
      : `${tr("stockAfterUse")}: ${formatNumber(stockAfter)} m.`;
    $("warn").append(el("div", noteClass, note));
  }
  return result;
}

function renderBeltSelect() {
  const select = $("beltSelect");
  select.replaceChildren();
  if (!data.belts.some((item) => item.id === selectedId)) selectedId = data.belts[0]?.id || "";
  if (!data.belts.length) {
    const option = el("option", "", tr("inventoryEmpty"));
    option.value = "";
    select.append(option);
    select.disabled = true;
  } else {
    data.belts.forEach((item) => {
      const option = el("option", "", item.part ? `${item.name} · ${item.part}` : item.name);
      option.value = item.id;
      select.append(option);
    });
    select.disabled = false;
    select.value = selectedId;
  }
  const belt = selectedBelt();
  const status = $("selectedBeltStatus");
  status.classList.toggle("low", Boolean(belt && belt.stock <= belt.minStock));
  status.textContent = belt
    ? `${tr("availableStock")}: ${formatNumber(belt.stock)} m · ${belt.stock <= belt.minStock ? tr("lowStock") : tr("inStock")}`
    : tr("noBeltSelected");
  $("useBeltThickness").disabled = !belt;
}

function renderInventorySummary() {
  const low = data.belts.filter((item) => item.stock <= item.minStock).length;
  const total = data.belts.reduce((sum, item) => sum + item.stock, 0);
  const cards = [
    [tr("beltsCount"), data.belts.length, ""],
    [tr("totalStock"), `${formatNumber(total)} m`, ""],
    [tr("lowCount"), low, low ? "low" : ""],
  ];
  $("inventorySummary").replaceChildren(...cards.map(([label, value, className]) => {
    const card = el("div", `summary-card ${className}`.trim());
    card.append(el("span", "", label), el("b", "", value));
    return card;
  }));
}

function renderInventory() {
  const list = $("beltList");
  const query = $("search").value.trim().toLocaleLowerCase();
  const matches = data.belts.filter((item) => [item.name, item.part, item.color, item.application, item.location, item.notes]
    .some((value) => String(value).toLocaleLowerCase().includes(query)));
  list.replaceChildren();
  if (!matches.length) {
    list.append(el("div", "empty-state", data.belts.length ? tr("noResults") : tr("inventoryEmpty")));
    return;
  }
  matches.forEach((item) => {
    const card = el("button", `belt-card ${item.id === selectedId ? "active" : ""} ${item.stock <= item.minStock ? "low" : ""}`.trim());
    card.type = "button";
    card.dataset.beltId = item.id;
    card.append(
      el("div", "title", item.name),
      el("div", "sub", `${item.part || "—"} · ${formatNumber(item.width)} × ${formatNumber(item.thickness)} mm · ${item.location || "—"}`),
      el("div", "stock", `${formatNumber(item.stock)} m`),
      el("div", "sub", item.stock <= item.minStock ? tr("lowStock") : tr("inStock")),
    );
    card.addEventListener("click", () => {
      selectedId = item.id;
      localStorage.setItem("brc_belt", selectedId);
      render();
    });
    list.append(card);
  });
}

function appendDetailRow(container, label, value) {
  const row = el("div", "detail-row");
  row.append(el("span", "", label), el("b", "", value || "—"));
  container.append(row);
}

function renderDetail() {
  const container = $("beltDetail");
  container.replaceChildren();
  const belt = selectedBelt();
  if (!belt) {
    container.append(el("div", "empty-state", tr("noBeltSelected")));
    return;
  }
  [
    [tr("name"), belt.name], [tr("part"), belt.part], [tr("width"), `${formatNumber(belt.width)} mm`],
    [tr("thickness"), `${formatNumber(belt.thickness)} mm`], [tr("color"), belt.color], [tr("application"), belt.application],
    [tr("stock"), `${formatNumber(belt.stock)} m`], [tr("minStock"), `${formatNumber(belt.minStock)} m`],
    [tr("location"), belt.location], [tr("notes"), belt.notes],
  ].forEach(([label, value]) => appendDetailRow(container, label, value));
  const actions = el("div", "actions");
  const inventoryButton = el("button", "primary", tr("inventoryAction"));
  inventoryButton.type = "button";
  inventoryButton.addEventListener("click", () => openAction(false));
  actions.append(inventoryButton);
  if (isAdmin()) {
    const editButton = el("button", "", tr("editBelt"));
    editButton.type = "button";
    editButton.addEventListener("click", () => openBelt(belt.id));
    actions.append(editButton);
  }
  container.append(actions);
}

function operationLabel(operation) {
  return tr(operation === "add" ? "addStock" : operation === "use" ? "useStock" : "setBalance");
}

function renderLogs() {
  const container = $("logList");
  const query = $("logSearch").value.trim().toLocaleLowerCase();
  const logs = data.logs.filter((item) => Object.values(item).join(" ").toLocaleLowerCase().includes(query)).slice().reverse();
  container.replaceChildren();
  if (!logs.length) {
    container.append(el("div", "empty-state", data.logs.length ? tr("noResults") : tr("logEmpty")));
    return;
  }
  logs.forEach((item) => {
    const card = el("div", "log-card");
    const timestamp = new Date(item.createdAt);
    card.append(
      el("div", "title", `${item.belt} · ${operationLabel(item.action)}`),
      el("div", "sub", `${Number.isNaN(timestamp.valueOf()) ? item.createdAt : timestamp.toLocaleString()} · ${item.user}`),
      el("div", "sub", `${tr("before")}: ${formatNumber(item.before)} m → ${tr("after")}: ${formatNumber(item.after)} m · ${tr("pinHidden")}: ${item.protected ? "ON" : "OFF"}`),
    );
    if (item.note) card.append(el("div", "sub", item.note));
    container.append(card);
  });
}

function renderUsers() {
  const container = $("userList");
  container.replaceChildren();
  data.users.forEach((item) => {
    const card = el("div", "user-card");
    card.append(el("div", "title", `${item.name} · ${tr(item.role)}`), el("div", "sub", `${tr("pin")}: ••••`));
    if (isAdmin()) {
      const actions = el("div", "actions");
      const pinButton = el("button", "", tr("changePin"));
      pinButton.type = "button";
      pinButton.addEventListener("click", () => changePin(item.id));
      actions.append(pinButton);
      if (item.role !== "admin") {
        const deleteButton = el("button", "danger", tr("delete"));
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteUser(item.id));
        actions.append(deleteButton);
      }
      card.append(actions);
    }
    container.append(card);
  });
}

function renderSettings() {
  $("secOn").classList.toggle("active", pendingPasswordProtection);
  $("secOff").classList.toggle("active", !pendingPasswordProtection);
}

function render() {
  renderAccess();
  renderBeltSelect();
  renderInventorySummary();
  renderInventory();
  renderDetail();
  renderLogs();
  renderUsers();
  renderSettings();
  calculate();
}

function openModal(id) {
  lastFocused = document.activeElement;
  const modal = $(id);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  window.setTimeout(() => modal.querySelector("input, select, button")?.focus(), 0);
}

function closeModal(id) {
  const modal = $(id);
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  lastFocused?.focus?.();
}

function openLogin() {
  const select = $("loginUser");
  select.replaceChildren(...data.users.map((item) => {
    const option = el("option", "", `${item.name} · ${tr(item.role)}`);
    option.value = item.id;
    return option;
  }));
  select.value = data.users.some((item) => item.id === currentUserId) ? currentUserId : data.users[0]?.id || "";
  $("loginPin").value = "";
  openModal("loginModal");
}

function login() {
  const user = data.users.find((item) => item.id === $("loginUser").value);
  if (!user || user.pin !== $("loginPin").value) {
    toast(tr("wrongPin"));
    return;
  }
  currentUserId = user.id;
  sessionStorage.setItem("brc_user", currentUserId);
  closeModal("loginModal");
  render();
  toast(tr("loggedIn"));
}

function logout() {
  currentUserId = "";
  sessionStorage.removeItem("brc_user");
  render();
  toast(tr("loggedOut"));
}

function openBelt(id = "") {
  if (!isAdmin()) {
    toast(tr("adminOnly"));
    return;
  }
  const existing = id ? data.belts.find((item) => item.id === id) : null;
  const belt = existing || { name: "", part: "", width: "", thickness: "", color: "", application: "", stock: 0, minStock: 0, location: "", notes: "" };
  const form = $("beltForm");
  form.replaceChildren();
  form.dataset.id = id;
  const fields = [
    ["name", "text", true], ["part", "text", false], ["width", "number", true], ["thickness", "number", true],
    ["color", "text", false], ["application", "text", false], ["stock", "number", false], ["minStock", "number", false],
    ["location", "text", false], ["notes", "text", false],
  ];
  fields.forEach(([key, type, required]) => {
    const label = el("label", "", tr(key));
    label.htmlFor = `bf_${key}`;
    const input = el("input");
    input.id = `bf_${key}`;
    input.dataset.beltField = key;
    input.type = type;
    input.value = belt[key] ?? "";
    input.required = required;
    if (type === "number") {
      input.step = "any";
      input.min = "0";
    }
    if (existing && key === "stock") {
      input.disabled = true;
      input.title = tr("inventoryAction");
    }
    form.append(label, input);
  });
  $("deleteBelt").hidden = !existing;
  openModal("beltModal");
}

function saveBelt() {
  if (!isAdmin()) return toast(tr("adminOnly"));
  const id = $("beltForm").dataset.id;
  const existing = data.belts.find((item) => item.id === id);
  const read = (key) => $(`bf_${key}`).value;
  const belt = {
    id: id || uniqueId("b"),
    name: read("name").trim(),
    part: read("part").trim(),
    width: Number(read("width")),
    thickness: Number(read("thickness")),
    color: read("color").trim(),
    application: read("application").trim(),
    stock: existing ? existing.stock : Number(read("stock")),
    minStock: Number(read("minStock")),
    location: read("location").trim(),
    notes: read("notes").trim(),
  };
  const validation = validateBeltRecord(belt);
  if (!validation.ok) return toast(tr(validation.error));
  const index = data.belts.findIndex((item) => item.id === id);
  if (index >= 0) data.belts[index] = belt;
  else data.belts.push(belt);
  selectedId = belt.id;
  localStorage.setItem("brc_belt", selectedId);
  saveData();
  closeModal("beltModal");
  render();
  toast(tr("saved"));
}

function deleteBelt() {
  if (!isAdmin()) return toast(tr("adminOnly"));
  const id = $("beltForm").dataset.id;
  if (!id || !window.confirm(tr("confirmDeleteBelt"))) return;
  data.belts = data.belts.filter((item) => item.id !== id);
  selectedId = data.belts[0]?.id || "";
  localStorage.setItem("brc_belt", selectedId);
  saveData();
  closeModal("beltModal");
  render();
  toast(tr("saved"));
}

function openAction(fromCalculator) {
  const belt = selectedBelt();
  if (!belt) return toast(tr("noBeltSelected"));
  if (data.settings.passwordProtection && !currentUser()) {
    toast(tr("loginRequired"));
    openLogin();
    return;
  }
  if (fromCalculator && !lastResult) return toast(tr("required"));
  const summary = $("actionSummary");
  summary.replaceChildren();
  summary.append(
    el("b", "", belt.name),
    el("div", "", `${tr("availableStock")}: ${formatNumber(belt.stock)} m`),
    el("div", "", `${tr("calculatedLength")}: ${lastResult ? `${formatNumber(lastResult.lengthM)} m` : "—"}`),
  );
  $("actionType").value = "use";
  $("actionAmount").value = fromCalculator && lastResult ? inputNumber(lastResult.lengthM) : "";
  $("actionPin").value = "";
  $("actionNote").value = "";
  $("passwordRow").style.display = data.settings.passwordProtection ? "grid" : "none";
  $("setWarn").style.display = "none";
  openModal("actionModal");
}

function confirmAction() {
  const belt = selectedBelt();
  if (!belt) return toast(tr("noBeltSelected"));
  const user = currentUser();
  if (data.settings.passwordProtection && (!user || user.pin !== $("actionPin").value)) return toast(tr(user ? "wrongPin" : "loginRequired"));
  const operation = $("actionType").value;
  const balance = calculateInventoryBalance({ operation, before: belt.stock, amount: $("actionAmount").value });
  if (!balance.ok) return toast(tr(balance.error));
  if (operation === "set" && !window.confirm(tr("setWarning"))) return;
  const before = belt.stock;
  const amount = Number($("actionAmount").value);
  belt.stock = balance.after;
  data.logs.push({
    id: uniqueId("log"), createdAt: new Date().toISOString(), beltId: belt.id, belt: belt.name, part: belt.part,
    action: operation, user: user?.name || tr("guest"), amount, before, after: balance.after,
    note: $("actionNote").value.trim(), protected: data.settings.passwordProtection,
  });
  saveData();
  closeModal("actionModal");
  render();
  toast(tr("saved"));
}

function changePin(userId) {
  if (!isAdmin()) return toast(tr("adminOnly"));
  const value = window.prompt(tr("newPin"));
  if (value === null) return;
  if (!/^\d{4}$/.test(value)) return toast(tr("invalidPin"));
  const user = data.users.find((item) => item.id === userId);
  if (!user) return;
  user.pin = value;
  saveData();
  renderUsers();
  toast(tr("saved"));
}

function deleteUser(userId) {
  if (!isAdmin()) return toast(tr("adminOnly"));
  const user = data.users.find((item) => item.id === userId);
  if (!user || user.role === "admin" || !window.confirm(tr("confirmDeleteUser"))) return;
  data.users = data.users.filter((item) => item.id !== userId);
  saveData();
  renderUsers();
  toast(tr("saved"));
}

function addUser() {
  if (!isAdmin()) return toast(tr("adminOnly"));
  const name = $("newUserName").value.trim();
  const pin = $("newUserPin").value;
  if (!name) return toast(tr("usernameRequired"));
  if (!/^\d{4}$/.test(pin)) return toast(tr("invalidPin"));
  if (data.users.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return toast(tr("duplicateName"));
  data.users.push({ id: uniqueId("u"), name: name.slice(0, 50), pin, role: "standard" });
  $("newUserName").value = "";
  $("newUserPin").value = "";
  saveData();
  renderUsers();
  toast(tr("saved"));
}

function downloadBlob(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = el("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportLogs() {
  const headings = ["Timestamp", "Belt", "Part Number", "Operation", "User", "Amount (m)", "Before (m)", "After (m)", "PIN Protection", "Notes"];
  const rows = data.logs.map((item) => [item.createdAt, item.belt, item.part, item.action, item.user, item.amount, item.before, item.after, item.protected ? "ON" : "OFF", item.note]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadBlob(`belt-roll-inventory-logs-${new Date().toISOString().slice(0, 10)}.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
  toast(tr("exported"));
}

function clearLogs() {
  if (!isAdmin()) return toast(tr("adminOnly"));
  if (!data.logs.length || !window.confirm(tr("confirmClearLogs"))) return;
  data.logs = [];
  saveData();
  renderLogs();
  toast(tr("saved"));
}

function exportBackup() {
  const backup = { product: "Belt Roll Calculator", build: BUILD, exportedAt: new Date().toISOString(), data };
  downloadBlob(`belt-roll-calculator-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), "application/json");
  toast(tr("exported"));
}

async function importBackup(file) {
  try {
    const parsed = JSON.parse(await file.text());
    const candidate = parsed?.product === "Belt Roll Calculator" ? parsed.data : parsed;
    if (!candidate || !Array.isArray(candidate.users) || !Array.isArray(candidate.belts) || !Array.isArray(candidate.logs)) throw new Error("invalid");
    if (!candidate.users.some((item) => item?.role === "admin")) throw new Error("missing admin");
    const normalized = normalizeData(candidate);
    if (!normalized.belts.every((item) => validateBeltRecord(item).ok)) throw new Error("invalid belt");
    if (!window.confirm(tr("confirmImport"))) return;
    data = normalized;
    currentUserId = "";
    sessionStorage.removeItem("brc_user");
    selectedId = data.belts[0]?.id || "";
    pendingPasswordProtection = data.settings.passwordProtection;
    saveData();
    render();
    setPage("calculator");
    toast(tr("imported"));
  } catch {
    toast(tr("invalidBackup"));
  } finally {
    $("backupFile").value = "";
  }
}

function copyResult() {
  if (!lastResult) return;
  const text = [
    "Belt Roll Calculator",
    `${tr("length")} (m): ${formatNumber(lastResult.lengthM)}`,
    `${tr("length")} (ft): ${formatNumber(lastResult.lengthFt)}`,
    `${tr("estimatedTurns")}: ${formatNumber(lastResult.turns)}`,
    `${tr("estimatedOD")}: ${formatNumber(lastResult.outsideDiameter)} ${units === "MM" ? "mm" : "in"}`,
  ].join("\n");
  navigator.clipboard?.writeText(text).then(() => toast(tr("copied"))).catch(() => toast(text));
}

function switchUnits(nextUnits) {
  if (nextUnits === units) return;
  const previousUnits = units;
  ["thickness", "core"].forEach((id) => {
    if ($(id).value !== "") $(id).value = inputNumber(convertDimension($(id).value, previousUnits, nextUnits));
  });
  if (mode === "od" && $("remaining").value !== "") {
    $("remaining").value = inputNumber(convertDimension($("remaining").value, previousUnits, nextUnits));
  }
  units = nextUnits;
  localStorage.setItem("brc_units", units);
  calculate();
}

function switchMode(nextMode) {
  if (nextMode === mode) return;
  const current = calculate();
  if (current.ok) $("remaining").value = inputNumber(nextMode === "turns" ? current.turns : current.outsideDiameter);
  mode = nextMode;
  localStorage.setItem("brc_mode", mode);
  calculate();
}

function useSelectedThickness() {
  const belt = selectedBelt();
  if (!belt) return toast(tr("noBeltSelected"));
  $("thickness").value = inputNumber(units === "MM" ? belt.thickness : convertDimension(belt.thickness, "MM", "IN"));
  calculate();
}

document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
document.querySelectorAll(".modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal.id); }));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelector(".modal.open") && closeModal(document.querySelector(".modal.open").id);
});

$("lang").addEventListener("change", (event) => setLanguage(event.target.value));
$("loginBtn").addEventListener("click", () => currentUser() ? logout() : openLogin());
$("doLogin").addEventListener("click", login);
$("loginPin").addEventListener("keydown", (event) => { if (event.key === "Enter") login(); });
document.querySelectorAll("[data-unit]").forEach((button) => button.addEventListener("click", () => switchUnits(button.dataset.unit)));
document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => switchMode(button.dataset.mode)));
["thickness", "core", "remaining"].forEach((id) => $(id).addEventListener("input", calculate));
$("beltSelect").addEventListener("change", (event) => {
  selectedId = event.target.value;
  localStorage.setItem("brc_belt", selectedId);
  render();
});
$("useBeltThickness").addEventListener("click", useSelectedThickness);
$("copyBtn").addEventListener("click", copyResult);
$("clearBtn").addEventListener("click", () => {
  ["thickness", "core", "remaining"].forEach((id) => { $(id).value = ""; });
  calculate();
  $("thickness").focus();
});
$("invActionBtn").addEventListener("click", () => openAction(true));
$("search").addEventListener("input", renderInventory);
$("logSearch").addEventListener("input", renderLogs);
$("addBelt").addEventListener("click", () => openBelt());
$("saveBelt").addEventListener("click", saveBelt);
$("deleteBelt").addEventListener("click", deleteBelt);
$("actionType").addEventListener("change", () => { $("setWarn").style.display = $("actionType").value === "set" ? "block" : "none"; });
$("confirmAction").addEventListener("click", confirmAction);
$("actionPin").addEventListener("keydown", (event) => { if (event.key === "Enter") confirmAction(); });
$("addUserBtn").addEventListener("click", addUser);
$("exportLogs").addEventListener("click", exportLogs);
$("clearLogs").addEventListener("click", clearLogs);
$("secOn").addEventListener("click", () => { pendingPasswordProtection = true; renderSettings(); });
$("secOff").addEventListener("click", () => { pendingPasswordProtection = false; renderSettings(); });
$("saveSettings").addEventListener("click", () => {
  if (!isAdmin()) return toast(tr("adminOnly"));
  data.settings.passwordProtection = pendingPasswordProtection;
  saveData();
  render();
  toast(tr("saved"));
});
$("exportBackup").addEventListener("click", exportBackup);
$("importBackup").addEventListener("click", () => $("backupFile").click());
$("backupFile").addEventListener("change", (event) => event.target.files[0] && importBackup(event.target.files[0]));
$("aboutLogo").addEventListener("click", () => {
  const now = Date.now();
  if (now - lastLogoTap < 450) {
    $("aboutLogo").classList.remove("easter");
    void $("aboutLogo").offsetWidth;
    $("aboutLogo").classList.add("easter");
  }
  lastLogoTap = now;
});

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));

translateStatic();
updateModeControls();
render();
