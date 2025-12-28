// composables/use-crypto.ts
// ₿ Cryptocurrency Payment Integration - Bitcoin On-Chain & USDT
// Supports: BTCPay Server, Blockonomics, Tron, Polygon

import { ref, computed } from "vue";
import type {
  BitcoinPayment,
  USDTPayment,
  CryptoSettings,
  CryptoProvider,
  USDTNetwork,
  PaymentStatus,
  CurrencyCode,
} from "~/types";

// Singleton state for settings
const cryptoSettings = ref<CryptoSettings>({
  bitcoinEnabled: false,
  bitcoinProvider: "btcpay",
  bitcoinRequiredConfirmations: 1,
  usdtEnabled: false,
  usdtDefaultNetwork: "tron",
  usdtAddresses: {},
  usdtRequiredConfirmations: 1,
  isConfigured: false,
});

// Storage keys
const SETTINGS_KEY = "bitspace_crypto_settings";
const SENSITIVE_KEYS_KEY = "bitspace_crypto_keys";

export const useCrypto = () => {
  const security = useSecurity();
  const currencyHelper = useCurrency();

  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const currentBitcoinPayment = ref<BitcoinPayment | null>(null);
  const currentUSDTPayment = ref<USDTPayment | null>(null);

  // ============================================
  // 🔐 SECURE KEY STORAGE
  // ============================================

  const storeSensitiveKeys = async (keys: {
    btcpayApiKey?: string;
    blockonomicsApiKey?: string;
  }): Promise<boolean> => {
    try {
      if (security.isEncryptionEnabled.value && !security.isLocked.value) {
        return await security.encryptAndStore(SENSITIVE_KEYS_KEY, keys);
      }
      localStorage.setItem(SENSITIVE_KEYS_KEY, JSON.stringify(keys));
      return true;
    } catch (e) {
      console.error("Failed to store crypto keys:", e);
      return false;
    }
  };

  const getSensitiveKeys = async (): Promise<{
    btcpayApiKey?: string;
    blockonomicsApiKey?: string;
  } | null> => {
    try {
      if (security.isEncryptionEnabled.value) {
        if (security.isLocked.value) return null;
        return await security.retrieveAndDecrypt(SENSITIVE_KEYS_KEY);
      }
      const stored = localStorage.getItem(SENSITIVE_KEYS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("Failed to retrieve crypto keys:", e);
      return null;
    }
  };

  // ============================================
  // ⚙️ SETTINGS MANAGEMENT
  // ============================================

  const loadSettings = async (): Promise<CryptoSettings> => {
    if (typeof window === "undefined") return cryptoSettings.value;

    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        cryptoSettings.value = {
          ...cryptoSettings.value,
          ...JSON.parse(stored),
        };
      }

      const sensitiveKeys = await getSensitiveKeys();
      if (sensitiveKeys) {
        cryptoSettings.value.btcpayApiKey = sensitiveKeys.btcpayApiKey;
        cryptoSettings.value.blockonomicsApiKey =
          sensitiveKeys.blockonomicsApiKey;
      }
    } catch (e) {
      console.error("Failed to load crypto settings:", e);
    }
    return cryptoSettings.value;
  };

  const saveSettings = async (
    settings: Partial<CryptoSettings>
  ): Promise<boolean> => {
    try {
      cryptoSettings.value = { ...cryptoSettings.value, ...settings };

      const { btcpayApiKey, blockonomicsApiKey, ...nonSensitiveSettings } =
        cryptoSettings.value;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(nonSensitiveSettings));

      await storeSensitiveKeys({ btcpayApiKey, blockonomicsApiKey });
      return true;
    } catch (e) {
      console.error("Failed to save crypto settings:", e);
      return false;
    }
  };

  const isBitcoinConfigured = computed(() => {
    const s = cryptoSettings.value;
    if (!s.bitcoinEnabled) return false;

    switch (s.bitcoinProvider) {
      case "btcpay":
        return !!(s.btcpayServerUrl && s.btcpayApiKey && s.btcpayStoreId);
      case "blockonomics":
        return !!(s.blockonomicsApiKey && s.bitcoinXpub);
      case "manual":
        return !!(s.bitcoinAddress || s.bitcoinXpub);
      default:
        return false;
    }
  });

  const isUSDTConfigured = computed(() => {
    const s = cryptoSettings.value;
    if (!s.usdtEnabled) return false;
    const network = s.usdtDefaultNetwork;
    return !!s.usdtAddresses[network];
  });

  // ============================================
  // ₿ BITCOIN ON-CHAIN PAYMENTS
  // ============================================

  /**
   * Get current BTC exchange rate
   */
  const getBTCExchangeRate = async (
    currency: CurrencyCode
  ): Promise<number> => {
    try {
      // Use CoinGecko API for rate (free tier)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency.toLowerCase()}`
      );
      const data = await response.json();
      return data.bitcoin?.[currency.toLowerCase()] || 0;
    } catch (e) {
      console.error("Failed to fetch BTC rate:", e);
      // Fallback to approximate rate
      return 100000; // Default fallback
    }
  };

  /**
   * Create Bitcoin payment request via BTCPay Server
   */
  const createBitcoinInvoice = async (
    orderId: string,
    amountFiat: number,
    currency: CurrencyCode,
    description?: string
  ): Promise<BitcoinPayment | null> => {
    const settings = cryptoSettings.value;

    if (!isBitcoinConfigured.value) {
      error.value = "Bitcoin payments not configured";
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      if (settings.bitcoinProvider === "btcpay") {
        return await createBTCPayInvoice(
          orderId,
          amountFiat,
          currency,
          description
        );
      }
      throw new Error(`Unsupported provider: ${settings.bitcoinProvider}`);
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to create Bitcoin invoice";
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create invoice via BTCPay Server Green Field API
   * https://docs.btcpayserver.org/API/Greenfield/v1/
   */
  const createBTCPayInvoice = async (
    orderId: string,
    amountFiat: number,
    currency: CurrencyCode,
    description?: string
  ): Promise<BitcoinPayment> => {
    const settings = cryptoSettings.value;
    const baseUrl = settings.btcpayServerUrl?.replace(/\/$/, "");

    const response = await fetch(
      `${baseUrl}/api/v1/stores/${settings.btcpayStoreId}/invoices`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${settings.btcpayApiKey}`,
        },
        body: JSON.stringify({
          amount: amountFiat,
          currency: currency,
          metadata: {
            orderId,
            posApp: "bitspace-pos",
          },
          checkout: {
            speedPolicy:
              settings.bitcoinRequiredConfirmations === 1
                ? "LowSpeed"
                : settings.bitcoinRequiredConfirmations === 3
                ? "MediumSpeed"
                : "HighSpeed",
            paymentMethods: ["BTC-OnChain"],
            expirationMinutes: 30,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`BTCPay error: ${errorData}`);
    }

    const invoice = await response.json();

    // Get payment details
    const paymentMethodsResponse = await fetch(
      `${baseUrl}/api/v1/stores/${settings.btcpayStoreId}/invoices/${invoice.id}/payment-methods`,
      {
        headers: {
          Authorization: `token ${settings.btcpayApiKey}`,
        },
      }
    );

    const paymentMethods = await paymentMethodsResponse.json();
    const btcMethod = paymentMethods.find(
      (pm: { paymentMethod: string }) =>
        pm.paymentMethod === "BTC-OnChain" || pm.paymentMethod === "BTC"
    );

    const payment: BitcoinPayment = {
      id: invoice.id,
      orderId,
      address: btcMethod?.destination || "",
      amountBTC: btcMethod?.amount || "0",
      amountSats: Math.round(parseFloat(btcMethod?.amount || "0") * 100000000),
      amountFiat,
      currency,
      exchangeRate: btcMethod?.rate || 0,
      confirmations: 0,
      requiredConfirmations: settings.bitcoinRequiredConfirmations,
      status: "pending",
      expiresAt: invoice.expirationTime,
      createdAt: new Date().toISOString(),
    };

    currentBitcoinPayment.value = payment;
    return payment;
  };

  /**
   * Check Bitcoin payment status via BTCPay
   */
  const checkBitcoinPaymentStatus = async (
    invoiceId: string
  ): Promise<PaymentStatus> => {
    const settings = cryptoSettings.value;
    const baseUrl = settings.btcpayServerUrl?.replace(/\/$/, "");

    try {
      const response = await fetch(
        `${baseUrl}/api/v1/stores/${settings.btcpayStoreId}/invoices/${invoiceId}`,
        {
          headers: {
            Authorization: `token ${settings.btcpayApiKey}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch invoice status");

      const invoice = await response.json();

      // Map BTCPay status to our PaymentStatus
      switch (invoice.status) {
        case "New":
          return "pending";
        case "Processing":
          return "processing";
        case "Settled":
          return "completed";
        case "Expired":
          return "expired";
        case "Invalid":
          return "failed";
        default:
          return "pending";
      }
    } catch (e) {
      console.error("Failed to check BTC payment status:", e);
      return "pending";
    }
  };

  /**
   * Watch for Bitcoin payment completion
   */
  const watchBitcoinPayment = (invoiceId: string, onPaid: () => void) => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkPayment = async () => {
      const status = await checkBitcoinPaymentStatus(invoiceId);

      if (currentBitcoinPayment.value) {
        currentBitcoinPayment.value.status = status;
      }

      if (status === "completed") {
        if (pollInterval) clearInterval(pollInterval);
        onPaid();
      } else if (status === "expired" || status === "failed") {
        if (pollInterval) clearInterval(pollInterval);
      }
    };

    // Poll every 5 seconds
    pollInterval = setInterval(checkPayment, 5000);
    checkPayment(); // Initial check

    // Return cleanup function
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  };

  // ============================================
  // 💵 USDT PAYMENTS
  // ============================================

  /**
   * Get USDT exchange rate (USD to fiat)
   */
  const getUSDTExchangeRate = async (
    currency: CurrencyCode
  ): Promise<number> => {
    try {
      // USDT = 1 USD, so we just need USD/fiat rate
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=${currency.toLowerCase()}`
      );
      const data = await response.json();
      return data.tether?.[currency.toLowerCase()] || 1;
    } catch (e) {
      console.error("Failed to fetch USDT rate:", e);
      return 1;
    }
  };

  /**
   * Get estimated network fee for USDT transfer
   */
  const getNetworkFee = (network: USDTNetwork): string => {
    switch (network) {
      case "tron":
        return "~1-2 TRX (~$0.10)";
      case "polygon":
        return "~0.01 MATIC (~$0.01)";
      case "ethereum":
        return "~$5-50 (variable)";
      case "arbitrum":
        return "~$0.10-0.50";
      default:
        return "Unknown";
    }
  };

  /**
   * Create USDT payment request
   */
  const createUSDTInvoice = async (
    orderId: string,
    amountFiat: number,
    currency: CurrencyCode,
    network?: USDTNetwork
  ): Promise<USDTPayment | null> => {
    const settings = cryptoSettings.value;
    const selectedNetwork = network || settings.usdtDefaultNetwork;

    if (!isUSDTConfigured.value) {
      error.value = "USDT payments not configured";
      return null;
    }

    const address = settings.usdtAddresses[selectedNetwork];
    if (!address) {
      error.value = `No USDT address configured for ${selectedNetwork}`;
      return null;
    }

    isLoading.value = true;
    error.value = null;

    try {
      // Get exchange rate
      const exchangeRate = await getUSDTExchangeRate(currency);
      const amountUSDT = (amountFiat / exchangeRate).toFixed(2);

      const payment: USDTPayment = {
        id: crypto.randomUUID(),
        orderId,
        network: selectedNetwork,
        address,
        amountUSDT,
        amountFiat,
        currency,
        exchangeRate,
        confirmations: 0,
        requiredConfirmations: settings.usdtRequiredConfirmations,
        status: "pending",
        networkFee: getNetworkFee(selectedNetwork),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
        createdAt: new Date().toISOString(),
      };

      currentUSDTPayment.value = payment;
      return payment;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to create USDT invoice";
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Check USDT payment on Tron network
   */
  const checkTronUSDTPayment = async (
    address: string,
    expectedAmount: string,
    sinceTimestamp: number
  ): Promise<{ paid: boolean; txHash: string | undefined }> => {
    try {
      // TronGrid API to check TRC20 transfers
      // USDT contract on Tron: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
      const response = await fetch(
        `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_confirmed=true&limit=20&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
      );

      if (!response.ok) return { paid: false, txHash: undefined };

      const data = await response.json();
      const transactions = data.data || [];

      // Find matching transaction
      for (const tx of transactions) {
        const txTime = tx.block_timestamp;
        const toAddress = tx.to;
        const value = parseFloat(tx.value) / 1000000; // USDT has 6 decimals

        if (
          txTime >= sinceTimestamp &&
          toAddress.toLowerCase() === address.toLowerCase() &&
          Math.abs(value - parseFloat(expectedAmount)) < 0.01
        ) {
          return { paid: true, txHash: tx.transaction_id };
        }
      }

      return { paid: false, txHash: undefined };
    } catch (e) {
      console.error("Failed to check Tron USDT:", e);
      return { paid: false, txHash: undefined };
    }
  };

  /**
   * Watch for USDT payment
   */
  const watchUSDTPayment = (
    payment: USDTPayment,
    onPaid: (txHash: string) => void
  ) => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const sinceTimestamp = new Date(payment.createdAt).getTime();

    const checkPayment = async () => {
      let result = { paid: false, txHash: undefined as string | undefined };

      if (payment.network === "tron") {
        result = await checkTronUSDTPayment(
          payment.address,
          payment.amountUSDT,
          sinceTimestamp
        );
      }
      // Add Polygon/ETH checks here if needed

      if (result.paid && result.txHash) {
        if (currentUSDTPayment.value) {
          currentUSDTPayment.value.status = "completed";
          currentUSDTPayment.value.txHash = result.txHash;
        }
        if (pollInterval) clearInterval(pollInterval);
        onPaid(result.txHash);
      }
    };

    // Poll every 10 seconds (blockchain is slower)
    pollInterval = setInterval(checkPayment, 10000);
    checkPayment(); // Initial check

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  };

  // ============================================
  // 🔧 TEST CONNECTION
  // ============================================

  const testBTCPayConnection = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    const settings = cryptoSettings.value;

    if (
      !settings.btcpayServerUrl ||
      !settings.btcpayApiKey ||
      !settings.btcpayStoreId
    ) {
      return {
        success: false,
        message: "BTCPay Server URL, API Key, and Store ID are required",
      };
    }

    try {
      const baseUrl = settings.btcpayServerUrl.replace(/\/$/, "");
      const response = await fetch(
        `${baseUrl}/api/v1/stores/${settings.btcpayStoreId}`,
        {
          headers: {
            Authorization: `token ${settings.btcpayApiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`BTCPay returned ${response.status}`);
      }

      const store = await response.json();
      return { success: true, message: `Connected to store: ${store.name}` };
    } catch (e) {
      return {
        success: false,
        message: e instanceof Error ? e.message : "Connection failed",
      };
    }
  };

  // ============================================
  // 🧹 CLEANUP
  // ============================================

  const reset = () => {
    currentBitcoinPayment.value = null;
    currentUSDTPayment.value = null;
    error.value = null;
  };

  return {
    // Settings
    settings: cryptoSettings,
    loadSettings,
    saveSettings,

    // Status
    isLoading,
    error,
    isBitcoinConfigured,
    isUSDTConfigured,

    // Bitcoin
    currentBitcoinPayment,
    createBitcoinInvoice,
    checkBitcoinPaymentStatus,
    watchBitcoinPayment,
    getBTCExchangeRate,

    // USDT
    currentUSDTPayment,
    createUSDTInvoice,
    watchUSDTPayment,
    getUSDTExchangeRate,
    getNetworkFee,

    // Testing
    testBTCPayConnection,

    // Cleanup
    reset,
  };
};
