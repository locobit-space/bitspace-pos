<!-- components/dashboard/DashboardShopSetup.vue -->
<!-- 🏪 Shop Setup Wizard for New Users -->
<script setup lang="ts">
import type { ShopConfig } from '~/composables/use-shop';

const emit = defineEmits<{
  (e: 'complete'): void;
}>();

const { t } = useI18n();
const shop = useShop();
const toast = useToast();

// Setup steps
const currentStep = ref(1);
const totalSteps = 3;
const isSubmitting = ref(false);

// Step 1: Shop Info
const shopForm = ref({
  name: '',
  address: '',
  phone: '',
  currency: 'LAK',
  timezone: 'Asia/Vientiane',
  language: 'en-US',
});

// Step 2: Branch Info
const branchForm = ref({
  name: '',
  code: '',
  address: '',
});

// Step 3: Additional Settings
const settingsForm = ref({
  taxRate: 0,
  tipEnabled: false,
  receiptFooter: '',
});

// Currency options
const currencyOptions = [
  { value: 'LAK', label: '🇱🇦 LAK - Lao Kip' },
  { value: 'USD', label: '🇺🇸 USD - US Dollar' },
  { value: 'THB', label: '🇹🇭 THB - Thai Baht' },
  { value: 'BTC', label: '₿ BTC - Bitcoin' },
  { value: 'SATS', label: '⚡ SATS - Satoshis' },
];

// Language options
const languageOptions = [
  { value: 'en-US', label: '🇺🇸 English' },
  { value: 'lo-LA', label: '🇱🇦 ລາວ (Lao)' },
];

// Timezone options (common for region) - for future use
const _timezoneOptions = [
  { value: 'Asia/Vientiane', label: 'Vientiane (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
];

// Validation
const isStep1Valid = computed(() => shopForm.value.name.trim().length > 0);
const isStep2Valid = computed(() => branchForm.value.name.trim().length > 0 && branchForm.value.code.trim().length > 0);

// Methods
const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++;
  }
};

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
};

const completeSetup = async () => {
  isSubmitting.value = true;
  
  try {
    // Save shop config
    const shopConfig: Partial<ShopConfig> = {
      name: shopForm.value.name,
      address: shopForm.value.address,
      phone: shopForm.value.phone,
      currency: shopForm.value.currency,
      timezone: shopForm.value.timezone,
      language: shopForm.value.language,
      taxRate: settingsForm.value.taxRate,
      tipEnabled: settingsForm.value.tipEnabled,
      receiptFooter: settingsForm.value.receiptFooter,
    };
    
    await shop.saveShopConfig(shopConfig);
    
    // Create first branch
    await shop.createFirstBranch({
      name: branchForm.value.name,
      code: branchForm.value.code,
      address: branchForm.value.address,
    });
    
    toast.add({
      title: t('shop.setup.success'),
      description: t('shop.setup.successDescription'),
      icon: 'i-heroicons-check-circle',
      color: 'green',
    });
    
    emit('complete');
  } catch (error) {
    console.error('Setup error:', error);
    toast.add({
      title: t('common.error'),
      description: String(error),
      icon: 'i-heroicons-exclamation-circle',
      color: 'red',
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Auto-generate branch code from name
watch(() => branchForm.value.name, (name) => {
  if (!branchForm.value.code || branchForm.value.code === '') {
    branchForm.value.code = name.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 8);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
    <div class="w-full max-w-lg">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
          <span class="text-3xl">🏪</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('shop.setup.title') }}</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">{{ t('shop.setup.subtitle') }}</p>
      </div>

      <!-- Progress Steps -->
      <div class="flex items-center justify-center mb-8">
        <template v-for="step in totalSteps" :key="step">
          <div class="flex items-center">
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm transition-colors"
              :class="step <= currentStep 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
            >
              <UIcon v-if="step < currentStep" name="i-heroicons-check" class="w-5 h-5" />
              <span v-else>{{ step }}</span>
            </div>
            <div 
              v-if="step < totalSteps"
              class="w-16 h-1 mx-2 rounded-full transition-colors"
              :class="step < currentStep 
                ? 'bg-primary-500' 
                : 'bg-gray-200 dark:bg-gray-700'"
            />
          </div>
        </template>
      </div>

      <!-- Card -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
        <!-- Step 1: Shop Info -->
        <div v-show="currentStep === 1" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-building-storefront" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">{{ t('shop.setup.step1.title') }}</h2>
              <p class="text-xs text-gray-500">{{ t('shop.setup.step1.subtitle') }}</p>
            </div>
          </div>

          <UFormField :label="t('shop.name')" required>
            <UInput 
              v-model="shopForm.name" 
              :placeholder="t('shop.namePlaceholder')"
              size="lg"
              icon="i-heroicons-building-storefront"
            />
          </UFormField>

          <UFormField :label="t('shop.address')">
            <UInput 
              v-model="shopForm.address" 
              :placeholder="t('shop.addressPlaceholder')"
              icon="i-heroicons-map-pin"
            />
          </UFormField>

          <UFormField :label="t('shop.phone')">
            <UInput 
              v-model="shopForm.phone" 
              :placeholder="t('shop.phonePlaceholder')"
              icon="i-heroicons-phone"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('settings.currency')">
              <USelect 
                v-model="shopForm.currency" 
                :items="currencyOptions"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <UFormField :label="t('settings.language')">
              <USelect 
                v-model="shopForm.language" 
                :items="languageOptions"
                value-key="value"
                label-key="label"
              />
            </UFormField>
          </div>
        </div>

        <!-- Step 2: Branch Info -->
        <div v-show="currentStep === 2" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-map" class="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">{{ t('shop.setup.step2.title') }}</h2>
              <p class="text-xs text-gray-500">{{ t('shop.setup.step2.subtitle') }}</p>
            </div>
          </div>

          <UFormField :label="t('branch.name')" required>
            <UInput 
              v-model="branchForm.name" 
              :placeholder="t('branch.namePlaceholder')"
              size="lg"
              icon="i-heroicons-building-office"
            />
          </UFormField>

          <UFormField :label="t('branch.code')" required>
            <UInput 
              v-model="branchForm.code" 
              :placeholder="t('branch.codePlaceholder')"
              icon="i-heroicons-tag"
            />
            <template #hint>
              <span class="text-xs text-gray-500">{{ t('branch.codeHint') }}</span>
            </template>
          </UFormField>

          <UFormField :label="t('branch.address')">
            <UTextarea 
              v-model="branchForm.address" 
              :placeholder="t('branch.addressPlaceholder')"
              :rows="2"
            />
          </UFormField>
        </div>

        <!-- Step 3: Settings -->
        <div v-show="currentStep === 3" class="space-y-4">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-900 dark:text-white">{{ t('shop.setup.step3.title') }}</h2>
              <p class="text-xs text-gray-500">{{ t('shop.setup.step3.subtitle') }}</p>
            </div>
          </div>

          <UFormField :label="t('settings.taxRate')">
            <UInput 
              v-model.number="settingsForm.taxRate" 
              type="number"
              min="0"
              max="100"
              :placeholder="t('settings.taxRatePlaceholder')"
              icon="i-heroicons-receipt-percent"
            >
              <template #trailing>
                <span class="text-gray-500">%</span>
              </template>
            </UInput>
          </UFormField>

          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p class="font-medium text-gray-900 dark:text-white text-sm">{{ t('settings.enableTips') }}</p>
              <p class="text-xs text-gray-500">{{ t('settings.enableTipsDescription') }}</p>
            </div>
            <UToggle v-model="settingsForm.tipEnabled" />
          </div>

          <UFormField :label="t('settings.receiptFooter')">
            <UTextarea 
              v-model="settingsForm.receiptFooter" 
              :placeholder="t('settings.receiptFooterPlaceholder')"
              :rows="2"
            />
          </UFormField>

          <!-- Summary -->
          <div class="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <h3 class="font-medium text-primary-900 dark:text-primary-100 text-sm mb-2">{{ t('shop.setup.summary') }}</h3>
            <div class="space-y-1 text-sm text-primary-700 dark:text-primary-300">
              <p><span class="opacity-70">{{ t('shop.name') }}:</span> {{ shopForm.name }}</p>
              <p><span class="opacity-70">{{ t('branch.name') }}:</span> {{ branchForm.name }} ({{ branchForm.code }})</p>
              <p><span class="opacity-70">{{ t('settings.currency') }}:</span> {{ shopForm.currency }}</p>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <UButton 
            v-if="currentStep > 1"
            color="neutral" 
            variant="ghost"
            icon="i-heroicons-arrow-left"
            @click="prevStep"
          >
            {{ t('common.back') }}
          </UButton>
          <div v-else />

          <UButton 
            v-if="currentStep < totalSteps"
            color="primary"
            icon="i-heroicons-arrow-right"
            trailing
            :disabled="(currentStep === 1 && !isStep1Valid) || (currentStep === 2 && !isStep2Valid)"
            @click="nextStep"
          >
            {{ t('common.next') }}
          </UButton>
          <UButton 
            v-else
            color="primary"
            icon="i-heroicons-check"
            :loading="isSubmitting"
            @click="completeSetup"
          >
            {{ t('shop.setup.complete') }}
          </UButton>
        </div>
      </div>

      <!-- Skip for now -->
      <p class="text-center mt-4">
        <button 
          class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          @click="emit('complete')"
        >
          {{ t('shop.setup.skipForNow') }}
        </button>
      </p>
    </div>
  </div>
</template>
