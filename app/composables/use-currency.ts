// composables/use-currency.ts
// 💰 Multi-Currency System - LAK, THB, USD, BTC/SATS

import { ref, computed, watch } from 'vue';
import type { Currency, CurrencyCode, ExchangeRate, MultiPrice } from '~/types';

// Supported currencies
const CURRENCIES: Record<CurrencyCode, Currency> = {
  LAK: { code: 'LAK', name: 'Lao Kip', symbol: '₭', decimals: 0 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 },
  BTC: { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8 },
  SATS: { code: 'SATS', name: 'Satoshis', symbol: 'sats', decimals: 0 },
};

// Price API sources
const PRICE_APIS = {
  coingecko: 'https://api.coingecko.com/api/v3/simple/price',
  yadio: 'https://api.yadio.io/exrates/BTC', // Good for LAK
  mempool: 'https://mempool.space/api/v1/prices',
};

export const useCurrency = () => {
  // State
  const baseCurrency = ref<CurrencyCode>('LAK');
  const displayCurrency = ref<CurrencyCode>('LAK');
  const exchangeRates = ref<Map<string, ExchangeRate>>(new Map());
  const btcPrice = ref<number>(0); // BTC price in USD
  const isLoading = ref(false);
  const lastUpdate = ref<string | null>(null);
  const error = ref<string | null>(null);

  // Auto-refresh interval (every 5 minutes)
  let refreshInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize currency system and fetch rates
   */
  const init = async (defaultCurrency: CurrencyCode = 'LAK') => {
    baseCurrency.value = defaultCurrency;
    displayCurrency.value = defaultCurrency;
    await refreshRates();
    startAutoRefresh();
  };

  /**
   * Fetch exchange rates from APIs
   */
  const refreshRates = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      // Fetch BTC/USD price
      const btcUsd = await fetchBTCPrice();
      btcPrice.value = btcUsd;

      // Fetch fiat exchange rates
      const fiatRates = await fetchFiatRates();

      // Build exchange rate map
      const now = new Date().toISOString();

      // BTC to all currencies
      setRate('BTC', 'USD', btcUsd, 'api');
      setRate('BTC', 'SATS', 100_000_000, 'manual'); // 1 BTC = 100M sats
      
      // Fiat conversions (approximate rates - use real API in production)
      const usdToLak = fiatRates.LAK || 20500; // ~20,500 LAK per USD
      const usdToThb = fiatRates.THB || 35; // ~35 THB per USD

      setRate('USD', 'LAK', usdToLak, 'api');
      setRate('USD', 'THB', usdToThb, 'api');
      setRate('THB', 'LAK', usdToLak / usdToThb, 'api');

      // BTC to fiat
      setRate('BTC', 'LAK', btcUsd * usdToLak, 'api');
      setRate('BTC', 'THB', btcUsd * usdToThb, 'api');

      // SATS to fiat
      const satsToUsd = btcUsd / 100_000_000;
      setRate('SATS', 'USD', satsToUsd, 'api');
      setRate('SATS', 'LAK', satsToUsd * usdToLak, 'api');
      setRate('SATS', 'THB', satsToUsd * usdToThb, 'api');

      lastUpdate.value = now;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch rates';
      console.error('Currency refresh error:', e);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Set exchange rate
   */
  const setRate = (
    from: CurrencyCode, 
    to: CurrencyCode, 
    rate: number, 
    source: 'api' | 'manual' | 'oracle'
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
    exchangeRates.value.set(inverseKey, {
      from: to,
      to: from,
      rate: 1 / rate,
      source,
      updatedAt: new Date().toISOString(),
    });
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
    const toUsd = exchangeRates.value.get(`USD-${to}`)?.rate;
    
    if (fromUsd && toUsd) {
      return fromUsd * toUsd;
    }

    console.warn(`No rate found for ${from} to ${to}`);
    return 0;
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
    if (from === 'SATS') return Math.round(amount);
    if (from === 'BTC') return Math.round(amount * 100_000_000);
    
    return Math.round(convert(amount, from, 'SATS'));
  };

  /**
   * Convert SATS to fiat
   */
  const fromSats = (sats: number, to: CurrencyCode): number => {
    if (to === 'SATS') return sats;
    if (to === 'BTC') return sats / 100_000_000;
    
    return convert(sats, 'SATS', to);
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
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: Math.min(curr.decimals, 2),
      maximumFractionDigits: curr.decimals,
    }).format(amount);

    if (options?.showCode) {
      return `${formatted} ${currency}`;
    }

    if (options?.showSymbol !== false) {
      return currency === 'SATS' 
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
      sats: format(sats, 'SATS'),
    };
  };

  /**
   * Create multi-price object for a product
   */
  const createMultiPrice = (baseAmount: number, baseCurrency: CurrencyCode): MultiPrice => {
    return {
      LAK: Math.round(convert(baseAmount, baseCurrency, 'LAK')),
      THB: Math.round(convert(baseAmount, baseCurrency, 'THB') * 100) / 100,
      USD: Math.round(convert(baseAmount, baseCurrency, 'USD') * 100) / 100,
      BTC: convert(baseAmount, baseCurrency, 'BTC'),
      SATS: toSats(baseAmount, baseCurrency),
    };
  };

  /**
   * Get price in preferred currency from MultiPrice
   */
  const getPriceInCurrency = (prices: MultiPrice, currency: CurrencyCode): number => {
    return prices[currency] || 0;
  };

  // ============================================
  // API Fetch Functions
  // ============================================

  const fetchBTCPrice = async (): Promise<number> => {
    try {
      // Try mempool.space first (fastest)
      const response = await fetch(PRICE_APIS.mempool);
      if (response.ok) {
        const data = await response.json();
        return data.USD;
      }
    } catch {
      console.warn('Mempool API failed, trying CoinGecko');
    }

    try {
      // Fallback to CoinGecko
      const response = await fetch(
        `${PRICE_APIS.coingecko}?ids=bitcoin&vs_currencies=usd`
      );
      if (response.ok) {
        const data = await response.json();
        return data.bitcoin.usd;
      }
    } catch {
      console.warn('CoinGecko API failed');
    }

    // Return cached or default
    return btcPrice.value || 100000; // Fallback
  };

  const fetchFiatRates = async (): Promise<Record<string, number>> => {
    try {
      // Use a free exchange rate API
      // In production, use a reliable source
      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/USD'
      );
      if (response.ok) {
        const data = await response.json();
        return {
          LAK: data.rates?.LAK || 20500,
          THB: data.rates?.THB || 35,
        };
      }
    } catch {
      console.warn('Exchange rate API failed');
    }

    // Return approximate rates
    return { LAK: 20500, THB: 35 };
  };

  // ============================================
  // Auto-refresh
  // ============================================

  const startAutoRefresh = (intervalMs: number = 300000) => { // 5 minutes
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

  const btcPriceFormatted = computed(() => format(btcPrice.value, 'USD'));

  const satPriceInLak = computed(() => {
    const rate = getRate('SATS', 'LAK');
    return format(rate, 'LAK');
  });

  // Cleanup on unmount
  watch(() => {}, () => {}, { 
    flush: 'post',
    onTrigger: () => {
      stopAutoRefresh();
    }
  });

  return {
    // State
    baseCurrency,
    displayCurrency,
    exchangeRates,
    btcPrice,
    isLoading,
    lastUpdate,
    error,

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
