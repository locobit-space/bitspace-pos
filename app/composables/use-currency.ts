// composables/use-currency.ts
// 💰 Multi-Currency System - LAK, THB, USD, BTC/SATS

import { ref, computed, watch } from "vue";
import type { Currency, CurrencyCode, ExchangeRate, MultiPrice } from "~/types";

// Supported currencies
const CURRENCIES: Record<CurrencyCode, Currency> = {
  LAK: { code: "LAK", name: "Lao Kip", symbol: "₭", decimals: 0 },
  THB: { code: "THB", name: "Thai Baht", symbol: "฿", decimals: 2 },
  USD: { code: "USD", name: "US Dollar", symbol: "$", decimals: 2 },
  BTC: { code: "BTC", name: "Bitcoin", symbol: "₿", decimals: 8 },
  SATS: { code: "SATS", name: "Satoshis", symbol: "sats", decimals: 0 },
};

// Currency codes for simple arrays (POS currency switcher)
export const CURRENCY_CODES: CurrencyCode[] = ["SATS", "LAK", "THB", "USD"];

// Currency options for select dropdowns (with labels)
export const CURRENCY_OPTIONS = [
  { value: "LAK", label: "🇱🇦 LAK - Lao Kip" },
  { value: "USD", label: "🇺🇸 USD - US Dollar" },
  { value: "THB", label: "🇹🇭 THB - Thai Baht" },
  { value: "BTC", label: "₿ BTC - Bitcoin" },
  { value: "SATS", label: "⚡ SATS - Satoshis" },
];

// POS-specific currency options (most used first)
export const POS_CURRENCY_OPTIONS: CurrencyCode[] = [
  "SATS",
  "LAK",
  "THB",
  "USD",
];

// Price API sources
const PRICE_APIS = {
  blockchain: "https://blockchain.info/ticker",
  fawazahmed:
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  mempool: "https://mempool.space/api/v1/prices",
};

// ============================================
// SHARED STATE (Singleton pattern)
// All useCurrency() calls share the same state
// ============================================
const baseCurrency = ref<CurrencyCode>("LAK");
const displayCurrency = ref<CurrencyCode>("LAK");
const exchangeRates = ref<Map<string, ExchangeRate>>(new Map());
const btcPrice = ref<number>(0); // BTC price in USD
const btcPriceLAK = ref<number>(0); // BTC price in LAK
const btcPriceTHB = ref<number>(0); // BTC price in THB
const isLoading = ref(false);
const lastUpdate = ref<string | null>(null);
const error = ref<string | null>(null);
const isInitialized = ref(false);

// Auto-refresh interval (every 5 minutes)
let refreshInterval: ReturnType<typeof setInterval> | null = null;

export const useCurrency = () => {
  /**
   * Initialize currency system and fetch rates
   */
  const init = async (defaultCurrency: CurrencyCode = "LAK") => {
    // Skip if already initialized with rates
    if (isInitialized.value && exchangeRates.value.size > 0) {
      console.log("💱 Currency already initialized, skipping...");
      return;
    }

    baseCurrency.value = defaultCurrency;
    displayCurrency.value = defaultCurrency;
    await refreshRates();
    startAutoRefresh();
    isInitialized.value = true;
  };

  /**
   * Fetch exchange rates from APIs
   */
  const refreshRates = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // Fetch BTC prices from blockchain.info (has LAK and THB)
      const btcPrices = await fetchBTCPrices();

      // Fetch fiat exchange rates from fawazahmed API
      const fiatRates = await fetchFiatRates();

      const now = new Date().toISOString();

      // Set BTC price in various currencies
      btcPrice.value = btcPrices.USD || 100000;
      btcPriceLAK.value =
        btcPrices.LAK || btcPrice.value * (fiatRates.lak || 20500);
      btcPriceTHB.value =
        btcPrices.THB || btcPrice.value * (fiatRates.thb || 35);

      // BTC conversions
      setRate("BTC", "USD", btcPrice.value, "api");
      setRate("BTC", "LAK", btcPriceLAK.value, "api");
      setRate("BTC", "THB", btcPriceTHB.value, "api");
      setRate("BTC", "SATS", 100000000, "manual"); // 1 BTC = 100M sats

      // USD to fiat rates
      const usdToLak = fiatRates.lak || 20500;
      const usdToThb = fiatRates.thb || 35;

      setRate("USD", "LAK", usdToLak, "api");
      setRate("USD", "THB", usdToThb, "api");
      setRate("THB", "LAK", usdToLak / usdToThb, "api");

      // SATS to all currencies (1 sat = BTC / 100000000)
      const satsToUsd = btcPrice.value / 100000000;
      const satsToLak = btcPriceLAK.value / 100000000;
      const satsToThb = btcPriceTHB.value / 100000000;

      setRate("SATS", "USD", satsToUsd, "api");
      setRate("SATS", "LAK", satsToLak, "api");
      setRate("SATS", "THB", satsToThb, "api");
      setRate("SATS", "BTC", 1 / 100000000, "manual");

      // Fiat to SATS (inverse) - HOW MANY SATS PER 1 FIAT UNIT
      const lakToSats = 1 / satsToLak; // e.g., 1 LAK = 0.05 sats
      const thbToSats = 1 / satsToThb;
      const usdToSats = 1 / satsToUsd;

      setRate("LAK", "SATS", lakToSats, "api");
      setRate("THB", "SATS", thbToSats, "api");
      setRate("USD", "SATS", usdToSats, "api");

      lastUpdate.value = now;
      console.log("💱 Exchange rates updated:", {
        btcUsd: btcPrice.value,
        btcLak: btcPriceLAK.value,
        usdToLak,
        satsToLak: satsToLak.toFixed(6),
        lakToSats: lakToSats.toFixed(6),
        "47000 LAK in sats": Math.round(47000 * lakToSats),
      });
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch rates";
      console.error("Currency refresh error:", e);

      // Set fallback rates if API fails
      setFallbackRates();
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Set fallback rates when APIs fail
   */
  const setFallbackRates = () => {
    const fallbackBtcUsd = 100000;
    const fallbackUsdLak = 20500;
    const fallbackUsdThb = 35;

    btcPrice.value = fallbackBtcUsd;
    btcPriceLAK.value = fallbackBtcUsd * fallbackUsdLak;
    btcPriceTHB.value = fallbackBtcUsd * fallbackUsdThb;

    setRate("BTC", "USD", fallbackBtcUsd, "manual");
    setRate("BTC", "LAK", btcPriceLAK.value, "manual");
    setRate("BTC", "THB", btcPriceTHB.value, "manual");
    setRate("BTC", "SATS", 100000000, "manual");

    setRate("USD", "LAK", fallbackUsdLak, "manual");
    setRate("USD", "THB", fallbackUsdThb, "manual");
    setRate("THB", "LAK", fallbackUsdLak / fallbackUsdThb, "manual");

    const satsToLak = btcPriceLAK.value / 100000000;
    const satsToThb = btcPriceTHB.value / 100000000;
    const satsToUsd = fallbackBtcUsd / 100000000;

    setRate("SATS", "USD", satsToUsd, "manual");
    setRate("SATS", "LAK", satsToLak, "manual");
    setRate("SATS", "THB", satsToThb, "manual");
    setRate("SATS", "BTC", 1 / 100000000, "manual");

    setRate("LAK", "SATS", 1 / satsToLak, "manual");
    setRate("THB", "SATS", 1 / satsToThb, "manual");
    setRate("USD", "SATS", 1 / satsToUsd, "manual");
  };

  /**
   * Set exchange rate
   */
  const setRate = (
    from: CurrencyCode,
    to: CurrencyCode,
    rate: number,
    source: "api" | "manual" | "oracle"
  ) => {
    const key = `${from}-${to}`;
    exchangeRates.value.set(key, {
      from,
      to,
      rate,
      source,
      updatedAt: new Date().toISOString(),
    });

    // Also set inverse
    const inverseKey = `${to}-${from}`;
    if (!exchangeRates.value.has(inverseKey)) {
      exchangeRates.value.set(inverseKey, {
        from: to,
        to: from,
        rate: 1 / rate,
        source,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  /**
   * Get exchange rate between two currencies
   */
  const getRate = (from: CurrencyCode, to: CurrencyCode): number => {
    if (from === to) return 1;

    const key = `${from}-${to}`;
    const rate = exchangeRates.value.get(key);

    if (rate) return rate.rate;

    // Try to calculate through USD
    const fromUsd = exchangeRates.value.get(`${from}-USD`)?.rate;
    const usdTo = exchangeRates.value.get(`USD-${to}`)?.rate;

    if (fromUsd && usdTo) {
      return fromUsd * usdTo;
    }

    // Try through SATS
    const fromSats = exchangeRates.value.get(`${from}-SATS`)?.rate;
    const satsTo = exchangeRates.value.get(`SATS-${to}`)?.rate;

    if (fromSats && satsTo) {
      return fromSats * satsTo;
    }

    console.warn(
      `No rate found for ${from} to ${to}, using fallback calculation`
    );

    // Last resort: calculate through BTC
    const fromBtc =
      exchangeRates.value.get(`${from}-BTC`)?.rate ||
      1 / (exchangeRates.value.get(`BTC-${from}`)?.rate || 1);
    const btcTo = exchangeRates.value.get(`BTC-${to}`)?.rate || 1;

    return fromBtc * btcTo;
  };

  /**
   * Convert amount between currencies
   */
  const convert = (
    amount: number,
    from: CurrencyCode,
    to: CurrencyCode
  ): number => {
    const rate = getRate(from, to);
    return amount * rate;
  };

  /**
   * Convert amount to SATS (for Lightning payments)
   */
  const toSats = (amount: number, from: CurrencyCode): number => {
    if (from === "SATS") return Math.round(amount);
    if (from === "BTC") return Math.round(amount * 100000000);

    // If rates not loaded yet, use fallback calculation
    if (exchangeRates.value.size === 0) {
      console.warn("Exchange rates not loaded yet, using fallback for toSats");
      // Fallback rates: 1 BTC = $100,000, 1 USD = 20,500 LAK
      const fallbackBtcUsd = 100000;
      const fallbackUsdLak = 20500;
      const fallbackUsdThb = 35;
      const satsPerBtc = 100000000;

      if (from === "USD") {
        return Math.round((amount / fallbackBtcUsd) * satsPerBtc);
      } else if (from === "LAK") {
        const usd = amount / fallbackUsdLak;
        return Math.round((usd / fallbackBtcUsd) * satsPerBtc);
      } else if (from === "THB") {
        const usd = amount / fallbackUsdThb;
        return Math.round((usd / fallbackBtcUsd) * satsPerBtc);
      }
    }

    const rate = getRate(from, "SATS");
    return Math.round(amount * rate);
  };

  /**
   * Convert SATS to fiat
   */
  const fromSats = (sats: number, to: CurrencyCode): number => {
    if (to === "SATS") return sats;
    if (to === "BTC") return sats / 100000000;

    return convert(sats, "SATS", to);
  };

  /**
   * Format currency for display
   */
  const format = (
    amount: number,
    currency: CurrencyCode = displayCurrency.value,
    options?: { showSymbol?: boolean; showCode?: boolean }
  ): string => {
    const curr = CURRENCIES[currency];
    if (!curr) return `${amount}`;

    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: Math.min(curr.decimals, 2),
      maximumFractionDigits: curr.decimals,
    }).format(amount);

    if (options?.showCode) {
      return `${formatted} ${currency}`;
    }

    if (options?.showSymbol !== false) {
      return currency === "SATS"
        ? `${formatted} sats`
        : `${curr.symbol}${formatted}`;
    }

    return formatted;
  };

  /**
   * Format with both fiat and sats
   */
  const formatDual = (
    amount: number,
    currency: CurrencyCode
  ): { fiat: string; sats: string } => {
    const sats = toSats(amount, currency);
    return {
      fiat: format(amount, currency),
      sats: format(sats, "SATS"),
    };
  };

  /**
   * Create multi-price object for a product
   */
  const createMultiPrice = (
    baseAmount: number,
    baseCurrency: CurrencyCode
  ): MultiPrice => {
    return {
      LAK: Math.round(convert(baseAmount, baseCurrency, "LAK")),
      THB: Math.round(convert(baseAmount, baseCurrency, "THB") * 100) / 100,
      USD: Math.round(convert(baseAmount, baseCurrency, "USD") * 100) / 100,
      BTC: convert(baseAmount, baseCurrency, "BTC"),
      SATS: toSats(baseAmount, baseCurrency),
    };
  };

  /**
   * Get price in preferred currency from MultiPrice
   */
  const getPriceInCurrency = (
    prices: MultiPrice,
    currency: CurrencyCode
  ): number => {
    return prices[currency] || 0;
  };

  // ============================================
  // API Fetch Functions
  // ============================================

  /**
   * Fetch BTC prices from blockchain.info ticker
   * This API provides BTC price in multiple currencies including LAK and THB
   */
  const fetchBTCPrices = async (): Promise<Record<string, number>> => {
    try {
      const response = await fetch(PRICE_APIS.blockchain);
      if (response.ok) {
        const data = await response.json();
        // blockchain.info returns: { USD: { last: 100000 }, THB: { last: 3500000 }, ... }
        return {
          USD: data.USD?.last || 100000,
          THB: data.THB?.last || 3500000,
          // LAK is not directly available, we'll calculate it
        };
      }
    } catch (e) {
      console.warn("blockchain.info API failed:", e);
    }

    // Fallback to mempool.space
    try {
      const response = await fetch(PRICE_APIS.mempool);
      if (response.ok) {
        const data = await response.json();
        return { USD: data.USD || 100000 };
      }
    } catch (e) {
      console.warn("mempool.space API failed:", e);
    }

    return { USD: 100000 }; // Fallback
  };

  /**
   * Fetch fiat exchange rates from fawazahmed currency API
   * Returns rates relative to USD
   */
  const fetchFiatRates = async (): Promise<Record<string, number>> => {
    try {
      const response = await fetch(PRICE_APIS.fawazahmed);
      if (response.ok) {
        const data = await response.json();
        // API returns: { usd: { lak: 20500, thb: 35, ... } }
        return {
          lak: data.usd?.lak || 20500,
          thb: data.usd?.thb || 35,
          btc: data.usd?.btc || 0.00001, // USD to BTC rate
        };
      }
    } catch (e) {
      console.warn("fawazahmed currency API failed:", e);
    }

    // Return approximate rates
    return { lak: 20500, thb: 35 };
  };

  // ============================================
  // Auto-refresh
  // ============================================

  const startAutoRefresh = (intervalMs: number = 300000) => {
    // 5 minutes
    stopAutoRefresh();
    refreshInterval = setInterval(refreshRates, intervalMs);
  };

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  // ============================================
  // Computed
  // ============================================

  const currencies = computed(() => Object.values(CURRENCIES));

  const currentCurrency = computed(() => CURRENCIES[displayCurrency.value]);

  const btcPriceFormatted = computed(() => format(btcPrice.value, "USD"));

  const satPriceInLak = computed(() => {
    const rate = getRate("SATS", "LAK");
    return format(rate, "LAK");
  });

  // Cleanup on unmount
  watch(
    () => {},
    () => {},
    {
      flush: "post",
      onTrigger: () => {
        stopAutoRefresh();
      },
    }
  );

  return {
    // State
    baseCurrency,
    displayCurrency,
    exchangeRates,
    btcPrice,
    btcPriceLAK,
    btcPriceTHB,
    isLoading,
    lastUpdate,
    error,
    isInitialized,

    // Computed
    currencies,
    currentCurrency,
    btcPriceFormatted,
    satPriceInLak,

    // Methods
    init,
    refreshRates,
    getRate,
    convert,
    toSats,
    fromSats,
    format,
    formatCurrency: format, // Alias for backward compatibility
    formatDual,
    createMultiPrice,
    getPriceInCurrency,
    setRate,
    startAutoRefresh,
    stopAutoRefresh,
  };
};
