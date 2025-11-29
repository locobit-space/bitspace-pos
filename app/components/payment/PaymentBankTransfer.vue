<!-- components/payment/PaymentBankTransfer.vue -->
<!-- 🏦 Bank Transfer Payment Component -->
<script setup lang="ts">
import type { CurrencyCode, BankAccount } from '~/types';

const emit = defineEmits<{
  paid: [{ reference: string; bankAccount: string }];
  cancel: [];
}>();

defineProps<{
  amount: number;
  currency: CurrencyCode;
  orderId: string;
}>();

// Composables
const currencyHelper = useCurrency();
const { t } = useI18n();

// State
const step = ref<'select' | 'confirm' | 'complete'>('select');
const selectedBank = ref<BankAccount | null>(null);
const transferReference = ref('');
const isProcessing = ref(false);

// Mock bank accounts - in production, load from settings
const bankAccounts = ref<BankAccount[]>([
  {
    id: 'bcel',
    bankName: 'BCEL',
    bankCode: 'BCEL',
    accountNumber: '010-12-00-00123456-001',
    accountName: 'BITSPACE CO., LTD',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'ldb',
    bankName: 'Lao Development Bank',
    bankCode: 'LDB',
    accountNumber: '0001234567890',
    accountName: 'BITSPACE CO., LTD',
    isActive: true,
  },
  {
    id: 'jdb',
    bankName: 'JDB Bank',
    bankCode: 'JDB',
    accountNumber: '123-456-7890',
    accountName: 'BITSPACE CO., LTD',
    isActive: true,
  },
]);

// Bank icons/logos
const bankIcons: Record<string, string> = {
  bcel: '🏦',
  ldb: '🏛️',
  jdb: '💳',
  apb: '🌾',
  stb: '🏪',
};

const selectBank = (bank: BankAccount) => {
  selectedBank.value = bank;
  step.value = 'confirm';
};

const confirmTransfer = () => {
  isProcessing.value = true;
  
  setTimeout(() => {
    step.value = 'complete';
    isProcessing.value = false;
    
    // Emit after showing success
    setTimeout(() => {
      emit('paid', {
        reference: transferReference.value.trim() || 'N/A',
        bankAccount: selectedBank.value?.id || '',
      });
    }, 1500);
  }, 500);
};

const goBack = () => {
  if (step.value === 'confirm') {
    step.value = 'select';
    selectedBank.value = null;
  } else {
    emit('cancel');
  }
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
};
</script>

<template>
  <div class="text-center max-h-[70vh] overflow-y-auto">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white">
        <span class="text-3xl">🏦</span>
        {{ t('payment.bankTransfer.title') }}
      </h2>
    </div>

    <!-- Amount Due -->
    <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">{{ t('payment.cash.amountDue') }}</div>
      <div class="text-3xl font-bold text-gray-900 dark:text-white">
        {{ currencyHelper.format(amount, currency) }}
      </div>
    </div>

    <!-- Step 1: Select Bank -->
    <div v-if="step === 'select'" class="space-y-4">
      <!-- Actions at Top -->
      <div class="flex gap-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1"
          @click="emit('cancel')"
        >
          {{ t('common.cancel') }}
        </UButton>
      </div>

      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ t('payment.bankTransfer.selectBank') }}
      </p>

      <!-- Bank Selection -->
      <div class="space-y-3">
        <button
          v-for="bank in bankAccounts.filter(b => b.isActive)"
          :key="bank.id"
          class="w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10"
          :class="bank.isDefault ? 'border-primary-200 dark:border-primary-800' : 'border-gray-200 dark:border-gray-700'"
          @click="selectBank(bank)"
        >
          <div class="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
            {{ bankIcons[bank.id] || '🏦' }}
          </div>
          <div class="flex-1 text-left">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white">{{ bank.bankName }}</span>
              <UBadge v-if="bank.isDefault" color="primary" variant="soft" size="xs">
                Default
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ bank.accountNumber }}</p>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>

    <!-- Step 2: Transfer Details & Confirm -->
    <div v-else-if="step === 'confirm'" class="space-y-4">
      <!-- Actions at Top -->
      <div class="flex gap-3 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10">
        <UButton
          color="neutral"
          variant="outline"
          size="lg"
          class="flex-1"
          @click="goBack"
        >
          {{ t('common.back') }}
        </UButton>
        <UButton
          color="primary"
          size="lg"
          class="flex-1"
          :loading="isProcessing"
          @click="confirmTransfer"
        >
          {{ t('payment.bankTransfer.confirm') }}
        </UButton>
      </div>

      <!-- Bank Details Card -->
      <div v-if="selectedBank" class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl space-y-4 text-left">
        <div class="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl">
            {{ bankIcons[selectedBank.id] || '🏦' }}
          </div>
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">{{ selectedBank.bankName }}</p>
            <p class="text-xs text-gray-500">{{ t('payment.bankTransfer.transferTo') }}</p>
          </div>
        </div>

        <!-- Account Number -->
        <div class="flex justify-between items-center">
          <div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('payment.bankTransfer.accountNumber') }}</p>
            <p class="font-mono text-lg font-semibold text-gray-900 dark:text-white">{{ selectedBank.accountNumber }}</p>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-clipboard-document"
            @click="copyToClipboard(selectedBank.accountNumber)"
          />
        </div>

        <!-- Account Name -->
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('payment.bankTransfer.accountName') }}</p>
          <p class="font-semibold text-gray-900 dark:text-white">{{ selectedBank.accountName }}</p>
        </div>

        <!-- Amount -->
        <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('payment.bankTransfer.amount') }}</p>
          <p class="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {{ currencyHelper.format(amount, currency) }}
          </p>
        </div>
      </div>

      <!-- Transfer Reference Input (Optional) -->
      <div class="text-left">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('payment.bankTransfer.reference') }} <span class="text-gray-400">({{ t('common.optional') }})</span>
        </label>
        <UInput
          v-model="transferReference"
          :placeholder="t('payment.bankTransfer.referencePlaceholder')"
          size="lg"
          class="font-mono"
        />
        <p class="text-xs text-gray-500 mt-1">{{ t('payment.bankTransfer.referenceHint') }}</p>
      </div>

      <!-- QR Code (if available) -->
      <div v-if="selectedBank?.qrCode" class="p-4 bg-white dark:bg-gray-800 rounded-xl">
        <p class="text-sm text-gray-500 mb-3">{{ t('payment.bankTransfer.scanQR') }}</p>
        <img :src="selectedBank.qrCode" alt="Bank QR Code" class="w-48 h-48 mx-auto rounded-lg">
      </div>
    </div>

    <!-- Step 3: Complete -->
    <div v-else-if="step === 'complete'" class="py-8">
      <div class="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
        <span class="text-5xl text-white">✓</span>
      </div>
      <h3 class="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
        {{ t('payment.bankTransfer.recorded') }}
      </h3>
      <p class="text-gray-500 dark:text-gray-400">
        {{ t('payment.bankTransfer.recordedDesc') }}
      </p>
      
      <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <p class="text-sm text-gray-500 mb-1">{{ t('payment.bankTransfer.reference') }}</p>
        <p class="font-mono font-semibold text-gray-900 dark:text-white">{{ transferReference }}</p>
      </div>
    </div>
  </div>
</template>
