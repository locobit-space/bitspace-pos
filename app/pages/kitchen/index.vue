<!-- pages/kitchen/index.vue -->
<!-- 👨‍🍳 Kitchen Display System (KDS) - Real-time Order Queue -->
<script setup lang="ts">
import type { Order } from "~/types";

definePageMeta({
  layout: "blank",
  middleware: ["auth"],
});

useHead({
  title: "Kitchen",
});

const { t } = useI18n();
const ordersStore = useOrders();
const toast = useToast();

// ============================================
// State
// ============================================
const currentTime = ref(new Date());
let timeInterval: ReturnType<typeof setInterval>;

const filterStatus = ref<"all" | "new" | "preparing" | "ready">("all");
const sortBy = ref<"time" | "priority">("time");
const soundEnabled = ref(true);
const autoRefresh = ref(true);

// ============================================
// Computed
// ============================================
// Get kitchen orders (orders that need to be prepared - NOT served/closed)
const kitchenOrders = computed(() => {
  let orders = ordersStore.orders.value.filter(
    (o) =>
      // Show orders that need kitchen attention:
      // - pending (customer QR orders waiting for payment)
      // - processing (payment in progress)
      // - completed (paid) but still in kitchen
      (o.status === "completed" ||
        o.status === "processing" ||
        o.status === "pending") &&
      // IMPORTANT: Exclude orders that have been served or picked up
      o.kitchenStatus !== "served"
  );

  // Filter by kitchen status
  if (filterStatus.value !== "all") {
    orders = orders.filter((o) => o.kitchenStatus === filterStatus.value);
  }

  // Sort
  if (sortBy.value === "time") {
    orders.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  return orders;
});

const newOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "new"
    ).length
);

const preparingOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "preparing"
    ).length
);

const readyOrdersCount = computed(
  () =>
    ordersStore.orders.value.filter(
      (o) =>
        (o.status === "completed" ||
          o.status === "processing" ||
          o.status === "pending") &&
        o.kitchenStatus === "ready"
    ).length
);

// ============================================
// Methods
// ============================================
const getOrderAge = (date: string) => {
  const orderTime = new Date(date).getTime();
  const now = currentTime.value.getTime();
  const diff = Math.floor((now - orderTime) / 1000);

  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
};

const getAgeColor = (date: string) => {
  const orderTime = new Date(date).getTime();
  const now = currentTime.value.getTime();
  const diff = Math.floor((now - orderTime) / 1000 / 60); // minutes

  if (diff < 5) return "text-green-500";
  if (diff < 10) return "text-yellow-500";
  if (diff < 15) return "text-orange-500";
  return "text-red-500";
};

const getStatusColor = (status?: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-500",
    preparing: "bg-amber-500",
    ready: "bg-green-500",
    served: "bg-gray-500",
  };
  return colors[status || "new"] || "bg-gray-500";
};

const getStatusBgColor = (status?: string) => {
  const colors: Record<string, string> = {
    new: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    preparing:
      "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    ready:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    served: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
  };
  return colors[status || "new"] || "bg-gray-50 border-gray-200";
};

const updateKitchenStatus = async (
  orderId: string,
  kitchenStatus: "new" | "preparing" | "ready" | "served"
) => {
  try {
    // Find the order and update it via the ordersStore.updateOrderStatus
    // Pass the current payment status to keep it unchanged, but add kitchenStatus data
    const order = ordersStore.orders.value.find((o) => o.id === orderId);
    if (!order) return;

    await ordersStore.updateOrderStatus(orderId, order.status, {
      kitchenStatus,
      ...(kitchenStatus === "preparing"
        ? { preparedAt: new Date().toISOString() }
        : {}),
      ...(kitchenStatus === "served"
        ? { servedAt: new Date().toISOString() }
        : {}),
    });

    // Broadcast to POS when order is ready
    if (kitchenStatus === "ready") {
      try {
        const readyChannel = new BroadcastChannel("bitspace-kitchen-ready");
        readyChannel.postMessage({
          type: "order-ready",
          order: JSON.parse(
            JSON.stringify({ ...order, kitchenStatus: "ready" })
          ),
        });
        readyChannel.close();
      } catch (e) {
        console.warn("BroadcastChannel not available:", e);
      }
    }

    // Play sound
    if (soundEnabled.value) {
      if (kitchenStatus === "ready") {
        playBellSound();
      } else {
        playClickSound();
      }
    }
  } catch (error) {
    console.error("Error updating kitchen status:", error);
  }
};

const bumpOrder = async (orderId: string, currentStatus?: string) => {
  const statusFlow: Record<string, "preparing" | "ready" | "served"> = {
    new: "preparing",
    preparing: "ready",
    ready: "served",
  };
  const nextStatus = statusFlow[currentStatus || "new"];
  if (nextStatus) {
    await updateKitchenStatus(orderId, nextStatus);
  }
};

const recallOrder = async (orderId: string) => {
  await updateKitchenStatus(orderId, "preparing");
};

// Sound effects
const playBellSound = () => {
  const audio = new Audio(
    "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGUxE0qGv+LrwHQvDTZ5oPXt1YdVJRY7l9bw5aFjQSgsZ7XV5beKfmhYR1BebZabrqKFXD85Pktbe"
  );
  audio.play().catch(() => {});
};

const playClickSound = () => {
  const audio = new Audio(
    "data:audio/wav;base64,UklGRl9vT19teleHRlbXQAAABXQVZFZm10IBAAAAABAAEAQB8AAEA..."
  );
  audio.play().catch(() => {});
};

const _playNewOrderSound = () => {
  if (soundEnabled.value) {
    playBellSound();
  }
};

const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ============================================
// Lifecycle
// ============================================
let refreshInterval: ReturnType<typeof setInterval>;
let orderChannel: BroadcastChannel | null = null;

// Handle new order from BroadcastChannel (instant)
const handleNewOrder = (order: Order) => {
  const exists = ordersStore.orders.value.find((o) => o.id === order.id);
  if (!exists) {
    ordersStore.orders.value.unshift(order);
    if (soundEnabled.value) playBellSound();

    // Show toast notification
    toast.add({
      title: t("kitchen.newOrder") || "🔔 New Order!",
      description: `#${order.id.slice(-6).toUpperCase()} - ${
        order.tableNumber
          ? "Table " + order.tableNumber
          : t("orders.walkInCustomer") || "Walk-in"
      }`,
      color: "blue",
      icon: "i-heroicons-bell-alert",
    });
  }
};

// Check for pending customer orders from localStorage
const checkPendingOrders = () => {
  const PENDING_ORDERS_KEY = "bitspace_pending_orders";
  try {
    const stored = localStorage.getItem(PENDING_ORDERS_KEY);
    if (!stored) return;

    const pendingOrders = JSON.parse(stored);
    let importedCount = 0;

    for (const order of pendingOrders) {
      const exists = ordersStore.orders.value.find((o) => o.id === order.id);
      if (!exists) {
        ordersStore.orders.value.unshift(order);
        importedCount++;
        if (soundEnabled.value) playBellSound();
      }
    }

    if (importedCount > 0) {
      localStorage.removeItem(PENDING_ORDERS_KEY);
    }
  } catch (e) {
    // Ignore errors
  }
};

onMounted(async () => {
  await ordersStore.init();

  // Check for any pending orders on load
  checkPendingOrders();

  // Update time every second
  timeInterval = setInterval(() => {
    currentTime.value = new Date();
  }, 1000);

  // BroadcastChannel for INSTANT order notifications (same origin)
  orderChannel = new BroadcastChannel("bitspace-orders");

  orderChannel.onmessage = (event) => {
    if (event.data?.type === "new-order" && event.data?.order) {
      handleNewOrder(event.data.order);
    }
  };

  // Fallback: Check for new orders every 30 seconds (BroadcastChannel handles instant)
  refreshInterval = setInterval(async () => {
    checkPendingOrders();
    await ordersStore.init(); // This also fetches from Nostr for cross-device sync
  }, 30000);

  // Listen for storage events from customer order pages
  window.addEventListener("storage", (event) => {
    if (event.key === "bitspace_pending_orders") {
      checkPendingOrders();
    }
  });
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
  if (refreshInterval) clearInterval(refreshInterval);
  if (orderChannel) orderChannel.close();
});
</script>

<template>
  <div
    class="h-screen flex flex-col bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-white overflow-hidden"
  >
    <!-- Header Bar -->
    <header
      class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0"
    >
      <div class="flex items-center justify-between">
        <!-- Logo & Title -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-xl shadow-lg"
            >
              <NuxtLinkLocale to="/">👨‍🍳</NuxtLinkLocale>
            </div>
            <div>
              <h1 class="text-lg font-bold text-gray-900 dark:text-white">
                {{ t("kitchen.title") }}
              </h1>
              <p class="text-xs text-gray-500">Kitchen Display System</p>
            </div>
          </div>

          <!-- Status Counts -->
          <div class="hidden md:flex items-center gap-3 ml-6">
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'all'
                  ? 'bg-gray-200 dark:bg-gray-800'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'all'"
            >
              <span class="text-sm font-medium">{{ t("common.all") }}</span>
              <UBadge color="gray" variant="soft" size="xs">
                {{ kitchenOrders.length }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'new'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'new'"
            >
              <span class="w-2 h-2 rounded-full bg-blue-500" />
              <span class="text-sm font-medium">{{ t("kitchen.new") }}</span>
              <UBadge color="blue" variant="soft" size="xs">
                {{ newOrdersCount }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'preparing'
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'preparing'"
            >
              <span class="w-2 h-2 rounded-full bg-amber-500" />
              <span class="text-sm font-medium">{{
                t("kitchen.preparing")
              }}</span>
              <UBadge color="amber" variant="soft" size="xs">
                {{ preparingOrdersCount }}
              </UBadge>
            </button>
            <button
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
              :class="
                filterStatus === 'ready'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              "
              @click="filterStatus = 'ready'"
            >
              <span class="w-2 h-2 rounded-full bg-green-500" />
              <span class="text-sm font-medium">{{ t("kitchen.ready") }}</span>
              <UBadge color="green" variant="soft" size="xs">
                {{ readyOrdersCount }}
              </UBadge>
            </button>
          </div>
        </div>

        <!-- Right Side -->
        <div class="flex items-center gap-4">
          <!-- Current Time -->
          <div class="text-right">
            <div
              class="text-2xl font-bold text-gray-900 dark:text-white tabular-nums"
            >
              {{
                currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              }}
            </div>
          </div>

          <div class="h-8 w-px bg-gray-300 dark:bg-gray-700" />

          <!-- Settings -->
          <UTooltip :text="soundEnabled ? 'Sound On' : 'Sound Off'">
            <UButton
              :icon="
                soundEnabled
                  ? 'i-heroicons-speaker-wave'
                  : 'i-heroicons-speaker-x-mark'
              "
              :color="soundEnabled ? 'primary' : 'neutral'"
              variant="ghost"
              @click="soundEnabled = !soundEnabled"
            />
          </UTooltip>

          <UTooltip text="Refresh">
            <UButton
              icon="i-heroicons-arrow-path"
              color="neutral"
              variant="ghost"
              :loading="ordersStore.isLoading.value"
              @click="ordersStore.init()"
            />
          </UTooltip>

          <NuxtLinkLocale to="/pos">
            <UButton
              icon="i-heroicons-arrow-left"
              color="neutral"
              variant="ghost"
            >
              POS
            </UButton>
          </NuxtLinkLocale>
        </div>
      </div>
    </header>

    <!-- Orders Grid -->
    <div class="flex-1 overflow-auto p-4">
      <!-- Empty State -->
      <div
        v-if="kitchenOrders.length === 0"
        class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500"
      >
        <div class="text-8xl mb-4">👨‍🍳</div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {{ t("kitchen.noOrders") }}
        </h2>
        <p class="text-gray-500">{{ t("kitchen.noOrdersDesc") }}</p>
      </div>

      <!-- Orders Grid -->
      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
      >
        <div
          v-for="order in kitchenOrders"
          :key="order.id"
          class="rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg"
          :class="getStatusBgColor(order.kitchenStatus)"
        >
          <!-- Order Header -->
          <div class="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span
                  class="w-3 h-3 rounded-full"
                  :class="getStatusColor(order.kitchenStatus)"
                />
                <span class="font-bold text-lg text-gray-900 dark:text-white">
                  #{{ order.id.slice(-4).toUpperCase() }}
                </span>
              </div>
              <span
                class="text-sm font-bold tabular-nums"
                :class="getAgeColor(order.date)"
              >
                {{ getOrderAge(order.date) }}
              </span>
            </div>

            <div class="flex items-center justify-between text-sm">
              <span class="text-gray-500">{{ formatTime(order.date) }}</span>
              <UBadge
                :color="
                  order.kitchenStatus === 'new'
                    ? 'blue'
                    : order.kitchenStatus === 'preparing'
                    ? 'amber'
                    : 'green'
                "
                variant="soft"
                size="sm"
              >
                {{ t(`kitchen.${order.kitchenStatus || "new"}`) }}
              </UBadge>
            </div>

            <!-- Customer/Table Info -->
            <div
              v-if="order.customer"
              class="mt-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <span>👤 {{ order.customer }}</span>
            </div>
          </div>

          <!-- Order Items -->
          <div class="p-4 max-h-64 overflow-auto">
            <div class="space-y-3">
              <div
                v-for="(item, idx) in order.items"
                :key="idx"
                class="flex items-start gap-3"
              >
                <span
                  class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-900 dark:text-white"
                >
                  {{ item.quantity }}
                </span>
                <div class="flex-1 min-w-0">
                  <p
                    class="font-medium text-gray-900 dark:text-white leading-tight"
                  >
                    {{ item.product?.name || "Unknown Item" }}
                  </p>
                  <!-- Variant -->
                  <p
                    v-if="item.selectedVariant"
                    class="text-sm text-amber-600 dark:text-amber-400"
                  >
                    {{ item.selectedVariant.name }}
                  </p>
                  <!-- Modifiers -->
                  <div
                    v-if="
                      item.selectedModifiers &&
                      item.selectedModifiers.length > 0
                    "
                    class="flex flex-wrap gap-1 mt-1"
                  >
                    <span
                      v-for="mod in item.selectedModifiers"
                      :key="mod.id"
                      class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                    >
                      {{ mod.name }}
                    </span>
                  </div>
                  <!-- Notes -->
                  <p
                    v-if="item.notes"
                    class="text-sm text-red-600 dark:text-red-400 mt-1 font-medium"
                  >
                    ⚠️ {{ item.notes }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Kitchen Notes -->
            <div
              v-if="order.kitchenNotes"
              class="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"
            >
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                📝 {{ order.kitchenNotes }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div
            class="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50"
          >
            <div class="flex gap-2">
              <!-- Recall Button (for ready orders) -->
              <UButton
                v-if="order.kitchenStatus === 'ready'"
                color="amber"
                variant="soft"
                size="sm"
                class="flex-1"
                @click="recallOrder(order.id)"
              >
                <UIcon
                  name="i-heroicons-arrow-uturn-left"
                  class="w-4 h-4 mr-1"
                />
                {{ t("kitchen.recall") }}
              </UButton>

              <!-- Bump Button -->
              <UButton
                :color="
                  order.kitchenStatus === 'ready'
                    ? 'green'
                    : order.kitchenStatus === 'preparing'
                    ? 'amber'
                    : 'blue'
                "
                size="sm"
                class="flex-1"
                block
                @click="bumpOrder(order.id, order.kitchenStatus)"
              >
                <template
                  v-if="order.kitchenStatus === 'new' || !order.kitchenStatus"
                >
                  <UIcon name="i-heroicons-fire" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.start") }}
                </template>
                <template v-else-if="order.kitchenStatus === 'preparing'">
                  <UIcon name="i-heroicons-check" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.ready") }}
                </template>
                <template v-else>
                  <UIcon name="i-heroicons-check-circle" class="w-4 h-4 mr-1" />
                  {{ t("kitchen.served") }}
                </template>
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Stats -->
    <footer
      class="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex-shrink-0"
    >
      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-blue-500" />
            <span class="text-gray-600 dark:text-gray-400">
              {{ t("kitchen.new") }}: {{ newOrdersCount }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-amber-500" />
            <span class="text-gray-600 dark:text-gray-400"
              >{{ t("kitchen.preparing") }}: {{ preparingOrdersCount }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-green-500" />
            <span class="text-gray-600 dark:text-gray-400"
              >{{ t("kitchen.ready") }}: {{ readyOrdersCount }}</span
            >
          </div>
        </div>
        <div class="text-gray-500">
          {{ t("kitchen.lastUpdate") }}: {{ currentTime.toLocaleTimeString() }}
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
