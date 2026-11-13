/**
 * PureTech Wallet - Core Application Engine, UI Renderer, Charts & Event Controllers
 */

let appState = getSampleState();
let wealthChart = null;
let pillarsChart = null;
let trendsChart = null;

// Toast Notification helper
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast-anim pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-bold shadow-2xl transition-all ${
    type === "success" 
      ? "bg-dark-900 border-brand-500/40 text-brand-300" 
      : type === "error" 
      ? "bg-dark-900 border-rose-500/40 text-rose-300" 
      : "bg-dark-900 border-indigo-500/40 text-indigo-300"
  }`;
  const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-circle-info";
  toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Utility: Debounce function for 60fps responsive UI
function debounce(func, wait = 180) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Currency Formatter - Strictly formats all numbers using Western/English numerals (1, 2, 3...)
function formatMoney(amount, forceRaw = false) {
  const curr = appState?.settings?.currency || "EGP";
  if (appState?.settings?.privacyMode && !forceRaw) {
    return `•••••• ${curr}`;
  }
  const num = Number(amount || 0);
  const val = Math.abs(num) < 0.005 ? 0 : num;
  const formatted = val.toLocaleString("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  return `${formatted} ${curr}`;
}

// Custom Confirmation Dialog
function requestConfirmation(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const titleEl = document.getElementById("confirmModalTitle");
    const msgEl = document.getElementById("confirmModalMessage");
    const btnOk = document.getElementById("btnConfirmOk");
    const btnCancel = document.getElementById("btnConfirmCancel");

    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.classList.remove("hidden");

    const cleanup = (confirmed) => {
      modal.classList.add("hidden");
      btnOk.onclick = null;
      btnCancel.onclick = null;
      resolve(confirmed);
    };

    btnOk.onclick = () => cleanup(true);
    btnCancel.onclick = () => cleanup(false);
  });
}

// Pagination & Cashflow Period State
const paginationState = {
  pageSize: 10,
  incomesPage: 1,
  obligationsPage: 1,
  creatorTxPage: 1,
  freelanceTxPage: 1,
  assetsPage: 1,
  selectedPeriod: "all"
};

window.changePaginationPage = function(target, page) {
  if (target === "incomes") paginationState.incomesPage = page;
  else if (target === "obligations") paginationState.obligationsPage = page;
  else if (target === "creatorTx") paginationState.creatorTxPage = page;
  else if (target === "freelanceTx") paginationState.freelanceTxPage = page;
  else if (target === "assets") paginationState.assetsPage = page;
  renderAll();
};

function renderPagination(containerId, target, currentPage, totalItems, pageSize = 10) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) {
    container.innerHTML = totalItems > 0 
      ? `<div class="w-full flex items-center justify-between text-[11px] text-slate-500 font-mono py-1">
           <span>${totalItems} ${(i18n[appState.settings.lang] || i18n.en).items_count?.replace("{count}", totalItems) || ''}</span>
         </div>`
      : "";
    return;
  }

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const lang = appState.settings.lang;
  const dict = i18n[lang] || i18n.en;
  const infoText = (dict.page_info || "Page {current} of {total}").replace("{current}", currentPage).replace("{total}", totalPages);
  const countText = (dict.items_count || "({count} items)").replace("{count}", totalItems);

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  let pageButtonsHtml = "";
  for (let p = 1; p <= totalPages; p++) {
    if (totalPages > 7) {
      if (p !== 1 && p !== totalPages && Math.abs(p - currentPage) > 1) {
        if (p === 2 || p === totalPages - 1) {
          pageButtonsHtml += `<span class="px-1 text-slate-600 text-xs font-mono">...</span>`;
        }
        continue;
      }
    }
    const isActive = p === currentPage;
    pageButtonsHtml += `
      <button type="button" onclick="changePaginationPage('${target}', ${p})" class="px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
        isActive 
          ? 'bg-brand-500 text-white shadow-sm' 
          : 'bg-dark-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
      }">${p}</button>
    `;
  }

  container.innerHTML = `
    <div class="flex items-center gap-2 font-mono text-[11px] text-slate-400">
      <span>${infoText}</span>
      <span class="text-slate-600">${countText}</span>
    </div>
    <div class="flex items-center gap-1">
      <button type="button" ${prevDisabled ? 'disabled' : ''} onclick="changePaginationPage('${target}', ${currentPage - 1})" 
        class="px-2.5 py-0.5 rounded text-xs font-semibold transition-all ${
          prevDisabled 
            ? 'bg-dark-950 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-40' 
            : 'bg-dark-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
        }">${dict.page_prev || 'Previous'}</button>
      
      <div class="flex items-center gap-1">${pageButtonsHtml}</div>

      <button type="button" ${nextDisabled ? 'disabled' : ''} onclick="changePaginationPage('${target}', ${currentPage + 1})" 
        class="px-2.5 py-0.5 rounded text-xs font-semibold transition-all ${
          nextDisabled 
            ? 'bg-dark-950 text-slate-600 border border-slate-800/60 cursor-not-allowed opacity-40' 
            : 'bg-dark-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
        }">${dict.page_next || 'Next'}</button>
    </div>
  `;
}

// Calculations & Data Aggregation
function calculateFinancials() {
  // All-time cumulative personal totals (preserves total wallet liquidity and portfolio net worth)
  const allTimePersonalIncome = appState.personalIncomes.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const allTimePersonalObligations = appState.personalObligations.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const allTimePersonalNet = allTimePersonalIncome - allTimePersonalObligations;

  // Selected period totals (for the Live Personal Monthly Cashflow Equation)
  const selectedPeriod = paginationState.selectedPeriod;
  const isPeriodFiltered = selectedPeriod && selectedPeriod !== "all";

  const periodIncomes = isPeriodFiltered
    ? appState.personalIncomes.filter(inc => (inc.date || "").startsWith(selectedPeriod))
    : appState.personalIncomes;
  const periodObligations = isPeriodFiltered
    ? appState.personalObligations.filter(exp => (exp.date || "").startsWith(selectedPeriod))
    : appState.personalObligations;

  const personalIncome = periodIncomes.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const personalObligations = periodObligations.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const personalNet = personalIncome - personalObligations;

  let creatorRev = 0;
  let creatorExp = 0;
  appState.creatorTransactions.forEach((tx) => {
    if (tx.flow === "revenue") creatorRev += Number(tx.amount || 0);
    else creatorExp += Number(tx.amount || 0);
  });
  const creatorNet = creatorRev - creatorExp;

  let freelanceRev = 0;
  let freelanceExp = 0;
  appState.freelanceTransactions.forEach((tx) => {
    if (tx.flow === "income") freelanceRev += Number(tx.amount || 0);
    else freelanceExp += Number(tx.amount || 0);
  });
  const freelanceNet = freelanceRev - freelanceExp;

  const onlineNet = creatorNet + freelanceNet;

  const liquidCash = appState.settings.includeOnline 
    ? allTimePersonalNet + onlineNet 
    : allTimePersonalNet;

  let totalAssetsValue = 0;
  let totalAssetsCost = 0;
  const assetValues = {
    usd: 0,
    eur: 0,
    gold: 0,
    stocks: 0,
    realestate: 0,
    other: 0
  };

  appState.assets.forEach((asset) => {
    let currentUnitPrice = Number(asset.unitPrice || 0);
    if (asset.category === "usd") currentUnitPrice = Number(appState.rates.usd);
    if (asset.category === "eur") currentUnitPrice = Number(appState.rates.eur);
    if (asset.category === "gold") {
      const base24k = Number(appState.rates.gold);
      const karat = asset.karat || "24k";
      if (karat === "21k") currentUnitPrice = Math.round(base24k * (21 / 24));
      else if (karat === "18k") currentUnitPrice = Math.round(base24k * (18 / 24));
      else currentUnitPrice = base24k;
    }

    const qty = Number(asset.quantity || 0);
    const val = qty * currentUnitPrice;
    const purchasePrice = Number(asset.purchasePrice || asset.unitPrice || currentUnitPrice);
    totalAssetsCost += (qty * purchasePrice);

    totalAssetsValue += val;
    if (assetValues[asset.category] !== undefined) {
      assetValues[asset.category] += val;
    } else {
      assetValues.other += val;
    }
  });

  const totalNetWorth = liquidCash + totalAssetsValue;

  // Financial Health Intelligence Indicators
  const savingsRate = personalIncome > 0 ? ((personalNet / personalIncome) * 100) : 0;
  
  // Calculate monthly burn rate for emergency runway (selected month or average monthly obligations)
  const distinctObligationMonths = new Set(
    appState.personalObligations
      .map(o => (o.date || "").slice(0, 7))
      .filter(Boolean)
  ).size;
  const avgMonthlyBurn = distinctObligationMonths > 0 
    ? (allTimePersonalObligations / distinctObligationMonths) 
    : personalObligations;
  const monthlyBurn = personalObligations > 0 ? personalObligations : avgMonthlyBurn;
  const runwayMonths = monthlyBurn > 0 ? (liquidCash / monthlyBurn) : 999;

  return {
    personalIncome,
    personalObligations,
    personalNet,
    allTimePersonalIncome,
    allTimePersonalObligations,
    allTimePersonalNet,
    creatorRev,
    creatorExp,
    creatorNet,
    freelanceRev,
    freelanceExp,
    freelanceNet,
    onlineNet,
    liquidCash,
    totalAssetsValue,
    totalAssetsCost,
    assetValues,
    totalNetWorth,
    savingsRate,
    runwayMonths
  };
}

// Online / Offline Network Status Detector
function updateOnlineStatusUI() {
  const dot = document.getElementById("networkStatusDot");
  const text = document.getElementById("networkStatusText");
  const lang = appState?.settings?.lang || "ar";
  const dict = i18n[lang] || i18n.en;

  if (navigator.onLine) {
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-400 status-pulse me-1.5";
    if (text) text.textContent = dict.status_online || "Online";
  } else {
    if (dot) dot.className = "w-1.5 h-1.5 rounded-full bg-amber-400 me-1.5";
    if (text) text.textContent = dict.status_offline || "100% Offline";
  }
}

// Backup Reminder Counter
let userOperationsCounter = 0;
function trackOperationAndRemind() {
  userOperationsCounter++;
  if (userOperationsCounter >= 8) {
    const lang = appState?.settings?.lang || "ar";
    const dict = i18n[lang] || i18n.en;
    showToast(dict.backup_reminder_msg || "Remember to export a backup!", "info");
    userOperationsCounter = 0;
  }
}

function updatePrivacyUI() {
  const isPrivate = Boolean(appState?.settings?.privacyMode);
  const icon = document.getElementById("iconPrivacyToggle");
  const btn = document.getElementById("btnTogglePrivacy");
  const lang = appState?.settings?.lang || "ar";
  const dict = i18n[lang] || i18n.en;

  if (icon) {
    icon.className = isPrivate ? "fa-solid fa-eye-slash text-xs text-amber-400" : "fa-solid fa-eye text-xs text-slate-300";
  }
  if (btn) {
    btn.setAttribute("title", isPrivate ? (dict.btn_privacy_show || "Show balances") : (dict.btn_privacy_hide || "Hide balances"));
  }
}

// UI Rendering Engine
function updateLanguageUI() {
  const lang = appState.settings.lang;
  const dict = i18n[lang] || i18n.en;

  document.documentElement.lang = lang;
  document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) {
      el.setAttribute("placeholder", dict[key]);
    }
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    if (btn.getAttribute("data-lang") === lang) {
      btn.className = "lang-btn px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-brand-500 text-white shadow-sm";
    } else {
      btn.className = "lang-btn px-2.5 py-1 text-xs font-bold rounded-md transition-all text-slate-300 hover:text-white";
    }
  });

  document.querySelectorAll(".curr-tag").forEach((el) => {
    el.textContent = appState.settings.currency;
  });
  const baseCurrLabel = document.getElementById("ratesBaseCurrency");
  if (baseCurrLabel) baseCurrLabel.textContent = appState.settings.currency;

  const baseOpt1 = document.getElementById("txCurrencyBaseOpt");
  if (baseOpt1) baseOpt1.textContent = `${appState.settings.currency} (${lang === 'ar' ? 'الأساسية' : 'Base'})`;
  const baseOpt2 = document.getElementById("flCurrencyBaseOpt");
  if (baseOpt2) baseOpt2.textContent = `${appState.settings.currency} (${lang === 'ar' ? 'الأساسية' : 'Base'})`;

  updatePrivacyUI();
  updateOnlineStatusUI();
}

function renderAll() {
  const data = calculateFinancials();
  const lang = appState.settings.lang;

  document.getElementById("tickerUsd").textContent = Number(appState.rates.usd).toFixed(2);
  document.getElementById("tickerEur").textContent = Number(appState.rates.eur).toFixed(2);
  document.getElementById("tickerGold").textContent = Number(appState.rates.gold).toLocaleString("en-US");
  document.getElementById("currencySelect").value = appState.settings.currency;

  document.getElementById("rateInputUsd").value = appState.rates.usd;
  document.getElementById("rateInputEur").value = appState.rates.eur;
  document.getElementById("rateInputGold").value = appState.rates.gold;

  const autoSyncToggle = document.getElementById("autoSyncRatesToggle");
  if (autoSyncToggle) autoSyncToggle.checked = appState.settings.autoSyncRates !== false;

  const syncStatusEl = document.getElementById("lastSyncStatusText");
  if (syncStatusEl) {
    if (appState.rates.lastSyncTime) {
      syncStatusEl.textContent = appState.rates.lastSyncTime;
    } else {
      syncStatusEl.textContent = (i18n[lang] || i18n.en).sync_status_never;
    }
  }

  document.getElementById("kpiNetWorth").textContent = formatMoney(data.totalNetWorth);
  document.getElementById("kpiLiquidity").textContent = formatMoney(data.liquidCash);
  document.getElementById("kpiAssetsValue").textContent = formatMoney(data.totalAssetsValue);
  document.getElementById("kpiOnlineEarnings").textContent = formatMoney(data.onlineNet);

  // Financial Health Intelligence Indicators
  const dict = i18n[lang] || i18n.en;
  const kpiSavingsRateEl = document.getElementById("kpiSavingsRate");
  const savingsBadgeEl = document.getElementById("kpiSavingsBadge");
  if (kpiSavingsRateEl && savingsBadgeEl) {
    kpiSavingsRateEl.textContent = `${data.savingsRate.toFixed(1)}%`;
    if (data.savingsRate >= 20) {
      savingsBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      savingsBadgeEl.textContent = dict.badge_savings_high || "Excellent (>20%)";
    } else if (data.savingsRate >= 10) {
      savingsBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30";
      savingsBadgeEl.textContent = dict.badge_savings_fair || "Moderate (10-20%)";
    } else {
      savingsBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30";
      savingsBadgeEl.textContent = dict.badge_savings_low || "Low (<10%)";
    }
  }

  const runwayEl = document.getElementById("kpiEmergencyRunway");
  const runwayBadgeEl = document.getElementById("kpiRunwayBadge");
  if (runwayEl && runwayBadgeEl) {
    if (data.runwayMonths >= 999) {
      runwayEl.textContent = dict.runway_infinite || "Highly Secure";
      runwayBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
      runwayBadgeEl.textContent = dict.badge_runway_high || "Safe (>6 mo)";
    } else {
      runwayEl.textContent = `${data.runwayMonths.toFixed(1)} ${dict.runway_months || 'Months'}`;
      if (data.runwayMonths >= 6) {
        runwayBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        runwayBadgeEl.textContent = dict.badge_runway_high || "Safe (>6 mo)";
      } else if (data.runwayMonths >= 3) {
        runwayBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30";
        runwayBadgeEl.textContent = dict.badge_runway_med || "Adequate (3-6 mo)";
      } else {
        runwayBadgeEl.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30";
        runwayBadgeEl.textContent = dict.badge_runway_low || "Critical (<3 mo)";
      }
    }
  }

  const toggle = document.getElementById("includeOnlineToggle");
  toggle.checked = appState.settings.includeOnline;

  // Period / Month Selector Dynamic Population
  const periodSelect = document.getElementById("cashflowPeriodSelect");
  if (periodSelect) {
    const rawMonths = new Set();
    appState.personalIncomes.forEach(i => { if (i.date) rawMonths.add(i.date.substring(0, 7)); });
    appState.personalObligations.forEach(o => { if (o.date) rawMonths.add(o.date.substring(0, 7)); });
    const currentYearMonth = new Date().toISOString().substring(0, 7);
    rawMonths.add(currentYearMonth);

    const sortedMonths = Array.from(rawMonths).sort().reverse();
    const periodDict = i18n[lang] || i18n.en;
    
    let optionsHtml = `<option value="all">${periodDict.filter_all_time || "All Time (Cumulative)"}</option>`;
    sortedMonths.forEach(m => {
      const isCurrent = m === currentYearMonth ? ` (${lang === 'ar' ? 'الشهر الحالي' : lang === 'es' ? 'Mes actual' : 'Current Month'})` : '';
      optionsHtml += `<option value="${m}">${m}${isCurrent}</option>`;
    });

    periodSelect.innerHTML = optionsHtml;
    periodSelect.value = paginationState.selectedPeriod || "all";
  }

  // Monthly Cashflow Equation Cards
  document.getElementById("eqTotalIncome").textContent = formatMoney(data.personalIncome);
  document.getElementById("eqTotalObligations").textContent = formatMoney(data.personalObligations);
  document.getElementById("eqNetBalance").textContent = formatMoney(data.personalNet);

  const savingsRateEl = document.getElementById("eqSavingsRate");
  if (savingsRateEl) {
    const rate = data.personalIncome > 0 ? Math.max(0, Math.round((data.personalNet / data.personalIncome) * 100)) : 0;
    savingsRateEl.textContent = `${rate}%`;
  }

  // Monthly Spending Budget Cap & Progress Bar
  const budgetStatusText = document.getElementById("budgetStatusText");
  const budgetProgressBar = document.getElementById("budgetProgressBar");
  const budgetAlertBadge = document.getElementById("budgetAlertBadge");

  if (budgetStatusText && budgetProgressBar) {
    const budgetConfig = appState.monthlyBudget || { enabled: false, amount: 0 };
    if (budgetConfig.enabled && budgetConfig.amount > 0) {
      const spent = data.personalObligations;
      const limit = budgetConfig.amount;
      const pct = Math.round((spent / limit) * 100);

      budgetStatusText.textContent = `${formatMoney(spent)} / ${formatMoney(limit)} (${pct}%)`;
      budgetProgressBar.style.width = `${Math.min(100, pct)}%`;

      if (pct > 100) {
        budgetProgressBar.className = "h-full bg-rose-500 transition-all duration-500 rounded-full";
        if (budgetAlertBadge) budgetAlertBadge.classList.remove("hidden");
      } else if (pct >= 80) {
        budgetProgressBar.className = "h-full bg-amber-500 transition-all duration-500 rounded-full";
        if (budgetAlertBadge) budgetAlertBadge.classList.add("hidden");
      } else {
        budgetProgressBar.className = "h-full bg-emerald-500 transition-all duration-500 rounded-full";
        if (budgetAlertBadge) budgetAlertBadge.classList.add("hidden");
      }
    } else {
      budgetStatusText.textContent = `${formatMoney(data.personalObligations)} (${(i18n[lang] || i18n.en).filter_all_time || 'No Limit Set'})`;
      budgetProgressBar.style.width = "0%";
      budgetProgressBar.className = "h-full bg-slate-700 transition-all duration-500 rounded-full";
      if (budgetAlertBadge) budgetAlertBadge.classList.add("hidden");
    }
  }

  // Period-filtered personal lists
  const selectedPeriod = paginationState.selectedPeriod;
  const isPeriodFiltered = selectedPeriod && selectedPeriod !== "all";

  const periodIncomes = isPeriodFiltered
    ? appState.personalIncomes.filter(inc => (inc.date || "").startsWith(selectedPeriod))
    : appState.personalIncomes;

  const incQuery = (document.getElementById("searchIncomesInput")?.value || "").trim().toLowerCase();
  const visibleIncomes = incQuery
    ? periodIncomes.filter(inc => {
        const catLabel = (categoriesMap.personal_income[inc.category]?.[lang] || inc.category).toLowerCase();
        const titleMatch = (inc.title || "").toLowerCase().includes(incQuery);
        const catMatch = catLabel.includes(incQuery);
        const currMatch = (inc.currency || "").toLowerCase().includes(incQuery);
        const amtMatch = String(inc.amount).includes(incQuery) || (inc.foreignAmount && String(inc.foreignAmount).includes(incQuery));
        return titleMatch || catMatch || currMatch || amtMatch;
      })
    : periodIncomes;

  // Pagination for Incomes
  const incPageSize = paginationState.pageSize;
  const incTotal = visibleIncomes.length;
  const incTotalPages = Math.max(1, Math.ceil(incTotal / incPageSize));
  if (paginationState.incomesPage > incTotalPages) paginationState.incomesPage = incTotalPages;
  const incStart = (paginationState.incomesPage - 1) * incPageSize;
  const pagedIncomes = visibleIncomes.slice(incStart, incStart + incPageSize);

  const incList = document.getElementById("incomesList");
  if (visibleIncomes.length === 0) {
    incList.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">${
      periodIncomes.length === 0
        ? (lang === 'ar' ? 'لا توجد مداخيل مسجلة في هذه الفترة' : 'No incomes logged in this period')
        : (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results')
    }</div>`;
  } else {
    incList.innerHTML = pagedIncomes.map((inc) => {
      const catLabel = categoriesMap.personal_income[inc.category]?.[lang] || inc.category;
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-dark-900 border border-slate-800 hover:border-emerald-500/30 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-arrow-down"></i>
            </div>
            <div>
              <h5 class="text-xs font-bold text-white">${escapeHtml(inc.title)}</h5>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span class="bg-dark-950 px-1.5 py-0.5 rounded border border-slate-800">${catLabel}</span>
                <span>${inc.date}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <span class="text-xs font-mono font-bold text-emerald-400">+${formatMoney(inc.amount)}</span>
              ${(inc.currency && inc.currency !== appState.settings.currency && inc.foreignAmount) ? `<span class="text-[10px] font-mono text-slate-400 block font-normal">(${inc.foreignAmount.toLocaleString('en-US')} ${inc.currency})</span>` : ''}
            </div>
            <button onclick="openEditPersonalTxModal('income', '${inc.id}')" aria-label="${lang === 'ar' ? 'تعديل الدخل' : 'Edit income'}" class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="Edit">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deletePersonalIncome('${inc.id}')" aria-label="${lang === 'ar' ? 'حذف الدخل' : 'Delete income'}" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
  renderPagination("incomesPagination", "incomes", paginationState.incomesPage, incTotal, incPageSize);

  const periodObligations = isPeriodFiltered
    ? appState.personalObligations.filter(exp => (exp.date || "").startsWith(selectedPeriod))
    : appState.personalObligations;

  const expQuery = (document.getElementById("searchObligationsInput")?.value || "").trim().toLowerCase();
  const visibleObligations = expQuery
    ? periodObligations.filter(exp => {
        const catLabel = (categoriesMap.personal_expense[exp.category]?.[lang] || exp.category).toLowerCase();
        const titleMatch = (exp.title || "").toLowerCase().includes(expQuery);
        const catMatch = catLabel.includes(expQuery);
        const currMatch = (exp.currency || "").toLowerCase().includes(expQuery);
        const amtMatch = String(exp.amount).includes(expQuery) || (exp.foreignAmount && String(exp.foreignAmount).includes(expQuery));
        return titleMatch || catMatch || currMatch || amtMatch;
      })
    : periodObligations;

  // Pagination for Obligations
  const expPageSize = paginationState.pageSize;
  const expTotal = visibleObligations.length;
  const expTotalPages = Math.max(1, Math.ceil(expTotal / expPageSize));
  if (paginationState.obligationsPage > expTotalPages) paginationState.obligationsPage = expTotalPages;
  const expStart = (paginationState.obligationsPage - 1) * expPageSize;
  const pagedObligations = visibleObligations.slice(expStart, expStart + expPageSize);

  const expList = document.getElementById("obligationsList");
  if (visibleObligations.length === 0) {
    expList.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">${
      periodObligations.length === 0
        ? (lang === 'ar' ? 'لا توجد التزامات مسجلة في هذه الفترة' : 'No obligations logged in this period')
        : (lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results')
    }</div>`;
  } else {
    expList.innerHTML = pagedObligations.map((exp) => {
      const catLabel = categoriesMap.personal_expense[exp.category]?.[lang] || exp.category;
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-dark-900 border border-slate-800 hover:border-rose-500/30 transition-all">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs">
              <i class="fa-solid fa-arrow-up"></i>
            </div>
            <div>
              <h5 class="text-xs font-bold text-white">${escapeHtml(exp.title)}</h5>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span class="bg-dark-950 px-1.5 py-0.5 rounded border border-slate-800">${catLabel}</span>
                <span>${exp.date}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <span class="text-xs font-mono font-bold text-rose-400">-${formatMoney(exp.amount)}</span>
              ${(exp.currency && exp.currency !== appState.settings.currency && exp.foreignAmount) ? `<span class="text-[10px] font-mono text-slate-400 block font-normal">(${exp.foreignAmount.toLocaleString('en-US')} ${exp.currency})</span>` : ''}
            </div>
            <button onclick="openEditPersonalTxModal('expense', '${exp.id}')" aria-label="${lang === 'ar' ? 'تعديل الالتزام' : 'Edit obligation'}" class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="Edit">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deletePersonalObligation('${exp.id}')" aria-label="${lang === 'ar' ? 'حذف الالتزام' : 'Delete obligation'}" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
  renderPagination("obligationsPagination", "obligations", paginationState.obligationsPage, expTotal, expPageSize);

  const assetsBody = document.getElementById("assetsTableBody");
  const astPageSize = paginationState.pageSize;
  const astTotal = appState.assets.length;
  const astTotalPages = Math.max(1, Math.ceil(astTotal / astPageSize));
  if (paginationState.assetsPage > astTotalPages) paginationState.assetsPage = astTotalPages;
  const astStart = (paginationState.assetsPage - 1) * astPageSize;
  const pagedAssets = appState.assets.slice(astStart, astStart + astPageSize);

  if (appState.assets.length === 0) {
    assetsBody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 text-xs">${lang === 'ar' ? 'لا توجد أصول مسجلة حالياً' : 'No assets registered yet'}</td></tr>`;
  } else {
    const isPrivate = Boolean(appState?.settings?.privacyMode);
    assetsBody.innerHTML = pagedAssets.map((ast) => {
      let unitPrice = Number(ast.unitPrice || 0);
      let isLockedRate = false;
      if (ast.category === "usd") { unitPrice = Number(appState.rates.usd); isLockedRate = true; }
      if (ast.category === "eur") { unitPrice = Number(appState.rates.eur); isLockedRate = true; }
      if (ast.category === "gold") {
        const base24k = Number(appState.rates.gold);
        const karat = ast.karat || "24k";
        if (karat === "21k") unitPrice = Math.round(base24k * (21 / 24));
        else if (karat === "18k") unitPrice = Math.round(base24k * (18 / 24));
        else unitPrice = base24k;
        isLockedRate = true;
      }

      const total = Number(ast.quantity || 0) * unitPrice;
      const catMeta = categoriesMap.asset_categories[ast.category] || { ar: "أصل عام", en: "General", es: "General", unit: "Unit" };
      let catLabel = catMeta[lang] || catMeta.en;
      if (ast.category === "gold") {
        catLabel += ` (${ast.karat ? ast.karat.toUpperCase() : '24K'})`;
      }

      const purchasePrice = Number(ast.purchasePrice || ast.unitPrice || unitPrice);
      const totalCost = Number(ast.quantity || 0) * purchasePrice;
      const gainLoss = total - totalCost;
      const roiPct = totalCost > 0 ? ((gainLoss / totalCost) * 100).toFixed(1) : 0;

      return `
        <tr class="hover:bg-dark-900/50 transition-colors">
          <td class="py-3 px-3 font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-vault text-brand-400"></i>
            <span>${escapeHtml(ast.name)}</span>
          </td>
          <td class="py-3 px-3">
            <span class="bg-dark-950 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800 text-[11px]">${catLabel}</span>
          </td>
          <td class="py-3 px-3">
            <div class="flex items-center gap-1.5">
              ${isPrivate 
                ? `<span class="font-mono text-slate-400 text-xs">••••••</span>`
                : `<input type="number" step="0.01" min="0" value="${ast.quantity}" 
                     onchange="updateAssetQtyInline('${ast.id}', this.value)"
                     aria-label="Asset quantity"
                     class="w-24 bg-dark-950 text-white font-mono px-2 py-1 rounded border border-slate-700 focus:border-brand-500 text-xs focus:outline-none">`
              }
              <span class="text-[10px] text-slate-400 font-mono">${catMeta.unit || ''}</span>
            </div>
          </td>
          <td class="py-3 px-3">
            ${isPrivate
              ? `<span class="font-mono text-slate-400 text-xs">••••••</span>`
              : (isLockedRate 
                  ? `<div class="flex items-center gap-1 text-slate-300 font-mono text-xs"><i class="fa-solid fa-lock text-[10px] text-amber-400" title="Synced with global rate"></i> ${unitPrice.toFixed(2)}</div>` 
                  : `<input type="number" step="0.01" min="0" value="${unitPrice}" 
                      onchange="updateAssetPriceInline('${ast.id}', this.value)"
                      aria-label="Asset unit price"
                      class="w-28 bg-dark-950 text-white font-mono px-2 py-1 rounded border border-slate-700 focus:border-brand-500 text-xs focus:outline-none">`
                )
            }
          </td>
          <td class="py-3 px-3">
            <div class="font-mono font-bold text-amber-300 text-xs">${formatMoney(total)}</div>
            ${totalCost > 0 && Math.abs(gainLoss) > 0.01 ? `
              <div class="text-[10px] font-mono flex items-center gap-1 mt-0.5 ${gainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                <i class="fa-solid ${gainLoss >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'} text-[9px]"></i>
                <span>${gainLoss >= 0 ? '+' : ''}${formatMoney(gainLoss)} ${isPrivate ? '' : `(${gainLoss >= 0 ? '+' : ''}${roiPct}%)`}</span>
              </div>
            ` : ''}
          </td>
          <td class="py-3 px-3 text-end">
            <div class="flex items-center justify-end gap-1">
              <button onclick="openEditAssetModal('${ast.id}')" aria-label="${lang === 'ar' ? 'تعديل الأصل' : 'Edit asset'}" class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="${lang === 'ar' ? 'تعديل الأصل' : 'Edit'}">
                <i class="fa-solid fa-pen-to-square text-xs"></i>
              </button>
              <button onclick="deleteAsset('${ast.id}')" aria-label="${lang === 'ar' ? 'حذف الأصل' : 'Delete asset'}" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete">
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }
  renderPagination("assetsPagination", "assets", paginationState.assetsPage, astTotal, astPageSize);

  document.getElementById("creatorTotalRev").textContent = formatMoney(data.creatorRev);
  document.getElementById("creatorTotalExp").textContent = formatMoney(data.creatorExp);
  document.getElementById("creatorNetProfit").textContent = formatMoney(data.creatorNet);
  const margin = data.creatorRev > 0 ? ((data.creatorNet / data.creatorRev) * 100).toFixed(1) : 0;
  document.getElementById("creatorProfitMargin").textContent = `${lang === 'ar' ? 'هامش الربح' : 'Margin'}: ${margin}%`;

  const chnGrid = document.getElementById("channelsGrid");
  if (appState.channels.length === 0) {
    chnGrid.innerHTML = `<div class="col-span-full p-6 text-center text-xs text-slate-500">${lang === 'ar' ? 'لا توجد قنوات مسجلة حالياً. اضغط قناة جديدة للبدء.' : 'No channels added yet.'}</div>`;
  } else {
    chnGrid.innerHTML = appState.channels.map((chn) => {
      const meta = platformMeta[chn.platform] || { icon: "fa-solid fa-play", color: "text-slate-200", bg: "bg-slate-700/20" };
      
      let cRev = 0;
      let cExp = 0;
      const expCatBreakdown = {};

      appState.creatorTransactions.filter(t => t.channelId === chn.id).forEach(t => {
        if (t.flow === "revenue") cRev += Number(t.amount || 0);
        else {
          cExp += Number(t.amount || 0);
          expCatBreakdown[t.category] = (expCatBreakdown[t.category] || 0) + Number(t.amount || 0);
        }
      });
      const cNet = cRev - cExp;

      const breakdownHtml = Object.keys(expCatBreakdown).map(catKey => {
        const label = categoriesMap.creator_expense[catKey]?.[lang] || catKey;
        return `<span class="bg-dark-950 px-1.5 py-0.5 rounded text-[10px] text-slate-400 border border-slate-800">${label}: ${formatMoney(expCatBreakdown[catKey])}</span>`;
      }).join(" ");

      return `
        <div class="bg-dark-900 border border-slate-800 rounded-xl p-4 space-y-3 relative hover:border-slate-700 transition-all">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg ${meta.bg} ${meta.color} flex items-center justify-center text-base">
                <i class="${meta.icon}"></i>
              </div>
              <div>
                <h5 class="text-xs font-bold text-white">${escapeHtml(chn.name)}</h5>
                <span class="text-[10px] uppercase font-bold text-slate-400">${chn.platform}</span>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button onclick="openEditChannelModal('${chn.id}')" class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="${lang === 'ar' ? 'تعديل بيانات القناة' : 'Edit Channel'}">
                <i class="fa-solid fa-pen-to-square text-xs"></i>
              </button>
              <button onclick="deleteChannel('${chn.id}')" class="text-slate-600 hover:text-rose-400 transition-colors text-xs p-1" title="Delete Channel">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center bg-dark-950 p-2 rounded-lg border border-slate-850">
            <div>
              <span class="text-[10px] text-slate-400 block">${lang === 'ar' ? 'الإيرادات' : 'Revenue'}</span>
              <span class="text-xs font-mono font-bold text-emerald-400">+${formatMoney(cRev)}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">${lang === 'ar' ? 'التكاليف' : 'Costs'}</span>
              <span class="text-xs font-mono font-bold text-rose-400">-${formatMoney(cExp)}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block">${lang === 'ar' ? 'الصافي' : 'Net'}</span>
              <span class="text-xs font-mono font-bold ${cNet >= 0 ? 'text-brand-300' : 'text-rose-400'}">${formatMoney(cNet)}</span>
            </div>
          </div>

          ${breakdownHtml ? `
            <div class="pt-1">
              <span class="text-[10px] text-slate-500 block mb-1 font-semibold">${lang === 'ar' ? 'تفاصيل الإنتاج:' : 'Production breakdown:'}</span>
              <div class="flex flex-wrap gap-1">${breakdownHtml}</div>
            </div>
          ` : ''}
        </div>
      `;
    }).join("");
  }

  const filterSelect = document.getElementById("channelFilterSelect");
  const modalChanSelect = document.getElementById("creatorTxChannelSelect");
  const currentFilter = filterSelect.value || "all";

  const channelOptionsHtml = appState.channels.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.platform})</option>`).join("");
  modalChanSelect.innerHTML = channelOptionsHtml || `<option value="">No channels available</option>`;

  filterSelect.innerHTML = `<option value="all">${i18n[lang].opt_all_channels}</option>` + channelOptionsHtml;
  filterSelect.value = currentFilter;

  const creatorTxList = document.getElementById("creatorTxList");
  const filteredCreatorTx = currentFilter === "all" 
    ? appState.creatorTransactions 
    : appState.creatorTransactions.filter(t => t.channelId === currentFilter);

  const crtPageSize = paginationState.pageSize;
  const crtTotal = filteredCreatorTx.length;
  const crtTotalPages = Math.max(1, Math.ceil(crtTotal / crtPageSize));
  if (paginationState.creatorTxPage > crtTotalPages) paginationState.creatorTxPage = crtTotalPages;
  const crtStart = (paginationState.creatorTxPage - 1) * crtPageSize;
  const pagedCreatorTx = filteredCreatorTx.slice(crtStart, crtStart + crtPageSize);

  if (filteredCreatorTx.length === 0) {
    creatorTxList.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">${lang === 'ar' ? 'لا توجد معاملات مسجلة' : 'No transactions recorded'}</div>`;
  } else {
    creatorTxList.innerHTML = pagedCreatorTx.map(tx => {
      const chn = appState.channels.find(c => c.id === tx.channelId);
      const chnName = chn ? chn.name : "Channel";
      const isRev = tx.flow === "revenue";
      const catLabel = isRev 
        ? (categoriesMap.creator_revenue[tx.category]?.[lang] || tx.category)
        : (categoriesMap.creator_expense[tx.category]?.[lang] || tx.category);

      return `
        <div class="flex items-center justify-between p-2.5 rounded-lg bg-dark-900 border border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full ${isRev ? 'bg-emerald-400' : 'bg-rose-400'}"></span>
            <div>
              <span class="font-bold text-white">${escapeHtml(tx.title)}</span>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span class="text-brand-300 font-semibold">${escapeHtml(chnName)}</span>
                <span>•</span>
                <span>${catLabel}</span>
                <span>•</span>
                <span>${tx.date}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="font-mono font-bold ${isRev ? 'text-emerald-400' : 'text-rose-400'}">
              ${isRev ? '+' : '-'}${formatMoney(tx.amount)}
            </span>
            <button onclick="openEditCreatorTxModal('${tx.id}')" aria-label="${lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}" class="text-slate-500 hover:text-brand-400 transition-colors p-1" title="${lang === 'ar' ? 'تعديل المعاملة' : 'Edit'}">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteCreatorTx('${tx.id}')" aria-label="${lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
  renderPagination("creatorTxPagination", "creatorTx", paginationState.creatorTxPage, crtTotal, crtPageSize);

  document.getElementById("freelanceRoleInput").value = appState.settings.freelanceRole || "";
  document.getElementById("flTotalIncome").textContent = formatMoney(data.freelanceRev);
  document.getElementById("flTotalExpenses").textContent = formatMoney(data.freelanceExp);
  document.getElementById("flNetProfit").textContent = formatMoney(data.freelanceNet);

  const flIncBadgeContainer = document.getElementById("flIncomeCatsBadges");
  flIncBadgeContainer.innerHTML = appState.freelanceCats.income.map((cat, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs">
      <span>${escapeHtml(cat)}</span>
      <button type="button" data-cat-idx="${idx}" data-cat-type="income" aria-label="${lang === 'ar' ? 'حذف التصنيف' : 'Remove category'}" class="btn-remove-fl-cat hover:text-rose-400 text-[10px]">&times;</button>
    </span>
  `).join("");

  const flExpBadgeContainer = document.getElementById("flExpenseCatsBadges");
  flExpBadgeContainer.innerHTML = appState.freelanceCats.expense.map((cat, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs">
      <span>${escapeHtml(cat)}</span>
      <button type="button" data-cat-idx="${idx}" data-cat-type="expense" aria-label="${lang === 'ar' ? 'حذف التصنيف' : 'Remove category'}" class="btn-remove-fl-cat hover:text-rose-400 text-[10px]">&times;</button>
    </span>
  `).join("");

  const flLedger = document.getElementById("freelanceTxList");
  const flPageSize = paginationState.pageSize;
  const flTotal = appState.freelanceTransactions.length;
  const flTotalPages = Math.max(1, Math.ceil(flTotal / flPageSize));
  if (paginationState.freelanceTxPage > flTotalPages) paginationState.freelanceTxPage = flTotalPages;
  const flStart = (paginationState.freelanceTxPage - 1) * flPageSize;
  const pagedFreelanceTx = appState.freelanceTransactions.slice(flStart, flStart + flPageSize);

  if (appState.freelanceTransactions.length === 0) {
    flLedger.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">${lang === 'ar' ? 'لا توجد معاملات مسجلة في مساحة العمل الحر' : 'No freelance records logged yet'}</div>`;
  } else {
    flLedger.innerHTML = pagedFreelanceTx.map(tx => {
      const isInc = tx.flow === "income";
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-dark-900 border border-slate-800 hover:border-indigo-500/30 transition-all text-xs">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} flex items-center justify-center">
              <i class="fa-solid ${isInc ? 'fa-arrow-down-left' : 'fa-arrow-up-right'}"></i>
            </div>
            <div>
              <h5 class="font-bold text-white">${escapeHtml(tx.title)}</h5>
              <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                <span class="bg-dark-950 px-1.5 py-0.5 rounded border border-slate-800">${escapeHtml(tx.category)}</span>
                <span>${tx.date}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="text-right">
              <span class="font-mono font-bold ${isInc ? 'text-emerald-400' : 'text-rose-400'}">
                ${isInc ? '+' : '-'}${formatMoney(tx.amount)}
              </span>
              ${(tx.currency && tx.currency !== appState.settings.currency && tx.foreignAmount) ? `<span class="text-[10px] font-mono text-slate-400 block font-normal">(${tx.foreignAmount.toLocaleString('en-US')} ${tx.currency})</span>` : ''}
            </div>
            <button onclick="openEditFreelanceTxModal('${tx.id}')" aria-label="${lang === 'ar' ? 'تعديل المعاملة' : 'Edit transaction'}" class="text-slate-500 hover:text-indigo-400 transition-colors p-1" title="${lang === 'ar' ? 'تعديل المعاملة' : 'Edit'}">
              <i class="fa-solid fa-pen-to-square text-xs"></i>
            </button>
            <button onclick="deleteFreelanceTx('${tx.id}')" aria-label="${lang === 'ar' ? 'حذف المعاملة' : 'Delete transaction'}" class="text-slate-500 hover:text-rose-400 transition-colors p-1" title="Delete">
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
  renderPagination("freelanceTxPagination", "freelanceTx", paginationState.freelanceTxPage, flTotal, flPageSize);

  renderCharts(data);
}

// Chart.js Visualization Controllers
function renderCharts(data) {
  const lang = appState.settings.lang;

  const doughnutCtx = document.getElementById("wealthDoughnutChart")?.getContext("2d");
  if (doughnutCtx) {
    const labels = [
      lang === 'ar' ? 'السيولة النقدية' : 'Liquid Cash',
      'USD',
      'EUR',
      lang === 'ar' ? 'الذهب والسبائك' : 'Gold (24k)',
      lang === 'ar' ? 'الأسهم والاستثمار' : 'Stocks & ETFs',
      lang === 'ar' ? 'العقارات' : 'Real Estate',
      lang === 'ar' ? 'أصول أخرى' : 'Other Assets'
    ];
    const values = [
      Math.max(0, data.liquidCash),
      data.assetValues.usd,
      data.assetValues.eur,
      data.assetValues.gold,
      data.assetValues.stocks,
      data.assetValues.realestate,
      data.assetValues.other
    ];
    const colors = [
      '#10b981',
      '#3b82f6',
      '#6366f1',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#64748b'
    ];

    if (wealthChart) {
      wealthChart.data.labels = labels;
      wealthChart.data.datasets[0].data = values;
      wealthChart.update();
    } else {
      wealthChart = new Chart(doughnutCtx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: '#0f172a',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` ${context.label}: ${formatMoney(context.raw)}`;
                }
              }
            }
          }
        }
      });
    }

    const legendContainer = document.getElementById("doughnutLegend");
    if (legendContainer) {
      legendContainer.innerHTML = labels.map((lbl, idx) => {
        if (values[idx] <= 0) return '';
        return `
          <div class="flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${colors[idx]}"></span>
            <span class="text-slate-400 truncate">${lbl}:</span>
            <span class="font-mono font-bold text-slate-200">${formatMoney(values[idx])}</span>
          </div>
        `;
      }).join("");
    }
  }

  const barCtx = document.getElementById("pillarsBarChart")?.getContext("2d");
  if (barCtx) {
    const pillarLabels = [
      lang === 'ar' ? 'المصاريف الشخصية' : 'Personal',
      lang === 'ar' ? 'صناع المحتوى' : 'Content Creators',
      lang === 'ar' ? 'العمل الحر' : 'Freelancing'
    ];
    const inflows = [data.personalIncome, data.creatorRev, data.freelanceRev];
    const outflows = [data.personalObligations, data.creatorExp, data.freelanceExp];

    const totalIn = inflows.reduce((a, b) => a + b, 0);
    const totalOut = outflows.reduce((a, b) => a + b, 0);
    document.getElementById("barInflowTotal").textContent = formatMoney(totalIn);
    document.getElementById("barOutflowTotal").textContent = formatMoney(totalOut);

    if (pillarsChart) {
      pillarsChart.data.labels = pillarLabels;
      pillarsChart.data.datasets[0].data = inflows;
      pillarsChart.data.datasets[1].data = outflows;
      pillarsChart.update();
    } else {
      pillarsChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: pillarLabels,
          datasets: [
            {
              label: lang === 'ar' ? 'التدفقات الواردة' : 'Inflow',
              data: inflows,
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              label: lang === 'ar' ? 'الالتزامات والمصاريف' : 'Outflow',
              data: outflows,
              backgroundColor: '#f43f5e',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { size: 11 } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#94a3b8',
                font: { size: 10, family: 'Inter' },
                callback: function(val) {
                  return appState?.settings?.privacyMode ? '•••' : val.toLocaleString('en-US');
                }
              }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
                }
              }
            }
          }
        }
      });
    }
  }

  // 3. Historical Monthly Trends Chart
  const trendsCtx = document.getElementById("historicalTrendsChart")?.getContext("2d");
  if (trendsCtx) {
    const allMonthsSet = new Set();
    appState.personalIncomes.forEach(i => { if (i.date) allMonthsSet.add(i.date.substring(0, 7)); });
    appState.personalObligations.forEach(o => { if (o.date) allMonthsSet.add(o.date.substring(0, 7)); });
    const currentYM = new Date().toISOString().substring(0, 7);
    allMonthsSet.add(currentYM);

    const sortedAllMonths = Array.from(allMonthsSet).sort();
    const recentMonths = sortedAllMonths.slice(-6);

    const trendLabels = recentMonths;
    const trendIncomes = [];
    const trendObligations = [];
    const trendNet = [];

    recentMonths.forEach(m => {
      const incSum = appState.personalIncomes
        .filter(i => (i.date || "").startsWith(m))
        .reduce((s, i) => s + Number(i.amount || 0), 0);
      const expSum = appState.personalObligations
        .filter(e => (e.date || "").startsWith(m))
        .reduce((s, e) => s + Number(e.amount || 0), 0);

      trendIncomes.push(incSum);
      trendObligations.push(expSum);
      trendNet.push(incSum - expSum);
    });

    if (trendsChart) {
      trendsChart.data.labels = trendLabels;
      trendsChart.data.datasets[0].data = trendIncomes;
      trendsChart.data.datasets[0].label = lang === 'ar' ? 'المداخيل (+)' : lang === 'es' ? 'Ingresos (+)' : 'Incomes (+)';
      trendsChart.data.datasets[1].data = trendObligations;
      trendsChart.data.datasets[1].label = lang === 'ar' ? 'الالتزامات (-)' : lang === 'es' ? 'Obligaciones (-)' : 'Obligations (-)';
      trendsChart.data.datasets[2].data = trendNet;
      trendsChart.data.datasets[2].label = lang === 'ar' ? 'صافي الفائض' : lang === 'es' ? 'Superávit neto' : 'Net Surplus';
      trendsChart.update();
    } else {
      trendsChart = new Chart(trendsCtx, {
        type: 'bar',
        data: {
          labels: trendLabels,
          datasets: [
            {
              label: lang === 'ar' ? 'المداخيل (+)' : lang === 'es' ? 'Ingresos (+)' : 'Incomes (+)',
              data: trendIncomes,
              backgroundColor: '#10b981',
              borderRadius: 6
            },
            {
              label: lang === 'ar' ? 'الالتزامات (-)' : lang === 'es' ? 'Obligaciones (-)' : 'Obligations (-)',
              data: trendObligations,
              backgroundColor: '#f43f5e',
              borderRadius: 6
            },
            {
              type: 'line',
              label: lang === 'ar' ? 'صافي الفائض' : lang === 'es' ? 'Superávit neto' : 'Net Surplus',
              data: trendNet,
              borderColor: '#6366f1',
              backgroundColor: '#6366f1',
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: '#818cf8',
              tension: 0.25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { size: 11, family: 'Inter' } }
            },
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: {
                color: '#94a3b8',
                font: { size: 10, family: 'Inter' },
                callback: function(val) {
                  return appState?.settings?.privacyMode ? '•••' : val.toLocaleString('en-US');
                }
              }
            }
          },
          plugins: {
            legend: {
              labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return ` ${context.dataset.label}: ${formatMoney(context.raw)}`;
                }
              }
            }
          }
        }
      });
    }
  }
}

// Action Handlers & Inline Mutations
function updateAssetQtyInline(assetId, newQty) {
  const asset = appState.assets.find(a => a.id === assetId);
  if (asset) {
    asset.quantity = Math.max(0, parseFloat(newQty) || 0);
    persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم تحديث كمية الأصل وصافي الثروة' : 'Asset quantity & Net Worth updated');
  }
}

function updateAssetPriceInline(assetId, newPrice) {
  const asset = appState.assets.find(a => a.id === assetId);
  if (asset) {
    asset.unitPrice = Math.max(0, parseFloat(newPrice) || 0);
    persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم تحديث سعر الأصل وصافي الثروة' : 'Asset price & Net Worth updated');
  }
}

async function deletePersonalIncome(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف مصدر الدخل' : 'Delete Income',
    appState.settings.lang === 'ar' ? 'هل أنت متأكد من حذف هذا البند نهائياً؟' : 'Are you sure you want to permanently delete this income?'
  );
  if (ok) {
    appState.personalIncomes = appState.personalIncomes.filter(i => i.id !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم الحذف بنجاح' : 'Income deleted');
  }
}

async function deletePersonalObligation(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف الالتزام المالي' : 'Delete Obligation',
    appState.settings.lang === 'ar' ? 'هل أنت متأكد من حذف هذا الالتزام نهائياً؟' : 'Are you sure you want to permanently delete this obligation?'
  );
  if (ok) {
    appState.personalObligations = appState.personalObligations.filter(o => o.id !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم الحذف بنجاح' : 'Obligation deleted');
  }
}

async function deleteAsset(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف الأصل' : 'Delete Asset',
    appState.settings.lang === 'ar' ? 'هل أنت متأكد من حذف هذا الأصل من محفظتك؟' : 'Are you sure you want to delete this asset?'
  );
  if (ok) {
    appState.assets = appState.assets.filter(a => a.id !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم حذف الأصل وإعادة تقييم الثروة' : 'Asset deleted');
  }
}

async function deleteChannel(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف القناة' : 'Delete Channel',
    appState.settings.lang === 'ar' ? 'سيتم حذف القناة وكافة العمليات المرتبطة بها!' : 'Deleting this channel will remove all its related transactions!'
  );
  if (ok) {
    appState.channels = appState.channels.filter(c => c.id !== id);
    appState.creatorTransactions = appState.creatorTransactions.filter(t => t.channelId !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم حذف القناة وبياناتها' : 'Channel & transactions removed');
  }
}

async function deleteCreatorTx(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف المعاملة' : 'Delete Transaction',
    appState.settings.lang === 'ar' ? 'هل أنت متأكد من حذف هذه المعاملة؟' : 'Are you sure you want to delete this transaction?'
  );
  if (ok) {
    appState.creatorTransactions = appState.creatorTransactions.filter(t => t.id !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم الحذف' : 'Transaction deleted');
  }
}

async function deleteFreelanceTx(id) {
  const ok = await requestConfirmation(
    appState.settings.lang === 'ar' ? 'حذف عملية العمل الحر' : 'Delete Freelance Entry',
    appState.settings.lang === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this entry?'
  );
  if (ok) {
    appState.freelanceTransactions = appState.freelanceTransactions.filter(t => t.id !== id);
    await persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم الحذف' : 'Entry deleted');
  }
}

function removeFreelanceCategory(type, catName) {
  if (appState.freelanceCats[type]) {
    appState.freelanceCats[type] = appState.freelanceCats[type].filter(c => c !== catName);
    persistState();
    renderAll();
    showToast(appState.settings.lang === 'ar' ? 'تم حذف التصنيف' : 'Category removed');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// Live Daily Currency & Gold 24k Auto-Sync Engine (Multi-Source with Offline Fallback)
const TROY_OUNCE_GRAMS = 31.1034768;
let isSyncingRates = false;

async function fetchLiveMarketRates(isManual = false) {
  if (isSyncingRates) return;
  const lang = appState.settings.lang || "ar";
  const dict = i18n[lang] || i18n.en;

  if (!navigator.onLine) {
    if (isManual) showToast(dict.sync_status_offline, "info");
    return;
  }

  isSyncingRates = true;
  const icon1 = document.getElementById("syncRatesIcon");
  const icon2 = document.getElementById("headerSyncIcon");
  const statusEl = document.getElementById("lastSyncStatusText");
  if (icon1) icon1.classList.add("fa-spin");
  if (icon2) icon2.classList.add("fa-spin");
  if (statusEl) statusEl.textContent = dict.sync_status_fetching;

  const baseCurr = (appState.settings.currency || "EGP").toUpperCase();
  const baseLower = baseCurr.toLowerCase();

  try {
    let usdInBase = null;
    let eurInBase = null;
    let goldGramInBase = null;

    // 1. Primary Exchange Rate Source: Fawazahmed0 Currency API via jsDelivr CDN (includes fiat + XAU spot)
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${baseLower}.json`);
      if (res.ok) {
        const json = await res.json();
        const ratesObj = json[baseLower];
        if (ratesObj) {
          if (ratesObj.usd && ratesObj.usd > 0) usdInBase = 1 / ratesObj.usd;
          if (ratesObj.eur && ratesObj.eur > 0) eurInBase = 1 / ratesObj.eur;
          if (ratesObj.xau && ratesObj.xau > 0) {
            const xauInBase = 1 / ratesObj.xau;
            goldGramInBase = xauInBase / TROY_OUNCE_GRAMS;
          }
        }
      }
    } catch (e) {
      console.warn("Primary CDN currency API fallback:", e);
    }

    // 2. Fallback Exchange Rate Source: Open ExchangeRate-API
    if (!usdInBase || !eurInBase) {
      try {
        const res2 = await fetch(`https://open.er-api.com/v6/latest/USD`);
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2 && data2.rates && data2.rates[baseCurr]) {
            const usdToBase = Number(data2.rates[baseCurr]);
            const usdToEur = Number(data2.rates.EUR || 0.92);
            usdInBase = usdToBase;
            eurInBase = usdToBase / usdToEur;
          }
        }
      } catch (e) {
        console.warn("Secondary ExchangeRate-API fallback:", e);
      }
    }

    // 3. Dedicated Spot Gold Price API (XAU/USD) for accurate live 24k Gold gram pricing
    try {
      const goldRes = await fetch("https://api.gold-api.com/price/XAU");
      if (goldRes.ok) {
        const goldData = await goldRes.json();
        if (goldData && goldData.price && usdInBase) {
          const xauUsd = Number(goldData.price);
          goldGramInBase = (xauUsd * usdInBase) / TROY_OUNCE_GRAMS;
        }
      }
    } catch (e) {
      console.warn("Spot gold API fallback:", e);
    }

    if (usdInBase && usdInBase > 0) appState.rates.usd = Number(usdInBase.toFixed(2));
    if (eurInBase && eurInBase > 0) appState.rates.eur = Number(eurInBase.toFixed(2));
    if (goldGramInBase && goldGramInBase > 0) appState.rates.gold = Math.round(goldGramInBase);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    appState.rates.lastSyncDate = todayStr;
    appState.rates.lastSyncTime = `${todayStr} (${timeStr})`;

    await persistState();
    renderAll();
    if (isManual) showToast(dict.sync_status_success, "success");
  } catch (err) {
    console.warn("Live rate sync failed:", err);
    if (isManual) showToast(dict.sync_status_offline, "error");
  } finally {
    isSyncingRates = false;
    if (icon1) icon1.classList.remove("fa-spin");
    if (icon2) icon2.classList.remove("fa-spin");
  }
}

function checkAndRunDailyAutoSync() {
  if (appState.settings.autoSyncRates === false) return;
  const todayStr = new Date().toISOString().split("T")[0];
  if (appState.rates.lastSyncDate !== todayStr) {
    fetchLiveMarketRates(false);
  }
}

// Event Listeners & Modal Controllers
document.addEventListener("DOMContentLoaded", async () => {
  appState = await loadStoredState();

  if (appState.settings.autoSyncRates === undefined) {
    appState.settings.autoSyncRates = true;
  }
  updateLanguageUI();
  renderAll();

  // Privacy Mode Toggle Listener
  document.getElementById("btnTogglePrivacy")?.addEventListener("click", async () => {
    appState.settings.privacyMode = !appState.settings.privacyMode;
    await persistState();
    updatePrivacyUI();
    renderAll();
  });

  // App PIN Lock & Security System
  function checkPinSecurityOnStartup() {
    const isPinActive = Boolean(appState?.settings?.pinEnabled && appState?.settings?.pinCode);
    const quickLockBtn = document.getElementById("btnQuickLock");
    if (quickLockBtn) {
      if (isPinActive) quickLockBtn.classList.remove("hidden");
      else quickLockBtn.classList.add("hidden");
    }

    const pinToggle = document.getElementById("pinLockEnabledToggle");
    const pinBox = document.getElementById("pinSettingsBox");
    const pinInp = document.getElementById("inputSettingsPin");
    if (pinToggle) pinToggle.checked = Boolean(appState?.settings?.pinEnabled);
    if (pinBox) {
      if (appState?.settings?.pinEnabled) pinBox.classList.remove("hidden");
      else pinBox.classList.add("hidden");
    }
    if (pinInp) {
      pinInp.value = appState?.settings?.pinCode || "";
    }

    const isUnlocked = sessionStorage.getItem("puretech_unlocked") === "true";
    const lockScreen = document.getElementById("pinLockScreen");
    if (isPinActive && !isUnlocked) {
      if (lockScreen) {
        lockScreen.classList.remove("hidden");
        document.getElementById("pinUnlockInput")?.focus();
      }
    } else {
      if (lockScreen) lockScreen.classList.add("hidden");
    }
  }

  checkPinSecurityOnStartup();

  document.getElementById("pinUnlockForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const entered = (document.getElementById("pinUnlockInput")?.value || "").trim();
    const errorMsg = document.getElementById("pinErrorMsg");
    if (entered === String(appState?.settings?.pinCode)) {
      sessionStorage.setItem("puretech_unlocked", "true");
      document.getElementById("pinLockScreen")?.classList.add("hidden");
      if (errorMsg) errorMsg.classList.add("hidden");
      document.getElementById("pinUnlockInput").value = "";
    } else {
      if (errorMsg) errorMsg.classList.remove("hidden");
      const inp = document.getElementById("pinUnlockInput");
      if (inp) {
        inp.value = "";
        inp.focus();
      }
    }
  });

  document.getElementById("btnForgotPin")?.addEventListener("click", async () => {
    const lang = appState?.settings?.lang || "ar";
    const dict = i18n[lang] || i18n.en;
    const confirmed = await requestConfirmation(
      dict.confirm_reset_pin_title || "Reset Wallet Lock",
      dict.confirm_reset_pin_msg || "Forgot your PIN? This will disable the PIN lock and restore wallet access. Proceed?"
    );
    if (confirmed) {
      appState.settings.pinEnabled = false;
      appState.settings.pinCode = "";
      sessionStorage.setItem("puretech_unlocked", "true");
      document.getElementById("pinLockScreen")?.classList.add("hidden");
      const pinInp = document.getElementById("pinUnlockInput");
      if (pinInp) pinInp.value = "";
      document.getElementById("pinErrorMsg")?.classList.add("hidden");
      checkPinSecurityOnStartup();
      await persistState();
      renderAll();
      showToast(dict.pin_disabled || 'PIN lock disabled');
    }
  });

  function lockWalletNow() {
    sessionStorage.removeItem("puretech_unlocked");
    const lockScreen = document.getElementById("pinLockScreen");
    const errorMsg = document.getElementById("pinErrorMsg");
    const inp = document.getElementById("pinUnlockInput");
    if (errorMsg) errorMsg.classList.add("hidden");
    if (inp) inp.value = "";
    if (lockScreen) lockScreen.classList.remove("hidden");
    if (inp) inp.focus();
    const lang = appState?.settings?.lang || "ar";
    showToast(lang === 'ar' ? 'تم قفل المحفظة' : 'Wallet locked', 'info');
  }

  document.getElementById("btnQuickLock")?.addEventListener("click", lockWalletNow);
  document.getElementById("btnManualLock")?.addEventListener("click", lockWalletNow);

  document.getElementById("pinLockEnabledToggle")?.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    const pinBox = document.getElementById("pinSettingsBox");
    const lang = appState?.settings?.lang || "ar";
    const dict = i18n[lang] || i18n.en;

    if (isChecked) {
      if (pinBox) pinBox.classList.remove("hidden");
      document.getElementById("inputSettingsPin")?.focus();
    } else {
      appState.settings.pinEnabled = false;
      appState.settings.pinCode = "";
      if (pinBox) pinBox.classList.add("hidden");
      document.getElementById("btnQuickLock")?.classList.add("hidden");
      document.getElementById("inputSettingsPin").value = "";
      await persistState();
      showToast(dict.pin_disabled || 'PIN lock disabled');
    }
  });

  document.getElementById("btnSavePin")?.addEventListener("click", async () => {
    const pinVal = (document.getElementById("inputSettingsPin")?.value || "").trim();
    const lang = appState?.settings?.lang || "ar";
    const dict = i18n[lang] || i18n.en;

    if (!/^\d{4}$/.test(pinVal)) {
      showToast(lang === 'ar' ? 'يرجى إدخال رمز PIN مكون من 4 أرقام عددية' : 'Please enter a 4-digit numeric PIN', 'error');
      return;
    }

    appState.settings.pinEnabled = true;
    appState.settings.pinCode = pinVal;
    sessionStorage.setItem("puretech_unlocked", "true");
    document.getElementById("btnQuickLock")?.classList.remove("hidden");
    await persistState();
    showToast(dict.pin_saved || 'PIN code saved');
  });

  // Trigger automatic daily rate check on launch & every 6 hours
  checkAndRunDailyAutoSync();
  setInterval(checkAndRunDailyAutoSync, 6 * 60 * 60 * 1000);

  const today = new Date().toISOString().split("T")[0];
  document.getElementById("txDateInput").value = today;
  document.getElementById("creatorTxDateInput").value = today;
  document.getElementById("flTxDateInput").value = today;

  document.querySelectorAll(".nav-tab").forEach((tabBtn) => {
    tabBtn.addEventListener("click", () => {
      const targetTabId = tabBtn.getAttribute("data-tab");
      document.querySelectorAll(".nav-tab").forEach(b => {
        b.classList.remove("active", "bg-brand-500/15", "text-brand-400", "border-brand-500/30");
        b.classList.add("text-slate-400", "border-transparent");
      });
      tabBtn.classList.add("active", "bg-brand-500/15", "text-brand-400", "border-brand-500/30");
      tabBtn.classList.remove("text-slate-400", "border-transparent");

      document.querySelectorAll(".tab-content").forEach(content => {
        content.classList.add("hidden");
      });
      document.getElementById(targetTabId)?.classList.remove("hidden");

      if (targetTabId === "tab-overview") {
        setTimeout(() => {
          wealthChart?.resize();
          pillarsChart?.resize();
          trendsChart?.resize();
        }, 50);
      }
    });
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetLang = btn.getAttribute("data-lang");
      appState.settings.lang = targetLang;
      persistState();
      updateLanguageUI();
      renderAll();
      showToast(targetLang === 'ar' ? 'تم التبديل إلى اللغة العربية' : targetLang === 'es' ? 'Cambiado a Español' : 'Switched to English');
    });
  });

  document.getElementById("currencySelect").addEventListener("change", (e) => {
    appState.settings.currency = e.target.value;
    persistState();
    updateLanguageUI();
    renderAll();
    showToast(`${appState.settings.currency} Currency Selected`);
    if (appState.settings.autoSyncRates !== false) {
      fetchLiveMarketRates(false);
    }
  });

  document.getElementById("includeOnlineToggle").addEventListener("change", (e) => {
    appState.settings.includeOnline = e.target.checked;
    persistState();
    renderAll();
    showToast(appState.settings.includeOnline 
      ? (appState.settings.lang === 'ar' ? 'تم دمج أرباح العمل أونلاين بالسيولة' : 'Online earnings merged into liquidity')
      : (appState.settings.lang === 'ar' ? 'تم فصل أرباح العمل أونلاين' : 'Online earnings decoupled')
    );
  });

  const onRateChange = () => {
    appState.rates.usd = Math.max(0, parseFloat(document.getElementById("rateInputUsd").value) || 0);
    appState.rates.eur = Math.max(0, parseFloat(document.getElementById("rateInputEur").value) || 0);
    appState.rates.gold = Math.max(0, parseFloat(document.getElementById("rateInputGold").value) || 0);
    persistState();
    renderAll();
  };
  document.getElementById("rateInputUsd").addEventListener("input", onRateChange);
  document.getElementById("rateInputEur").addEventListener("input", onRateChange);
  document.getElementById("rateInputGold").addEventListener("input", onRateChange);

  // Live Rate Sync Buttons & Auto-Sync Toggle
  document.getElementById("btnSyncRatesNow")?.addEventListener("click", () => fetchLiveMarketRates(true));
  document.getElementById("btnQuickSyncHeader")?.addEventListener("click", () => fetchLiveMarketRates(true));
  document.getElementById("autoSyncRatesToggle")?.addEventListener("change", (e) => {
    appState.settings.autoSyncRates = e.target.checked;
    persistState();
    if (e.target.checked) fetchLiveMarketRates(true);
  });

  document.getElementById("btnSaveRole").addEventListener("click", () => {
    appState.settings.freelanceRole = document.getElementById("freelanceRoleInput").value.trim();
    persistState();
    showToast(appState.settings.lang === 'ar' ? 'تم حفظ المسمى الوظيفي' : 'Role title saved');
  });

  document.getElementById("btnAddIncomeCat").addEventListener("click", () => {
    const inp = document.getElementById("newIncomeCatInput");
    const val = inp.value.trim();
    if (val && !appState.freelanceCats.income.includes(val)) {
      appState.freelanceCats.income.push(val);
      inp.value = "";
      persistState();
      renderAll();
      showToast(appState.settings.lang === 'ar' ? 'تمت إضافة التصنيف' : 'Category added');
    }
  });
  document.getElementById("btnAddExpenseCat").addEventListener("click", () => {
    const inp = document.getElementById("newExpenseCatInput");
    const val = inp.value.trim();
    if (val && !appState.freelanceCats.expense.includes(val)) {
      appState.freelanceCats.expense.push(val);
      inp.value = "";
      persistState();
      renderAll();
      showToast(appState.settings.lang === 'ar' ? 'تمت إضافة التصنيف' : 'Category added');
    }
  });

  document.getElementById("channelFilterSelect").addEventListener("change", () => {
    paginationState.creatorTxPage = 1;
    renderAll();
  });

  const onIncomesSearch = debounce(() => {
    paginationState.incomesPage = 1;
    renderPersonalTab();
  }, 180);
  document.getElementById("searchIncomesInput")?.addEventListener("input", onIncomesSearch);

  const onObligationsSearch = debounce(() => {
    paginationState.obligationsPage = 1;
    renderPersonalTab();
  }, 180);
  document.getElementById("searchObligationsInput")?.addEventListener("input", onObligationsSearch);

  document.getElementById("cashflowPeriodSelect")?.addEventListener("change", (e) => {
    paginationState.selectedPeriod = e.target.value;
    paginationState.incomesPage = 1;
    paginationState.obligationsPage = 1;
    renderAll();
  });

  // Modal Backdrop click dismissal
  document.querySelectorAll(".fixed").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (modal.id === "pinLockScreen") return;
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });

  // Global Escape key listener to dismiss open dialogs
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".fixed:not(.hidden)").forEach(modal => {
        if (modal.id === "pinLockScreen") return;
        modal.classList.add("hidden");
      });
    }
  });

  document.querySelectorAll(".close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".fixed").classList.add("hidden");
    });
  });

  // Delegated click handler for safe category removal without inline string escaping issues
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-remove-fl-cat");
    if (!btn) return;
    const type = btn.getAttribute("data-cat-type");
    const idx = parseInt(btn.getAttribute("data-cat-idx"), 10);
    if (type && !isNaN(idx) && appState.freelanceCats[type] && appState.freelanceCats[type][idx]) {
      appState.freelanceCats[type].splice(idx, 1);
      persistState();
      renderAll();
      showToast(appState.settings.lang === 'ar' ? 'تم حذف التصنيف' : 'Category removed');
    }
  });

  const txModal = document.getElementById("txModal");
  const txModalTitle = document.getElementById("txModalTitle");
  const txTypeInput = document.getElementById("txType");
  const txCatSelect = document.getElementById("txCategorySelect");

  function updateTxConversionPreview() {
    const currSelect = document.getElementById("txCurrencySelect");
    const amtInput = document.getElementById("txAmountInput");
    const infoBox = document.getElementById("txConversionInfo");
    const convertedVal = document.getElementById("txConvertedVal");
    if (!currSelect || !amtInput || !infoBox || !convertedVal) return;

    const curr = currSelect.value;
    const amt = parseFloat(amtInput.value);

    if (curr === "BASE" || isNaN(amt) || amt <= 0) {
      infoBox.classList.add("hidden");
      return;
    }

    const rate = curr === "USD" ? (Number(appState.rates.usd) || 1) : (Number(appState.rates.eur) || 1);
    const baseEq = amt * rate;
    convertedVal.textContent = `≈ ${baseEq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${appState.settings.currency}`;
    infoBox.classList.remove("hidden");
  }

  document.getElementById("txAmountInput")?.addEventListener("input", updateTxConversionPreview);
  document.getElementById("txCurrencySelect")?.addEventListener("change", updateTxConversionPreview);

  function openTxModal(type) {
    txTypeInput.value = type;
    document.getElementById("txEditId").value = "";
    const lang = appState.settings.lang;
    const isIncome = type === "income";

    txModalTitle.textContent = isIncome 
      ? (lang === 'ar' ? 'إضافة مصدر دخل مالي' : lang === 'es' ? 'Agregar Fuente de Ingreso' : 'Add Financial Income')
      : (lang === 'ar' ? 'إضافة التزام مالي شهري' : lang === 'es' ? 'Agregar Obligación Mensual' : 'Add Monthly Obligation');

    populatePersonalCats(type);

    document.getElementById("txTitleInput").value = "";
    document.getElementById("txAmountInput").value = "";
    document.getElementById("txDateInput").value = new Date().toISOString().split("T")[0];
    const currSelect = document.getElementById("txCurrencySelect");
    if (currSelect) currSelect.value = "BASE";
    document.getElementById("txConversionInfo")?.classList.add("hidden");
    document.getElementById("newPersonalCatBox")?.classList.add("hidden");
    txModal.classList.remove("hidden");
  }

  function populatePersonalCats(type, selectedVal = null) {
    const lang = appState.settings.lang;
    const isIncome = type === "income";
    const catSource = isIncome ? categoriesMap.personal_income : categoriesMap.personal_expense;
    const customList = (appState.customPersonalCats && appState.customPersonalCats[type]) || [];

    let options = Object.keys(catSource).map(k => `
      <option value="${k}">${catSource[k][lang] || catSource[k].en}</option>
    `);

    if (customList.length > 0) {
      options.push(`<optgroup label="${lang === 'ar' ? 'تصنيفات مخصصة' : lang === 'es' ? 'Personalizadas' : 'Custom Categories'}">`);
      customList.forEach(c => {
        options.push(`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`);
      });
      options.push(`</optgroup>`);
    }

    txCatSelect.innerHTML = options.join("");
    if (selectedVal) {
      if (![...txCatSelect.options].some(o => o.value === selectedVal)) {
        txCatSelect.innerHTML += `<option value="${escapeHtml(selectedVal)}">${escapeHtml(selectedVal)}</option>`;
      }
      txCatSelect.value = selectedVal;
    }
  }

  window.openEditPersonalTxModal = function(type, id) {
    const isIncome = type === "income";
    const list = isIncome ? appState.personalIncomes : appState.personalObligations;
    const item = list.find(i => i.id === id);
    if (!item) return;

    const lang = appState.settings.lang;
    txTypeInput.value = type;
    document.getElementById("txEditId").value = item.id;

    txModalTitle.textContent = isIncome 
      ? (lang === 'ar' ? 'تعديل مصدر الدخل' : lang === 'es' ? 'Editar Ingreso' : 'Edit Income')
      : (lang === 'ar' ? 'تعديل الالتزام المالي' : lang === 'es' ? 'Editar Obligación' : 'Edit Obligation');

    populatePersonalCats(type, item.category);

    document.getElementById("txTitleInput").value = item.title;
    const currSelect = document.getElementById("txCurrencySelect");
    if (item.currency === "USD" || item.currency === "EUR") {
      if (currSelect) currSelect.value = item.currency;
      document.getElementById("txAmountInput").value = item.foreignAmount || item.amount;
    } else {
      if (currSelect) currSelect.value = "BASE";
      document.getElementById("txAmountInput").value = item.amount;
    }
    updateTxConversionPreview();
    document.getElementById("txDateInput").value = item.date;
    document.getElementById("newPersonalCatBox")?.classList.add("hidden");
    txModal.classList.remove("hidden");
  };

  document.getElementById("btnToggleNewPersonalCat")?.addEventListener("click", () => {
    const box = document.getElementById("newPersonalCatBox");
    if (!box) return;
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) {
      document.getElementById("newPersonalCatInput")?.focus();
    }
  });

  document.getElementById("btnSavePersonalCat")?.addEventListener("click", () => {
    const inp = document.getElementById("newPersonalCatInput");
    const val = inp?.value.trim();
    const type = txTypeInput.value || "income";
    if (!appState.customPersonalCats) appState.customPersonalCats = { income: [], expense: [] };
    if (!appState.customPersonalCats[type]) appState.customPersonalCats[type] = [];

    if (val && !appState.customPersonalCats[type].includes(val)) {
      appState.customPersonalCats[type].push(val);
      persistState();
      populatePersonalCats(type, val);
      inp.value = "";
      document.getElementById("newPersonalCatBox")?.classList.add("hidden");
      showToast(appState.settings.lang === 'ar' ? 'تمت إضافة التصنيف المخصص' : 'Custom category added');
    }
  });

  document.getElementById("btnOpenAddIncome").addEventListener("click", () => openTxModal("income"));
  document.getElementById("btnOpenAddExpense").addEventListener("click", () => openTxModal("expense"));

  document.getElementById("txForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = txTypeInput.value;
    const editId = document.getElementById("txEditId").value;
    const isIncome = type === "income";
    const title = document.getElementById("txTitleInput").value.trim();
    const rawAmount = parseFloat(document.getElementById("txAmountInput").value);
    const date = document.getElementById("txDateInput").value;
    const category = txCatSelect.value;
    const lang = appState.settings.lang;

    // Defensive input validation
    if (!title || isNaN(rawAmount) || rawAmount <= 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال وصف ومبلغ صحيح أكبر من الصفر' : 'Please enter a valid title and amount greater than zero', 'error');
      return;
    }

    const currCode = document.getElementById("txCurrencySelect")?.value || "BASE";
    let finalBaseAmount = rawAmount;
    let currency = appState.settings.currency;
    let foreignAmount = null;
    let exchangeRate = 1;

    if (currCode === "USD") {
      currency = "USD";
      exchangeRate = Number(appState.rates.usd) || 1;
      foreignAmount = rawAmount;
      finalBaseAmount = Number((rawAmount * exchangeRate).toFixed(2));
    } else if (currCode === "EUR") {
      currency = "EUR";
      exchangeRate = Number(appState.rates.eur) || 1;
      foreignAmount = rawAmount;
      finalBaseAmount = Number((rawAmount * exchangeRate).toFixed(2));
    }

    if (editId) {
      const list = isIncome ? appState.personalIncomes : appState.personalObligations;
      const item = list.find(i => i.id === editId);
      if (item) {
        item.title = title;
        item.amount = finalBaseAmount;
        item.date = date;
        item.category = category;
        item.currency = currency;
        item.foreignAmount = foreignAmount;
        item.exchangeRate = exchangeRate;
      }
      showToast(lang === 'ar' ? 'تم تعديل المعاملة بنجاح' : 'Transaction updated');
    } else {
      const item = {
        id: `${isIncome ? 'inc' : 'exp'}-${Date.now()}`,
        title,
        amount: finalBaseAmount,
        date,
        category,
        currency,
        foreignAmount,
        exchangeRate
      };
      if (isIncome) {
        appState.personalIncomes.unshift(item);
        paginationState.incomesPage = 1;
      } else {
        appState.personalObligations.unshift(item);
        paginationState.obligationsPage = 1;
      }
      showToast(lang === 'ar' ? 'تم تسجيل المعاملة بنجاح' : 'Transaction saved');
    }

    await persistState();
    trackOperationAndRemind();
    txModal.classList.add("hidden");
    renderAll();
  });

  const assetModal = document.getElementById("assetModal");
  const assetCatSelect = document.getElementById("assetCategorySelect");
  const assetUnitPriceInput = document.getElementById("assetUnitPriceInput");
  const goldKaratBox = document.getElementById("goldKaratBox");
  const assetGoldKaratSelect = document.getElementById("assetGoldKaratSelect");
  const assetPurchasePriceInput = document.getElementById("assetPurchasePriceInput");

  function getCalculatedGoldRate(karat) {
    const base24k = Number(appState.rates.gold || 0);
    if (karat === "21k") return Math.round(base24k * (21 / 24));
    if (karat === "18k") return Math.round(base24k * (18 / 24));
    return base24k;
  }

  window.openEditAssetModal = function(id) {
    const ast = appState.assets.find(a => a.id === id);
    if (!ast) return;
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("assetModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_asset_edit || (lang === 'ar' ? 'تعديل الأصل' : 'Edit Asset');

    document.getElementById("assetEditId").value = ast.id;
    document.getElementById("assetNameInput").value = ast.name || "";
    assetCatSelect.value = ast.category || "usd";
    document.getElementById("assetQtyInput").value = ast.quantity;

    if (ast.category === "gold") {
      goldKaratBox?.classList.remove("hidden");
      if (assetGoldKaratSelect) assetGoldKaratSelect.value = ast.karat || "24k";
      assetUnitPriceInput.value = getCalculatedGoldRate(ast.karat || "24k");
    } else {
      goldKaratBox?.classList.add("hidden");
      assetUnitPriceInput.value = ast.unitPrice;
    }

    if (assetPurchasePriceInput) {
      assetPurchasePriceInput.value = (ast.purchasePrice !== undefined && ast.purchasePrice !== null) ? ast.purchasePrice : (ast.unitPrice || "");
    }

    assetModal.classList.remove("hidden");
    document.getElementById("assetNameInput")?.focus();
  };

  document.getElementById("btnOpenAddAsset").addEventListener("click", () => {
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("assetModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_asset_title || (lang === 'ar' ? 'تسجيل أصل استثماري' : 'Register Asset');

    document.getElementById("assetEditId").value = "";
    document.getElementById("assetNameInput").value = "";
    document.getElementById("assetQtyInput").value = "";
    assetCatSelect.value = "usd";
    goldKaratBox?.classList.add("hidden");
    assetUnitPriceInput.value = appState.rates.usd;
    if (assetPurchasePriceInput) assetPurchasePriceInput.value = "";
    assetModal.classList.remove("hidden");
    document.getElementById("assetNameInput")?.focus();
  });

  assetCatSelect.addEventListener("change", (e) => {
    const val = e.target.value;
    if (val === "usd") {
      goldKaratBox?.classList.add("hidden");
      assetUnitPriceInput.value = appState.rates.usd;
    } else if (val === "eur") {
      goldKaratBox?.classList.add("hidden");
      assetUnitPriceInput.value = appState.rates.eur;
    } else if (val === "gold") {
      goldKaratBox?.classList.remove("hidden");
      const karat = assetGoldKaratSelect?.value || "21k";
      if (assetGoldKaratSelect) assetGoldKaratSelect.value = karat;
      assetUnitPriceInput.value = getCalculatedGoldRate(karat);
    } else {
      goldKaratBox?.classList.add("hidden");
      assetUnitPriceInput.value = "";
    }
  });

  assetGoldKaratSelect?.addEventListener("change", (e) => {
    assetUnitPriceInput.value = getCalculatedGoldRate(e.target.value);
  });

  document.getElementById("assetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("assetEditId").value;
    const name = document.getElementById("assetNameInput").value.trim();
    const category = assetCatSelect.value;
    const quantity = parseFloat(document.getElementById("assetQtyInput").value);
    const unitPrice = parseFloat(assetUnitPriceInput.value);
    const karat = category === "gold" ? (assetGoldKaratSelect?.value || "24k") : undefined;
    const rawPurchasePrice = parseFloat(assetPurchasePriceInput?.value);
    const purchasePrice = (!isNaN(rawPurchasePrice) && rawPurchasePrice >= 0) ? rawPurchasePrice : unitPrice;
    const lang = appState.settings.lang;

    // Defensive validation
    if (!name || isNaN(quantity) || quantity <= 0 || isNaN(unitPrice) || unitPrice < 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال اسم الأصل وكمية وسعر صحيحين (الكمية أكبر من الصفر)' : 'Please enter valid asset details (quantity must be > 0)', 'error');
      return;
    }

    if (editId) {
      const ast = appState.assets.find(a => a.id === editId);
      if (ast) {
        ast.name = name;
        ast.category = category;
        ast.quantity = quantity;
        ast.unitPrice = unitPrice;
        ast.karat = karat;
        ast.purchasePrice = purchasePrice;
      }
      showToast((i18n[lang] || i18n.en).asset_updated || (lang === 'ar' ? 'تم تعديل الأصل بنجاح' : 'Asset updated'));
    } else {
      const item = {
        id: `ast-${Date.now()}`,
        name,
        category,
        quantity,
        unitPrice,
        karat,
        purchasePrice
      };
      appState.assets.push(item);
      paginationState.assetsPage = 1;
      showToast(lang === 'ar' ? 'تم تسجيل الأصل وحساب صافي الثروة والعائد' : 'Asset added & Net Worth recalculated');
    }

    await persistState();
    trackOperationAndRemind();
    assetModal.classList.add("hidden");
    renderAll();
  });

  const channelModal = document.getElementById("channelModal");
  
  window.openEditChannelModal = function(id) {
    const chn = appState.channels.find(c => c.id === id);
    if (!chn) return;
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("channelModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_channel_edit || (lang === 'ar' ? 'تعديل بيانات القناة' : 'Edit Channel');

    document.getElementById("channelEditId").value = chn.id;
    document.getElementById("channelPlatformSelect").value = chn.platform;
    document.getElementById("channelNameInput").value = chn.name;
    channelModal.classList.remove("hidden");
  };

  document.getElementById("btnOpenAddChannel").addEventListener("click", () => {
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("channelModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_channel_title || 'Add Creator Channel';

    document.getElementById("channelEditId").value = "";
    document.getElementById("channelNameInput").value = "";
    document.getElementById("channelPlatformSelect").value = "youtube";
    channelModal.classList.remove("hidden");
  });

  document.getElementById("channelForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("channelEditId").value;
    const platform = document.getElementById("channelPlatformSelect").value;
    const name = document.getElementById("channelNameInput").value.trim();
    const lang = appState.settings.lang;

    if (editId) {
      const chn = appState.channels.find(c => c.id === editId);
      if (chn) {
        chn.platform = platform;
        chn.name = name;
      }
      showToast((i18n[lang] || i18n.en).channel_updated || (lang === 'ar' ? 'تم تعديل بيانات القناة بنجاح' : 'Channel updated'));
    } else {
      const chn = {
        id: `chn-${Date.now()}`,
        platform,
        name
      };
      appState.channels.push(chn);
      showToast(lang === 'ar' ? 'تم إنشاء القناة' : 'Channel created');
    }

    await persistState();
    trackOperationAndRemind();
    channelModal.classList.add("hidden");
    renderAll();
  });

  const creatorTxModal = document.getElementById("creatorTxModal");
  const creatorFlowSelect = document.getElementById("creatorTxFlowSelect");
  const creatorCatSelect = document.getElementById("creatorTxCatSelect");

  function populateCreatorCats() {
    const flow = creatorFlowSelect.value;
    const lang = appState.settings.lang;
    const source = flow === "revenue" ? categoriesMap.creator_revenue : categoriesMap.creator_expense;
    creatorCatSelect.innerHTML = Object.keys(source).map(k => `
      <option value="${k}">${source[k][lang] || source[k].en}</option>
    `).join("");
  }

  window.openEditCreatorTxModal = function(id) {
    const tx = appState.creatorTransactions.find(t => t.id === id);
    if (!tx) return;
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("creatorTxModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_creator_tx_edit || (lang === 'ar' ? 'تعديل معاملة القناة' : 'Edit Channel Transaction');

    document.getElementById("creatorTxEditId").value = tx.id;
    document.getElementById("creatorTxChannelSelect").value = tx.channelId;
    creatorFlowSelect.value = tx.flow;
    populateCreatorCats();
    creatorCatSelect.value = tx.category;
    document.getElementById("creatorTxTitleInput").value = tx.title;
    document.getElementById("creatorTxAmountInput").value = tx.amount;
    document.getElementById("creatorTxDateInput").value = tx.date;
    creatorTxModal.classList.remove("hidden");
  };

  document.getElementById("btnOpenAddCreatorTx").addEventListener("click", () => {
    if (appState.channels.length === 0) {
      showToast(appState.settings.lang === 'ar' ? 'يرجى إنشاء قناة أولاً' : 'Please add a channel first', 'error');
      return;
    }
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("creatorTxModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_creator_tx_title || 'Log Channel Transaction';

    document.getElementById("creatorTxEditId").value = "";
    document.getElementById("creatorTxFlowSelect").value = "revenue";
    populateCreatorCats();
    document.getElementById("creatorTxTitleInput").value = "";
    document.getElementById("creatorTxAmountInput").value = "";
    document.getElementById("creatorTxDateInput").value = new Date().toISOString().split("T")[0];
    creatorTxModal.classList.remove("hidden");
  });

  creatorFlowSelect.addEventListener("change", populateCreatorCats);

  document.getElementById("creatorTxForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("creatorTxEditId").value;
    const channelId = document.getElementById("creatorTxChannelSelect").value;
    const flow = creatorFlowSelect.value;
    const category = creatorCatSelect.value;
    const title = document.getElementById("creatorTxTitleInput").value.trim();
    const amount = parseFloat(document.getElementById("creatorTxAmountInput").value);
    const date = document.getElementById("creatorTxDateInput").value;
    const lang = appState.settings.lang;

    // Defensive input validation
    if (!title || isNaN(amount) || amount <= 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال وصف ومبلغ صحيح أكبر من الصفر' : 'Please enter a valid title and amount greater than zero', 'error');
      return;
    }

    if (editId) {
      const tx = appState.creatorTransactions.find(t => t.id === editId);
      if (tx) {
        tx.channelId = channelId;
        tx.flow = flow;
        tx.category = category;
        tx.title = title;
        tx.amount = amount;
        tx.date = date;
      }
      showToast((i18n[lang] || i18n.en).creator_tx_updated || (lang === 'ar' ? 'تم تعديل المعاملة بنجاح' : 'Transaction updated'));
    } else {
      const tx = {
        id: `ctx-${Date.now()}`,
        channelId,
        flow,
        category,
        title,
        amount,
        date
      };
      appState.creatorTransactions.unshift(tx);
      paginationState.creatorTxPage = 1;
      showToast(lang === 'ar' ? 'تم تسجيل المعاملة بالقناة' : 'Channel entry saved');
    }

    await persistState();
    trackOperationAndRemind();
    creatorTxModal.classList.add("hidden");
    renderAll();
  });

  const flTxModal = document.getElementById("freelanceTxModal");
  const flFlowSelect = document.getElementById("flTxFlowSelect");
  const flCatSelect = document.getElementById("flTxCategorySelect");

  function updateFlTxConversionPreview() {
    const currSelect = document.getElementById("flTxCurrencySelect");
    const amtInput = document.getElementById("flTxAmountInput");
    const infoBox = document.getElementById("flConversionInfo");
    const convertedVal = document.getElementById("flConvertedVal");
    if (!currSelect || !amtInput || !infoBox || !convertedVal) return;

    const curr = currSelect.value;
    const amt = parseFloat(amtInput.value);

    if (curr === "BASE" || isNaN(amt) || amt <= 0) {
      infoBox.classList.add("hidden");
      return;
    }

    const rate = curr === "USD" ? (Number(appState.rates.usd) || 1) : (Number(appState.rates.eur) || 1);
    const baseEq = amt * rate;
    convertedVal.textContent = `≈ ${baseEq.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${appState.settings.currency}`;
    infoBox.classList.remove("hidden");
  }

  document.getElementById("flTxAmountInput")?.addEventListener("input", updateFlTxConversionPreview);
  document.getElementById("flTxCurrencySelect")?.addEventListener("change", updateFlTxConversionPreview);

  function populateFreelanceCats() {
    const flow = flFlowSelect.value;
    const list = flow === "income" ? appState.freelanceCats.income : appState.freelanceCats.expense;
    flCatSelect.innerHTML = list.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  }

  window.openEditFreelanceTxModal = function(id) {
    const tx = appState.freelanceTransactions.find(t => t.id === id);
    if (!tx) return;
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("flTxModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_fl_tx_edit || (lang === 'ar' ? 'تعديل معاملة العمل الحر' : 'Edit Freelance Transaction');

    document.getElementById("flTxEditId").value = tx.id;
    flFlowSelect.value = tx.flow || "income";
    populateFreelanceCats();
    flCatSelect.value = tx.category || "";
    document.getElementById("flTxTitleInput").value = tx.title || "";
    const currSelect = document.getElementById("flTxCurrencySelect");
    if (tx.currency === "USD" || tx.currency === "EUR") {
      if (currSelect) currSelect.value = tx.currency;
      document.getElementById("flTxAmountInput").value = tx.foreignAmount || tx.amount;
    } else {
      if (currSelect) currSelect.value = "BASE";
      document.getElementById("flTxAmountInput").value = tx.amount;
    }
    updateFlTxConversionPreview();
    document.getElementById("flTxDateInput").value = tx.date;
    flTxModal.classList.remove("hidden");
  };

  document.getElementById("btnOpenAddFreelanceTx").addEventListener("click", () => {
    const lang = appState.settings.lang;
    const titleEl = document.getElementById("flTxModalTitle");
    if (titleEl) titleEl.textContent = (i18n[lang] || i18n.en).modal_fl_tx_title || (lang === 'ar' ? 'تسجيل معاملة عمل حر' : 'Log Freelance Transaction');

    document.getElementById("flTxEditId").value = "";
    flFlowSelect.value = "income";
    populateFreelanceCats();
    document.getElementById("flTxTitleInput").value = "";
    document.getElementById("flTxAmountInput").value = "";
    const currSelect = document.getElementById("flTxCurrencySelect");
    if (currSelect) currSelect.value = "BASE";
    document.getElementById("flConversionInfo")?.classList.add("hidden");
    document.getElementById("flTxDateInput").value = new Date().toISOString().split("T")[0];
    flTxModal.classList.remove("hidden");
  });

  flFlowSelect.addEventListener("change", populateFreelanceCats);

  document.getElementById("freelanceTxForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("flTxEditId").value;
    const flow = flFlowSelect.value;
    const category = flCatSelect.value;
    const title = document.getElementById("flTxTitleInput").value.trim();
    const rawAmount = parseFloat(document.getElementById("flTxAmountInput").value);
    const date = document.getElementById("flTxDateInput").value;
    const lang = appState.settings.lang;

    // Defensive input validation
    if (!title || isNaN(rawAmount) || rawAmount <= 0) {
      showToast(lang === 'ar' ? 'يرجى إدخال وصف ومبلغ صحيح أكبر من الصفر' : 'Please enter a valid title and amount greater than zero', 'error');
      return;
    }

    const currCode = document.getElementById("flTxCurrencySelect")?.value || "BASE";
    let finalBaseAmount = rawAmount;
    let currency = appState.settings.currency;
    let foreignAmount = null;
    let exchangeRate = 1;

    if (currCode === "USD") {
      currency = "USD";
      exchangeRate = Number(appState.rates.usd) || 1;
      foreignAmount = rawAmount;
      finalBaseAmount = Number((rawAmount * exchangeRate).toFixed(2));
    } else if (currCode === "EUR") {
      currency = "EUR";
      exchangeRate = Number(appState.rates.eur) || 1;
      foreignAmount = rawAmount;
      finalBaseAmount = Number((rawAmount * exchangeRate).toFixed(2));
    }

    if (editId) {
      const tx = appState.freelanceTransactions.find(t => t.id === editId);
      if (tx) {
        tx.flow = flow;
        tx.category = category;
        tx.title = title;
        tx.amount = finalBaseAmount;
        tx.date = date;
        tx.currency = currency;
        tx.foreignAmount = foreignAmount;
        tx.exchangeRate = exchangeRate;
      }
      showToast((i18n[lang] || i18n.en).fl_tx_updated || (lang === 'ar' ? 'تم تعديل معاملة العمل الحر بنجاح' : 'Freelance transaction updated'));
    } else {
      const tx = {
        id: `flx-${Date.now()}`,
        flow,
        category,
        title,
        amount: finalBaseAmount,
        date,
        currency,
        foreignAmount,
        exchangeRate
      };
      appState.freelanceTransactions.unshift(tx);
      paginationState.freelanceTxPage = 1;
      showToast(lang === 'ar' ? 'تم تسجيل عملية العمل الحر' : 'Freelance entry saved');
    }

    await persistState();
    trackOperationAndRemind();
    flTxModal.classList.add("hidden");
    renderAll();
  });

  // Monthly Budget Cap Handlers
  const budgetModal = document.getElementById("budgetModal");
  document.getElementById("btnSetBudget")?.addEventListener("click", () => {
    const budget = appState.monthlyBudget || { enabled: false, amount: 0 };
    document.getElementById("budgetLimitInput").value = budget.amount > 0 ? budget.amount : "";
    document.getElementById("budgetEnabledToggle").checked = budget.enabled !== false;
    budgetModal.classList.remove("hidden");
  });

  document.getElementById("budgetForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const limit = parseFloat(document.getElementById("budgetLimitInput").value) || 0;
    const enabled = document.getElementById("budgetEnabledToggle").checked;
    appState.monthlyBudget = {
      enabled: enabled && limit > 0,
      amount: limit
    };
    await persistState();
    budgetModal.classList.add("hidden");
    renderAll();
    const lang = appState.settings.lang;
    showToast(lang === 'ar' ? 'تم تحديث سقف الميزانية الشهرية' : 'Monthly budget updated');
  });

  // Quick Recurring Obligations Clone Handler
  document.getElementById("btnCloneRecurring")?.addEventListener("click", async () => {
    const lang = appState.settings.lang;
    const currentPeriod = paginationState.selectedPeriod === "all"
      ? new Date().toISOString().slice(0, 7)
      : paginationState.selectedPeriod;

    // Find all distinct months available in personalObligations
    const availableMonths = Array.from(new Set(
      appState.personalObligations
        .map(o => (o.date ? o.date.slice(0, 7) : ""))
        .filter(m => m && m.length === 7)
    )).sort().reverse();

    // Prefer the most recent month strictly before the selected month
    let sourceMonth = availableMonths.find(m => m < currentPeriod);
    if (!sourceMonth && availableMonths.length > 0) {
      sourceMonth = availableMonths.find(m => m !== currentPeriod) || availableMonths[0];
    }

    if (!sourceMonth) {
      showToast(lang === 'ar' ? 'لا توجد التزامات مسجلة في أشهر سابقة لنسخها' : 'No previous monthly obligations found to clone', 'info');
      return;
    }

    const prevItems = appState.personalObligations.filter(o => o.date && o.date.startsWith(sourceMonth));
    if (prevItems.length === 0) {
      showToast(lang === 'ar' ? 'لا توجد التزامات في الشهر المصدر' : 'No obligations found in source month', 'info');
      return;
    }

    const titleMsg = lang === 'ar' ? 'استنساخ الالتزامات الشهرية' : 'Clone Monthly Obligations';
    const textMsg = lang === 'ar'
      ? `هل تريد استنساخ ${prevItems.length} التزام من شهر (${sourceMonth}) إلى شهر (${currentPeriod})؟`
      : `Clone ${prevItems.length} recurring obligations from (${sourceMonth}) into (${currentPeriod})?`;

    const ok = await requestConfirmation(titleMsg, textMsg);
    if (!ok) return;

    let clonedCount = 0;
    prevItems.forEach(item => {
      const day = item.date ? item.date.slice(8, 10) : "01";
      const newTx = {
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: item.title,
        amount: item.amount,
        category: item.category,
        date: `${currentPeriod}-${day}`,
        currency: item.currency || appState.settings.currency,
        foreignAmount: item.foreignAmount || null,
        exchangeRate: item.exchangeRate || 1
      };
      appState.personalObligations.unshift(newTx);
      clonedCount++;
    });

    paginationState.obligationsPage = 1;
    await persistState();
    trackOperationAndRemind();
    renderAll();
    showToast(lang === 'ar' ? `تم استنساخ ${clonedCount} التزام بنجاح إلى شهر ${currentPeriod}` : `Cloned ${clonedCount} obligations to ${currentPeriod}`);
  });

  document.getElementById("btnExportJson").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PureTech_Wallet_Backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(appState.settings.lang === 'ar' ? 'تم تحميل ملف النسخة الاحتياطية بنجاح' : 'Backup JSON exported successfully');
  });

  document.getElementById("importJsonInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && typeof parsed === "object" && (parsed.settings || parsed.personalIncomes)) {
          appState = typeof mergeWithDefaultState === "function" ? mergeWithDefaultState(parsed) : parsed;
          await persistState();
          updateLanguageUI();
          renderAll();
          checkPinSecurityOnStartup();
          showToast(appState.settings.lang === 'ar' ? 'تمت استعادة البيانات وتنقيتها بنجاح' : 'Database restored and sanitized successfully');
        } else {
          showToast("Invalid PureTech Wallet JSON format", "error");
        }
      } catch (err) {
        showToast("Failed to parse JSON file", "error");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  });

  document.getElementById("btnExportCsv").addEventListener("click", () => {
    // تعقيم الحقول لمنع ثغرة حقن صيغ الإكسيل (CSV Formula Injection)
    function sanitizeCsvCell(value) {
      if (value === null || value === undefined) return '""';
      let str = String(value);
      if (/^[=\+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    }

    let csvContent = "\uFEFF";
    csvContent += "Type,Category,Description/Name,BaseAmount,Date/Quantity,BaseCurrency,ForeignAmount,ForeignCurrency\n";

    appState.personalIncomes.forEach(i => {
      const fAmt = (i.currency && i.currency !== appState.settings.currency && i.foreignAmount) ? i.foreignAmount : "";
      const fCurr = (i.currency && i.currency !== appState.settings.currency) ? i.currency : "";
      csvContent += `${sanitizeCsvCell("Personal Income")},${sanitizeCsvCell(i.category)},${sanitizeCsvCell(i.title)},${sanitizeCsvCell(i.amount)},${sanitizeCsvCell(i.date)},${sanitizeCsvCell(appState.settings.currency)},${sanitizeCsvCell(fAmt)},${sanitizeCsvCell(fCurr)}\n`;
    });
    appState.personalObligations.forEach(o => {
      const fAmt = (o.currency && o.currency !== appState.settings.currency && o.foreignAmount) ? -Number(o.foreignAmount) : "";
      const fCurr = (o.currency && o.currency !== appState.settings.currency) ? o.currency : "";
      csvContent += `${sanitizeCsvCell("Personal Obligation")},${sanitizeCsvCell(o.category)},${sanitizeCsvCell(o.title)},${sanitizeCsvCell(-Number(o.amount || 0))},${sanitizeCsvCell(o.date)},${sanitizeCsvCell(appState.settings.currency)},${sanitizeCsvCell(fAmt)},${sanitizeCsvCell(fCurr)}\n`;
    });
    appState.assets.forEach(a => {
      let unitPrice = Number(a.unitPrice || 0);
      if (a.category === "usd") unitPrice = Number(appState.rates.usd || 0);
      if (a.category === "eur") unitPrice = Number(appState.rates.eur || 0);
      if (a.category === "gold") unitPrice = Number(appState.rates.gold || 0);
      const total = Number(a.quantity || 0) * unitPrice;
      csvContent += `${sanitizeCsvCell("Asset")},${sanitizeCsvCell(a.category)},${sanitizeCsvCell(a.name)},${sanitizeCsvCell(total)},${sanitizeCsvCell(`Qty: ${a.quantity}`)},${sanitizeCsvCell(appState.settings.currency)},${sanitizeCsvCell("")},${sanitizeCsvCell("")}\n`;
    });
    appState.creatorTransactions.forEach(t => {
      const isRev = t.flow === "revenue";
      const signedAmt = isRev ? Number(t.amount || 0) : -Number(t.amount || 0);
      csvContent += `${sanitizeCsvCell(`Creator (${t.flow})`)},${sanitizeCsvCell(t.category)},${sanitizeCsvCell(t.title)},${sanitizeCsvCell(signedAmt)},${sanitizeCsvCell(t.date)},${sanitizeCsvCell(appState.settings.currency)},${sanitizeCsvCell("")},${sanitizeCsvCell("")}\n`;
    });
    appState.freelanceTransactions.forEach(t => {
      const isInc = t.flow === "income";
      const signedAmt = isInc ? Number(t.amount || 0) : -Number(t.amount || 0);
      const fAmt = (t.currency && t.currency !== appState.settings.currency && t.foreignAmount) ? (isInc ? Number(t.foreignAmount) : -Number(t.foreignAmount)) : "";
      const fCurr = (t.currency && t.currency !== appState.settings.currency) ? t.currency : "";
      csvContent += `${sanitizeCsvCell(`Freelance (${t.flow})`)},${sanitizeCsvCell(t.category)},${sanitizeCsvCell(t.title)},${sanitizeCsvCell(signedAmt)},${sanitizeCsvCell(t.date)},${sanitizeCsvCell(appState.settings.currency)},${sanitizeCsvCell(fAmt)},${sanitizeCsvCell(fCurr)}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PureTech_Wallet_Ledger_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(appState.settings.lang === 'ar' ? 'تم تصدير ملف الإكسيل بنجاح' : 'Excel CSV exported successfully');
  });

  document.getElementById("btnExportPdf")?.addEventListener("click", () => {
    const overviewTab = document.querySelector('[data-tab="tab-overview"]');
    if (overviewTab) overviewTab.click();
    showToast(appState.settings.lang === 'ar' ? 'جاري تجهيز التقرير المالي للطباعة / التصدير كـ PDF...' : 'Preparing financial statement for print / PDF...', 'info');
    setTimeout(() => {
      window.print();
    }, 450);
  });

  window.addEventListener("online", () => {
    updateOnlineStatusUI();
    showToast(appState.settings.lang === 'ar' ? 'تم الاتصال بالإنترنت - الأسعار جاهزة للتحديث' : 'Network restored (Online)', 'info');
    if (appState.settings.autoSyncRates !== false) {
      fetchLiveMarketRates(false);
    }
  });

  window.addEventListener("offline", () => {
    updateOnlineStatusUI();
    showToast(appState.settings.lang === 'ar' ? 'وضع عدم الاتصال: يعمل محلياً 100% بأمان' : 'Offline Mode: Running 100% locally', 'info');
  });

  document.getElementById("btnLoadSampleData").addEventListener("click", async () => {
    const ok = await requestConfirmation(
      appState.settings.lang === 'ar' ? 'شحن البيانات النموذجية' : 'Load Sample Data',
      appState.settings.lang === 'ar' ? 'سيتم استبدال البيانات الحالية ببيانات تجريبية شاملة وواقعية، هل تود المتابعة؟' : 'Current data will be replaced with rich realistic sample records. Proceed?'
    );
    if (ok) {
      appState = getSampleState();
      await persistState();
      updateLanguageUI();
      renderAll();
      checkPinSecurityOnStartup();
      showToast(appState.settings.lang === 'ar' ? 'تم شحن البيانات النموذجية بنجاح' : 'Sample data loaded');
    }
  });

  document.getElementById("btnOpenClearConfirm").addEventListener("click", async () => {
    const ok = await requestConfirmation(
      appState.settings.lang === 'ar' ? 'تصفير المحفظة والبدء من الصفر' : 'Wipe Database Clean',
      appState.settings.lang === 'ar' ? 'تحذير: هذا الإجراء لا يمكن التراجع عنه وسيحذف كافة المصادر والالتزامات والأصول والقنوات نهائياً!' : 'Warning: This action cannot be undone and will permanently wipe all entries!'
    );
    if (ok) {
      appState = {
        settings: { lang: "ar", currency: "EGP", includeOnline: true, freelanceRole: "", privacyMode: false, pinEnabled: false, pinCode: "" },
        rates: { usd: 48.50, eur: 52.20, gold: 3750 },
        personalIncomes: [],
        personalObligations: [],
        assets: [],
        channels: [],
        creatorTransactions: [],
        freelanceCats: {
          income: ["تطوير برمجيات", "استشارات"],
          expense: ["أدوات واشتراكات"]
        },
        freelanceTransactions: []
      };
      await persistState();
      updateLanguageUI();
      renderAll();
      checkPinSecurityOnStartup();
      showToast(appState.settings.lang === 'ar' ? 'تم تصفير قاعدة البيانات بنجاح' : 'Database wiped cleanly');
    }
  });
});

// Register PWA Service Worker for 100% Offline Resilience
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered in scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker registration skipped:", err);
      });
  });
}
