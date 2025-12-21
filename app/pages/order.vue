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
        class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10"
      >
        <div class="container mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                📍 {{ tableInfo.tableName || `Table ${tableInfo.tableNumber}` }}
              </h1>
              <p class="text-sm text-gray-500">
                {{ $t("order.scanToOrder") || "Scan to view menu & order" }}
              </p>
            </div>
            <UBadge color="green" variant="subtle" size="lg">
              {{ $t("order.tableReady") || "Ready to Order" }}
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Menu Content Placeholder -->
      <div class="container mx-auto px-4 py-8">
        <UCard>
          <div class="text-center py-12">
            <UIcon
              name="i-heroicons-document-text"
              class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
            />
            <h2
              class="text-xl font-semibold text-gray-900 dark:text-white mb-2"
            >
              {{ $t("order.menuComingSoon") || "Menu Coming Soon" }}
            </h2>
            <p class="text-gray-500 max-w-md mx-auto">
              {{
                $t("order.menuComingSoonDesc") ||
                "The digital menu feature is being developed. Please ask staff for the menu."
              }}
            </p>

            <!-- Debug Info (dev only) -->
            <div
              v-if="isDev"
              class="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left"
            >
              <p class="text-xs font-mono text-gray-500 mb-2">Debug Info:</p>
              <pre class="text-xs text-gray-600 dark:text-gray-400">{{
                JSON.stringify(tableInfo, null, 2)
              }}</pre>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "blank",
  auth: false,
});

const { t } = useI18n();
const route = useRoute();
const tablesStore = useTables();

const isLoading = ref(true);
const error = ref<string | null>(null);
const tableInfo = ref<{
  tableId: string;
  tableNumber: string;
  tableName: string;
} | null>(null);

const isDev = process.env.NODE_ENV === "development";

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

  isLoading.value = false;
});
</script>
