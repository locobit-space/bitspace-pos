<!-- pages/reports/inventory.vue -->
<!-- 📊 Inventory Reports - Cost & Stock Movement Analysis -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

useHead({
  title: "Inventory Reports",
});

const { t } = useI18n();
const inventory = useInventory();

// State
const activeTab = ref<"cost" | "movements">("cost");
const selectedPreset = ref("month");
const selectedBranch = ref("all");
const dateRange = ref({
  start: "",
  end: "",
});

// Initialize
onMounted(async () => {
  await inventory.init();
});

// Loading state
const isLoading = computed(
  () => inventory.isLoading.value || !inventory.isInitialized.value
);

// Branches
const branches = computed(() => [
  { id: "all", name: t("common.allBranches", "All Branches") },
  ...inventory.branches.value.map((b) => ({ id: b.id, name: b.name })),
]);

// Computed date range
const startDate = computed(() => new Date(dateRange.value.start || new Date()));
const endDate = computed(() => {
  const end = new Date(dateRange.value.end || new Date());
  end.setHours(23, 59, 59, 999);
  return end;
});

// Cost report data
const costReport = computed(() =>
  inventory.getCostReport(
    selectedBranch.value !== "all" ? selectedBranch.value : undefined
  )
);

// Stock movement data
const stockInOut = computed(() =>
  inventory.getStockInOutSummary(
    startDate.value,
    endDate.value,
    selectedBranch.value !== "all" ? selectedBranch.value : undefined
  )
);

// Handlers
const handleDateRangeChange = (range: { start: string; end: string }) => {
  dateRange.value = range;
};

// Format helpers
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("lo-LA", {
    style: "currency",
    currency: "LAK",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num);
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('reports.inventoryReports', 'Inventory Reports')"
      :description="
        t(
          'reports.inventoryReportsDesc',
          'Analyze inventory costs and stock movements'
        )
      "
    >
      <template #right>
        <UButton
          color="gray"
          variant="outline"
          icon="i-heroicons-arrow-left"
          :label="t('common.back', 'Back')"
          @click="navigateTo('/reports')"
        />
      </template>
    </CommonPageHeader>

    <!-- Filters -->
    <div class="px-4">
      <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
        <!-- Date Range Selector -->
        <CommonDateRangeSelector
          v-model="selectedPreset"
          @update:date-range="handleDateRangeChange"
        />

        <!-- Branch Filter -->
        <div class="flex items-center gap-4">
          <UFormField :label="t('common.branch', 'Branch')">
            <USelectMenu
              v-model="selectedBranch"
              :items="branches"
              value-key="id"
              label-key="name"
              class="w-48"
            />
          </UFormField>
        </div>
      </div>
    </div>

    <!-- Tab Selection -->
    <div class="px-4">
      <div class="flex gap-2">
        <button
          class="px-4 py-2 rounded-lg font-medium transition-all"
          :class="
            activeTab === 'cost'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          "
          @click="activeTab = 'cost'"
        >
          <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 mr-1" />
          {{ t("reports.costReport", "Cost Report") }}
        </button>
        <button
          class="px-4 py-2 rounded-lg font-medium transition-all"
          :class="
            activeTab === 'movements'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          "
          @click="activeTab = 'movements'"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1" />
          {{ t("reports.stockMovements", "Stock Movements") }}
        </button>
      </div>
    </div>

    <!-- Cost Report Tab -->
    <template v-if="activeTab === 'cost'">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        <CommonStatCard
          icon="i-heroicons-currency-dollar"
          icon-color="blue"
          :label="t('reports.totalInventoryValue', 'Total Inventory Value')"
          :value="formatCurrency(costReport.totalInventoryValue)"
          :loading="isLoading"
        />
        <CommonStatCard
          icon="i-heroicons-receipt-percent"
          icon-color="green"
          :label="t('reports.totalCostValue', 'Total Cost Value')"
          :value="formatCurrency(costReport.totalCostValue)"
          :loading="isLoading"
        />
        <CommonStatCard
          icon="i-heroicons-chart-bar"
          icon-color="purple"
          :label="t('reports.estimatedMargin', 'Estimated Margin')"
          :value="`${costReport.estimatedMargin.toFixed(1)}%`"
          :loading="isLoading"
        />
        <CommonStatCard
          icon="i-heroicons-calculator"
          icon-color="yellow"
          :label="t('reports.potentialProfit', 'Potential Profit')"
          :value="
            formatCurrency(
              costReport.totalInventoryValue - costReport.totalCostValue
            )
          "
          :loading="isLoading"
        />
      </div>

      <!-- Cost by Category -->
      <div class="px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">
              {{ t("reports.costByCategory", "Cost by Category") }}
            </h3>
          </template>

          <!-- Skeleton Loading -->
          <div v-if="isLoading" class="space-y-3">
            <div
              v-for="i in 4"
              :key="i"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div class="space-y-2">
                <USkeleton class="h-4 w-32" />
                <USkeleton class="h-3 w-20" />
              </div>
              <div class="text-right space-y-2">
                <USkeleton class="h-5 w-24" />
                <USkeleton class="h-3 w-16" />
              </div>
            </div>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="category in costReport.byCategory"
              :key="category.categoryId"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p class="font-medium">{{ category.categoryName }}</p>
                <p class="text-xs text-gray-500">
                  {{ category.productCount }}
                  {{ t("common.products", "products") }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-bold text-blue-600 dark:text-blue-400">
                  {{ formatCurrency(category.totalValue) }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t("reports.cost", "Cost") }}:
                  {{ formatCurrency(category.totalCost) }}
                </p>
              </div>
            </div>

            <div
              v-if="costReport.byCategory.length === 0"
              class="text-center py-8 text-gray-500"
            >
              {{ t("reports.noData", "No data available") }}
            </div>
          </div>
        </UCard>
      </div>

      <!-- Top Value Products -->
      <div class="px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">
              {{ t("reports.topValueProducts", "Top Products by Value") }}
            </h3>
          </template>

          <!-- Skeleton Loading -->
          <div v-if="isLoading" class="space-y-2">
            <div v-for="i in 5" :key="i" class="flex items-center gap-3 p-2">
              <USkeleton class="w-6 h-6 rounded-full" />
              <div class="flex-1 space-y-1">
                <USkeleton class="h-4 w-40" />
                <USkeleton class="h-3 w-28" />
              </div>
              <USkeleton class="h-5 w-20" />
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(product, index) in costReport.topValueProducts"
              :key="product.productId"
              class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span
                class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 flex items-center justify-center text-sm font-bold"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <p class="font-medium">{{ product.productName }}</p>
                <p class="text-xs text-gray-500">
                  {{ product.currentStock }} {{ t("common.units", "units") }} ×
                  {{ formatCurrency(product.costPrice) }}
                </p>
              </div>
              <p class="font-bold text-green-600 dark:text-green-400">
                {{ formatCurrency(product.value) }}
              </p>
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Stock Movements Tab -->
    <template v-if="activeTab === 'movements'">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <CommonStatCard
          icon="i-heroicons-arrow-down-tray"
          icon-color="green"
          :label="t('reports.totalStockIn', 'Total Stock In')"
          :value="formatNumber(stockInOut.totalIn)"
          :loading="isLoading"
        />
        <CommonStatCard
          icon="i-heroicons-arrow-up-tray"
          icon-color="red"
          :label="t('reports.totalStockOut', 'Total Stock Out')"
          :value="formatNumber(stockInOut.totalOut)"
          :loading="isLoading"
        />
        <CommonStatCard
          icon="i-heroicons-plus-minus"
          :icon-color="stockInOut.netChange >= 0 ? 'green' : 'red'"
          :label="t('reports.netChange', 'Net Change')"
          :value="`${stockInOut.netChange >= 0 ? '+' : ''}${formatNumber(
            stockInOut.netChange
          )}`"
          :loading="isLoading"
        />
      </div>

      <!-- Movement by Type -->
      <div class="px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">
              {{ t("reports.movementByType", "Movement by Type") }}
            </h3>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              v-for="typeData in stockInOut.byType"
              :key="typeData.type"
              class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center"
            >
              <p
                class="text-2xl font-bold"
                :class="
                  typeData.quantity > 0 ? 'text-green-500' : 'text-red-500'
                "
              >
                {{ typeData.quantity > 0 ? "+" : "" }}{{ typeData.quantity }}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {{ typeData.type }}
              </p>
              <p class="text-xs text-gray-500">
                {{ typeData.count }}
                {{ t("common.transactions", "transactions") }}
              </p>
            </div>

            <div
              v-if="stockInOut.byType.length === 0"
              class="col-span-full text-center py-8 text-gray-500"
            >
              {{
                t("reports.noMovementsInPeriod", "No movements in this period")
              }}
            </div>
          </div>
        </UCard>
      </div>

      <!-- Daily Movement Chart -->
      <div class="px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">
              {{ t("reports.dailyMovement", "Daily Stock Movement") }}
            </h3>
          </template>
          <div v-if="stockInOut.byDay.length > 0" class="h-64">
            <ChartBar
              :x-axis-data="stockInOut.byDay.map((d) => d.date)"
              :series="[
                {
                  name: t('reports.stockIn', 'Stock In'),
                  type: 'bar',
                  data: stockInOut.byDay.map((d) => d.inQty),
                  color: '#22c55e',
                },
                {
                  name: t('reports.stockOut', 'Stock Out'),
                  type: 'bar',
                  data: stockInOut.byDay.map((d) => -d.outQty),
                  color: '#ef4444',
                },
              ]"
            />
          </div>
          <div v-else class="text-center py-12 text-gray-500">
            {{
              t("reports.noMovementsInPeriod", "No movements in this period")
            }}
          </div>
        </UCard>
      </div>

      <!-- Top Movers -->
      <div class="px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">
              {{ t("reports.topMovers", "Top Movers") }}
            </h3>
          </template>
          <div class="space-y-2">
            <div
              v-for="mover in stockInOut.topMovers"
              :key="mover.productId"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p class="font-medium">{{ mover.productName }}</p>
                <div class="flex gap-3 text-xs">
                  <span class="text-green-500">↑ {{ mover.inQty }}</span>
                  <span class="text-red-500">↓ {{ mover.outQty }}</span>
                </div>
              </div>
              <span
                class="px-2 py-1 rounded-full text-sm font-bold"
                :class="
                  mover.netChange > 0
                    ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    : mover.netChange < 0
                    ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                "
              >
                {{ mover.netChange > 0 ? "+" : "" }}{{ mover.netChange }}
              </span>
            </div>

            <div
              v-if="stockInOut.topMovers.length === 0"
              class="text-center py-8 text-gray-500"
            >
              {{
                t("reports.noMovementsInPeriod", "No movements in this period")
              }}
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
