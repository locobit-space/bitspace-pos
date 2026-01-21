<!-- pages/reports/index.vue -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();

// Use the reports composable for all data
const {
  // State
  isInitialized,
  loading,
  dateRange,
  selectedBranch,
  selectedReport,
  // Config
  reportTypes,
  branches,
  quickDateRanges,
  // Report Data
  salesData,
  productData,
  customerData,
  staffData,
  paymentData,
  inventoryStats,
  lowStockItems,
  // Chart Data
  salesChartData,
  categoryChartData,
  // Functions
  formatCurrency,
  setQuickDateRange,
  init,
  refresh,
  generateExportData,
} = useReports();

// Initialize on mount
onMounted(async () => {
  try {
    await init();
  } catch (error) {
    console.error("Failed to initialize stores:", error);
    toast.add({
      title: t("common.error"),
      description: t("reports.initError", "Failed to load report data"),
      color: "error",
    });
  }
});

// Date range selector state
const selectedPreset = ref("month");

// Handle date range changes from the selector
const handleDateRangeChange = (range: { start: string; end: string }) => {
  dateRange.value = range;
};

// Generate report (refresh data)
const generateReport = async () => {
  try {
    await refresh();
    toast.add({
      title: t("common.success"),
      description: t("reports.dataRefreshed", "Report data refreshed"),
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: t("common.error"),
      description: String(error),
      color: "error",
    });
  }
};

// Export report
const exportReport = async (format: "pdf" | "excel" | "csv") => {
  if (format === "csv") {
    const data = generateExportData(selectedReport.value);
    const csvContent = data.map((r) => r.join(",")).join("\n");
    const fileName = `${selectedReport.value}-report-${dateRange.value.start}-${dateRange.value.end}.csv`;

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    toast.add({
      title: t("common.success"),
      description: t("reports.exported", "Report exported"),
      color: "success",
    });
  } else {
    toast.add({
      title: t("common.info"),
      description: t(
        "reports.exportComingSoon",
        "PDF and Excel export coming soon",
      ),
      color: "info",
    });
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <CommonPageHeader
      :title="t('reports.title')"
      :description="t('reports.description')"
    >
      <template #right>
        <div class="flex gap-2">
          <UDropdownMenu
            :items="[
              [
                {
                  label: 'PDF',
                  icon: 'solar:file-text-linear',
                  click: () => exportReport('pdf'),
                },
                {
                  label: 'Excel',
                  icon: 'solar:clipboard-list-linear',
                  click: () => exportReport('excel'),
                },
                {
                  label: 'CSV',
                  icon: 'solar:document-text-linear',
                  onSelect: () => exportReport('csv'),
                },
              ],
            ]"
          >
            <UButton
              color="gray"
              variant="outline"
              icon="solar:download-minimalistic-linear"
              :label="t('common.export')"
              trailing-icon="solar:alt-arrow-down-linear"
            />
          </UDropdownMenu>
          <UButton
            color="primary"
            icon="solar:refresh-circle-linear"
            :loading="loading"
            :label="t('reports.generate')"
            @click="generateReport"
          />
        </div>
      </template>
    </CommonPageHeader>

    <!-- Report Type Selection -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-4">
      <button
        v-for="report in reportTypes"
        :key="report.id"
        class="p-4 rounded-xl border-2 transition-all text-left"
        :class="[
          selectedReport === report.id
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        ]"
        @click="selectedReport = report.id"
      >
        <Icon
          :name="report.icon"
          class="w-8 h-8 mb-2"
          :class="
            selectedReport === report.id ? 'text-primary-500' : 'text-gray-400'
          "
        />
        <p
          class="font-medium text-sm"
          :class="
            selectedReport === report.id
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300'
          "
        >
          {{ t(report.name) }}
        </p>
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-gray-50 dark:bg-gray-800/50 p-4 mx-4 rounded-xl space-y-4">
      <!-- Date Range Selector -->
      <CommonDateRangeSelector
        v-model="selectedPreset"
        @update:date-range="handleDateRangeChange"
      />

      <!-- Branch Filter -->
      <div class="flex items-end gap-4">
        <UFormField :label="t('common.branch')">
          <USelectMenu
            v-model="selectedBranch"
            :items="branches"
            value-key="id"
            label-key="name"
            class="w-48"
          />
        </UFormField>
        <!-- Quick Actions -->
        <div v-if="selectedReport === 'inventory'" class="">
          <UButton
            color="primary"
            variant="soft"
            icon="solar:chart-square-linear"
            to="/reports/inventory"
          >
            {{ t("reports.advancedReports", "Advanced Inventory Reports") }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Sales Report -->
    <template v-if="selectedReport === 'sales'">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        <CommonStatCard
          icon="i-solar:dollar-minimalistic-outline"
          icon-color="blue"
          :label="t('reports.totalRevenue')"
          :value="formatCurrency(salesData.totalRevenue)"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:cart-large-minimalistic-linear"
          icon-color="green"
          :label="t('reports.totalOrders')"
          :value="salesData.totalOrders.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:calculator-minimalistic-linear"
          icon-color="purple"
          :label="t('reports.avgOrderValue')"
          :value="formatCurrency(salesData.avgOrderValue)"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:banknote-2-linear"
          icon-color="yellow"
          :label="t('reports.topPaymentMethod')"
          :value="salesData.topPaymentMethod"
          :loading="loading || !isInitialized"
        />
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.revenueOverTime") }}</h3>
          </template>
          <div class="h-80">
            <ChartBar
              :x-axis-data="salesChartData.xAxisData"
              :series="salesChartData.series"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.paymentMethods") }}</h3>
          </template>
          <div class="space-y-4">
            <div
              v-for="method in salesData.byPaymentMethod"
              :key="method.method"
              class="flex items-center"
            >
              <div class="flex-1">
                <div class="flex justify-between mb-1">
                  <span class="font-medium">{{ method.method }}</span>
                  <span class="text-sm text-gray-500"
                    >{{ method.percentage }}%</span
                  >
                </div>
                <div
                  class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="{ width: `${method.percentage}%` }"
                  />
                </div>
              </div>
              <span class="ml-4 font-bold text-right min-w-30">{{
                formatCurrency(method.amount)
              }}</span>
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Products Report -->
    <template v-if="selectedReport === 'products'">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4">
        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.topProducts") }}</h3>
          </template>
          <div class="space-y-4">
            <div
              v-for="(product, index) in productData.topProducts"
              :key="product.name"
              class="flex items-center"
            >
              <span
                class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold mr-3"
              >
                {{ index + 1 }}
              </span>
              <div class="flex-1">
                <p class="font-medium">{{ product.name }}</p>
                <p class="text-sm text-gray-500">
                  {{ product.sold }} {{ t("reports.unitsSold") }}
                </p>
              </div>
              <span class="font-bold text-primary-600 dark:text-primary-400">{{
                formatCurrency(product.revenue)
              }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">{{ t("reports.salesByCategory") }}</h3>
          </template>
          <div class="h-64">
            <ChartPie :chart-data="categoryChartData" />
          </div>
        </UCard>
      </div>
    </template>

    <!-- Customers Report -->
    <template v-if="selectedReport === 'customers'">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <CommonStatCard
          icon="i-solar:users-group-rounded-linear"
          icon-color="blue"
          :label="t('reports.totalCustomers')"
          :value="customerData.totalCustomers"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:user-plus-rounded-linear"
          icon-color="green"
          :label="t('reports.newCustomers')"
          :value="'+' + customerData.newCustomers"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:refresh-circle-linear"
          icon-color="purple"
          :label="t('reports.repeatRate')"
          :value="customerData.repeatRate + '%'"
          :loading="loading || !isInitialized"
        />
      </div>

      <UCard class="mx-4">
        <template #header>
          <h3 class="font-medium">{{ t("reports.topCustomers") }}</h3>
        </template>
        <table class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium">#</th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("customers.name") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("reports.orders") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("reports.totalSpent") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(customer, index) in customerData.topCustomers"
              :key="customer.name"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4">{{ index + 1 }}</td>
              <td class="py-3 px-4 font-medium">{{ customer.name }}</td>
              <td class="py-3 px-4 text-center">{{ customer.orders }}</td>
              <td
                class="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400"
              >
                {{ formatCurrency(customer.spent) }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <!-- Payments Report -->
    <template v-if="selectedReport === 'payments'">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 px-4">
        <UCard v-for="method in paymentData.byMethod" :key="method.method">
          <div class="flex items-center mb-4">
            <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-full mr-4">
              <Icon :name="method.icon" class="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p class="font-medium">{{ method.method }}</p>
              <p class="text-sm text-gray-500">
                {{ method.transactions }} {{ t("reports.transactions") }}
              </p>
            </div>
          </div>
          <p class="text-2xl font-bold">{{ formatCurrency(method.amount) }}</p>
        </UCard>
      </div>

      <!-- Lightning Stats -->
      <UCard class="mx-4">
        <template #header>
          <div class="flex items-center gap-2">
            <Icon name="solar:bolt-linear" class="w-5 h-5 text-orange-500" />
            <h3 class="font-medium">{{ t("reports.lightningStats") }}</h3>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.totalSats") }}
            </p>
            <p class="text-2xl font-bold text-orange-500">
              {{ paymentData.lightningStats.totalSats.toLocaleString() }} sats
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.avgTxSize") }}
            </p>
            <p class="text-2xl font-bold">
              {{ paymentData.lightningStats.avgTxSize.toLocaleString() }} sats
            </p>
          </div>
          <div class="text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ t("reports.successRate") }}
            </p>
            <p class="text-2xl font-bold text-green-500">
              {{ paymentData.lightningStats.successRate }}%
            </p>
          </div>
        </div>
      </UCard>
    </template>

    <!-- Inventory Report -->
    <template v-if="selectedReport === 'inventory'">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
        <CommonStatCard
          icon="i-solar:box-minimalistic-linear"
          icon-color="blue"
          :label="t('reports.totalProducts', 'Total Products')"
          :value="inventoryStats.totalProducts.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:dollar-minimalistic-linear"
          icon-color="green"
          :label="t('ingredients.inventoryValue', 'Inventory Value')"
          :value="formatCurrency(inventoryStats.totalValue)"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:danger-triangle-linear"
          icon-color="yellow"
          :label="t('inventory.lowStock', 'Low Stock')"
          :value="inventoryStats.lowStock.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:close-circle-linear"
          icon-color="red"
          :label="t('inventory.outOfStock', 'Out of Stock')"
          :value="inventoryStats.outOfStock.toLocaleString()"
          :loading="loading || !isInitialized"
        />
      </div>

      <UCard class="mx-4">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-medium">
              {{ t("reports.lowStockItems", "Low Stock Items") }}
            </h3>
            <UButton
              variant="ghost"
              color="primary"
              size="sm"
              icon="solar:alt-arrow-right-linear"
              to="/reports/inventory"
            >
              {{ t("reports.viewDetails", "View Details") }}
            </UButton>
          </div>
        </template>

        <!-- Skeleton Loading -->
        <div v-if="loading || !isInitialized" class="space-y-3">
          <div v-for="i in 5" :key="i" class="flex items-center gap-4">
            <USkeleton class="h-4 w-1/3" />
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-4 w-16" />
            <USkeleton class="h-6 w-20" />
          </div>
        </div>

        <div
          v-else-if="lowStockItems.length === 0"
          class="text-center py-8 text-gray-500"
        >
          {{ t("reports.noLowStockItems", "No low stock items") }}
        </div>
        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium">
                {{ t("products.name", "Product") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.currentStock", "Current Stock") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("inventory.reorderPoint", "Reorder Point") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("common.status", "Status") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in lowStockItems.slice(0, 10)"
              :key="item.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4 font-medium">{{ item.productName }}</td>
              <td class="py-3 px-4 text-center">{{ item.currentStock }}</td>
              <td class="py-3 px-4 text-center">
                {{ item.reorderPoint || 0 }}
              </td>
              <td class="py-3 px-4 text-right">
                <UBadge
                  :color="item.status === 'out-of-stock' ? 'red' : 'yellow'"
                  variant="subtle"
                >
                  {{
                    item.status === "out-of-stock"
                      ? t("inventory.outOfStock", "Out of Stock")
                      : t("inventory.lowStock", "Low Stock")
                  }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>

    <!-- Staff Report -->
    <template v-if="selectedReport === 'staff'">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4">
        <CommonStatCard
          icon="i-solar:users-group-rounded-linear"
          icon-color="blue"
          :label="t('reports.totalStaff', 'Total Staff')"
          :value="staffData.totalStaff.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:cart-large-minimalistic-linear"
          icon-color="green"
          :label="t('reports.ordersProcessed', 'Orders Processed')"
          :value="staffData.totalOrders.toLocaleString()"
          :loading="loading || !isInitialized"
        />
        <CommonStatCard
          icon="i-solar:dollar-minimalistic-linear"
          icon-color="purple"
          :label="t('reports.totalSales', 'Total Sales')"
          :value="formatCurrency(staffData.totalSales)"
          :loading="loading || !isInitialized"
        />
      </div>

      <UCard class="mx-4">
        <template #header>
          <h3 class="font-medium">
            {{ t("reports.topPerformers", "Top Performers") }}
          </h3>
        </template>
        <div
          v-if="staffData.performers.length === 0"
          class="text-center py-8 text-gray-500"
        >
          {{
            t(
              "reports.noStaffData",
              "No staff performance data available for this period",
            )
          }}
        </div>
        <table v-else class="w-full">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium">#</th>
              <th class="text-left py-3 px-4 font-medium">
                {{ t("staff.name", "Staff Name") }}
              </th>
              <th class="text-center py-3 px-4 font-medium">
                {{ t("reports.orders", "Orders") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("reports.sales", "Sales") }}
              </th>
              <th class="text-right py-3 px-4 font-medium">
                {{ t("reports.avgOrder", "Avg Order") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(staff, index) in staffData.performers"
              :key="staff.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 px-4">{{ index + 1 }}</td>
              <td class="py-3 px-4 font-medium">{{ staff.name }}</td>
              <td class="py-3 px-4 text-center">{{ staff.orders }}</td>
              <td
                class="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400"
              >
                {{ formatCurrency(staff.sales) }}
              </td>
              <td class="py-3 px-4 text-right">
                {{ formatCurrency(staff.avgOrder) }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </template>
  </div>
</template>
