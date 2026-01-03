<!-- components/dashboard/DashboardShopSetup.vue -->
<!-- 🏪 Shop Setup Wizard for New Users - Enhanced with Shop Type & Visibility -->
<script setup lang="ts">
import type { ShopConfig } from "~/composables/use-shop";
import type {
  ShopType,
  ShopVisibility,
  ProductTemplate,
  CategoryTemplate,
} from "~/types";
import { getShopTypeConfig } from "~/data/shop-templates";

const emit = defineEmits<{
  (e: "complete"): void;
}>();

const { t } = useI18n();
const shop = useShop();
const company = useCompany();
const toast = useToast();
const productsStore = useProductsStore();
const nostrKey = useNostrKey();

// Setup steps (5 steps if public, 4 if private)
const currentStep = ref(1);
const totalSteps = computed(() => shopForm.value.visibility === 'public' ? 5 : 4);
const isSubmitting = ref(false);

// Step 1: Shop Info + Visibility
const shopForm = ref({
  name: "",
  address: "",
  phone: "",
  currency: "LAK",
  timezone: "Asia/Vientiane",
  language: "en-US",
  visibility: "private" as ShopVisibility,
});

// Step 2: Shop Type
const shopType = ref<ShopType>("cafe");

// Step 3: Branch Info
const branchForm = ref({
  name: "",
  code: "",
  address: "",
});

// Step 4: Additional Settings + Templates
const settingsForm = ref({
  taxRate: 0,
  tipEnabled: false,
  receiptFooter: "",
});
const applyTemplates = ref(true);

// Step 5: Marketplace Configuration (only if public)
const marketplaceForm = ref({
  lud16: "", // Lightning address
  nip05: "", // Nostr verification
  marketplaceDescription: "",
  services: [] as string[], // dine-in, takeaway, delivery
  acceptsLightning: true,
  acceptsBitcoin: false,
});

// Service options for marketplace
const serviceOptions = [
  { value: "dine-in", label: "🍽️ Dine-in" },
  { value: "takeaway", label: "🥡 Takeaway" },
  { value: "delivery", label: "🚚 Delivery" },
  { value: "pickup", label: "📦 Pickup" },
  { value: "reservation", label: "📅 Reservation" },
];

// Company code (generated on mount)
const generatedCompanyCode = ref("");

// Currency options (imported from centralized constant)
import { CURRENCY_OPTIONS } from "~/composables/use-currency";
const currencyOptions = CURRENCY_OPTIONS;

// Language options
const languageOptions = [
  { value: "en-US", label: "🇺🇸 English" },
  { value: "lo-LA", label: "🇱🇦 ລາວ (Lao)" },
];

// Step icons and titles
const stepConfig = computed(() => {
  const baseSteps = [
    {
      icon: "i-heroicons-building-storefront",
      color: "primary",
      title: t("shop.setup.step1.title"),
    },
    {
      icon: "i-heroicons-squares-2x2",
      color: "purple",
      title: t("shop.setup.step2.title"),
    },
    {
      icon: "i-heroicons-map",
      color: "green",
      title: t("shop.setup.step3.title"),
    },
    {
      icon: "i-heroicons-cog-6-tooth",
      color: "amber",
      title: t("shop.setup.step4.title"),
    },
  ];

  // Add Step 5 for marketplace if public
  if (shopForm.value.visibility === 'public') {
    baseSteps.push({
      icon: "i-heroicons-globe-alt",
      color: "blue",
      title: t("shop.setup.step5.title", "Marketplace"),
    });
  }

  return baseSteps;
});

// Get selected shop type config
const selectedTypeConfig = computed(() => getShopTypeConfig(shopType.value));

// Validation
const isStep1Valid = computed(() => shopForm.value.name.trim().length > 0);
const isStep2Valid = computed(() => !!shopType.value);
const isStep3Valid = computed(
  () =>
    branchForm.value.name.trim().length > 0 &&
    branchForm.value.code.trim().length > 0
);

// Methods
const nextStep = () => {
  if (currentStep.value < totalSteps.value) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const applyProductTemplates = async () => {
  if (!applyTemplates.value || !selectedTypeConfig.value) return;

  const config = selectedTypeConfig.value;

  // Create categories
  for (const cat of config.categories) {
    await productsStore.addCategory({
      name: cat.name,
      description: cat.nameLao,
      icon: cat.icon,
      sortOrder: cat.sortOrder,
    });
  }

  // Create products
  for (const prod of config.products) {
    // Find the category
    const categoryId = productsStore.categories.value.find(
      (c) =>
        c.name ===
        config.categories.find((tc) => tc.id === prod.categoryId)?.name
    )?.id;

    if (categoryId) {
      await productsStore.addProduct({
        name: prod.name,
        description: prod.nameLao,
        sku: prod.id.toUpperCase(),
        categoryId,
        unitId: "default",
        price: prod.price,
        stock: 0,
        minStock: 0,
        branchId: "",
        status: "active",
        image: prod.image, // Pass the image URL from template
      });
    }
  }
};

const completeSetup = async () => {
  isSubmitting.value = true;

  try {
    // Auto-generate tags from shop type
    const autoTags = [shopType.value.toLowerCase().replace(/_/g, "-")];

    // Save shop config with auto-tags and platform tag
    const shopConfig: Partial<ShopConfig> = {
      name: shopForm.value.name,
      address: shopForm.value.address,
      phone: shopForm.value.phone,
      currency: shopForm.value.currency,
      timezone: shopForm.value.timezone,
      language: shopForm.value.language,
      visibility: shopForm.value.visibility,
      shopType: shopType.value,
      taxRate: settingsForm.value.taxRate,
      tipEnabled: settingsForm.value.tipEnabled,
      receiptFooter: settingsForm.value.receiptFooter,
      // Auto-add shop type as tag and set platform
      tags: autoTags,
      platformTag: "bnos.space",
      // Marketplace fields (if public)
      ...(shopForm.value.visibility === 'public' && {
        lud16: marketplaceForm.value.lud16 || undefined,
        nip05: marketplaceForm.value.nip05 || undefined,
        marketplaceDescription: marketplaceForm.value.marketplaceDescription || undefined,
        services: marketplaceForm.value.services,
        acceptsLightning: marketplaceForm.value.acceptsLightning,
        acceptsBitcoin: marketplaceForm.value.acceptsBitcoin,
        isListed: true,
        marketplaceJoinedAt: new Date().toISOString(),
      }),
    };

    await shop.saveShopConfig(shopConfig);

    // Create first branch
    const newBranch = await shop.createFirstBranch({
      name: branchForm.value.name,
      code: branchForm.value.code,
      address: branchForm.value.address,
    });

    // Apply product templates if enabled
    if (applyTemplates.value && newBranch) {
      await applyProductTemplates();
    }

    // Set up company code for staff sync
    if (generatedCompanyCode.value) {
      // Get owner pubkey
      let ownerPubkey = "";
      const nostrUser = localStorage.getItem("nostrUser");
      if (nostrUser) {
        try {
          const parsed = JSON.parse(nostrUser);
          ownerPubkey = parsed.pubkey || parsed.publicKey || "";
        } catch (e) {
          console.warn("Failed to parse nostrUser");
        }
      }

      await company.setCompanyCode(generatedCompanyCode.value, ownerPubkey);
      company.toggleCompanyCode(true);

      // IMPORTANT: Publish company index so staff can discover this owner
      // This allows staff to sync products/orders when they join with the company code
      if (ownerPubkey) {
        try {
          const nostrData = useNostrData();
          const codeHash = await company.hashCompanyCode(
            generatedCompanyCode.value
          );
          await nostrData.publishCompanyIndex(codeHash);
          console.log(
            "[ShopSetup] Published company index for staff discovery"
          );
        } catch (e) {
          console.warn("[ShopSetup] Failed to publish company index:", e);
        }
      }
    }

    toast.add({
      title: t("shop.setup.success"),
      description: t("shop.setup.successDescription"),
      icon: "i-heroicons-check-circle",
      color: "success",
    });

    emit("complete");
  } catch (error) {
    console.error("Setup error:", error);
    toast.add({
      title: t("common.error"),
      description: String(error),
      icon: "i-heroicons-exclamation-circle",
      color: "error",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Auto-generate branch code from name
watch(
  () => branchForm.value.name,
  (name) => {
    if (!branchForm.value.code || branchForm.value.code === "") {
      branchForm.value.code = name
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .slice(0, 8);
    }
  }
);

// Generate company code on mount
onMounted(() => {
  if (!company.hasCompanyCode.value) {
    generatedCompanyCode.value = company.generateCompanyCode();
  } else {
    generatedCompanyCode.value = company.companyCode.value || "";
  }
});
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">
      <!-- Header -->
      <div class="text-center mb-8">
        <div
          class="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
          <span class="text-3xl">🏪</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t("shop.setup.title") }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          {{ t("shop.setup.subtitle") }}
        </p>
      </div>

      <!-- Progress Steps -->
      <div class="flex items-center justify-center mb-8">
        <template v-for="step in totalSteps" :key="step">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors"
              :class="step <= currentStep
                ? 'bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                ">
              <UIcon v-if="step < currentStep" name="i-heroicons-check" class="w-5 h-5" />
              <span v-else>{{ step }}</span>
            </div>
            <div v-if="step < totalSteps" class="w-12 sm:w-16 h-1 mx-1 sm:mx-2 rounded-full transition-colors" :class="step < currentStep
              ? 'bg-primary-500'
              : 'bg-gray-200 dark:bg-gray-700'
              " />
          </div>
        </template>
      </div>

      <!-- Card -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <!-- Step 1: Shop Info + Visibility -->
        <div v-show="currentStep === 1" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-building-storefront" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.setup.step1.title") }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t("shop.setup.step1.subtitle") }}
              </p>
            </div>
          </div>

          <UFormField :label="t('shop.name')" required>
            <UInput v-model="shopForm.name" :placeholder="t('shop.namePlaceholder')" size="lg"
              icon="i-heroicons-building-storefront" class="w-full" />
          </UFormField>

          <UFormField :label="t('shop.address')">
            <UInput v-model="shopForm.address" :placeholder="t('shop.addressPlaceholder')" icon="i-heroicons-map-pin"
              class="w-full" />
          </UFormField>

          <UFormField :label="t('shop.phone')">
            <UInput v-model="shopForm.phone" :placeholder="t('shop.phonePlaceholder')" icon="i-heroicons-phone"
              class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('settings.general.currency')">
              <USelect v-model="shopForm.currency" :items="currencyOptions" value-key="value" label-key="label"
                class="w-full" />
            </UFormField>

            <UFormField :label="t('settings.general.language')">
              <USelect v-model="shopForm.language" :items="languageOptions" value-key="value" label-key="label"
                class="w-full" />
            </UFormField>
          </div>

          <!-- Shop Visibility -->
          <div class="pt-2">
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {{ t("shop.setup.visibility") }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <button type="button" class="p-3 rounded-lg border-2 text-left transition-all" :class="shopForm.visibility === 'private'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700'
                " @click="shopForm.visibility = 'private'">
                <UIcon name="i-heroicons-lock-closed" class="w-5 h-5 mb-1" :class="shopForm.visibility === 'private'
                  ? 'text-primary-600'
                  : 'text-gray-400'
                  " />
                <p class="font-medium text-sm" :class="shopForm.visibility === 'private'
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-gray-900 dark:text-white'
                  ">
                  {{ t("shop.setup.private") }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("shop.setup.privateDesc") }}
                </p>
              </button>
              <button type="button" class="p-3 rounded-lg border-2 text-left transition-all" :class="shopForm.visibility === 'public'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700'
                " @click="shopForm.visibility = 'public'">
                <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 mb-1" :class="shopForm.visibility === 'public'
                  ? 'text-primary-600'
                  : 'text-gray-400'
                  " />
                <p class="font-medium text-sm" :class="shopForm.visibility === 'public'
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-gray-900 dark:text-white'
                  ">
                  {{ t("shop.setup.public") }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("shop.setup.publicDesc") }}
                </p>
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Shop Type -->
        <div v-show="currentStep === 2" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.setup.step2.title") }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t("shop.setup.step2.subtitle") }}
              </p>
            </div>
          </div>

          <ShopTypeSelector v-model="shopType" />
        </div>

        <!-- Step 3: Branch Info -->
        <div v-show="currentStep === 3" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-map" class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.setup.step3.title") }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t("shop.setup.step3.subtitle") }}
              </p>
            </div>
          </div>

          <UFormField :label="t('branch.name')" required>
            <UInput v-model="branchForm.name" :placeholder="t('branch.namePlaceholder')" size="lg"
              icon="i-heroicons-building-office" class="w-full" />
          </UFormField>

          <UFormField :label="t('branch.code')" required>
            <UInput v-model="branchForm.code" :placeholder="t('branch.codePlaceholder')" icon="i-heroicons-tag"
              class="w-full" />
            <template #hint>
              <span class="text-xs text-gray-500">{{
                t("branch.codeHint")
                }}</span>
            </template>
          </UFormField>

          <UFormField :label="t('branch.address')">
            <UTextarea v-model="branchForm.address" :placeholder="t('branch.addressPlaceholder')" :rows="2"
              class="w-full" />
          </UFormField>
        </div>

        <!-- Step 4: Settings + Templates -->
        <div v-show="currentStep === 4" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.setup.step4.title") }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t("shop.setup.step4.subtitle") }}
              </p>
            </div>
          </div>

          <UFormField :label="t('settings.general.taxRate')">
            <UInput v-model.number="settingsForm.taxRate" type="number" min="0" max="100"
              :placeholder="t('settings.general.taxRatePlaceholder')" icon="i-heroicons-receipt-percent">
              <template #trailing>
                <span class="text-gray-500">%</span>
              </template>
            </UInput>
          </UFormField>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white text-sm">
                {{ t("settings.general.enableTips") }}
              </p>
              <p class="text-xs text-gray-500">
                {{ t("settings.general.enableTipsDescription") }}
              </p>
            </div>
            <USwitch v-model="settingsForm.tipEnabled" />
          </div>

          <UFormField :label="t('settings.general.receiptFooter')">
            <UTextarea v-model="settingsForm.receiptFooter"
              :placeholder="t('settings.general.receiptFooterPlaceholder')" :rows="2" class="w-full" />
          </UFormField>

          <!-- Product Templates -->
          <div class="pt-2">
            <ShopProductTemplatePreview :shop-type="shopType" v-model="applyTemplates" />
          </div>

          <!-- Summary -->
          <div
            class="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <h3 class="font-medium text-primary-900 dark:text-primary-100 text-sm mb-2">
              {{ t("shop.setup.summary") }}
            </h3>
            <div class="space-y-1 text-sm text-primary-700 dark:text-primary-300">
              <p>
                <span class="opacity-70">{{ t("shop.name") }}:</span>
                {{ shopForm.name }}
              </p>
              <p>
                <span class="opacity-70">{{ t("branch.name") }}:</span>
                {{ branchForm.name }} ({{ branchForm.code }})
              </p>
              <p>
                <span class="opacity-70">{{ t("settings.currency") }}:</span>
                {{ shopForm.currency }}
              </p>
              <p>
                <span class="opacity-70">{{ t("shop.setup.shopType") }}:</span>
                {{ shopType }}
              </p>
              <!-- Company Code -->
              <div class="mt-2 pt-2 border-t border-primary-200 dark:border-primary-800">
                <p class="flex items-center gap-2">
                  <span class="opacity-70">
                    {{ t("auth.company.connectTitle", "Company Code") }}:
                  </span>
                  <span class="font-mono text-lg font-bold tracking-widest">{{
                    generatedCompanyCode
                    }}</span>
                </p>
                <p class="text-xs opacity-60 mt-1">
                  {{
                    t("shop.setup.companyCodeHint") ||
                    "Share this code with your staff to connect their devices"
                  }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 5: Marketplace Configuration (only if public) -->
        <div v-show="currentStep === 5 && shopForm.visibility === 'public'" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">
                {{ t("shop.setup.step5.title", "Marketplace Profile") }}
              </h2>
              <p class="text-xs text-gray-500">
                {{ t("shop.setup.step5.subtitle", "Make your store discoverable") }}
              </p>
            </div>
          </div>

          <!-- Lightning Address -->
          <UFormField :label="t('shop.marketplace.lud16', 'Lightning Address')">
            <UInput v-model="marketplaceForm.lud16" placeholder="shop@getalby.com" icon="i-heroicons-bolt"
              class="w-full" />
            <template #hint>
              <span class="text-xs text-gray-500">
                {{ t("shop.marketplace.lud16Hint", "Receive Lightning payments directly") }}
              </span>
            </template>
          </UFormField>

          <!-- NIP-05 Verification -->
          <UFormField :label="t('shop.marketplace.nip05', 'Nostr Verification')">
            <UInput v-model="marketplaceForm.nip05" placeholder="shop@bnos.space" icon="i-heroicons-check-badge"
              class="w-full" />
            <template #hint>
              <span class="text-xs text-gray-500">
                {{ t("shop.marketplace.nip05Hint", "Verify your store identity") }}
              </span>
            </template>
          </UFormField>

          <!-- Marketplace Description -->
          <UFormField :label="t('shop.marketplace.description', 'Description')">
            <UTextarea v-model="marketplaceForm.marketplaceDescription"
              :placeholder="t('shop.marketplace.descriptionPlaceholder', 'Tell customers what makes your store special...')"
              :rows="3" class="w-full" />
          </UFormField>

          <!-- Services Offered -->
          <UFormField :label="t('shop.marketplace.services', 'Services Offered')">
            <div class="flex flex-wrap gap-2">
              <button v-for="option in serviceOptions" :key="option.value" type="button"
                class="px-3 py-2 rounded-lg border-2 text-sm transition-all" :class="marketplaceForm.services.includes(option.value)
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  " @click="
                    marketplaceForm.services.includes(option.value)
                      ? (marketplaceForm.services = marketplaceForm.services.filter(s => s !== option.value))
                      : marketplaceForm.services.push(option.value)
                    ">
                {{ option.label }}
              </button>
            </div>
          </UFormField>

          <!-- Payment Methods -->
          <div class="space-y-3">
            <p class="text-sm font-medium text-gray-900 dark:text-white">
              {{ t("shop.marketplace.payments", "Payment Methods") }}
            </p>

            <div
              class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div class="flex items-center gap-3">
                <span class="text-2xl">⚡</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    {{ t("shop.marketplace.lightning", "Lightning Network") }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ t("shop.marketplace.lightningDesc", "Fast, cheap Bitcoin payments") }}
                  </p>
                </div>
              </div>
              <USwitch v-model="marketplaceForm.acceptsLightning" />
            </div>

            <div
              class="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div class="flex items-center gap-3">
                <span class="text-2xl">₿</span>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white text-sm">
                    {{ t("shop.marketplace.bitcoin", "Bitcoin On-chain") }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{ t("shop.marketplace.bitcoinDesc", "Traditional Bitcoin payments") }}
                  </p>
                </div>
              </div>
              <USwitch v-model="marketplaceForm.acceptsBitcoin" />
            </div>
          </div>

          <!-- Marketplace Summary -->
          <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-blue-600" />
              <h3 class="font-medium text-blue-900 dark:text-blue-100 text-sm">
                {{ t("shop.marketplace.ready", "Ready for Marketplace!") }}
              </h3>
            </div>
            <p class="text-sm text-blue-700 dark:text-blue-300">
              {{ t("shop.marketplace.readyDesc") }}
            </p>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton v-if="currentStep > 1" color="neutral" variant="ghost" icon="i-heroicons-arrow-left"
            @click="prevStep">
            {{ t("common.back") }}
          </UButton>
          <div v-else />

          <UButton v-if="currentStep < totalSteps" color="primary" icon="i-heroicons-arrow-right" trailing :disabled="(currentStep === 1 && !isStep1Valid) ||
            (currentStep === 2 && !isStep2Valid) ||
            (currentStep === 3 && !isStep3Valid)
            " @click="nextStep">
            {{ t("common.next") }}
          </UButton>
          <UButton v-else color="primary" icon="i-heroicons-check" :loading="isSubmitting" @click="completeSetup">
            {{ t("shop.setup.complete") }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
