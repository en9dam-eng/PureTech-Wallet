/**
 * PureTech Wallet - Local Database Engine (IndexedDB Primary + Safe LocalStorage) & Sample State
 */

const DB_NAME = "PureTechWalletDB";
const DB_VERSION = 1;
const STORE_NAME = "state_store";
const STORAGE_KEY = "puretech_wallet_state_v1";
const SETTINGS_KEY = "puretech_wallet_settings_v1";

let dbInstance = null;

// الكشف الذكي عن لغة جهاز المتصفح (الإنجليزية عالمياً، العربية لأجهزة الناطقين بالعربية، والإسبانية)
function detectInitialLanguage() {
  try {
    if (typeof navigator !== "undefined" && navigator.language) {
      const navLang = navigator.language.toLowerCase();
      if (navLang.startsWith("ar")) return "ar";
      if (navLang.startsWith("es")) return "es";
    }
  } catch (e) {
    // fallback
  }
  return "en"; // الإنجليزية هي الافتراضية عالمياً
}

// الحالة الابتدائية النظيفة تماماً للمستخدم الجديد (خالية 100% من أي بيانات وهمية)
function getDefaultCleanState() {
  const initialLang = detectInitialLanguage();
  const isAr = initialLang === "ar";
  const isEs = initialLang === "es";

  return {
    isDemoMode: false,
    settings: {
      lang: initialLang,
      currency: "USD",
      includeOnline: true,
      autoSyncRates: true,
      freelanceRole: isAr 
        ? "مهندس برمجيات / عمل حر" 
        : (isEs ? "Ingeniero de Software / Freelance" : "Software Engineer / Freelancer"),
      privacyMode: false,
      pinEnabled: false,
      pinCode: ""
    },
    rates: {
      usd: 1.00,
      eur: 1.08,
      gold: 85,
      lastSyncDate: "",
      lastSyncTime: ""
    },
    personalIncomes: [],
    personalObligations: [],
    assets: [],
    channels: [],
    creatorTransactions: [],
    freelanceCats: {
      income: isAr 
        ? ["تطوير برمجيات ومواقع", "تصميم واجهات UI/UX", "استشارات ودعم تقني", "عقود عمل حر بالساعة"]
        : (isEs 
            ? ["Desarrollo de Software y Web", "Diseño UI/UX", "Consultoría y Soporte Técnico", "Contratos Freelance por Hora"]
            : ["Software & Web Development", "UI/UX Design", "Consulting & Tech Support", "Hourly Freelance Contracts"]),
      expense: isAr
        ? ["استضافة وسيرفرات سحابية", "اشتراكات برمجيات وذكاء اصطناعي", "عمولات منصات العمل الحر", "معدات وتراخيص"]
        : (isEs
            ? ["Hosting y Servidores Cloud", "Suscripciones de Software e IA", "Comisiones de Plataformas Freelance", "Equipamiento y Licencias"]
            : ["Cloud Hosting & Servers", "Software & AI Subscriptions", "Freelance Platform Fees", "Hardware & Licenses"])
    },
    customPersonalCats: {
      income: isAr
        ? ["مكافآت وحوافز", "عوائد استثمارات", "أعمال إضافية", "أخرى"]
        : (isEs
            ? ["Bonos e Incentivos", "Rendimientos de Inversión", "Trabajos Adicionales", "Otros"]
            : ["Bonuses & Incentives", "Investment Returns", "Side Gigs", "Other"]),
      expense: isAr
        ? ["فواتير وخدمات منزلية", "أقساط والتزامات تمويلية", "رعاية صحية وتأمين", "تعليم وتدريب", "صيانة ومواصلات"]
        : (isEs
            ? ["Facturas y Servicios del Hogar", "Cuotas y Compromisos Financieros", "Salud y Seguros", "Educación y Formación", "Mantenimiento y Transporte"]
            : ["Bills & Utilities", "Installments & Loan Payments", "Healthcare & Insurance", "Education & Training", "Maintenance & Transport"])
    },
    monthlyBudget: {
      enabled: false,
      amount: 0
    },
    freelanceTransactions: []
  };
}

function getSampleState() {
  return {
    isDemoMode: true,
    settings: {
      lang: "ar",
      currency: "EGP",
      includeOnline: true,
      autoSyncRates: true,
      freelanceRole: "مهندس برمجيات ومصمم واجهات Full-Stack",
      privacyMode: false,
      pinEnabled: false,
      pinCode: ""
    },
    rates: {
      usd: 48.50,
      eur: 52.20,
      gold: 3750,
      lastSyncDate: "",
      lastSyncTime: ""
    },
    personalIncomes: [
      { id: "inc-1", title: "راتب شركة التكنولوجيا الأساسي", category: "salary", amount: 45000, date: "2026-11-01" },
      { id: "inc-2", title: "عائد تأجير استوديو عقاري", category: "returns", amount: 12000, date: "2026-11-03" },
      { id: "inc-3", title: "مكافأة إنجاز مشروع سنوي", category: "bonus", amount: 8500, date: "2026-11-05" }
    ],
    personalObligations: [
      { id: "exp-1", title: "إيجار الشقة السكنية", category: "rent", amount: 14000, date: "2026-11-01" },
      { id: "exp-2", title: "قسط السيارة الشهري", category: "loans", amount: 8200, date: "2026-11-02" },
      { id: "exp-3", title: "فواتير الكهرباء والمياه والغاز", category: "bills", amount: 2300, date: "2026-11-03" },
      { id: "exp-4", title: "مشتريات وبقالة البيت الشهرية", category: "groceries", amount: 9500, date: "2026-11-04" },
      { id: "exp-5", title: "تأمين طبي واحتياجات أسرية", category: "health", amount: 3500, date: "2026-11-05" }
    ],
    assets: [
      { id: "ast-1", name: "سيولة نقدية احتياطية (USD Cash)", category: "usd", quantity: 3000, unitPrice: 48.50, purchasePrice: 47.00 },
      { id: "ast-2", name: "سبائك ذهب سويسري عيار 24", category: "gold", karat: "24k", quantity: 50, unitPrice: 3750, purchasePrice: 3500 },
      { id: "ast-5", name: "جنيهات ذهب بي تي سي عيار 21", category: "gold", karat: "21k", quantity: 32, unitPrice: 3281, purchasePrice: 3100 },
      { id: "ast-3", name: "أسهم محفظة تكنولوجيا S&P 500", category: "stocks", quantity: 120, unitPrice: 1850, purchasePrice: 1700 },
      { id: "ast-4", name: "مقدم استثمار عقاري تجاري", category: "realestate", quantity: 1, unitPrice: 450000, purchasePrice: 450000 }
    ],
    channels: [
      { id: "chn-1", platform: "youtube", name: "@PureTechInsights" },
      { id: "chn-2", platform: "tiktok", name: "@PureTechQuick" }
    ],
    creatorTransactions: [
      { id: "ctx-1", channelId: "chn-1", flow: "revenue", category: "sponsorship", title: "رعاية حلقة أدوات الذكاء الاصطناعي", amount: 22000, date: "2026-11-02" },
      { id: "ctx-2", channelId: "chn-1", flow: "revenue", category: "adsense", title: "أرباح إعلانات أدسنس الشهرية", amount: 16500, date: "2026-11-04" },
      { id: "ctx-3", channelId: "chn-1", flow: "expense", category: "editor", title: "أتعاب مونتاج 4 حلقات يوتيوب", amount: 7000, date: "2026-11-03" },
      { id: "ctx-4", channelId: "chn-1", flow: "expense", category: "thumbnail", title: "تصميم 4 صور مصغرة (Thumbnails)", amount: 1800, date: "2026-11-03" },
      { id: "ctx-5", channelId: "chn-1", flow: "expense", category: "internet", title: "فاتورة ألياف ضوئية فائقة السرعة للرفع", amount: 1200, date: "2026-11-04" },
      { id: "ctx-6", channelId: "chn-2", flow: "revenue", category: "affiliate", title: "عمولات تسويق منتجات تقنية", amount: 5400, date: "2026-11-05" },
      { id: "ctx-7", channelId: "chn-2", flow: "expense", category: "ads", title: "حملة إعلانات ممولة لزيادة المتابعين", amount: 1500, date: "2026-11-05" }
    ],
    freelanceCats: {
      income: ["تطوير مواقع ويب (Web Dev)", "تصميم واجهات UI/UX", "استشارات أداء الأنظمة", "عقد Upwork بالساعة"],
      expense: ["سيرفرات واستضافة Cloud", "اشتراكات AI (OpenAI & Claude)", "عمولات منصات العمل الحر", "رخص أدوات التصميم (Figma)"]
    },
    customPersonalCats: {
      income: ["مكافآت وتكريمات", "عوائد استشارات"],
      expense: ["أقساط وتمويل", "أدوية وعلاج", "تعليم وتدريب", "صيانة سيارة"]
    },
    monthlyBudget: {
      enabled: false,
      amount: 0
    },
    freelanceTransactions: [
      { id: "flx-1", flow: "income", category: "تطوير مواقع ويب (Web Dev)", title: "تسليم المرحلة الأولى لمتجر إلكتروني", amount: 28000, date: "2026-11-02" },
      { id: "flx-2", flow: "income", category: "تصميم واجهات UI/UX", title: "تصميم نظام تصميم (Design System) لتطبيق", amount: 15000, date: "2026-11-04" },
      { id: "flx-3", flow: "expense", category: "اشتراكات AI (OpenAI & Claude)", title: "تجديد باقة نماذج الذكاء الاصطناعي", amount: 1950, date: "2026-11-03" },
      { id: "flx-4", flow: "expense", category: "سيرفرات واستضافة Cloud", title: "استضافة السيرفرات السحابية وقواعد البيانات", amount: 2400, date: "2026-11-04" }
    ]
  };
}

// طلب الحماية ضد مسح المتصفح التلقائي للبيانات
async function requestPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.log(`[Storage] Persistent storage granted: ${granted}`);
      }
    } catch (e) {
      console.warn("[Storage] Persistent storage request error:", e);
    }
  }
}

// تدقيق وتطهير البيانات لمنع الثغرات أو إدخال عناصر مشوهة من ملفات الـ JSON
function sanitizeState(raw) {
  const def = getDefaultCleanState();
  if (!raw || typeof raw !== "object") return def;

  const cleanString = (val, fallback = "") => {
    if (typeof val === "string") return val.trim();
    if (typeof val === "number" && !isNaN(val)) return String(val).trim();
    return fallback;
  };
  const cleanId = (val, fallback = "") => cleanString(val, fallback).replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanNumber = (val, fallback = 0, min = 0) => {
    const num = Number(val);
    return (Number.isFinite(num) && num >= min) ? num : fallback;
  };
  const cleanDate = (val) => {
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.substring(0, 10);
    }
    return new Date().toISOString().split("T")[0];
  };

  const sanitizeList = (list, validator) => {
    if (!Array.isArray(list)) return [];
    return list.map(validator).filter(Boolean);
  };

  const cleanIncomes = sanitizeList(raw.personalIncomes, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const amount = cleanNumber(item.amount, 0, 0);
    const title = cleanString(item.title);
    if (!title || amount <= 0) return null;
    return {
      id: cleanId(item.id, `inc-${Date.now()}-${idx}`),
      title: title || "Income",
      category: cleanString(item.category, "other"),
      amount,
      date: cleanDate(item.date),
      currency: cleanString(item.currency) || undefined,
      foreignAmount: cleanNumber(item.foreignAmount) || undefined,
      exchangeRate: cleanNumber(item.exchangeRate) || undefined
    };
  });

  const cleanObligations = sanitizeList(raw.personalObligations, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const amount = cleanNumber(item.amount, 0, 0);
    const title = cleanString(item.title);
    if (!title || amount <= 0) return null;
    return {
      id: cleanId(item.id, `exp-${Date.now()}-${idx}`),
      title: title || "Obligation",
      category: cleanString(item.category, "other"),
      amount,
      date: cleanDate(item.date),
      currency: cleanString(item.currency) || undefined,
      foreignAmount: cleanNumber(item.foreignAmount) || undefined,
      exchangeRate: cleanNumber(item.exchangeRate) || undefined
    };
  });

  const cleanAssets = sanitizeList(raw.assets, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const name = cleanString(item.name);
    if (!name) return null;
    const qty = cleanNumber(item.quantity, 1, 0);
    const unitPrice = cleanNumber(item.unitPrice, 0, 0);
    const purchasePrice = cleanNumber(item.purchasePrice, unitPrice, 0);
    return {
      id: cleanId(item.id, `ast-${Date.now()}-${idx}`),
      name,
      category: cleanString(item.category, "other"),
      quantity: qty,
      unitPrice,
      purchasePrice,
      karat: (item.category === "gold" && ["24k", "21k", "18k"].includes(item.karat)) ? item.karat : "24k"
    };
  });

  const cleanChannels = sanitizeList(raw.channels, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const name = cleanString(item.name);
    if (!name) return null;
    return {
      id: cleanId(item.id, `chn-${Date.now()}-${idx}`),
      platform: cleanString(item.platform, "youtube"),
      name
    };
  });

  const cleanCreatorTx = sanitizeList(raw.creatorTransactions, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const title = cleanString(item.title);
    const amount = cleanNumber(item.amount, 0, 0);
    if (!title || amount <= 0) return null;
    return {
      id: cleanId(item.id, `ctx-${Date.now()}-${idx}`),
      channelId: cleanString(item.channelId),
      flow: item.flow === "expense" ? "expense" : "revenue",
      category: cleanString(item.category, "other"),
      title: title || "Creator Tx",
      amount,
      date: cleanDate(item.date)
    };
  });

  const cleanFreelanceTx = sanitizeList(raw.freelanceTransactions, (item, idx) => {
    if (!item || typeof item !== "object") return null;
    const title = cleanString(item.title);
    const amount = cleanNumber(item.amount, 0, 0);
    if (!title || amount <= 0) return null;
    return {
      id: cleanId(item.id, `flx-${Date.now()}-${idx}`),
      flow: item.flow === "expense" ? "expense" : "income",
      category: cleanString(item.category, "general"),
      title: title || "Freelance Tx",
      amount,
      date: cleanDate(item.date),
      currency: cleanString(item.currency) || undefined,
      foreignAmount: cleanNumber(item.foreignAmount) || undefined,
      exchangeRate: cleanNumber(item.exchangeRate) || undefined
    };
  });

  const cleanCategoriesArray = (arr, fallbackArr) => {
    if (!Array.isArray(arr)) return fallbackArr;
    const set = new Set();
    arr.forEach(c => {
      const s = cleanString(c);
      if (s) set.add(s);
    });
    return Array.from(set);
  };

  return {
    isDemoMode: Boolean(raw.isDemoMode),
    settings: {
      lang: ["ar", "en", "es"].includes(raw.settings?.lang) ? raw.settings.lang : def.settings.lang,
      currency: cleanString(raw.settings?.currency, def.settings.currency),
      includeOnline: raw.settings?.includeOnline !== false,
      autoSyncRates: raw.settings?.autoSyncRates !== false,
      freelanceRole: cleanString(raw.settings?.freelanceRole, def.settings.freelanceRole),
      privacyMode: Boolean(raw.settings?.privacyMode),
      pinEnabled: Boolean(raw.settings?.pinEnabled),
      pinCode: cleanString(raw.settings?.pinCode)
    },
    rates: {
      usd: cleanNumber(raw.rates?.usd, def.rates.usd, 0.01),
      eur: cleanNumber(raw.rates?.eur, def.rates.eur, 0.01),
      gold: cleanNumber(raw.rates?.gold, def.rates.gold, 1),
      lastSyncDate: cleanString(raw.rates?.lastSyncDate),
      lastSyncTime: cleanString(raw.rates?.lastSyncTime)
    },
    personalIncomes: cleanIncomes.length > 0 || Array.isArray(raw.personalIncomes) ? cleanIncomes : def.personalIncomes,
    personalObligations: cleanObligations.length > 0 || Array.isArray(raw.personalObligations) ? cleanObligations : def.personalObligations,
    assets: cleanAssets.length > 0 || Array.isArray(raw.assets) ? cleanAssets : def.assets,
    channels: cleanChannels.length > 0 || Array.isArray(raw.channels) ? cleanChannels : def.channels,
    creatorTransactions: cleanCreatorTx.length > 0 || Array.isArray(raw.creatorTransactions) ? cleanCreatorTx : def.creatorTransactions,
    freelanceCats: {
      income: cleanCategoriesArray(raw.freelanceCats?.income, def.freelanceCats.income),
      expense: cleanCategoriesArray(raw.freelanceCats?.expense, def.freelanceCats.expense)
    },
    customPersonalCats: {
      income: cleanCategoriesArray(raw.customPersonalCats?.income, def.customPersonalCats.income),
      expense: cleanCategoriesArray(raw.customPersonalCats?.expense, def.customPersonalCats.expense)
    },
    monthlyBudget: {
      enabled: Boolean(raw.monthlyBudget?.enabled),
      amount: cleanNumber(raw.monthlyBudget?.amount, 0, 0)
    },
    freelanceTransactions: cleanFreelanceTx.length > 0 || Array.isArray(raw.freelanceTransactions) ? cleanFreelanceTx : def.freelanceTransactions
  };
}

// دمج البيانات المحفوظة مع المخطط الافتراضي وتنقيتها
function mergeWithDefaultState(saved) {
  return sanitizeState(saved);
}

function openIndexedDB() {
  return new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      requestPersistentStorage();
      resolve(dbInstance);
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

// التعرف على ما إذا كانت البيانات المخزنة هي البيانات التجريبية القديمة الافتراضية
function isLegacySampleState(state) {
  if (!state || typeof state !== "object") return false;
  if (state.isDemoMode === true) return false;
  const isOldRole = state.settings?.freelanceRole === "مهندس برمجيات ومصمم واجهات Full-Stack";
  const hasSampleInc = Array.isArray(state.personalIncomes) && state.personalIncomes.some(i => i.id === "inc-1" && i.title === "راتب شركة التكنولوجيا الأساسي");
  const hasSampleExp = Array.isArray(state.personalObligations) && state.personalObligations.some(e => e.id === "exp-1" && e.title === "إيجار الشقة السكنية");
  return Boolean(isOldRole && hasSampleInc && hasSampleExp);
}

// تنظيف وتثبيت الحالة الفارغة عند الترحيل
async function persistCleanState(freshState) {
  try {
    if (!dbInstance) await openIndexedDB();
    if (dbInstance) {
      const tx = dbInstance.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(freshState, "app_state");
    }
  } catch (e) {
    console.warn("Clean state persist error:", e);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      settings: freshState.settings,
      rates: freshState.rates
    }));
  } catch (e) {
    console.warn("Clean state localStorage error:", e);
  }
}

async function loadStoredState() {
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("app_state");
      const result = await new Promise((res) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
      if (result) {
        if (isLegacySampleState(result)) {
          const fresh = getDefaultCleanState();
          await persistCleanState(fresh);
          return fresh;
        }
        return mergeWithDefaultState(result);
      }
    }
  } catch (e) {
    console.warn("IndexedDB read fallback:", e);
  }

  try {
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      const parsed = JSON.parse(local);
      if (isLegacySampleState(parsed)) {
        const fresh = getDefaultCleanState();
        await persistCleanState(fresh);
        return fresh;
      }
      return mergeWithDefaultState(parsed);
    }
  } catch (e) {
    console.warn("localStorage read fallback:", e);
  }

  return getDefaultCleanState();
}

async function persistState() {
  // 1. IndexedDB هو المخزن الأساسي (يتحمل مئات الميجابايت دون قيود الـ 5MB)
  try {
    if (!dbInstance) await openIndexedDB();
    if (dbInstance) {
      const tx = dbInstance.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(appState, "app_state");
    }
  } catch (e) {
    console.warn("IndexedDB write error:", e);
  }

  // 2. LocalStorage يُستخدم بحذر: حفظ الإعدادات الخفيفة دائماً، وحفظ البيانات الكاملة إن أمكن دون تعريض التطبيق للتوقف
  try {
    if (appState && appState.settings) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        settings: appState.settings,
        rates: appState.rates
      }));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    console.warn("localStorage quota warning (IndexedDB remains safe):", e);
  }
}
