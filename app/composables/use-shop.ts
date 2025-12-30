// composables/use-shop.ts
// 🏪 Shop & Branch Configuration Management
// Stores shop settings in Nostr (kind: 30078)

import type {
  Branch,
  StoreSettings,
  GeneralSettings,
  LightningSettings,
  SecuritySettings,
  ShopVisibility,
  ShopType,
} from "~/types";

/**
 * Feature flags for enabling/disabling shop modules
 */
export interface EnabledFeatures {
  // Core (always on)
  products: boolean;
  orders: boolean;
  pos: boolean;
  reports: boolean;
  settings: boolean;
  // Optional features
  customers: boolean;
  inventory: boolean;
  kitchen: boolean;
  recipes: boolean;
  ingredients: boolean;
  memberships: boolean;
  accounting: boolean;
  invoicing: boolean;
  delivery: boolean;
  loyalty: boolean;
  contracts: boolean;
  employees: boolean;
  deviceSync: boolean;
}

/**
 * Get default features based on shop type
 */
export function getDefaultFeatures(shopType: ShopType): EnabledFeatures {
  const base: EnabledFeatures = {
    products: true,
    orders: true,
    pos: true,
    reports: true,
    settings: true,
    customers: true,
    inventory: true,
    kitchen: false,
    recipes: false,
    ingredients: false,
    memberships: false,
    accounting: false,
    invoicing: false,
    delivery: false,
    loyalty: false,
    contracts: false,
    employees: false,
    deviceSync: false,
  };

  // Customize based on shop type
  switch (shopType) {
    case "restaurant":
    case "cafe":
      return { ...base, kitchen: true, recipes: true, ingredients: true };
    case "gym":
      return { ...base, memberships: true, inventory: false, kitchen: false };
    case "karaoke":
      return { ...base, kitchen: false, loyalty: true };
    case "garage":
      return { ...base, invoicing: true, inventory: true };
    case "service":
      return { ...base, invoicing: true, inventory: false };
    case "enterprise":
      return {
        ...base,
        customers: true,
        inventory: true,
        kitchen: true,
        recipes: true,
        ingredients: true,
        memberships: true,
        accounting: true,
        invoicing: true,
        delivery: true,
        loyalty: true,
        contracts: true,
        deviceSync: false,
      };
    default:
      return base;
  }
}

export interface ShopConfig {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string;
  currency: string;
  timezone: string;
  language: string;
  defaultBranchId?: string;
  taxRate: number;
  tipEnabled: boolean;
  receiptFooter?: string;
  // Shop type & visibility
  visibility: ShopVisibility;
  shopType: ShopType;
  // Feature flags
  enabledFeatures: EnabledFeatures;
  // Marketplace fields
  marketplaceDescription?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
  };
  // Analytics & Tracking
  tags?: string[]; // Custom tags like "coffee", "thai-food", "retail"
  platformTag?: string; // Platform identifier, defaults to "bnos.space"
}

// Singleton state
const shopConfig = ref<ShopConfig | null>(null);
const currentBranch = ref<Branch | null>(null);
const isLoading = ref(false);
const isConfigured = ref(false);
const error = ref<string | null>(null);

export function useShop() {
  const nostrData = useNostrData();
  const productsStore = useProductsStore();

  // Check if shop is configured
  const hasShopConfig = computed(() => !!shopConfig.value?.name);
  const hasBranches = computed(() => productsStore.branches.value.length > 0);
  const isSetupComplete = computed(
    () => hasShopConfig.value && hasBranches.value
  );

  // Get all branches from products store
  const branches = computed(() => productsStore.branches.value);

  // Convert StoreSettings to ShopConfig
  function storeSettingsToShopConfig(settings: StoreSettings): ShopConfig {
    const shopType: ShopType = "other";
    return {
      name: settings.general?.storeName || "",
      address: settings.general?.storeAddress,
      phone: settings.general?.storePhone,
      email: settings.general?.storeEmail,
      logo: settings.general?.storeLogo,
      currency: settings.general?.defaultCurrency || "LAK",
      timezone: settings.general?.timezone || "Asia/Vientiane",
      language: settings.general?.language || "en-US",
      taxRate: settings.general?.taxRate || 0,
      tipEnabled: settings.general?.tipEnabled || false,
      receiptFooter: settings.general?.receiptFooter,
      // Shop type & visibility defaults
      visibility: "private",
      shopType,
      enabledFeatures:
        (settings.general?.enabledFeatures as unknown as EnabledFeatures) ||
        getDefaultFeatures(shopType),
    };
  }

  // Convert ShopConfig to GeneralSettings
  function shopConfigToGeneralSettings(config: ShopConfig): GeneralSettings {
    return {
      storeName: config.name,
      storeAddress: config.address,
      storePhone: config.phone,
      storeEmail: config.email,
      storeLogo: config.logo,
      defaultCurrency: config.currency as
        | "LAK"
        | "USD"
        | "THB"
        | "BTC"
        | "SATS",
      timezone: config.timezone,
      language: config.language,
      taxRate: config.taxRate,
      tipEnabled: config.tipEnabled,
      tipSuggestions: [10, 15, 20],
      receiptFooter: config.receiptFooter,
      // @ts-ignore - Record<string, boolean> vs EnabledFeatures match
      enabledFeatures: config.enabledFeatures,
    };
  }

  // Default lightning settings
  const defaultLightningSettings: LightningSettings = {
    provider: "lnbits",
    isConfigured: false,
  };

  // Default security settings
  const defaultSecuritySettings: SecuritySettings = {
    dataEncryption: true,
    autoLockTimeout: 30,
    requirePinForRefunds: true,
    requirePinForVoids: true,
    requirePinForDiscounts: false,
    auditLogging: true,
  };

  // Load shop config from Nostr
  async function loadShopConfig(): Promise<ShopConfig | null> {
    isLoading.value = true;
    error.value = null;

    try {
      // Try to get from Nostr (STORE_SETTINGS kind)
      const settings = await nostrData.getSettings();

      if (settings) {
        shopConfig.value = storeSettingsToShopConfig(settings);
        isConfigured.value = true;

        // Set current branch from localStorage or first available
        if (branches.value.length > 0) {
          const storedBranchId = import.meta.client
            ? localStorage.getItem("currentBranchId")
            : null;
          currentBranch.value =
            branches.value.find((b) => b.id === storedBranchId) ||
            branches.value[0] ||
            null;
        }

        return shopConfig.value;
      }

      // Check localStorage fallback
      if (import.meta.client) {
        const stored = localStorage.getItem("shopConfig");
        if (stored) {
          shopConfig.value = JSON.parse(stored);
          isConfigured.value = true;
          return shopConfig.value;
        }
      }

      return null;
    } catch (e) {
      error.value = `Failed to load shop config: ${e}`;
      console.error(error.value);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  // Save shop config
  async function saveShopConfig(config: Partial<ShopConfig>): Promise<boolean> {
    isLoading.value = true;
    error.value = null;

    try {
      const shopType = config.shopType ?? shopConfig.value?.shopType ?? "other";
      const newConfig: ShopConfig = {
        name: config.name || shopConfig.value?.name || "",
        address: config.address ?? shopConfig.value?.address,
        phone: config.phone ?? shopConfig.value?.phone,
        email: config.email ?? shopConfig.value?.email,
        logo: config.logo ?? shopConfig.value?.logo,
        currency: config.currency || shopConfig.value?.currency || "LAK",
        timezone:
          config.timezone || shopConfig.value?.timezone || "Asia/Vientiane",
        language: config.language || shopConfig.value?.language || "en-US",
        defaultBranchId:
          config.defaultBranchId ?? shopConfig.value?.defaultBranchId,
        taxRate: config.taxRate ?? shopConfig.value?.taxRate ?? 0,
        tipEnabled: config.tipEnabled ?? shopConfig.value?.tipEnabled ?? false,
        receiptFooter: config.receiptFooter ?? shopConfig.value?.receiptFooter,
        // Shop type & visibility
        visibility:
          config.visibility ?? shopConfig.value?.visibility ?? "private",
        shopType,
        enabledFeatures:
          config.enabledFeatures ??
          shopConfig.value?.enabledFeatures ??
          getDefaultFeatures(shopType),
        marketplaceDescription:
          config.marketplaceDescription ??
          shopConfig.value?.marketplaceDescription,
        socialLinks: config.socialLinks ?? shopConfig.value?.socialLinks,
        // Analytics & Tracking
        tags: config.tags ?? shopConfig.value?.tags ?? [],
        platformTag:
          config.platformTag ?? shopConfig.value?.platformTag ?? "bnos.space",
      };

      // Get existing settings or create new
      const existingSettings = await nostrData.getSettings();
      const updatedSettings: StoreSettings = {
        general: shopConfigToGeneralSettings(newConfig),
        lightning: existingSettings?.lightning || defaultLightningSettings,
        security: existingSettings?.security || defaultSecuritySettings,
        updatedAt: new Date().toISOString(),
      };

      // Save to Nostr
      await nostrData.saveSettings(updatedSettings);

      // Also save to localStorage as fallback
      if (import.meta.client) {
        localStorage.setItem("shopConfig", JSON.stringify(newConfig));
      }

      shopConfig.value = newConfig;
      isConfigured.value = true;

      return true;
    } catch (e) {
      error.value = `Failed to save shop config: ${e}`;
      console.error(error.value);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Create first branch
  async function createFirstBranch(
    branch: Omit<Branch, "id">
  ): Promise<Branch | null> {
    try {
      const newBranch = await productsStore.addBranch(branch);
      currentBranch.value = newBranch;

      // Update shop config with default branch
      if (shopConfig.value) {
        await saveShopConfig({ defaultBranchId: newBranch.id });
      }

      return newBranch;
    } catch (e) {
      error.value = `Failed to create branch: ${e}`;
      return null;
    }
  }

  // Set current branch
  function setCurrentBranch(branchId: string): void {
    const branch = branches.value.find((b) => b.id === branchId);
    if (branch) {
      currentBranch.value = branch;
      if (import.meta.client) {
        localStorage.setItem("currentBranchId", branchId);
      }
    }
  }

  // Initialize
  async function init(): Promise<void> {
    // Load products store first (includes branches)
    await productsStore.init();

    // Then load shop config
    await loadShopConfig();

    // Try to restore current branch from localStorage
    if (import.meta.client && !currentBranch.value) {
      const storedBranchId = localStorage.getItem("currentBranchId");
      if (storedBranchId) {
        setCurrentBranch(storedBranchId);
      } else if (branches.value.length > 0) {
        currentBranch.value = branches.value[0] || null;
      }
    }
  }

  return {
    // State
    shopConfig: readonly(shopConfig),
    currentBranch: readonly(currentBranch),
    branches,
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Computed
    hasShopConfig,
    hasBranches,
    isSetupComplete,

    // Methods
    init,
    loadShopConfig,
    saveShopConfig,
    createFirstBranch,
    setCurrentBranch,
  };
}
