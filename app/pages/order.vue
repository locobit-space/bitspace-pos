<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4"
        />
        <p class="text-gray-500">{{ $t("common.loading") }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center min-h-screen p-4"
    >
      <UCard class="max-w-md w-full">
        <div class="text-center py-6">
          <div
            class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"
          >
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-10 h-10 text-red-500"
            />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ $t("order.invalidLink") || "Invalid Link" }}
          </h1>
          <p class="text-gray-500 mb-6">{{ error }}</p>
          <p class="text-sm text-gray-400">
            {{ $t("order.askStaff") || "Please ask staff for a new QR code" }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Order Submitted State -->
    <div
      v-else-if="orderSubmitted"
      class="flex items-center justify-center min-h-screen p-4"
    >
      <UCard class="max-w-md w-full">
        <div class="text-center py-8">
          <div
            class="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce"
          >
            <UIcon
              name="i-heroicons-check-circle"
              class="w-16 h-16 text-green-500"
            />
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {{ $t("order.orderPlaced") || "Order Placed!" }}
          </h1>
          <p class="text-gray-500 mb-4">
            {{
              $t("order.orderPlacedDesc") ||
              "Your order has been sent to the kitchen"
            }}
          </p>

          <!-- Order Number -->
          <div class="bg-primary-50 dark:bg-primary-900/30 rounded-xl p-6 mb-6">
            <p class="text-sm text-gray-500 mb-1">
              {{ $t("order.orderNumber") || "Order #" }}
            </p>
            <p
              class="text-3xl font-bold text-primary-600 dark:text-primary-400"
            >
              {{ submittedOrderId?.slice(-6).toUpperCase() }}
            </p>
          </div>

          <!-- Table Info -->
          <div
            class="flex items-center justify-center gap-2 text-gray-500 mb-6"
          >
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            <span>{{
              tableInfo?.tableName || `Table ${tableInfo?.tableNumber}`
            }}</span>
          </div>

          <!-- Actions -->
          <div class="space-y-3">
            <UButton color="primary" size="lg" block @click="startNewOrder">
              <UIcon name="i-heroicons-plus" class="w-5 h-5 mr-2" />
              {{ $t("order.orderMore") || "Order More" }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Valid Token - Show Menu -->
    <template v-else-if="tableInfo">
      <!-- Header -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm"
      >
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                📍 {{ tableInfo.tableName || `Table ${tableInfo.tableNumber}` }}
              </h1>
              <p class="text-sm text-gray-500">
                {{ $t("order.browseMenu") || "Browse our menu" }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <UButton
                v-if="cart.length > 0"
                color="primary"
                variant="solid"
                @click="showCartModal = true"
              >
                🛒 {{ cartItemCount }} · {{ formatPrice(cartTotal) }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Tabs -->
      <div
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[72px] z-10"
      >
        <div class="container mx-auto px-4">
          <div class="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
            <UButton
              v-for="category in menuCategories"
              :key="category.id"
              :color="selectedCategory === category.id ? 'primary' : 'neutral'"
              :variant="selectedCategory === category.id ? 'solid' : 'ghost'"
              size="sm"
              @click="selectedCategory = category.id"
            >
              {{ category.icon }} {{ category.name }}
            </UButton>
          </div>
        </div>
      </div>

      <!-- Menu Content -->
      <div class="container mx-auto px-4 py-6 pb-24">
        <!-- Products Grid -->
        <div
          v-if="filteredMenuProducts.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <UCard
            v-for="product in filteredMenuProducts"
            :key="product.id"
            class="hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.02]"
            @click="addToCart(product)"
          >
            <!-- Product Image -->
            <div
              class="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden relative"
            >
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-4xl"
              >
                🍽️
              </div>

              <!-- Quantity Badge -->
              <div
                v-if="getCartQuantity(product.id) > 0"
                class="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold shadow-lg"
              >
                {{ getCartQuantity(product.id) }}
              </div>
            </div>

            <!-- Product Info -->
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <h3
                  class="font-semibold text-gray-900 dark:text-white truncate"
                >
                  {{ product.name }}
                </h3>
                <p
                  v-if="product.description"
                  class="text-sm text-gray-500 line-clamp-2"
                >
                  {{ product.description }}
                </p>
              </div>
              <div class="ml-2 text-right">
                <p class="font-bold text-primary-600 dark:text-primary-400">
                  {{ formatPrice(product.price) }}
                </p>
              </div>
            </div>

            <!-- Add Button -->
            <UButton
              color="primary"
              :variant="getCartQuantity(product.id) > 0 ? 'solid' : 'soft'"
              size="sm"
              block
              class="mt-3"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
              {{
                getCartQuantity(product.id) > 0
                  ? $t("order.addAnother") || "Add Another"
                  : $t("order.addToCart") || "Add"
              }}
            </UButton>
          </UCard>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <UIcon
            name="i-heroicons-shopping-bag"
            class="w-16 h-16 text-gray-300 mx-auto mb-4"
          />
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {{ $t("order.noProducts") || "No products available" }}
          </h2>
          <p class="text-gray-500">
            {{
              $t("order.noProductsDesc") || "Please ask staff for assistance"
            }}
          </p>
        </div>
      </div>

      <!-- Cart Button (Fixed at bottom) -->
      <div
        v-if="cart.length > 0"
        class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-20"
      >
        <div class="container mx-auto">
          <UButton
            color="primary"
            size="lg"
            block
            @click="showCartModal = true"
          >
            <div class="flex items-center justify-between w-full">
              <span class="flex items-center gap-2">
                <span class="bg-white/20 rounded-full px-2 py-0.5 text-sm">{{
                  cartItemCount
                }}</span>
                {{ $t("order.viewCart") || "View Cart" }}
              </span>
              <span class="font-bold">{{ formatPrice(cartTotal) }}</span>
            </div>
          </UButton>
        </div>
      </div>

      <!-- Cart Modal -->
      <UModal v-model:open="showCartModal">
        <template #content>
          <UCard class="max-h-[90vh] overflow-hidden flex flex-col">
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">
                  🛒 {{ $t("order.yourCart") || "Your Cart" }}
                </h3>
                <UButton
                  v-if="cart.length > 0"
                  color="red"
                  variant="ghost"
                  size="xs"
                  @click="clearCart"
                >
                  {{ $t("order.clearCart") || "Clear" }}
                </UButton>
              </div>
            </template>

            <div class="overflow-y-auto max-h-[50vh] -mx-4 px-4">
              <!-- Empty Cart -->
              <div v-if="cart.length === 0" class="text-center py-8">
                <UIcon
                  name="i-heroicons-shopping-cart"
                  class="w-16 h-16 text-gray-300 mx-auto mb-4"
                />
                <p class="text-gray-500">
                  {{ $t("order.cartEmpty") || "Your cart is empty" }}
                </p>
              </div>

              <!-- Cart Items -->
              <div v-else class="space-y-3">
                <div
                  v-for="(item, index) in cart"
                  :key="item.product.id"
                  class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <!-- Product Image -->
                  <div
                    class="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0"
                  >
                    <img
                      v-if="item.product.image"
                      :src="item.product.image"
                      :alt="item.product.name"
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else
                      class="w-full h-full flex items-center justify-center text-2xl"
                    >
                      🍽️
                    </div>
                  </div>

                  <!-- Product Info -->
                  <div class="flex-1 min-w-0">
                    <h4
                      class="font-medium text-gray-900 dark:text-white truncate"
                    >
                      {{ item.product.name }}
                    </h4>
                    <p class="text-sm text-primary-600 dark:text-primary-400">
                      {{ formatPrice(item.product.price) }}
                    </p>

                    <!-- Notes Input -->
                    <UInput
                      v-model="item.notes"
                      size="xs"
                      :placeholder="$t('order.addNote') || 'Add note...'"
                      class="mt-1"
                    />
                  </div>

                  <!-- Quantity Controls -->
                  <div class="flex items-center gap-2">
                    <UButton
                      color="gray"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-minus"
                      @click="decreaseQuantity(index)"
                    />
                    <span class="w-8 text-center font-bold">{{
                      item.quantity
                    }}</span>
                    <UButton
                      color="primary"
                      variant="soft"
                      size="xs"
                      icon="i-heroicons-plus"
                      @click="increaseQuantity(index)"
                    />
                  </div>

                  <!-- Item Total -->
                  <div class="text-right w-20">
                    <p class="font-bold text-gray-900 dark:text-white">
                      {{ formatPrice(item.product.price * item.quantity) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <template #footer v-if="cart.length > 0">
              <div class="space-y-4">
                <!-- Totals -->
                <div class="flex justify-between text-lg font-bold">
                  <span>{{ $t("order.total") || "Total" }}</span>
                  <span class="text-primary-600 dark:text-primary-400">{{
                    formatPrice(cartTotal)
                  }}</span>
                </div>

                <!-- Submit Order Button -->
                <UButton
                  color="primary"
                  size="lg"
                  block
                  :loading="isSubmitting"
                  @click="submitOrder"
                >
                  <UIcon
                    name="i-heroicons-paper-airplane"
                    class="w-5 h-5 mr-2"
                  />
                  {{ $t("order.placeOrder") || "Place Order" }}
                </UButton>
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Product, Category } from "~/types";

definePageMeta({
  layout: "blank",
  auth: false,
});

const { t } = useI18n();
const route = useRoute();
const toast = useToast();
const tablesStore = useTables();
const productsStore = useProductsStore();
const ordersStore = useOrders();
const { format: formatPrice } = useCurrency();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tableInfo = ref<{
  tableId: string;
  tableNumber: string;
  tableName: string;
} | null>(null);

const selectedCategory = ref("all");
const cart = ref<{ product: Product; quantity: number; notes?: string }[]>([]);
const showCartModal = ref(false);
const isSubmitting = ref(false);
const orderSubmitted = ref(false);
const submittedOrderId = ref<string | null>(null);

// Local state for customer menu (loaded from owner's Nostr data)
const ownerProducts = ref<Product[]>([]);
const ownerCategories = ref<Category[]>([]);
const nostrData = useNostrData();

// Menu categories (with "All" option)
const menuCategories = computed(() => {
  // Use locally loaded categories if available, else use default categories
  const cats =
    ownerCategories.value.length > 0
      ? ownerCategories.value.filter((c) => c.id !== "favorites")
      : productsStore.categories.value.filter((c) => c.id !== "favorites");
  return [{ id: "all", name: t("common.all") || "All", icon: "📦" }, ...cats];
});

// Filtered products based on selected category
const filteredMenuProducts = computed(() => {
  // Use locally loaded products if available, else try productsStore
  const products =
    ownerProducts.value.length > 0
      ? ownerProducts.value
      : productsStore.publicProducts.value;
  if (selectedCategory.value === "all") {
    return products;
  }
  return products.filter((p) => p.categoryId === selectedCategory.value);
});

// Cart calculations
const cartItemCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0);
});

const cartTotal = computed(() => {
  return cart.value.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
});

// Get quantity in cart for a product
const getCartQuantity = (productId: string) => {
  const item = cart.value.find((item) => item.product.id === productId);
  return item?.quantity || 0;
};

// Cart actions
const addToCart = (product: Product) => {
  const existing = cart.value.find((item) => item.product.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.value.push({ product, quantity: 1 });
  }

  // Show toast
  toast.add({
    title: `${product.name} added`,
    icon: "i-heroicons-check-circle",
    color: "green",
    timeout: 1500,
  });
};

const increaseQuantity = (index: number) => {
  cart.value[index].quantity++;
};

const decreaseQuantity = (index: number) => {
  if (cart.value[index].quantity > 1) {
    cart.value[index].quantity--;
  } else {
    cart.value.splice(index, 1);
  }
};

const clearCart = () => {
  cart.value = [];
  showCartModal.value = false;
};

// Submit order
const submitOrder = async () => {
  if (cart.value.length === 0) return;

  isSubmitting.value = true;

  try {
    // Create order object
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customer: "Customer",
      branch: "main",
      date: new Date().toISOString(),
      total: cartTotal.value,
      totalSats: 0,
      currency: "LAK" as const,
      status: "pending" as const,
      orderType: "dine_in" as const,
      tableNumber:
        tableInfo.value?.tableName || tableInfo.value?.tableNumber || "",
      items: cart.value.map((item) => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        product: item.product,
        notes: item.notes,
      })),
      kitchenStatus: "new" as const,
      kitchenNotes: cart.value
        .filter((item) => item.notes)
        .map((item) => `${item.product.name}: ${item.notes}`)
        .join("; "),
    };

    // Save order
    await ordersStore.createOrder(order);

    // Update state
    submittedOrderId.value = order.id;
    orderSubmitted.value = true;
    showCartModal.value = false;
    cart.value = [];

    toast.add({
      title: t("order.orderSuccess") || "Order placed!",
      description:
        t("order.orderSuccessDesc") ||
        "Your order has been sent to the kitchen",
      icon: "i-heroicons-check-circle",
      color: "green",
    });
  } catch (e) {
    console.error("Failed to submit order:", e);
    toast.add({
      title: t("common.error") || "Error",
      description: String(e),
      icon: "i-heroicons-exclamation-triangle",
      color: "red",
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Start new order after submission
const startNewOrder = () => {
  orderSubmitted.value = false;
  submittedOrderId.value = null;
};

onMounted(async () => {
  const token = route.query.t as string;

  if (!token) {
    error.value = t("order.noToken") || "No table token provided";
    isLoading.value = false;
    return;
  }

  const result = await tablesStore.validateTableToken(token);

  if (!result.valid) {
    error.value =
      result.error || t("order.invalidToken") || "Invalid or expired token";
    isLoading.value = false;
    return;
  }

  tableInfo.value = {
    tableId: result.tableId || "",
    tableNumber: result.tableNumber || "",
    tableName: result.tableName || "",
  };

  console.log("[Order] Table info:", tableInfo.value);
  console.log("[Order] Owner pubkey from token:", result.ownerPubkey);

  // Try to load products from owner's Nostr data if pubkey is available
  if (result.ownerPubkey) {
    try {
      console.log("[Order] Loading products for owner:", result.ownerPubkey);
      const [products, categories] = await Promise.all([
        nostrData.getProductsForOwner(result.ownerPubkey),
        nostrData.getCategoriesForOwner(result.ownerPubkey),
      ]);

      ownerProducts.value = products;
      ownerCategories.value = categories;

      console.log(
        "[Order] Loaded from Nostr - Products:",
        products.length,
        "Categories:",
        categories.length
      );
    } catch (e) {
      console.error("[Order] Failed to load from Nostr:", e);
    }
  }

  // Fallback: Also try local store (if on same browser as admin)
  if (ownerProducts.value.length === 0) {
    console.log("[Order] No products from Nostr, trying local store...");
    await productsStore.init();
    console.log("[Order] Local products:", productsStore.products.value.length);
    console.log(
      "[Order] Local public products:",
      productsStore.publicProducts.value.length
    );
  }

  console.log("[Order] Categories:", productsStore.categories.value.length);

  await ordersStore.init();

  isLoading.value = false;
});
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
