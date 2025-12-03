<!-- pages/pos/customer.vue -->
<!-- 🖥️ Customer Display Screen - Minimal & Clean Design -->
<script setup lang="ts">
/**
 * CUSTOMER-FACING DISPLAY
 * 
 * Minimal, clean design for secondary monitor facing the customer.
 * Syncs with the main POS terminal in real-time via BroadcastChannel.
 */

definePageMeta({
  layout: 'blank',
});

const { t } = useI18n();
const pos = usePOS();
const currency = useCurrency();

// ============================================
// Display States
// ============================================
type DisplayState = 'idle' | 'active' | 'payment' | 'success';

const displayState = computed<DisplayState>(() => {
  if (pos.paymentState.value.status === 'paid') return 'success';
  if (pos.paymentState.value.status === 'pending') return 'payment';
  if (pos.cartItems.value.length > 0) return 'active';
  return 'idle';
});

// Success animation auto-clear
watch(() => pos.paymentState.value.status, (status) => {
  if (status === 'paid') {
    setTimeout(() => {
      pos.setPaymentState({ status: 'idle' });
    }, 5000);
  }
});

// Current time
const currentTime = ref(new Date());

// Promotional messages for idle state
const promoMessages = [
  { icon: '☕', title: 'Fresh Coffee Daily' },
  { icon: '⚡', title: 'Pay with Lightning' },
  { icon: '🎁', title: 'Earn Loyalty Points' },
  { icon: '🌿', title: 'Organic Ingredients' },
];
const currentPromoIndex = ref(0);

// ============================================
// Lifecycle
// ============================================
let timeInterval: ReturnType<typeof setInterval>;
let promoInterval: ReturnType<typeof setInterval>;

onMounted(async () => {
  await currency.init('LAK');
  
  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
  
  promoInterval = setInterval(() => {
    currentPromoIndex.value = (currentPromoIndex.value + 1) % promoMessages.length;
  }, 4000);
});

onUnmounted(() => {
  clearInterval(timeInterval);
  clearInterval(promoInterval);
});

// ============================================
// Formatting
// ============================================
const formatTime = computed(() => {
  return currentTime.value.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
});
</script>

<template>
  <div class="h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
    <!-- Minimal Header -->
    <header class="px-8 py-5 flex justify-between items-center border-b border-gray-100 dark:border-gray-900">
      <div class="flex items-center gap-4">
        <span class="text-3xl">☕</span>
        <div>
          <h1 class="text-xl font-semibold">Berkeley Café</h1>
          <p class="text-sm text-gray-400">{{ t('pos.welcomeMessage') || 'Welcome' }}</p>
        </div>
      </div>
      <div class="flex items-center gap-6">
        <div v-if="pos.cartItems.value.length > 0" class="text-sm text-gray-500">
          {{ pos.itemCount.value }} items
        </div>
        <div class="text-2xl font-light tabular-nums text-gray-400">
          {{ formatTime }}
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <!-- ============================================ -->
      <!-- IDLE STATE -->
      <!-- ============================================ -->
      <div v-if="displayState === 'idle'" class="h-full flex flex-col items-center justify-center">
        <div class="text-center transition-all duration-700">
          <div class="text-8xl mb-8">{{ promoMessages[currentPromoIndex]?.icon }}</div>
          <h2 class="text-4xl font-light text-gray-700 dark:text-gray-200">
            {{ promoMessages[currentPromoIndex]?.title }}
          </h2>
        </div>
        
        <!-- Payment methods -->
        <div class="absolute bottom-12 flex gap-12 text-gray-400">
          <div class="flex items-center gap-2">
            <span class="text-xl">💵</span>
            <span>Cash</span>
          </div>
          <div class="flex items-center gap-2 text-amber-500">
            <span class="text-xl">⚡</span>
            <span>Lightning</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📱</span>
            <span>QR</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- ACTIVE STATE: Cart -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'active'" class="h-full flex">
        <!-- Cart Items -->
        <div class="flex-1 flex flex-col">
          <div class="flex-1 overflow-y-auto px-8 py-6">
            <TransitionGroup name="list" tag="div" class="space-y-4">
              <div
                v-for="(item, index) in pos.cartItems.value"
                :key="`${item.product?.id || index}-${index}`"
                class="flex items-center gap-6 py-4 border-b border-gray-100 dark:border-gray-900"
              >
                <!-- Icon -->
                <div class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-2xl">
                  {{ item.product?.image || '📦' }}
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium truncate">{{ item.product?.name || 'Product' }}</h3>
                  <div v-if="item.selectedVariant || item.selectedModifiers?.length" class="text-sm text-gray-400 mt-0.5">
                    <span v-if="item.selectedVariant">{{ item.selectedVariant.name }}</span>
                    <span v-if="item.selectedModifiers?.length"> · {{ item.selectedModifiers.map(m => m.name).join(', ') }}</span>
                  </div>
                  <p v-if="item.notes" class="text-sm text-amber-500 mt-1">{{ item.notes }}</p>
                </div>
                
                <!-- Qty -->
                <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-lg font-semibold">
                  {{ item.quantity }}
                </div>
                
                <!-- Price -->
                <div class="w-32 text-right">
                  <div class="text-lg font-semibold">{{ currency.format(item.total, pos.selectedCurrency.value) }}</div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </div>

        <!-- Summary Panel -->
        <div class="w-80 bg-gray-50 dark:bg-gray-900/50 flex flex-col justify-end p-8">
          <div class="space-y-3 text-lg">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>{{ currency.format(pos.subtotal.value, pos.selectedCurrency.value) }}</span>
            </div>
            <div v-if="pos.tipAmount.value > 0" class="flex justify-between text-gray-500">
              <span>Tip</span>
              <span>{{ currency.format(pos.tipAmount.value, pos.selectedCurrency.value) }}</span>
            </div>
          </div>
          
          <div class="border-t border-gray-200 dark:border-gray-800 mt-6 pt-6">
            <div class="flex justify-between items-end">
              <span class="text-xl text-gray-500">Total</span>
              <div class="text-right">
                <div class="text-4xl font-bold">{{ currency.format(pos.total.value, pos.selectedCurrency.value) }}</div>
                <div v-if="pos.totalSats.value > 0" class="text-lg text-amber-500 mt-1">
                  ⚡ {{ pos.totalSats.value.toLocaleString() }} sats
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- PAYMENT STATE: QR Code -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'payment'" class="h-full flex items-center justify-center gap-20">
        <!-- QR Code -->
        <div class="text-center">
          <div v-if="pos.paymentState.value.invoiceData" class="bg-white p-6 rounded-3xl inline-block">
            <img
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pos.paymentState.value.invoiceData)}`"
              alt="QR"
              class="w-64 h-64"
            >
          </div>
          <div v-else class="w-64 h-64 bg-gray-100 dark:bg-gray-900 rounded-3xl flex items-center justify-center">
            <span class="text-6xl animate-pulse">⚡</span>
          </div>
          <p class="text-gray-400 mt-4">Scan with Lightning wallet</p>
        </div>

        <!-- Amount -->
        <div class="text-center">
          <p class="text-gray-400 mb-2">Amount Due</p>
          <div class="text-6xl font-bold mb-4">
            {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
          </div>
          <div class="text-2xl text-amber-500">
            ⚡ {{ (pos.paymentState.value.satsAmount || pos.totalSats.value).toLocaleString() }} sats
          </div>
          
          <!-- Waiting indicator -->
          <div class="flex items-center justify-center gap-2 text-gray-400 mt-10">
            <span class="flex gap-1">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 0ms" />
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 100ms" />
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style="animation-delay: 200ms" />
            </span>
            <span>Waiting for payment</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- SUCCESS STATE -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'success'" class="h-full flex items-center justify-center">
        <div class="text-center animate-fade-in">
          <div class="text-9xl mb-8">✓</div>
          <h2 class="text-5xl font-light text-green-500 mb-4">Thank You!</h2>
          <p class="text-xl text-gray-400">Payment received</p>
        </div>
      </div>
    </main>

    <!-- Minimal Footer -->
    <footer class="px-8 py-3 border-t border-gray-100 dark:border-gray-900 flex justify-between text-sm text-gray-400">
      <span>BitSpace POS</span>
      <div class="flex items-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span>Live</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* List animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Fade in */
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>
