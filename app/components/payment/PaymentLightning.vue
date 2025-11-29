<!-- components/payment/PaymentLightning.vue -->
<!-- ⚡ Lightning Payment Component with QR Code -->
<script setup lang="ts">
import type { CurrencyCode } from '~/types';

const props = defineProps<{
  amount: number; // in sats
  fiatAmount: number;
  currency: CurrencyCode;
  orderId: string;
}>();

const emit = defineEmits<{
  paid: [preimage: string];
  cancel: [];
}>();

// Composables
const lightning = useLightning();
const currencyHelper = useCurrency();
const { t } = useI18n();

// State
const paymentStep = ref<'generating' | 'waiting' | 'success' | 'error'>('generating');
const errorMessage = ref('');
const countdown = ref(600); // 10 minutes
const showBolt12 = ref(false);
const showErrorModal = ref(false);
const checkingPayment = ref(false);

// Computed
const isLNURLProvider = computed(() => lightning.settings.value?.provider === 'lnurl');
const lightningAddress = computed(() => lightning.settings.value?.lightningAddress || '');
const providerName = computed(() => {
  const provider = lightning.settings.value?.provider;
  switch (provider) {
    case 'lnurl': return 'Lightning Address';
    case 'lnbits': return 'LNbits';
    case 'alby': return 'Alby';
    case 'nwc': return 'NWC';
    default: return provider || 'Unknown';
  }
});

// Generate invoice on mount
onMounted(async () => {
  // Load settings first
  await lightning.loadSettings();
  await generateInvoice();
});

const generateInvoice = async () => {
  paymentStep.value = 'generating';
  errorMessage.value = '';
  showErrorModal.value = false;
  
  try {
    // Reload settings to ensure we have latest config
    await lightning.loadSettings();
    
    // Check if Lightning is configured
    if (!lightning.settings.value?.isConfigured) {
      throw new Error(t('payment.lightning.notConfigured'));
    }

    const invoice = await lightning.createInvoice(
      props.amount,
      `Order ${props.orderId}`,
      { orderId: props.orderId, fiatAmount: props.fiatAmount, currency: props.currency }
    );

    if (invoice) {
      paymentStep.value = 'waiting';
      startCountdown();
      watchForPayment();
    } else {
      throw new Error(lightning.error.value || t('payment.lightning.invoiceFailed'));
    }
  } catch (e) {
    paymentStep.value = 'error';
    errorMessage.value = e instanceof Error ? e.message : t('payment.lightning.invoiceFailed');
    showErrorModal.value = true;
  }
};

const watchForPayment = () => {
  // Watch for payment status changes
  watch(() => lightning.paymentStatus.value, (status) => {
    if (status === 'completed') {
      paymentStep.value = 'success';
      emit('paid', lightning.currentInvoice.value?.preimage || '');
    }
  });
};

let countdownInterval: ReturnType<typeof setInterval>;

const startCountdown = () => {
  countdownInterval = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownInterval);
      paymentStep.value = 'error';
      errorMessage.value = t('payment.lightning.invoiceExpired');
      showErrorModal.value = true;
    }
  }, 1000);
};

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

const copyInvoice = async () => {
  if (lightning.invoiceQR.value) {
    await navigator.clipboard.writeText(lightning.invoiceQR.value);
    // Could show toast here
  }
};

const openWallet = () => {
  if (lightning.invoiceQR.value) {
    window.location.href = `lightning:${lightning.invoiceQR.value}`;
  }
};

const handleTryAgain = () => {
  showErrorModal.value = false;
  countdown.value = 600;
  generateInvoice();
};

const handleCancel = () => {
  showErrorModal.value = false;
  emit('cancel');
};

// Manual confirmation for LNURL (since we can't check payment status automatically)
const confirmPaymentReceived = () => {
  checkingPayment.value = true;
  // For LNURL, we trust the cashier's confirmation
  // In production, you might want to add additional verification
  setTimeout(() => {
    paymentStep.value = 'success';
    checkingPayment.value = false;
    emit('paid', 'manual-confirmation-' + Date.now());
  }, 500);
};

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});
</script>

<template>
  <div class="text-center">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold flex items-center justify-center gap-2 text-gray-900 dark:text-white">
        <span class="text-3xl">⚡</span>
        {{ t('payment.lightning.title') }}
      </h2>
      <p class="text-gray-500 dark:text-gray-400 mt-2">{{ t('payment.lightning.scanOrCopy') }}</p>
    </div>

    <!-- Amount Display -->
    <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
      <div class="text-3xl font-bold text-amber-600 dark:text-amber-400">
        {{ currencyHelper.format(amount, 'SATS') }}
      </div>
      <div class="text-gray-500 dark:text-gray-400 text-sm mt-1">
        ≈ {{ currencyHelper.format(fiatAmount, currency) }}
      </div>
      <!-- Show Lightning Address for LNURL provider -->
      <div v-if="isLNURLProvider && lightningAddress" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ t('payment.lightning.receivingTo') }}</div>
        <div class="text-sm font-medium text-gray-900 dark:text-white flex items-center justify-center gap-2">
          <span>⚡</span>
          <span>{{ lightningAddress }}</span>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">{{ providerName }}</div>
      </div>
    </div>

    <!-- Generating State -->
    <div v-if="paymentStep === 'generating'" class="py-12">
      <div class="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-gray-500 dark:text-gray-400">{{ t('payment.lightning.generating') }}</p>
    </div>

    <!-- Waiting for Payment -->
    <div v-else-if="paymentStep === 'waiting'" class="space-y-4">
      <!-- QR Type Toggle -->
      <div class="flex justify-center gap-2 mb-4">
        <UButton
          :color="!showBolt12 ? 'primary' : 'neutral'"
          :variant="!showBolt12 ? 'solid' : 'outline'"
          size="sm"
          @click="showBolt12 = false"
        >
          BOLT11 (Standard)
        </UButton>
        <UButton
          :color="showBolt12 ? 'primary' : 'neutral'"
          :variant="showBolt12 ? 'solid' : 'outline'"
          size="sm"
          @click="showBolt12 = true"
        >
          BOLT12 (Static)
        </UButton>
      </div>

      <!-- QR Code -->
      <div class="bg-white p-4 rounded-2xl inline-block shadow-lg">
        <img
          v-if="lightning.invoiceQR.value"
          :src="`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(lightning.invoiceQR.value)}`"
          alt="Lightning Invoice QR"
          class="w-64 h-64"
        >
        <div v-else class="w-64 h-64 bg-gray-200 flex items-center justify-center">
          <span class="text-gray-400">No QR</span>
        </div>
      </div>

      <!-- Countdown -->
      <div class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('payment.lightning.expiresIn') }} <span class="text-amber-600 dark:text-amber-400 font-mono">{{ formattedCountdown }}</span>
      </div>

      <!-- Invoice Actions -->
      <div class="flex justify-center gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-clipboard-document"
          @click="copyInvoice"
        >
          {{ t('payment.lightning.copyInvoice') }}
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-bolt"
          @click="openWallet"
        >
          {{ t('payment.lightning.openWallet') }}
        </UButton>
      </div>

      <!-- Invoice String (truncated) -->
      <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400 break-all max-h-20 overflow-hidden">
        {{ lightning.invoiceQR.value?.slice(0, 100) }}...
      </div>

      <!-- Payment Status Indicator -->
      <div class="mt-6 flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
        <div class="animate-pulse w-2 h-2 bg-amber-500 rounded-full" />
        {{ t('payment.lightning.waitingForPayment') }}
      </div>

      <!-- Manual Confirmation for LNURL (no automatic callback) -->
      <div v-if="isLNURLProvider" class="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {{ t('payment.lightning.lnurlManualConfirmHint') }}
        </p>
        <UButton
          color="green"
          size="lg"
          :loading="checkingPayment"
          icon="i-heroicons-check-circle"
          class="w-full"
          @click="confirmPaymentReceived"
        >
          {{ t('payment.lightning.confirmReceived') }}
        </UButton>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="paymentStep === 'success'" class="py-8">
      <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl text-white">✓</span>
      </div>
      <h3 class="text-xl font-bold text-green-600 dark:text-green-400">{{ t('payment.lightning.paymentReceived') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">{{ t('payment.lightning.thankYou') }}</p>
      
      <div class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-mono text-gray-500">
        Preimage: {{ lightning.currentInvoice.value?.preimage?.slice(0, 32) }}...
      </div>
    </div>

    <!-- Error State (inline, for when modal is closed) -->
    <div v-else-if="paymentStep === 'error' && !showErrorModal" class="py-8">
      <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">✕</span>
      </div>
      <h3 class="text-xl font-bold text-red-600 dark:text-red-400">{{ t('payment.lightning.paymentFailed') }}</h3>
      <p class="text-gray-500 dark:text-gray-400 mt-2">{{ errorMessage }}</p>
      
      <div class="flex justify-center gap-3 mt-4">
        <UButton
          color="primary"
          @click="handleTryAgain"
        >
          {{ t('common.tryAgain') }}
        </UButton>
        <UButton
          color="neutral"
          variant="outline"
          @click="handleCancel"
        >
          {{ t('common.cancel') }}
        </UButton>
      </div>
    </div>

    <!-- Cancel Button (when not in error state) -->
    <div v-if="paymentStep !== 'error'" class="mt-6">
      <UButton
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        {{ t('payment.lightning.cancelPayment') }}
      </UButton>
    </div>

    <!-- Tips Section -->
    <div class="mt-6 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-left text-sm">
      <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">💡 {{ t('payment.lightning.tips') }}</h4>
      <ul class="text-gray-500 dark:text-gray-400 space-y-1 text-xs">
        <li>• {{ t('payment.lightning.tip1') }}</li>
        <li>• {{ t('payment.lightning.tip2') }}</li>
        <li>• {{ t('payment.lightning.tip3') }}</li>
        <li>• {{ t('payment.lightning.tip4') }}</li>
      </ul>
    </div>

    <!-- Error Modal -->
    <UModal v-model:open="showErrorModal">
      <template #content>
        <div class="p-6 bg-white dark:bg-gray-900 text-center">
          <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500" />
          </div>
          
          <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {{ t('payment.lightning.paymentFailed') }}
          </h3>
          
          <p class="text-gray-500 dark:text-gray-400 mb-6">
            {{ errorMessage }}
          </p>

          <!-- Error Details for Lightning Not Configured -->
          <div v-if="!lightning.settings.value?.isConfigured" class="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
            <h4 class="font-medium text-amber-700 dark:text-amber-400 mb-2">
              ⚡ {{ t('payment.lightning.configureRequired') }}
            </h4>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
              {{ t('payment.lightning.configureDescription') }}
            </p>
            <NuxtLink to="/settings/lightning">
              <UButton
                color="amber"
                variant="soft"
                icon="i-heroicons-cog-6-tooth"
                size="sm"
              >
                {{ t('payment.lightning.goToSettings') }}
              </UButton>
            </NuxtLink>
          </div>
          
          <div class="flex justify-center gap-3">
            <UButton
              color="primary"
              size="lg"
              @click="handleTryAgain"
            >
              {{ t('common.tryAgain') }}
            </UButton>
            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              @click="handleCancel"
            >
              {{ t('payment.lightning.cancelPayment') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
