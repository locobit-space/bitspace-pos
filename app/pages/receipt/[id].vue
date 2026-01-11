<!-- pages/receipt/[id].vue -->
<!-- 📱 E-Bill Public Page - Customer Digital Receipt -->
<script setup lang="ts">
import type { EReceipt } from "~/composables/use-receipt";

definePageMeta({
  layout: "blank",
});

useHead({
  title: "Digital Receipt - bnos.space",
});

const route = useRoute();
const receipt = useReceipt();
const receiptGenerator = useReceiptGenerator();
const currency = useCurrency();
const relay = useNostrRelay();

// State
const eBill = ref<EReceipt | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const canShare = ref(false);
const showVerified = ref(false);
const qrCodeUrl = ref<string | null>(null);

// Load receipt
onMounted(async () => {
  // Check if Web Share API is supported
  canShare.value = typeof navigator !== "undefined" && !!navigator.share;

  // Initialize Nostr relay (required for fetching receipts)
  await relay.init();

  const receiptId = route.params.id as string;
  const receiptCode = route.query.code as string;

  if (!receiptId) {
    error.value = "Receipt ID not provided";
    loading.value = false;
    return;
  }

  // Try localStorage first (fast)
  const storedReceipt = receipt.retrieveEBill(receiptId);

  if (storedReceipt) {
    // Verify code matches (security check) even for cached receipts
    if (receiptCode && storedReceipt.code !== receiptCode) {
      error.value = "Invalid receipt code";
      loading.value = false;
      return;
    }
    eBill.value = storedReceipt;
  } else {
    // Fetch from Nostr using receipt ID and code for decryption
    // 🔐 The receiptCode is required to decrypt encrypted receipts
    const fetchedReceipt = await receiptGenerator.fetchReceiptById(
      receiptId,
      receiptCode
    );

    if (fetchedReceipt) {
      eBill.value = fetchedReceipt;
    } else {
      // Could be: not found, expired, or invalid/missing code
      if (!receiptCode) {
        error.value = "Receipt code required to view this receipt";
      } else {
        error.value = "Receipt not found, expired, or invalid code";
      }
    }
  }

  // Check expiration
  if (eBill.value?.expiresAt && new Date(eBill.value.expiresAt) < new Date()) {
    error.value = "Receipt expired (90 days retention)";
    eBill.value = null;
  }

  // Initialize currency from the receipt (use currency from event/receipt data)
  if (eBill.value?.currency) {
    await currency.init(eBill.value.currency);
  }

  loading.value = false;

  // Trigger verified animation after load
  if (eBill.value) {
    setTimeout(() => {
      showVerified.value = true;
    }, 300);

    // Generate QR code for the receipt URL
    try {
      const QRCode = await import("qrcode");
      qrCodeUrl.value = await QRCode.toDataURL(window.location.href, {
        width: 200,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#1f2937",
          light: "#ffffff",
        },
      });
    } catch (err) {
      console.warn("Failed to generate QR code:", err);
    }
  }
});

// Format date
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format short date for header
const formatShortDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Format time only
const formatTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Download receipt as image
const downloadReceipt = () => {
  // Could implement html2canvas here
  window.print();
};

// Share receipt
const shareReceipt = async () => {
  if (navigator.share && eBill.value) {
    try {
      await navigator.share({
        title: `Receipt from ${eBill.value.merchantName}`,
        text: `Order ${eBill.value.orderId} - ${currency.format(
          eBill.value.total,
          eBill.value.currency
        )}`,
        url: window.location.href,
      });
    } catch {
      // User cancelled or not supported
    }
  }
};
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
  >
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="relative">
          <div
            class="w-20 h-20 border-4 border-emerald-200 dark:border-emerald-900 rounded-full"
          />
          <div
            class="absolute inset-0 w-20 h-20 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"
          />
          <div
            class="absolute inset-0 flex items-center justify-center text-2xl"
          >
            🧾
          </div>
        </div>
        <p class="text-gray-500 dark:text-gray-400 mt-4 font-medium">
          Verifying receipt...
        </p>
      </div>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen p-6"
    >
      <div class="text-center max-w-md">
        <div
          class="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
        >
          <UIcon
            name="i-heroicons-lock-closed"
            class="w-12 h-12 text-red-500"
          />
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Unable to Verify
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
        <div
          class="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-left text-sm"
        >
          <p class="text-gray-500 dark:text-gray-400 mb-2">
            <strong>Possible reasons:</strong>
          </p>
          <ul class="text-gray-500 dark:text-gray-400 space-y-1 list-disc ml-4">
            <li>The receipt link is incomplete</li>
            <li>The verification code is incorrect</li>
            <li>The receipt has expired (90 days retention)</li>
          </ul>
        </div>
        <p class="text-xs text-gray-400 mt-4">
          Please contact the merchant if you need assistance.
        </p>
      </div>
    </div>

    <!-- E-Bill Content -->
    <div v-else-if="eBill" class="max-w-lg mx-auto p-4 py-8">
      <!-- Verified Badge - Floating -->
      <div
        class="flex justify-center mb-4 print:hidden"
        :class="{ 'animate-fade-in': showVerified }"
      >
        <div
          class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 rounded-full"
        >
          <div class="relative">
            <UIcon
              name="i-heroicons-shield-check-solid"
              class="w-5 h-5 text-emerald-500"
            />
            <span
              class="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping"
            />
          </div>
          <span
            class="text-sm font-medium text-emerald-600 dark:text-emerald-400"
            >Verified Digital Receipt</span
          >
        </div>
      </div>

      <!-- Receipt Card -->
      <div
        class="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50 overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <!-- Header with gradient -->
        <div
          class="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 text-center text-white overflow-hidden"
        >
          <!-- Background pattern -->
          <div
            class="absolute inset-0 opacity-10"
            style="
              background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E');
            "
          />

          <!-- Merchant Logo/Emoji -->
          <div
            class="relative w-16 h-16 mx-auto mb-3 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center text-4xl shadow-lg"
          >
            {{ receipt.settings.value.logoEmoji || "☕" }}
          </div>

          <!-- Merchant Name -->
          <h1 class="relative text-xl font-mono font-bold tracking-wide">
            {{ eBill.merchantName || "bnos.space" }}
          </h1>
          <p
            v-if="eBill.merchantAddress"
            class="relative text-gray-400 text-sm mt-1"
          >
            {{ eBill.merchantAddress }}
          </p>

          <!-- Date badge -->
          <div
            class="relative inline-flex font-mono items-center gap-2 mt-4 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-xs text-gray-300"
          >
            <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
            {{ formatShortDate(eBill.createdAt) }} •
            {{ formatTime(eBill.createdAt) }}
          </div>
        </div>

        <!-- Receipt Number - More prominent -->
        <div
          class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-4 text-center border-b border-amber-100 dark:border-amber-900/30"
        >
          <p
            class="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-semibold mb-1"
          >
            Receipt No.
          </p>
          <p
            class="font-mono text-lg font-mono font-bold text-amber-700 dark:text-amber-300 tracking-wider"
          >
            {{ eBill.code || eBill.id.slice(0, 12).toUpperCase() }}
          </p>
        </div>

        <!-- Order Reference -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center"
        >
          <div>
            <p class="text-xs font-mono text-gray-400 uppercase tracking-wide">
              Order
            </p>
            <p class="font-semibold text-gray-900 dark:text-white">
              #{{ eBill.orderCode || eBill.orderNumber || eBill.orderId }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs font-mono text-gray-400 uppercase tracking-wide">
              Items
            </p>
            <p class="font-semibold text-gray-900 dark:text-white">
              {{ eBill.items.length }}
            </p>
          </div>
        </div>

        <!-- Items List -->
        <div class="px-6 py-5">
          <div class="space-y-4">
            <div
              v-for="(item, index) in eBill.items"
              :key="index"
              class="flex justify-between items-start group"
            >
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span
                    class="w-7 h-7 font-mono rounded-lg bg-gray-100 dark:bg-gray-700 text-xs flex items-center justify-center font-bold text-gray-600 dark:text-gray-300"
                  >
                    {{ item.quantity }}×
                  </span>
                  <span class="font-medium text-gray-900 dark:text-white">{{
                    item.name
                  }}</span>
                </div>
                <div
                  v-if="item.variant"
                  class="text-xs text-amber-600 dark:text-amber-400 ml-10 mt-1 flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-tag" class="w-3 h-3" />
                  {{ item.variant }}
                </div>
                <div
                  v-if="item.modifiers?.length"
                  class="text-xs text-gray-500 ml-10 mt-0.5"
                >
                  + {{ item.modifiers.join(", ") }}
                </div>
                <div
                  v-if="item.notes"
                  class="text-xs text-blue-500 ml-10 mt-0.5 italic flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-chat-bubble-left" class="w-3 h-3" />
                  {{ item.notes }}
                </div>
              </div>
              <span
                class="font-semibold font-mono text-gray-900 dark:text-white tabular-nums"
              >
                {{ currency.format(item.total, eBill.currency) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Divider - Receipt style -->
        <div class="relative mx-6">
          <div class="absolute inset-0 flex items-center">
            <div
              class="w-full border-t-2 border-dashed border-gray-200 dark:border-gray-700"
            />
          </div>
          <div class="relative flex justify-center">
            <span
              class="bg-white dark:bg-gray-800 font-mono px-3 text-xs text-gray-400 uppercase tracking-widest"
              >Summary</span
            >
          </div>
        </div>

        <!-- Totals -->
        <div class="px-6 py-5 space-y-3">
          <div
            class="flex justify-between font-mono text-gray-500 dark:text-gray-400"
          >
            <span>Subtotal</span>
            <span class="tabular-nums">
              {{ currency.format(eBill.subtotal, eBill.currency) }}
            </span>
          </div>
          <div
            v-if="eBill.discount && eBill.discount > 0"
            class="flex justify-between text-emerald-600 font-mono dark:text-emerald-400"
          >
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-ticket" class="w-4 h-4" />
              Discount
            </span>
            <span class="tabular-nums"
              >-{{ currency.format(eBill.discount, eBill.currency) }}</span
            >
          </div>
          <div
            v-if="eBill.tax > 0"
            class="flex justify-between text-gray-500 font-mono dark:text-gray-400"
          >
            <span>Tax</span>
            <span class="tabular-nums">{{
              currency.format(eBill.tax, eBill.currency)
            }}</span>
          </div>
          <div
            v-if="eBill.tip && eBill.tip > 0"
            class="flex justify-between text-gray-500 font-mono dark:text-gray-400"
          >
            <span class="flex items-center gap-1">
              <UIcon name="i-heroicons-heart" class="w-4 h-4 text-pink-500" />
              Tip
            </span>
            <span class="tabular-nums text-pink-600 dark:text-pink-400">{{
              currency.format(eBill.tip, eBill.currency)
            }}</span>
          </div>
        </div>

        <!-- Grand Total - Premium look -->
        <div class="mx-6 mb-6">
          <div
            class="bg-gradient-to-br from-gray-900 via-gray-800 font-mono to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 rounded-2xl p-5 shadow-lg"
          >
            <div class="flex justify-between items-center">
              <span class="text-gray-400 font-medium">Total</span>
              <span class="text-3xl font-bold text-white tracking-tight">
                {{ currency.format(eBill.total, eBill.currency) }}
              </span>
            </div>
            <div
              v-if="eBill.totalSats"
              class="flex justify-between items-center mt-3 font-mono pt-3 border-t border-gray-700"
            >
              <span class="text-gray-500 flex items-center gap-1">
                <span class="text-amber-500">⚡</span> Bitcoin
              </span>
              <span
                class="text-lg font-semibold text-amber-400 font-mono tabular-nums"
              >
                {{ eBill.totalSats.toLocaleString() }} sats
              </span>
            </div>
          </div>
        </div>

        <!-- Payment Verification - Animated -->
        <div class="px-6 pb-6">
          <div
            class="relative bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-5 text-center border border-emerald-100 dark:border-emerald-800/50 overflow-hidden"
          >
            <!-- Animated background -->
            <div
              v-if="showVerified"
              class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent animate-shimmer"
            />

            <div class="relative">
              <div
                class="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                :class="{ 'animate-bounce-once': showVerified }"
              >
                <UIcon name="i-heroicons-check" class="w-8 h-8 text-white" />
              </div>
              <p
                class="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-lg"
              >
                Payment Verified
              </p>
              <p
                class="text-sm text-emerald-600 font-mono dark:text-emerald-400 mt-1"
              >
                {{ receipt.getPaymentMethodLabel(eBill.paymentMethod) }}
              </p>
              <p
                v-if="eBill.paymentProof?.paymentHash"
                class="text-xs font-mono text-emerald-500/70 mt-3 font-mono bg-emerald-100 dark:bg-emerald-900/40 rounded-lg px-3 py-1.5 inline-block"
              >
                TX: {{ eBill.paymentProof.paymentHash.slice(0, 16) }}...
              </p>
            </div>
          </div>
        </div>

        <!-- QR Code Section -->
        <div v-if="qrCodeUrl" class="px-6 pb-6 print:pb-4">
          <div
            class="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 text-center"
          >
            <p
              class="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3"
            >
              Scan to Verify
            </p>
            <div
              class="inline-block p-3 bg-white rounded-xl shadow-sm border border-gray-100"
            >
              <img
                :src="qrCodeUrl"
                alt="Receipt QR Code"
                class="w-32 h-32 mx-auto"
              />
            </div>
            <p class="text-[10px] text-gray-400 mt-3 font-mono">
              {{ eBill?.code || eBill?.id.slice(0, 12).toUpperCase() }}
            </p>
          </div>
        </div>

        <!-- Security Footer -->
        <div
          class="bg-gray-50 dark:bg-gray-900/50 px-6 py-5 border-t border-gray-100 dark:border-gray-800"
        >
          <!-- Thank you message -->
          <p
            v-if="receipt.settings.value.footerMessage"
            class="text-center text-gray-600 dark:text-gray-400 mb-4"
          >
            {{ receipt.settings.value.footerMessage }}
          </p>

          <!-- Security indicator -->
          <div
            class="flex items-center font-mono justify-center gap-3 text-xs text-gray-400"
          >
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5" />
              <span>Encrypted</span>
            </div>
            <span>•</span>
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-shield-check" class="w-3.5 h-3.5" />
              <span>Tamper-proof</span>
            </div>
            <span>•</span>
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5" />
              <span>Nostr</span>
            </div>
          </div>

          <p class="text-xs font-mono text-gray-400 text-center mt-3">
            Powered by
            <span class="font-semibold text-amber-500">bnos.space</span> ⚡
          </p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="mt-6 grid grid-cols-2 font-mono gap-3 print:hidden">
        <UButton
          color="neutral"
          variant="solid"
          size="xl"
          icon="i-heroicons-arrow-down-tray"
          block
          class="shadow-lg"
          @click="downloadReceipt"
        >
          Save
        </UButton>
        <UButton
          v-if="canShare"
          color="primary"
          variant="solid"
          size="xl"
          icon="i-heroicons-share"
          block
          class="shadow-lg"
          @click="shareReceipt"
        >
          Share
        </UButton>
      </div>

      <!-- Branding -->
      <div class="mt-8 text-center print:hidden">
        <p class="text-xs text-gray-400">
          Digital receipt by
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-amber-500 hover:underline font-medium"
            >bnos.space</a
          >
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes fade-in {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce-once {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

.animate-bounce-once {
  animation: bounce-once 0.5s ease-out;
}

@media print {
  body {
    background: white !important;
  }

  .print\:hidden {
    display: none !important;
  }
}
</style>
