<!-- components/receipt/ReceiptPreview.vue -->
<!-- 🧾 Receipt Preview Modal - Print & E-Bill Options -->
<script setup lang="ts">
import type { Order, PaymentProof } from "~/types";
import type { EReceipt } from "~/composables/use-receipt";
import QRCodeVue3 from "qrcode.vue";

const props = defineProps<{
  order: Order;
  paymentProof?: PaymentProof;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  printed: [];
}>();

// Composables
const receipt = useReceipt();
const currency = useCurrency();
const { t } = useI18n();

// State
const currentReceipt = ref<EReceipt | null>(null);
const showEBillQr = ref(false);
const eBillUrl = ref("");
const qrCodeImage = ref("");
const receiptCode = ref("");

// Generate receipt when opened
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.order) {
      // Check if order already has public receipt data
      const orderWithReceipt = props.order as Order & {
        receiptUrl?: string;
        receiptQR?: string;
        receiptCode?: string;
      };

      if (orderWithReceipt.receiptUrl && orderWithReceipt.receiptQR) {
        // ✅ Use new public receipt data (from createReceiptFromOrder)
        eBillUrl.value = orderWithReceipt.receiptUrl;
        qrCodeImage.value = orderWithReceipt.receiptQR;
        receiptCode.value = orderWithReceipt.receiptCode || "";

        // Still generate receipt object for preview display
        currentReceipt.value = receipt.generateReceipt(
          props.order,
          props.paymentProof
        );
      } else {
        // ❌ Fallback: Generate legacy receipt (for older orders)
        currentReceipt.value = receipt.generateReceipt(
          props.order,
          props.paymentProof
        );
        eBillUrl.value = receipt.generateEBillUrl(currentReceipt.value.id);
        receipt.storeEBill(currentReceipt.value);
      }
    }
  },
  { immediate: true }
);

// Actions
const handlePrint = () => {
  if (!currentReceipt.value) return;
  receipt.printReceipt(currentReceipt.value);
  emit("printed");
};

const handleThermalPrint = async () => {
  if (!currentReceipt.value) return;
  await receipt.printToThermalPrinter(currentReceipt.value);
  emit("printed");
};

const showEBill = () => {
  showEBillQr.value = true;
};

const copyEBillLink = async () => {
  await navigator.clipboard.writeText(eBillUrl.value);
};

const close = () => {
  showEBillQr.value = false;
  emit("close");
};
</script>

<template>
  <UModal
    :open="open"
    title="Receipt"
    description="Receipt Preview"
    @close="close"
  >
    <template #content>
      <div class="p-6 bg-white dark:bg-gray-900 max-w-lg">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2
            class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2"
          >
            <span class="text-2xl">🧾</span>
            {{ t("receipt.title") || "Receipt" }}
          </h2>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <!-- Receipt Preview Card -->
        <div
          v-if="currentReceipt"
          class="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 font-mono text-sm"
        >
          <!-- Header -->
          <div
            class="text-center mb-4 pb-4 border-b border-dashed border-gray-300 dark:border-gray-700"
          >
            <div class="text-3xl mb-2">
              {{ receipt.settings.value.logoEmoji }}
            </div>
            <div class="font-bold text-lg">
              {{ receipt.settings.value.merchantName }}
            </div>
            <div class="text-xs text-gray-500">
              {{ receipt.settings.value.merchantAddress }}
            </div>
          </div>

          <!-- Order Info -->
          <div
            class="text-xs text-gray-500 mb-3 pb-3 border-b border-dashed border-gray-300 dark:border-gray-700"
          >
            <div>
              <span v-if="currentReceipt.orderNumber" class="text-lg font-bold">
                #{{ currentReceipt.orderNumber }}
              </span>
            </div>
            <div class="flex items-center gap-2 justify-between">
              <span>{{ t("receipt.order", "Order") }}: </span>
              <span class="font-bold font-sm font-mono">
                {{ currentReceipt?.orderCode || currentReceipt.orderId }}
              </span>
            </div>
            <div class="flex items-center gap-2 justify-between">
              <span>{{ t("receipt.date", "Date") }}:</span>
              <span class="font-bold font-sm font-mono">
                {{ new Date(currentReceipt.createdAt).toLocaleString() }}
              </span>
            </div>
          </div>

          <!-- Items -->
          <div
            class="space-y-2 mb-3 pb-3 border-b border-dashed border-gray-300 dark:border-gray-700"
          >
            <div
              v-for="(item, index) in currentReceipt.items"
              :key="index"
              class="flex justify-between"
            >
              <div class="flex-1">
                <span>{{ item.quantity }}× {{ item.name }}</span>
                <div v-if="item.variant" class="text-xs text-gray-500 pl-3">
                  └ {{ item.variant }}
                </div>
              </div>
              <span>{{
                currency.format(item.total, currentReceipt.currency)
              }}</span>
            </div>
          </div>

          <!-- Totals -->
          <div class="space-y-1">
            <div class="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>
                {{
                  currency.format(
                    currentReceipt.subtotal,
                    currentReceipt.currency
                  )
                }}
              </span>
            </div>
            <div
              v-if="currentReceipt.tip"
              class="flex justify-between text-gray-500"
            >
              <span>Tip</span>
              <span>{{
                currency.format(currentReceipt.tip, currentReceipt.currency)
              }}</span>
            </div>
            <div
              class="flex justify-between font-bold text-lg pt-2 border-t border-double border-gray-400 dark:border-gray-600"
            >
              <span>TOTAL</span>
              <span>{{
                currency.format(currentReceipt.total, currentReceipt.currency)
              }}</span>
            </div>
            <div
              v-if="currentReceipt.totalSats"
              class="flex justify-between text-amber-600 dark:text-amber-400"
            >
              <span>≈ Sats</span>
              <span>⚡ {{ currentReceipt.totalSats.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Payment Method -->
          <div
            class="text-center mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-500"
          >
            Paid via:
            {{ receipt.getPaymentMethodLabel(currentReceipt.paymentMethod) }}
          </div>
        </div>

        <!-- E-Bill QR Display -->
        <Transition name="fade">
          <div
            v-if="showEBillQr"
            class="mb-6 p-6 bg-white dark:bg-gray-800 rounded-2xl text-center border border-gray-200 dark:border-gray-700"
          >
            <h3
              class="text-lg font-semibold mb-4 text-gray-900 dark:text-white"
            >
              📱 Digital Receipt
            </h3>

            <!-- Use pre-generated QR code if available, otherwise generate -->
            <div class="bg-white p-4 rounded-xl inline-block mb-4">
              <img
                v-if="qrCodeImage"
                :src="qrCodeImage"
                alt="Receipt QR Code"
                class="w-48 h-48 mx-auto"
              />
              <QRCodeVue3
                v-else
                :value="eBillUrl"
                :size="192"
                level="M"
                render-as="svg"
              />
            </div>

            <!-- Receipt Code (if available) -->
            <div
              v-if="receiptCode"
              class="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3"
            >
              <p class="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                RECEIPT CODE
              </p>
              <p class="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                {{ receiptCode }}
              </p>
            </div>

            <p class="text-sm text-gray-500 mb-3">
              Customer can scan to view receipt on their phone
            </p>
            <div class="flex justify-center gap-2">
              <UButton
                color="neutral"
                variant="outline"
                size="sm"
                icon="i-heroicons-clipboard-document"
                @click="copyEBillLink"
              >
                Copy Link
              </UButton>
            </div>
          </div>
        </Transition>

        <!-- Action Buttons -->
        <div class="space-y-3">
          <!-- Primary Actions -->
          <div class="grid grid-cols-2 gap-3">
            <UButton
              color="primary"
              size="lg"
              icon="i-heroicons-printer"
              :loading="receipt.isPrinting.value"
              block
              @click="handlePrint"
            >
              {{ t("receipt.print") || "Print Receipt" }}
            </UButton>

            <UButton
              color="neutral"
              variant="outline"
              size="lg"
              icon="i-heroicons-qr-code"
              block
              @click="showEBill"
            >
              {{ t("receipt.eBill", "E-Bill") }}
            </UButton>
          </div>

          <!-- Secondary Actions -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <UButton
                color="neutral"
                variant="soft"
                size="md"
                icon="i-heroicons-printer"
                block
                @click="handleThermalPrint"
              >
                <span class="flex items-center gap-2">
                  <span>POS Printer</span>
                </span>
              </UButton>
            </div>

            <div>
              <UButton
                color="neutral"
                variant="ghost"
                size="md"
                block
                @click="close"
              >
                {{ t("receipt.noReceipt", "No Receipt") }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p class="text-xs text-center text-gray-400">
            Receipt ID: {{ currentReceipt?.id }}
          </p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
