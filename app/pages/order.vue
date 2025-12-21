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
          <p class="text-gray-500 mb-6">
            {{ error }}
          </p>
          <p class="text-sm text-gray-400">
            {{ $t("order.askStaff") || "Please ask staff for a new QR code" }}
          </p>
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
              <UBadge
                v-if="cart.length > 0"
                color="primary"
                variant="solid"
                size="lg"
              >
                🛒 {{ cart.length }}
              </UBadge>
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
      <div class="container mx-auto px-4 py-6">
        <!-- Products Grid -->
        <div
          v-if="filteredMenuProducts.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <UCard
            v-for="product in filteredMenuProducts"
            :key="product.id"
            class="hover:shadow-lg transition-shadow cursor-pointer"
            @click="addToCart(product)"
          >
            <!-- Product Image -->
            <div
              class="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden"
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
              variant="soft"
              size="sm"
              block
              class="mt-3"
            >
              <UIcon name="i-heroicons-plus" class="w-4 h-4 mr-1" />
              {{ $t("order.addToCart") || "Add to Cart" }}
            </UButton>
          </UCard>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <UIcon
            name="i-heroicons-shopping-bag"
            class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
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
        class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg"
      >
        <div class="container mx-auto">
          <UButton color="primary" size="lg" block @click="showCart = true">
            <div class="flex items-center justify-between w-full">
              <span
                >🛒 {{ $t("order.viewCart") || "View Cart" }} ({{
                  cart.length
                }})</span
              >
              <span class="font-bold">{{ formatPrice(cartTotal) }}</span>
            </div>
          </UButton>
        </div>
      </div>
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
const tablesStore = useTables();
const productsStore = useProductsStore();
const { format: formatPrice } = useCurrency();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tableInfo = ref<{
  tableId: string;
  tableNumber: string;
  tableName: string;
} | null>(null);

const selectedCategory = ref("all");
const cart = ref<{ product: Product; quantity: number }[]>([]);
const showCart = ref(false);

// Menu categories (with "All" option)
const menuCategories = computed(() => {
  const cats = productsStore.categories.value.filter(
    (c) => c.id !== "favorites"
  );
  return [{ id: "all", name: t("common.all") || "All", icon: "📦" }, ...cats];
});

// Filtered products based on selected category
const filteredMenuProducts = computed(() => {
  const products = productsStore.publicProducts.value;
  if (selectedCategory.value === "all") {
    return products;
  }
  return products.filter((p) => p.categoryId === selectedCategory.value);
});

// Cart total
const cartTotal = computed(() => {
  return cart.value.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
});

// Add product to cart
const addToCart = (product: Product) => {
  const existing = cart.value.find((item) => item.product.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.value.push({ product, quantity: 1 });
  }
};

onMounted(async () => {
  // Get token from URL
  const token = route.query.t as string;

  if (!token) {
    error.value = t("order.noToken") || "No table token provided";
    isLoading.value = false;
    return;
  }

  // Validate token
  const result = await tablesStore.validateTableToken(token);

  if (!result.valid) {
    error.value =
      result.error || t("order.invalidToken") || "Invalid or expired token";
    isLoading.value = false;
    return;
  }

  // Success - store table info
  tableInfo.value = {
    tableId: result.tableId || "",
    tableNumber: result.tableNumber || "",
    tableName: result.tableName || "",
  };

  // Initialize products store to load menu
  await productsStore.init();

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
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
