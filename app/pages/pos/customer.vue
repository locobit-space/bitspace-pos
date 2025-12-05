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
  middleware: ['auth'],
});

const _t = useI18n();
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

// Success animation auto-clear (15s to allow e-bill QR scanning)
watch(() => pos.paymentState.value.status, (status) => {
  if (status === 'paid') {
    setTimeout(() => {
      pos.setPaymentState({ status: 'idle' });
    }, 15000); // 15 seconds for customer to scan e-bill
  }
});

// Current time
const currentTime = ref(new Date());

// Promotional messages for idle state
const promoMessages = [
  { icon: '☕', title: 'Fresh Coffee Daily', subtitle: 'Locally roasted beans' },
  { icon: '⚡', title: 'Pay with Lightning', subtitle: 'Fast & secure payments' },
  { icon: '🎁', title: 'Earn Loyalty Points', subtitle: 'Rewards on every purchase' },
  { icon: '🌿', title: 'Organic Ingredients', subtitle: 'Farm to cup freshness' },
];
const currentPromoIndex = ref(0);
const isPromoTransitioning = ref(false);

// Order type display info
interface OrderTypeDisplay {
  icon: string;
  label: string;
  color: string;
}
const orderTypeInfo = computed<OrderTypeDisplay>(() => {
  const types: Record<string, OrderTypeDisplay> = {
    dine_in: { icon: '🍽️', label: 'Dine In', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    take_away: { icon: '🥡', label: 'Take Away', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    delivery: { icon: '🛵', label: 'Delivery', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    pickup: { icon: '🏃', label: 'Pickup', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  };
  return types[pos.orderType.value] ?? types.dine_in!;
});

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
    isPromoTransitioning.value = true;
    setTimeout(() => {
      currentPromoIndex.value = (currentPromoIndex.value + 1) % promoMessages.length;
      isPromoTransitioning.value = false;
    }, 300);
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

const formatDate = computed(() => {
  return currentTime.value.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
});
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden">
    <!-- Minimal Header -->
    <header class="px-8 py-5 flex justify-between items-center bg-white dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <span class="text-2xl">☕</span>
        </div>
        <div>
          <h1 class="text-xl font-semibold tracking-tight">Berkeley Café</h1>
          <p class="text-sm text-gray-400 font-light">{{ formatDate }}</p>
        </div>
      </div>
      <div class="flex items-center gap-8">
        <div v-if="pos.cartItems.value.length > 0" class="flex items-center gap-2 text-gray-500">
          <span class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center">
            {{ pos.itemCount.value }}
          </span>
          <span class="text-sm">items</span>
        </div>
        <div class="text-right">
          <div class="text-2xl font-light tabular-nums">{{ formatTime }}</div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden relative">
      <!-- ============================================ -->
      <!-- IDLE STATE -->
      <!-- ============================================ -->
      <div v-if="displayState === 'idle'" class="h-full flex flex-col items-center justify-center bg-white dark:bg-gray-950">
        <!-- Promo Content -->
        <div 
          class="text-center transition-all duration-300 ease-out"
          :class="isPromoTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'"
        >
          <div class="text-9xl mb-6 filter drop-shadow-sm">{{ promoMessages[currentPromoIndex]?.icon }}</div>
          <h2 class="text-5xl font-light text-gray-800 dark:text-gray-100 tracking-tight">
            {{ promoMessages[currentPromoIndex]?.title }}
          </h2>
          <p class="text-xl text-gray-400 font-light mt-3">
            {{ promoMessages[currentPromoIndex]?.subtitle }}
          </p>
        </div>

        <!-- Promo Dots -->
        <div class="flex gap-2 mt-12">
          <span 
            v-for="(_, i) in promoMessages" 
            :key="i"
            class="w-2 h-2 rounded-full transition-all duration-300"
            :class="i === currentPromoIndex ? 'w-6 bg-amber-500' : 'bg-gray-200 dark:bg-gray-800'"
          />
        </div>
        
        <!-- Payment methods -->
        <div class="absolute bottom-16 flex gap-10">
          <div class="flex items-center gap-3 px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500">
            <span class="text-xl">💵</span>
            <span class="font-medium">Cash</span>
          </div>
          <div class="flex items-center gap-3 px-5 py-3 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
            <span class="text-xl">⚡</span>
            <span class="font-medium">Lightning</span>
          </div>
          <div class="flex items-center gap-3 px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500">
            <span class="text-xl">📱</span>
            <span class="font-medium">QR Pay</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- ACTIVE STATE: Cart -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'active'" class="h-full flex">
        <!-- Cart Items -->
        <div class="flex-1 flex flex-col bg-white dark:bg-gray-950">
          <!-- Order Type Badge -->
          <div class="px-8 pt-6 pb-2">
            <div 
              class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              :class="orderTypeInfo.color"
            >
              <span class="text-lg">{{ orderTypeInfo.icon }}</span>
              <span>{{ orderTypeInfo.label }}</span>
              <span v-if="pos.orderType.value === 'dine_in' && pos.tableNumber.value" class="font-bold">
                · Table {{ pos.tableNumber.value }}
              </span>
            </div>
          </div>
          
          <div class="flex-1 overflow-y-auto px-8 py-4">
            <TransitionGroup name="list" tag="div" class="space-y-3">
              <div
                v-for="(item, index) in pos.cartItems.value"
                :key="`${item.product?.id || index}-${index}`"
                class="flex items-center gap-5 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
              >
                <!-- Icon -->
                <div class="w-14 h-14 rounded-2xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center text-2xl">
                  {{ item.product?.image || '📦' }}
                </div>
                
                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-medium truncate">{{ item.product?.name || 'Product' }}</h3>
                  <div v-if="item.selectedVariant || item.selectedModifiers?.length" class="text-sm text-gray-400 mt-0.5">
                    <span v-if="item.selectedVariant" class="text-amber-600 dark:text-amber-400">{{ item.selectedVariant.name }}</span>
                    <span v-if="item.selectedModifiers?.length" class="text-gray-400"> · {{ item.selectedModifiers.map(m => m.name).join(', ') }}</span>
                  </div>
                  <p v-if="item.notes" class="text-sm text-blue-500 mt-1 italic">"{{ item.notes }}"</p>
                </div>
                
                <!-- Qty -->
                <div class="flex items-center gap-1">
                  <span class="text-gray-400">×</span>
                  <span class="text-xl font-semibold w-8 text-center">{{ item.quantity }}</span>
                </div>
                
                <!-- Price -->
                <div class="w-36 text-right">
                  <div class="text-lg font-semibold">{{ currency.format(item.total, pos.selectedCurrency.value) }}</div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </div>

        <!-- Summary Panel -->
        <div class="w-96 bg-gradient-to-b from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col justify-end p-8 border-l border-gray-200 dark:border-gray-800">
          <div class="space-y-4">
            <div class="flex justify-between text-lg text-gray-500">
              <span>Subtotal</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ currency.format(pos.subtotal.value, pos.selectedCurrency.value) }}</span>
            </div>
            <div v-if="pos.tipAmount.value > 0" class="flex justify-between text-lg text-gray-500">
              <span>Tip</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">{{ currency.format(pos.tipAmount.value, pos.selectedCurrency.value) }}</span>
            </div>
          </div>
          
          <div class="border-t-2 border-gray-200 dark:border-gray-800 mt-6 pt-6">
            <div class="flex justify-between items-end">
              <span class="text-xl text-gray-500">Total</span>
              <div class="text-right">
                <div class="text-5xl font-bold tracking-tight">{{ currency.format(pos.total.value, pos.selectedCurrency.value) }}</div>
                <div v-if="pos.totalSats.value > 0" class="text-xl text-amber-500 font-medium mt-2 flex items-center justify-end gap-1">
                  <span>⚡</span>
                  <span>{{ pos.totalSats.value.toLocaleString() }} sats</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- PAYMENT STATE: Multiple Payment Methods -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'payment'" class="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
        
        <!-- ==================== -->
        <!-- LIGHTNING PAYMENT -->
        <!-- ==================== -->
        <div v-if="pos.paymentState.value.method === 'lightning' || pos.paymentState.value.invoiceData" class="flex items-center justify-center gap-24 w-full">
          <!-- QR Code -->
          <div class="text-center">
            <div class="relative">
              <div v-if="pos.paymentState.value.invoiceData" class="bg-white p-8 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none dark:border dark:border-gray-800">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pos.paymentState.value.invoiceData)}`"
                  alt="QR"
                  class="w-72 h-72"
                >
              </div>
              <div v-else class="w-72 h-72 bg-gray-100 dark:bg-gray-900 rounded-3xl flex items-center justify-center">
                <span class="text-7xl animate-pulse">⚡</span>
              </div>
              <!-- Corner accent -->
              <div class="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full animate-ping opacity-75" />
              <div class="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full" />
            </div>
            <p class="text-gray-500 mt-6 text-lg">Scan with Lightning wallet</p>
          </div>

          <!-- Amount -->
          <div class="text-center">
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mb-4">
              <span class="text-xl">⚡</span>
              <span class="font-semibold">Lightning Payment</span>
            </div>
            <p class="text-gray-400 text-lg mb-2">Amount Due</p>
            <div class="text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
            </div>
            <div class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-2xl font-semibold">
              <span>⚡</span>
              <span>{{ (pos.paymentState.value.satsAmount || pos.totalSats.value).toLocaleString() }} sats</span>
            </div>
            
            <!-- Waiting indicator -->
            <div class="mt-12">
              <div class="flex items-center justify-center gap-3">
                <div class="payment-loader" />
                <span class="text-gray-500 text-lg">Waiting for payment...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== -->
        <!-- BANK TRANSFER -->
        <!-- ==================== -->
        <div v-else-if="pos.paymentState.value.method === 'bank_transfer'" class="flex items-center justify-center gap-20 w-full px-12">
          <!-- Bank QR Code -->
          <div class="text-center">
            <div class="relative">
              <!-- Bank Logo -->
              <div class="absolute -top-4 -left-4 z-10">
                <div class="w-16 h-16 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
                  <span v-if="pos.paymentState.value.bankCode === 'bcel'" class="text-3xl">🏦</span>
                  <span v-else-if="pos.paymentState.value.bankCode === 'ldb'" class="text-3xl">🏛️</span>
                  <span v-else-if="pos.paymentState.value.bankCode === 'jdb'" class="text-3xl">💳</span>
                  <span v-else class="text-3xl">🏦</span>
                </div>
              </div>
              
              <div v-if="pos.paymentState.value.bankQrData" class="bg-white p-8 rounded-3xl shadow-xl shadow-blue-200/50 dark:shadow-none dark:border dark:border-gray-800">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pos.paymentState.value.bankQrData)}`"
                  alt="Bank QR"
                  class="w-72 h-72"
                >
              </div>
              <div v-else class="w-72 h-72 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-blue-300 dark:border-blue-700">
                <span class="text-6xl mb-4">🏦</span>
                <span class="text-blue-600 dark:text-blue-400 font-medium">Bank Transfer</span>
              </div>
            </div>
            <p class="text-gray-500 mt-6 text-lg">Scan with banking app</p>
          </div>

          <!-- Bank Details & Amount -->
          <div class="text-center max-w-md">
            <!-- Bank Badge -->
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-6">
              <span class="text-xl">🏦</span>
              <span class="font-semibold">{{ pos.paymentState.value.bankName || 'Bank Transfer' }}</span>
            </div>
            
            <!-- Amount -->
            <p class="text-gray-400 text-lg mb-2">Amount Due</p>
            <div class="text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
              {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
            </div>
            
            <!-- Account Details -->
            <div v-if="pos.paymentState.value.accountNumber" class="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 text-left space-y-3">
              <div class="flex justify-between">
                <span class="text-gray-400">Bank</span>
                <span class="font-semibold text-gray-700 dark:text-gray-300">{{ pos.paymentState.value.bankName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-400">Account</span>
                <span class="font-mono font-semibold text-gray-700 dark:text-gray-300">{{ pos.paymentState.value.accountNumber }}</span>
              </div>
              <div v-if="pos.paymentState.value.accountName" class="flex justify-between">
                <span class="text-gray-400">Name</span>
                <span class="font-semibold text-gray-700 dark:text-gray-300">{{ pos.paymentState.value.accountName }}</span>
              </div>
            </div>
            
            <!-- Waiting indicator -->
            <div class="mt-8">
              <div class="flex items-center justify-center gap-3">
                <div class="payment-loader border-blue-500 border-t-blue-200" />
                <span class="text-gray-500 text-lg">Waiting for transfer...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== -->
        <!-- CASH PAYMENT -->
        <!-- ==================== -->
        <div v-else-if="pos.paymentState.value.method === 'cash'" class="text-center">
          <div class="mb-8">
            <div class="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
              <span class="text-8xl">💵</span>
            </div>
          </div>
          
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-6">
            <span class="text-xl">💵</span>
            <span class="font-semibold">Cash Payment</span>
          </div>
          
          <p class="text-gray-400 text-xl mb-3">Please pay</p>
          <div class="text-8xl font-bold tracking-tight text-gray-900 dark:text-white mb-8">
            {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
          </div>
          
          <div class="flex items-center justify-center gap-3 text-gray-400">
            <div class="payment-loader border-green-500 border-t-green-200" />
            <span class="text-lg">Processing payment...</span>
          </div>
        </div>

        <!-- ==================== -->
        <!-- EXTERNAL / OTHER PAYMENT -->
        <!-- ==================== -->
        <div v-else-if="pos.paymentState.value.method === 'external'" class="text-center">
          <div class="mb-8">
            <div class="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
              <span class="text-8xl">📱</span>
            </div>
          </div>
          
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-6">
            <span class="text-xl">📱</span>
            <span class="font-semibold">{{ pos.paymentState.value.externalMethod || 'External Payment' }}</span>
          </div>
          
          <p class="text-gray-400 text-xl mb-3">Amount Due</p>
          <div class="text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-8">
            {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
          </div>
          
          <p class="text-gray-500 text-lg mb-8">Please complete payment on the terminal</p>
          
          <div class="flex items-center justify-center gap-3 text-gray-400">
            <div class="payment-loader border-purple-500 border-t-purple-200" />
            <span class="text-lg">Waiting for confirmation...</span>
          </div>
        </div>

        <!-- ==================== -->
        <!-- DEFAULT: Generic Pending -->
        <!-- ==================== -->
        <div v-else class="text-center">
          <div class="mb-8">
            <div class="w-40 h-40 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              <span class="text-8xl animate-pulse">💳</span>
            </div>
          </div>
          
          <p class="text-gray-400 text-xl mb-3">Amount Due</p>
          <div class="text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-8">
            {{ currency.format(pos.paymentState.value.amount || pos.total.value, pos.selectedCurrency.value) }}
          </div>
          
          <div class="flex items-center justify-center gap-3 text-gray-400">
            <div class="payment-loader" />
            <span class="text-lg">Processing...</span>
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- SUCCESS STATE -->
      <!-- ============================================ -->
      <div v-else-if="displayState === 'success'" class="h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-950 dark:to-gray-900">
        <div class="text-center w-full max-w-4xl mx-auto px-8">
          <div class="flex flex-col lg:flex-row items-center justify-center gap-16">
            <!-- Left: Success Message -->
            <div class="text-center flex-1">
              <!-- Animated checkmark -->
              <div class="success-checkmark mb-8 mx-auto">
                <div class="check-icon">
                  <span class="icon-line line-tip" />
                  <span class="icon-line line-long" />
                  <div class="icon-circle" />
                  <div class="icon-fix" />
                </div>
              </div>
              <h2 class="text-6xl font-light text-green-600 dark:text-green-400 mb-4 tracking-tight">Thank You!</h2>
              <p class="text-2xl text-gray-500 font-light mb-8">Payment successful</p>
              
              <!-- Amount Display -->
              <div v-if="pos.paymentState.value.amount" class="p-6 bg-white/70 dark:bg-gray-800/50 rounded-2xl backdrop-blur-sm inline-block">
                <p class="text-sm text-gray-400 uppercase tracking-wide mb-1">Amount Paid</p>
                <p class="text-4xl font-bold text-gray-900 dark:text-white">
                  {{ currency.format(pos.paymentState.value.amount, pos.selectedCurrency.value) }}
                </p>
                <p v-if="pos.paymentState.value.satsAmount" class="text-lg text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
                  <span>⚡</span> {{ currency.format(pos.paymentState.value.satsAmount, 'SATS') }}
                </p>
              </div>
            </div>

            <!-- Right: E-Bill QR Code -->
            <div v-if="pos.paymentState.value.eBillUrl" class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl shadow-gray-200/50 dark:shadow-none">
              <div class="text-center mb-6">
                <p class="text-xl font-semibold text-gray-900 dark:text-white">📱 Digital Receipt</p>
                <p class="text-gray-500 mt-1">Scan for your e-bill</p>
              </div>
              
              <!-- QR Code -->
              <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl">
                <img
                  :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pos.paymentState.value.eBillUrl)}`"
                  alt="E-Bill QR Code"
                  class="w-48 h-48 mx-auto"
                >
              </div>
              
              <p class="mt-5 text-sm text-gray-400 text-center">
                Receipt ID: <span class="font-mono text-amber-600 dark:text-amber-400">{{ pos.paymentState.value.eBillId }}</span>
              </p>
            </div>
          </div>

          <!-- Footer message -->
          <p class="text-xl text-gray-400 mt-12">Have a great day! ☀️</p>
        </div>
      </div>
    </main>

    <!-- Minimal Footer -->
    <footer class="px-8 py-3 bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm text-gray-400">
      <span class="font-medium">BitSpace POS</span>
      <div class="flex items-center gap-4">
        <span class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Connected</span>
        </span>
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Payment Loader */
.payment-loader {
  width: 24px;
  height: 24px;
  border: 3px solid #d4d4d8;
  border-top-color: #f59e0b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Success Checkmark Animation */
.success-checkmark {
  width: 140px;
  height: 140px;
  margin: 0 auto;
}

.check-icon {
  width: 140px;
  height: 140px;
  position: relative;
  border-radius: 50%;
  box-sizing: content-box;
  border: 5px solid #22c55e;
}

.check-icon::before {
  content: '';
  position: absolute;
  top: 3px;
  left: -3px;
  width: 30px;
  height: 100px;
  border-radius: 40% 0 0 40%;
  transform-origin: 100% 50%;
  transform: rotate(-45deg);
  background-color: #f0fdf4;
}

.dark .check-icon::before {
  background-color: #030712;
}

.check-icon::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50px;
  width: 60px;
  height: 120px;
  border-radius: 0 60% 60% 0;
  transform-origin: 0 50%;
  transform: rotate(-45deg);
  background-color: #f0fdf4;
}

.dark .check-icon::after {
  background-color: #030712;
}

.icon-line {
  height: 8px;
  background-color: #22c55e;
  display: block;
  border-radius: 4px;
  position: absolute;
  z-index: 10;
}

.line-tip {
  width: 40px;
  left: 22px;
  top: 76px;
  transform: rotate(45deg);
  animation: icon-line-tip 0.75s;
}

.line-long {
  width: 70px;
  right: 12px;
  top: 62px;
  transform: rotate(-45deg);
  animation: icon-line-long 0.75s;
}

.icon-circle {
  width: 140px;
  height: 140px;
  position: absolute;
  border-radius: 50%;
  box-sizing: content-box;
  top: -8px;
  left: -8px;
  border: 5px solid rgba(34, 197, 94, 0.3);
  animation: circle 0.75s;
}

.icon-fix {
  background-color: #f0fdf4;
  width: 10px;
  height: 105px;
  position: absolute;
  left: 34px;
  top: 12px;
  z-index: 1;
  transform: rotate(-45deg);
}

.dark .icon-fix {
  background-color: #030712;
}

@keyframes icon-line-tip {
  0% { width: 0; left: 1px; top: 19px; }
  54% { width: 0; left: 1px; top: 19px; }
  70% { width: 50px; left: 4px; top: 82px; }
  84% { width: 25px; left: 18px; top: 71px; }
  100% { width: 40px; left: 22px; top: 76px; }
}

@keyframes icon-line-long {
  0% { width: 0; right: 56px; top: 74px; }
  65% { width: 0; right: 56px; top: 74px; }
  84% { width: 75px; right: 2px; top: 60px; }
  100% { width: 70px; right: 12px; top: 62px; }
}

@keyframes circle {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}
</style>
