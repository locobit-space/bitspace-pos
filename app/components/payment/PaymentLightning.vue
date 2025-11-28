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

// State
const paymentStep = ref<'generating' | 'waiting' | 'success' | 'error'>('generating');
const errorMessage = ref('');
const countdown = ref(600); // 10 minutes
const showBolt12 = ref(false);

// Generate invoice on mount
onMounted(async () => {
  await generateInvoice();
});

const generateInvoice = async () => {
  paymentStep.value = 'generating';
  
  try {
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
      throw new Error('Failed to generate invoice');
    }
  } catch (e) {
    paymentStep.value = 'error';
    errorMessage.value = e instanceof Error ? e.message : 'Failed to generate invoice';
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
      errorMessage.value = 'Invoice expired';
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
      <h2 class="text-2xl font-bold flex items-center justify-center gap-2">
        <span class="text-3xl">⚡</span>
        Lightning Payment
      </h2>
      <p class="text-gray-400 mt-2">Scan QR code or copy invoice</p>
    </div>

    <!-- Amount Display -->
    <div class="mb-6 p-4 bg-gray-800 rounded-xl">
      <div class="text-3xl font-bold text-amber-400">
        {{ currencyHelper.format(amount, 'SATS') }}
      </div>
      <div class="text-gray-400 text-sm mt-1">
        ≈ {{ currencyHelper.format(fiatAmount, currency) }}
      </div>
    </div>

    <!-- Generating State -->
    <div v-if="paymentStep === 'generating'" class="py-12">
      <div class="animate-spin w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
      <p class="mt-4 text-gray-400">Generating invoice...</p>
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
      <div class="bg-white p-4 rounded-2xl inline-block">
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
      <div class="text-sm text-gray-400">
        Expires in <span class="text-amber-400 font-mono">{{ formattedCountdown }}</span>
      </div>

      <!-- Invoice Actions -->
      <div class="flex justify-center gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-clipboard-document"
          @click="copyInvoice"
        >
          Copy Invoice
        </UButton>
        <UButton
          color="primary"
          icon="i-heroicons-bolt"
          @click="openWallet"
        >
          Open Wallet
        </UButton>
      </div>

      <!-- Invoice String (truncated) -->
      <div class="mt-4 p-3 bg-gray-800 rounded-lg text-xs font-mono text-gray-400 break-all max-h-20 overflow-hidden">
        {{ lightning.invoiceQR.value?.slice(0, 100) }}...
      </div>

      <!-- Payment Status Indicator -->
      <div class="mt-6 flex items-center justify-center gap-2 text-gray-400">
        <div class="animate-pulse w-2 h-2 bg-amber-500 rounded-full" />
        Waiting for payment...
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="paymentStep === 'success'" class="py-8">
      <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">✓</span>
      </div>
      <h3 class="text-xl font-bold text-green-400">Payment Received!</h3>
      <p class="text-gray-400 mt-2">Thank you for your payment</p>
      
      <div class="mt-4 p-3 bg-gray-800 rounded-lg text-xs font-mono text-gray-500">
        Preimage: {{ lightning.currentInvoice.value?.preimage?.slice(0, 32) }}...
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="paymentStep === 'error'" class="py-8">
      <div class="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-4xl">✕</span>
      </div>
      <h3 class="text-xl font-bold text-red-400">Payment Failed</h3>
      <p class="text-gray-400 mt-2">{{ errorMessage }}</p>
      
      <UButton
        class="mt-4"
        color="primary"
        @click="generateInvoice"
      >
        Try Again
      </UButton>
    </div>

    <!-- Cancel Button -->
    <div class="mt-6">
      <UButton
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        Cancel Payment
      </UButton>
    </div>

    <!-- Tips Section -->
    <div class="mt-6 p-4 bg-gray-800/50 rounded-xl text-left text-sm">
      <h4 class="font-medium text-gray-300 mb-2">💡 Tips</h4>
      <ul class="text-gray-400 space-y-1 text-xs">
        <li>• Use any Lightning wallet to scan</li>
        <li>• Popular wallets: Phoenix, Breez, Muun, Zeus</li>
        <li>• Payment confirms instantly</li>
        <li>• BOLT12 offers work offline!</li>
      </ul>
    </div>
  </div>
</template>
