(() => {
  const state = {
    language: localStorage.getItem("brc.language") || "en",
    units: localStorage.getItem("brc.units") || "MM",
    mode: localStorage.getItem("brc.mode") || "od",
    deferredInstallPrompt: null
  };

  const i18n = {
    en: {
      version:"Web Edition 2.1 Beta", build:"Build 2026.06.29.02",
      input:"Input", result:"Result", units:"Units", thickness:"Thickness", core:"Core Diameter",
      calculateBy:"Calculate By", turnsShort:"Turns", remainingOD:"Remaining OD", remainingTurns:"Remaining Turns",
      copyResult:"Copy Result", clearInputs:"Clear", about:"About", note:"Note: Calculations are estimates only.",
      done:"Done", installApp:"Install App", designed:"Designed and Developed by",
      copyright:"Copyright © 2026 Raymond Lei", rights:"All Rights Reserved.",
      legal:"No part of this application, including its design, calculations, source code, documentation, images, or data structure, may be copied, modified, distributed, or reproduced without written permission from Raymond Lei.",
      installTitle:"Install to Device", installIOS:"Safari → Share → Add to Home Screen",
      installAndroid:"Chrome → Menu → Install app or Add to Home screen",
      installDesktop:"Chrome or Edge → Address bar install icon, or Menu → Install app",
      length:"Length", feet:"ft", meters:"m", estimatedTurns:"Estimated Turns", estimatedOD:"Estimated OD",
      copied:"Result copied.", installUnavailable:"Install instructions are shown in About.",
      warningNumber:"Wrong input: Please enter numbers only.", warningThickness:"Thickness must be greater than 0.",
      warningCore:"Core Diameter must be greater than 0.", warningPositive:"Remaining value must be greater than 0.",
      warningODCore:"Remaining OD must be greater than Core Diameter."
    },
    es: {
      version:"Edición Web 2.1 Beta", build:"Build 2026.06.29.02",
      input:"Datos", result:"Resultado", units:"Unidades", thickness:"Espesor", core:"Diámetro del Núcleo",
      calculateBy:"Calcular Por", turnsShort:"Vueltas", remainingOD:"Diámetro Exterior Restante", remainingTurns:"Vueltas Restantes",
      copyResult:"Copiar Resultado", clearInputs:"Borrar", about:"Acerca de", note:"Nota: Los cálculos son estimados.",
      done:"Listo", installApp:"Instalar", designed:"Diseñado y desarrollado por",
      copyright:"Copyright © 2026 Raymond Lei", rights:"Todos los derechos reservados.",
      legal:"No part of this application, including its design, calculations, source code, documentation, images, or data structure, may be copied, modified, distributed, or reproduced without written permission from Raymond Lei.",
      installTitle:"Instalar en dispositivo", installIOS:"Safari → Compartir → Agregar a pantalla de inicio",
      installAndroid:"Chrome → Menú → Instalar app o Agregar a pantalla de inicio",
      installDesktop:"Chrome o Edge → Icono de instalación en la barra, o Menú → Instalar app",
      length:"Longitud", feet:"pies", meters:"m", estimatedTurns:"Vueltas Estimadas", estimatedOD:"Diámetro Exterior Estimado",
      copied:"Resultado copiado.", installUnavailable:"Las instrucciones de instalación están en Acerca de.",
      warningNumber:"Entrada incorrecta: ingrese solo números.", warningThickness:"El espesor debe ser mayor que 0.",
      warningCore:"El diámetro del núcleo debe ser mayor que 0.", warningPositive:"El valor debe ser mayor que 0.",
      warningODCore:"El diámetro exterior restante debe ser mayor que el diámetro del núcleo."
    },
    zh: {
      version:"网页版 2.1 Beta", build:"Build 2026.06.29.02",
      input:"输入", result:"结果", units:"单位", thickness:"皮带厚度", core:"卷芯直径",
      calculateBy:"计算方式", turnsShort:"圈数", remainingOD:"剩余外径", remainingTurns:"剩余圈数",
      copyResult:"复制结果", clearInputs:"清除", about:"关于", note:"注：计算结果仅为估算。",
      done:"完成", installApp:"安装应用", designed:"设计与开发",
      copyright:"版权所有 © 2026 Raymond Lei", rights:"保留所有权利。",
      legal:"未经 Raymond Lei 书面授权，不得复制、修改、分发、转载本应用程序的设计、计算逻辑、源代码、文档、图片或数据结构。",
      installTitle:"安装到设备", installIOS:"Safari → 分享 → 添加到主屏幕",
      installAndroid:"Chrome → 菜单 → 安装应用 或 添加到主屏幕",
      installDesktop:"Chrome 或 Edge → 地址栏安装图标，或 菜单 → 安装应用",
      length:"长度", feet:"英尺", meters:"米", estimatedTurns:"预估圈数", estimatedOD:"预估外径",
      copied:"结果已复制。", installUnavailable:"安装说明已显示在 About 页面。",
      warningNumber:"错误：请输入有效数字。", warningThickness:"错误：皮带厚度必须大于 0。",
      warningCore:"错误：卷芯直径必须大于 0。", warningPositive:"错误：数值必须大于 0。",
      warningODCore:"错误：剩余外径必须大于卷芯直径。"
    }
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    languageSelect: $("languageSelect"), installButton: $("installButton"),
    thickness: $("thickness"), core: $("core"), remaining: $("remaining"),
    remainingLabel: $("remainingLabel"), remainingUnit: $("remainingUnit"),
    warningArea: $("warningArea"), resultArea: $("resultArea"),
    lengthUnitLabel: $("lengthUnitLabel"), lengthFeetLabel: $("lengthFeetLabel"), lengthMetersLabel: $("lengthMetersLabel"),
    lengthUnitValue: $("lengthUnitValue"), lengthFeetValue: $("lengthFeetValue"), lengthMetersValue: $("lengthMetersValue"),
    checkLabel: $("checkLabel"), checkValue: $("checkValue"),
    toast: $("toast"), aboutModal: $("aboutModal")
  };

  function t(key) { return (i18n[state.language] && i18n[state.language][key]) || i18n.en[key] || key; }

  function formatNumber(value, digits = 3) {
    const n = Number(value);
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: n < 10 ? Math.min(3, digits) : 0 });
  }

  function setLanguage(language) {
    state.language = language;
    localStorage.setItem("brc.language", language);
    el.languageSelect.value = language;
    document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(node.getAttribute("data-i18n")); });
    updateModeLabels();
    calculate();
  }

  function setUnits(units) {
    state.units = units;
    localStorage.setItem("brc.units", units);
    $("unitMM").classList.toggle("active", units === "MM");
    $("unitInch").classList.toggle("active", units === "Inch");
    document.querySelectorAll(".unit-text").forEach(node => { node.textContent = units === "MM" ? "mm" : "in"; });
    updateModeLabels();
    calculate();
  }

  function setMode(mode) {
    state.mode = mode;
    localStorage.setItem("brc.mode", mode);
    $("modeOD").classList.toggle("active", mode === "od");
    $("modeTurns").classList.toggle("active", mode === "turns");
    updateModeLabels();
    calculate();
  }

  function updateModeLabels() {
    el.remainingLabel.textContent = state.mode === "od" ? t("remainingOD") : t("remainingTurns");
    el.remainingUnit.textContent = state.mode === "od" ? (state.units === "MM" ? "mm" : "in") : "";
  }

  function getNumber(input) { return parseFloat(input.value); }

  function saveInputs() {
    localStorage.setItem("brc.thickness", el.thickness.value);
    localStorage.setItem("brc.core", el.core.value);
    localStorage.setItem("brc.remaining", el.remaining.value);
  }

  function calculate() {
    saveInputs();
    const thickness = getNumber(el.thickness);
    const core = getNumber(el.core);
    const remaining = getNumber(el.remaining);
    el.warningArea.innerHTML = "";
    el.resultArea.style.display = "block";
    let warning = "";

    if (Number.isNaN(thickness) || Number.isNaN(core) || Number.isNaN(remaining)) {
      const hasAnyValue = [el.thickness.value, el.core.value, el.remaining.value].some(value => value !== "");
      if (hasAnyValue) warning = t("warningNumber");
    } else if (thickness <= 0) warning = t("warningThickness");
    else if (core <= 0) warning = t("warningCore");
    else if (remaining <= 0) warning = t("warningPositive");
    else if (state.mode === "od" && remaining <= core) warning = t("warningODCore");

    if (warning) {
      el.warningArea.innerHTML = `<div class="warning">${warning}</div>`;
      el.resultArea.style.display = "none";
      return;
    }

    if (Number.isNaN(thickness) || Number.isNaN(core) || Number.isNaN(remaining)) {
      el.lengthUnitValue.textContent = "-";
      el.lengthFeetValue.textContent = "-";
      el.lengthMetersValue.textContent = "-";
      el.checkValue.textContent = "-";
      return;
    }

    let length, checkLabel, checkValue;
    if (state.mode === "od") {
      length = Math.PI * (remaining * remaining - core * core) / (4 * thickness);
      checkLabel = t("estimatedTurns");
      checkValue = formatNumber((remaining - core) / (2 * thickness), 2);
    } else {
      length = Math.PI * remaining * (core + thickness * (remaining - 1));
      checkLabel = t("estimatedOD");
      checkValue = `${formatNumber(core + 2 * thickness * remaining)} ${state.units}`;
    }

    const feet = state.units === "MM" ? length / 304.8 : length / 12;
    const meters = state.units === "MM" ? length / 1000 : length * 0.0254;

    el.lengthUnitLabel.textContent = `${t("length")} (${state.units})`;
    el.lengthFeetLabel.textContent = `${t("length")} (${t("feet")})`;
    el.lengthMetersLabel.textContent = `${t("length")} (${t("meters")})`;
    el.lengthUnitValue.textContent = formatNumber(length);
    el.lengthFeetValue.textContent = formatNumber(feet);
    el.lengthMetersValue.textContent = formatNumber(meters);
    el.checkLabel.textContent = checkLabel;
    el.checkValue.textContent = checkValue;
  }

  function clearInputs() { el.thickness.value = ""; el.core.value = ""; el.remaining.value = ""; calculate(); }

  function reportText() {
    return [
      "Belt Roll Estimate", "",
      `${t("units")}: ${state.units}`,
      `${t("thickness")}: ${el.thickness.value}`,
      `${t("core")}: ${el.core.value}`,
      `${el.remainingLabel.textContent}: ${el.remaining.value}`, "",
      `${el.lengthUnitLabel.textContent}: ${el.lengthUnitValue.textContent}`,
      `${el.lengthFeetLabel.textContent}: ${el.lengthFeetValue.textContent}`,
      `${el.lengthMetersLabel.textContent}: ${el.lengthMetersValue.textContent}`,
      `${el.checkLabel.textContent}: ${el.checkValue.textContent}`
    ].join("\n");
  }

  async function copyResult() {
    try { await navigator.clipboard.writeText(reportText()); }
    catch {
      const temporary = document.createElement("textarea");
      temporary.value = reportText();
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
    }
    showToast(t("copied"));
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.style.display = "block";
    setTimeout(() => { el.toast.style.display = "none"; }, 1800);
  }

  function openAbout() { el.aboutModal.classList.add("open"); el.aboutModal.setAttribute("aria-hidden", "false"); }
  function closeAbout() { el.aboutModal.classList.remove("open"); el.aboutModal.setAttribute("aria-hidden", "true"); }

  async function installApp() {
    if (state.deferredInstallPrompt) {
      state.deferredInstallPrompt.prompt();
      await state.deferredInstallPrompt.userChoice;
      state.deferredInstallPrompt = null;
      return;
    }
    openAbout();
    const card = $("installInstructions");
    if (card) {
      card.classList.add("highlight");
      setTimeout(() => card.classList.remove("highlight"), 2500);
    }
    showToast(t("installUnavailable"));
  }

  function restoreInputs() {
    el.thickness.value = localStorage.getItem("brc.thickness") || "1";
    el.core.value = localStorage.getItem("brc.core") || "100";
    el.remaining.value = localStorage.getItem("brc.remaining") || "102";
  }

  function bindEvents() {
    el.languageSelect.addEventListener("change", event => setLanguage(event.target.value));
    document.querySelectorAll("[data-unit]").forEach(button => button.addEventListener("click", () => setUnits(button.getAttribute("data-unit"))));
    document.querySelectorAll("[data-mode]").forEach(button => button.addEventListener("click", () => setMode(button.getAttribute("data-mode"))));
    [el.thickness, el.core, el.remaining].forEach(input => {
      input.addEventListener("input", calculate);
      input.addEventListener("focus", () => input.select());
    });
    $("copyButton").addEventListener("click", copyResult);
    $("clearButton").addEventListener("click", clearInputs);
    $("aboutButton").addEventListener("click", openAbout);
    $("closeAboutButton").addEventListener("click", closeAbout);
    el.installButton.addEventListener("click", installApp);
    el.aboutModal.addEventListener("click", event => { if (event.target === el.aboutModal) closeAbout(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeAbout(); });
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
    }
  }

  bindEvents();
  restoreInputs();
  setUnits(state.units);
  setMode(state.mode);
  setLanguage(state.language);
  registerServiceWorker();
})();
