<!-- pages/index.vue -->
<!-- 📊 Dashboard - Real-time Sales KPIs & Business Overview -->
<script setup lang="ts">
const { t } = useI18n();
const currency = useCurrency();
const ordersStore = useOrders();
const productsStore = useProducts();

// ============================================
// State
// ============================================
const selectedPeriod = ref<'today' | 'week' | 'month'>('today');
const isInitialLoad = ref(true);
const isRefreshing = ref(false);

// ============================================
// Computed - Check if we have cached data
// ============================================
const hasCachedData = computed(() => {
  return ordersStore.orders.value.length > 0 || productsStore.products.value.length > 0;
});

// ============================================
// Computed - Dashboard KPIs
// ============================================
const kpis = computed(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const startDate = selectedPeriod.value === 'today' 
    ? today 
    : selectedPeriod.value === 'week' 
      ? weekStart 
      : monthStart;

  const periodOrders = ordersStore.orders.value.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate >= startDate && o.status === 'completed';
  });

  const totalRevenue = periodOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = periodOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Payment method breakdown
  const cashSales = periodOrders
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + o.total, 0);
  const lightningSales = periodOrders
    .filter(o => ['lightning', 'bolt12', 'lnurl'].includes(o.paymentMethod || ''))
    .reduce((sum, o) => sum + o.total, 0);
  const otherSales = totalRevenue - cashSales - lightningSales;

  return {
    totalRevenue,
    totalOrders,
    avgOrderValue,
    cashSales,
    lightningSales,
    otherSales,
  };
});

// Today's stats
const todayStats = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayOrders = ordersStore.orders.value.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate >= today && o.status === 'completed';
  });

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayOrders = ordersStore.orders.value.filter(o => {
    const orderDate = new Date(o.date);
    return orderDate >= yesterday && orderDate < today && o.status === 'completed';
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
    : 0;

  return {
    revenue: todayRevenue,
    orders: todayOrders.length,
    revenueChange,
    yesterdayRevenue,
    yesterdayOrders: yesterdayOrders.length,
  };
});

// Top products
const topProducts = computed(() => {
  const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  ordersStore.orders.value
    .filter(o => new Date(o.date) >= today && o.status === 'completed')
    .forEach(order => {
      order.items?.forEach(item => {
        const existing = productSales.get(item.productId) || {
          name: item.product?.name || 'Unknown',
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total;
        productSales.set(item.productId, existing);
      });
    });

  return Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
});

// Hourly sales chart data
const hourlySales = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const hourlyData = Array(24).fill(0).map((_, hour) => ({
    hour: hour.toString().padStart(2, '0') + ':00',
    sales: 0,
    orders: 0,
  }));

  ordersStore.orders.value
    .filter(o => new Date(o.date) >= today && o.status === 'completed')
    .forEach(order => {
      const hour = new Date(order.date).getHours();
      const hourData = hourlyData[hour];
      if (hourData) {
        hourData.sales += order.total;
        hourData.orders += 1;
      }
    });

  return hourlyData;
});

// Low stock products
const lowStockProducts = computed(() => {
  return productsStore.lowStockProducts.value.slice(0, 5);
});

// Recent orders
const recentOrders = computed(() => {
  return [...ordersStore.orders.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
});

// Peak hours
const peakHour = computed(() => {
  const hourSales = hourlySales.value;
  let maxHour = { hour: '-', sales: 0 };
  hourSales.forEach(h => {
    if (h.sales > maxHour.sales) {
      maxHour = h;
    }
  });
  return maxHour;
});

// ============================================
// Methods
// ============================================
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getStatusColor = (status: string): 'green' | 'yellow' | 'red' | 'gray' => {
  const colors: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
    completed: 'green',
    pending: 'yellow',
    processing: 'yellow',
    cancelled: 'red',
  };
  return colors[status] || 'gray';
};

// ============================================
// Lifecycle - Fast load with background refresh
// ============================================
onMounted(async () => {
  // If we have cached data, show it immediately
  if (hasCachedData.value) {
    isInitialLoad.value = false;
    // Refresh in background
    isRefreshing.value = true;
    await Promise.all([
      ordersStore.init(),
      productsStore.init(),
    ]).finally(() => {
      isRefreshing.value = false;
    });
  } else {
    // No cached data, need to wait for initial load
    await Promise.all([
      ordersStore.init(),
      productsStore.init(),
    ]);
    isInitialLoad.value = false;
  }
});
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ t('dashboard.title') }}</h1>
        <p class="text-gray-500 flex items-center gap-2">
          {{ t('dashboard.overview') }}
          <span v-if="isRefreshing" class="inline-flex items-center gap-1 text-xs text-primary-500">
            <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
            {{ t('common.syncing') }}
          </span>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Period Selector -->
        <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            v-for="period in ['today', 'week', 'month'] as const"
            :key="period"
            class="px-4 py-1.5 text-sm font-medium transition-colors"
            :class="selectedPeriod === period
              ? 'bg-primary-500 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
            @click="selectedPeriod = period"
          >
            {{ t(`dashboard.${period}`) }}
          </button>
        </div>
        
        <!-- Quick Actions -->
        <NuxtLink to="/pos">
          <UButton color="primary" icon="i-heroicons-shopping-cart">
            {{ t('pos.terminal') }}
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Initial Loading State with Skeletons -->
    <template v-if="isInitialLoad && !hasCachedData">
      <!-- KPI Cards Skeleton -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard v-for="i in 4" :key="i">
          <div class="flex items-start justify-between">
            <div class="space-y-2 flex-1">
              <USkeleton class="h-4 w-24" />
              <USkeleton class="h-8 w-32" />
              <USkeleton class="h-3 w-20" />
            </div>
            <USkeleton class="w-12 h-12 rounded-xl" />
          </div>
        </UCard>
      </div>

      <!-- Main Content Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <USkeleton class="h-5 w-32" />
            </template>
            <div class="h-64 flex items-end justify-between gap-1 px-2">
              <USkeleton v-for="i in 17" :key="i" class="flex-1 rounded-t" :style="{ height: `${Math.random() * 150 + 30}px` }" />
            </div>
          </UCard>
        </div>
        <div class="space-y-4">
          <UCard v-for="i in 2" :key="i">
            <template #header>
              <USkeleton class="h-5 w-28" />
            </template>
            <div class="space-y-3">
              <div v-for="j in 3" :key="j" class="flex items-center justify-between">
                <USkeleton class="h-4 w-24" />
                <USkeleton class="h-4 w-16" />
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Bottom Skeleton -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard v-for="i in 2" :key="i">
          <template #header>
            <USkeleton class="h-5 w-32" />
          </template>
          <div class="space-y-3">
            <div v-for="j in 4" :key="j" class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <div class="space-y-1">
                <USkeleton class="h-4 w-20" />
                <USkeleton class="h-3 w-16" />
              </div>
              <USkeleton class="h-5 w-24" />
            </div>
          </div>
        </UCard>
      </div>
    </template>

    <!-- Actual Dashboard Content -->
    <template v-else>
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Revenue -->
        <UCard>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.totalRevenue') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {{ currency.format(kpis.totalRevenue, 'LAK') }}
              </p>
              <div v-if="selectedPeriod === 'today'" class="mt-2 flex items-center gap-1">
                <UIcon
                  :name="todayStats.revenueChange >= 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'"
                  :class="todayStats.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'"
                  class="w-4 h-4"
                />
                <span
                  class="text-sm font-medium"
                  :class="todayStats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ todayStats.revenueChange >= 0 ? '+' : '' }}{{ todayStats.revenueChange.toFixed(1) }}%
                </span>
                <span class="text-xs text-gray-500">vs yesterday</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-banknotes" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </UCard>

        <!-- Total Orders -->
        <UCard>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.totalOrders') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {{ kpis.totalOrders }}
              </p>
              <div v-if="selectedPeriod === 'today'" class="mt-2">
                <span class="text-sm text-gray-500">
                  {{ todayStats.yesterdayOrders }} yesterday
                </span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </UCard>

        <!-- Average Order Value -->
        <UCard>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.avgOrderValue') }}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {{ currency.format(kpis.avgOrderValue, 'LAK') }}
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </UCard>

        <!-- Lightning Sales -->
        <UCard>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ t('dashboard.lightningSales') }}</p>
              <p class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {{ currency.format(kpis.lightningSales, 'LAK') }}
              </p>
              <div class="mt-2">
                <span class="text-sm text-gray-500">
                  {{ kpis.totalRevenue > 0 ? ((kpis.lightningSales / kpis.totalRevenue) * 100).toFixed(1) : 0 }}% of total
                </span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <UIcon name="i-heroicons-bolt" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </UCard>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Sales Chart -->
        <div class="lg:col-span-2">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('dashboard.hourlySales') }}</h3>
                <UBadge v-if="peakHour.sales > 0" color="amber" variant="soft">
                  Peak: {{ peakHour.hour }}
                </UBadge>
              </div>
            </template>
            
            <div class="h-64">
              <!-- Simple bar chart visualization -->
              <div class="flex items-end justify-between h-full gap-1 px-2">
                <div
                  v-for="(data, index) in hourlySales.filter((_, i) => i >= 6 && i <= 22)"
                  :key="index"
                  class="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    class="w-full bg-primary-500/80 dark:bg-primary-400/80 rounded-t transition-all"
                    :style="{
                      height: `${Math.max(4, (data.sales / (Math.max(...hourlySales.map(h => h.sales)) || 1)) * 180)}px`
                    }"
                  />
                  <span class="text-xs text-gray-500 tabular-nums">{{ data.hour.split(':')[0] }}</span>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Quick Stats -->
        <div class="space-y-4">
          <!-- Payment Breakdown -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('dashboard.paymentBreakdown') }}</h3>
            </template>
            
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-banknotes" class="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span class="text-gray-600 dark:text-gray-300">{{ t('payment.methods.cash') }}</span>
                </div>
                <span class="font-bold text-gray-900 dark:text-white">
                  {{ currency.format(kpis.cashSales, 'LAK') }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span class="text-gray-600 dark:text-gray-300">{{ t('payment.methods.lightning') }}</span>
                </div>
                <span class="font-bold text-amber-600 dark:text-amber-400">
                  {{ currency.format(kpis.lightningSales, 'LAK') }}
                </span>
              </div>
              <div v-if="kpis.otherSales > 0" class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-device-phone-mobile" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span class="text-gray-600 dark:text-gray-300">{{ t('payment.methods.external') }}</span>
                </div>
                <span class="font-bold text-gray-900 dark:text-white">
                  {{ currency.format(kpis.otherSales, 'LAK') }}
                </span>
              </div>
            </div>
          </UCard>

          <!-- Top Products -->
          <UCard>
            <template #header>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('dashboard.topProducts') }}</h3>
            </template>
            
            <div v-if="topProducts.length === 0" class="text-center py-4 text-gray-500">
              {{ t('dashboard.noSalesYet') }}
            </div>
            <div v-else class="space-y-3">
              <div
                v-for="(product, index) in topProducts"
                :key="index"
                class="flex items-center justify-between"
              >
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                    {{ index + 1 }}
                  </span>
                  <span class="text-gray-900 dark:text-white truncate max-w-[120px]">{{ product.name }}</span>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ currency.format(product.revenue, 'LAK') }}
                  </div>
                  <div class="text-xs text-gray-500">{{ product.quantity }} sold</div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <!-- Bottom Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Orders -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ t('dashboard.recentOrders') }}</h3>
              <NuxtLink to="/orders">
                <UButton size="xs" color="neutral" variant="ghost">
                  {{ t('common.viewAll') }}
                </UButton>
              </NuxtLink>
            </div>
          </template>
          
          <div v-if="recentOrders.length === 0" class="text-center py-8 text-gray-500">
            {{ t('dashboard.noOrdersYet') }}
          </div>
          <div v-else class="space-y-3">
            <NuxtLink
              v-for="order in recentOrders"
              :key="order.id"
              :to="`/orders/${order.id}`"
              class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div>
                <div class="font-medium text-gray-900 dark:text-white">#{{ order.id.slice(-6).toUpperCase() }}</div>
                <div class="text-sm text-gray-500">{{ formatTime(order.date) }}</div>
              </div>
              <div class="flex items-center gap-3">
                <span class="font-bold text-gray-900 dark:text-white">
                  {{ currency.format(order.total, 'LAK') }}
                </span>
                <UBadge :color="getStatusColor(order.status)" variant="soft" size="xs">
                  {{ t(`orders.status.${order.status}`) }}
                </UBadge>
              </div>
            </NuxtLink>
          </div>
        </UCard>

        <!-- Low Stock Alert -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-500" /> {{ t('dashboard.lowStock') }}
              </h3>
              <NuxtLink to="/inventory">
                <UButton size="xs" color="neutral" variant="ghost">
                  {{ t('common.viewAll') }}
                </UButton>
              </NuxtLink>
            </div>
          </template>
          
          <div v-if="lowStockProducts.length === 0" class="text-center py-8 text-green-600 dark:text-green-400">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 mx-auto" />
            <p class="mt-2">{{ t('dashboard.allStocked') }}</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="product in lowStockProducts"
              :key="product.id"
              class="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20"
            >
              <div>
                <div class="font-medium text-gray-900 dark:text-white">{{ product.name }}</div>
                <div class="text-sm text-gray-500">SKU: {{ product.sku }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-red-600 dark:text-red-400">{{ product.stock }}</div>
                <div class="text-xs text-gray-500">min: {{ product.minStock }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Quick Links -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <NuxtLink to="/pos" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-shopping-cart" class="w-8 h-8 text-primary-600 dark:text-primary-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('pos.terminal') }}</div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/pos/shift" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-currency-dollar" class="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('pos.shift.title') }}</div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/pos/tables" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-table-cells" class="w-8 h-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('pos.tables.title') }}</div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/kitchen" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-fire" class="w-8 h-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('kitchen.title') }}</div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/accounting/expenses" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-arrow-trending-down" class="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('accounting.tabs.expenses') }}</div>
            </div>
          </UCard>
        </NuxtLink>
        <NuxtLink to="/reports" class="block">
          <UCard class="hover:border-primary-500 transition-colors cursor-pointer">
            <div class="text-center">
              <UIcon name="i-heroicons-chart-bar-square" class="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div class="font-medium text-gray-900 dark:text-white">{{ t('reports.title') }}</div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
