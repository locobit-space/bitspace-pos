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

// Current time for greeting
const currentTime = ref(new Date());
const greeting = computed(() => {
  const hour = currentTime.value.getHours();
  if (hour < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (hour < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  if (hour < 21) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Good Night', emoji: '🌙' };
});

// Finance health score (based on today's performance)
const financeHealth = computed(() => {
  const change = todayStats.value.revenueChange;
  if (change >= 20) return { score: 'Excellent', color: 'green', value: 95 };
  if (change >= 10) return { score: 'Great', color: 'green', value: 85 };
  if (change >= 0) return { score: 'Good', color: 'blue', value: 70 };
  if (change >= -10) return { score: 'Fair', color: 'yellow', value: 55 };
  return { score: 'Needs Attention', color: 'red', value: 40 };
});

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
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
    <!-- Compact Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <span class="text-xl">{{ greeting.emoji }}</span>
        <div>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ greeting.text }}</p>
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('dashboard.title') }}</h1>
        </div>
        <span v-if="isRefreshing" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-xs text-primary-600 dark:text-primary-400">
          <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 animate-spin" />
          {{ t('common.syncing') }}
        </span>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Period Selector -->
        <div class="flex p-1 rounded-lg bg-gray-100 dark:bg-gray-800 gap-1">
          <button
            v-for="period in ['today', 'week', 'month'] as const"
            :key="period"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all relative"
            :class="selectedPeriod === period
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700'"
            @click="selectedPeriod = period"
          >
            <span class="flex items-center gap-1">
              <span v-if="period === 'today'" class="w-1.5 h-1.5 rounded-full" :class="selectedPeriod === 'today' ? 'bg-white' : 'bg-green-500'" />
              {{ t(`dashboard.${period}`) }}
            </span>
          </button>
        </div>
        
        <NuxtLink to="/pos">
          <UButton color="primary" icon="i-heroicons-shopping-cart" size="sm">
            {{ t('pos.terminal') }}
          </UButton>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <template v-if="isInitialLoad && !hasCachedData">
      <div class="grid grid-cols-12 gap-3">
        <div v-for="i in 4" :key="i" class="col-span-12 sm:col-span-6 lg:col-span-3">
          <div class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <USkeleton class="h-3 w-16 mb-2" />
            <USkeleton class="h-6 w-28" />
          </div>
        </div>
      </div>
    </template>

    <!-- Main Grid - Minimal -->
    <template v-else>
      <div class="grid grid-cols-12 gap-3">
        
        <!-- Total Revenue -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-banknotes" class="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <span
                v-if="selectedPeriod === 'today'"
                class="text-xs font-medium"
                :class="todayStats.revenueChange >= 0 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'"
              >
                {{ todayStats.revenueChange >= 0 ? '+' : '' }}{{ todayStats.revenueChange.toFixed(1) }}%
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.totalRevenue') }}</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
              {{ currency.format(kpis.totalRevenue, 'LAK') }}
            </p>
          </div>
        </div>

        <!-- Total Orders -->
        <div class="col-span-6 lg:col-span-3">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-clipboard-document-list" class="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.totalOrders') }}</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">{{ kpis.totalOrders }}</p>
          </div>
        </div>

        <!-- Average Order Value -->
        <div class="col-span-6 lg:col-span-3">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('dashboard.avgOrderValue') }}</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
              {{ currency.format(kpis.avgOrderValue, 'LAK') }}
            </p>
          </div>
        </div>

        <!-- Lightning Sales -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-3">
          <div class="h-full bg-amber-50 dark:bg-amber-900/10 rounded-lg p-4 border border-amber-200 dark:border-amber-900/30">
            <div class="flex items-center justify-between mb-2">
              <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <span class="text-base">⚡</span>
              </div>
              <span class="text-xs font-medium text-amber-600 dark:text-amber-400">
                {{ kpis.totalRevenue > 0 ? ((kpis.lightningSales / kpis.totalRevenue) * 100).toFixed(0) : 0 }}%
              </span>
            </div>
            <p class="text-xs text-amber-600 dark:text-amber-400">{{ t('dashboard.lightningSales') }}</p>
            <p class="text-xl font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
              {{ currency.format(kpis.lightningSales, 'LAK') }}
            </p>
          </div>
        </div>

        <!-- Sales Chart -->
        <div class="col-span-12 lg:col-span-8">
          <div class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.hourlySales') }}</h3>
                <p class="text-xs text-gray-500">Sales throughout the day</p>
              </div>
              <UBadge v-if="peakHour.sales > 0" color="amber" variant="soft" size="sm">
                Peak: {{ peakHour.hour }}
              </UBadge>
            </div>
            
            <div class="h-36">
              <div class="flex items-end justify-between h-full gap-0.5">
                <div
                  v-for="(data, index) in hourlySales.filter((_, i) => i >= 6 && i <= 22)"
                  :key="index"
                  class="flex-1 flex flex-col items-center gap-0.5 group cursor-pointer"
                >
                  <div class="relative w-full">
                    <div
                      class="w-full bg-primary-500 dark:bg-primary-400 rounded-t transition-all group-hover:bg-primary-600 dark:group-hover:bg-primary-300"
                      :style="{
                        height: `${Math.max(3, (data.sales / (Math.max(...hourlySales.map(h => h.sales)) || 1)) * 120)}px`
                      }"
                    />
                    <div class="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                      {{ currency.format(data.sales, 'LAK') }}
                    </div>
                  </div>
                  <span class="text-[10px] text-gray-400 tabular-nums">{{ data.hour.split(':')[0] }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Business Health -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center gap-2 mb-3">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-shield-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Business Health</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white"><span :class="`text-${financeHealth.color}-600 dark:text-${financeHealth.color}-400`">{{ financeHealth.score }}</span></p>
              </div>
            </div>
            <div class="flex gap-0.5 mb-2">
              <div 
                v-for="i in 10" 
                :key="i"
                class="flex-1 h-1.5 rounded-full"
                :class="i <= financeHealth.value / 10 
                  ? `bg-${financeHealth.color}-500` 
                  : 'bg-gray-200 dark:bg-gray-700'"
              />
            </div>
            <p class="text-[10px] text-gray-400">Based on revenue trends vs yesterday</p>
          </div>
        </div>

        <!-- Payment Breakdown -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <h3 class="font-medium text-gray-900 dark:text-white text-sm mb-3">{{ t('dashboard.paymentBreakdown') }}</h3>
            
            <div class="space-y-3">
              <!-- Cash -->
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <UIcon name="i-heroicons-banknotes" class="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-center mb-0.5">
                    <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.cash') }}</span>
                    <span class="font-medium text-gray-900 dark:text-white tabular-nums text-sm">
                      {{ currency.format(kpis.cashSales, 'LAK') }}
                    </span>
                  </div>
                  <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-green-500 rounded-full" 
                      :style="{ width: `${kpis.totalRevenue > 0 ? (kpis.cashSales / kpis.totalRevenue) * 100 : 0}%` }"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Lightning -->
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <span class="text-sm">⚡</span>
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-center mb-0.5">
                    <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.lightning') }}</span>
                    <span class="font-medium text-amber-600 dark:text-amber-400 tabular-nums text-sm">
                      {{ currency.format(kpis.lightningSales, 'LAK') }}
                    </span>
                  </div>
                  <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-amber-500 rounded-full" 
                      :style="{ width: `${kpis.totalRevenue > 0 ? (kpis.lightningSales / kpis.totalRevenue) * 100 : 0}%` }"
                    />
                  </div>
                </div>
              </div>
              
              <!-- Other -->
              <div v-if="kpis.otherSales > 0" class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <UIcon name="i-heroicons-device-phone-mobile" class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div class="flex-1">
                  <div class="flex justify-between items-center mb-0.5">
                    <span class="text-xs text-gray-600 dark:text-gray-300">{{ t('payment.methods.external') }}</span>
                    <span class="font-medium text-gray-900 dark:text-white tabular-nums text-sm">
                      {{ currency.format(kpis.otherSales, 'LAK') }}
                    </span>
                  </div>
                  <div class="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full bg-blue-500 rounded-full" 
                      :style="{ width: `${kpis.totalRevenue > 0 ? (kpis.otherSales / kpis.totalRevenue) * 100 : 0}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Products -->
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
          <div class="h-full bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.topProducts') }}</h3>
              <span class="text-[10px] text-gray-400">Today</span>
            </div>
            
            <div v-if="topProducts.length === 0" class="text-center py-6 text-gray-500">
              <UIcon name="i-heroicons-cube" class="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p class="text-xs">{{ t('dashboard.noSalesYet') }}</p>
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="(product, index) in topProducts"
                :key="index"
                class="flex items-center gap-2 py-1"
              >
                <span 
                  class="w-5 h-5 rounded text-[10px] font-medium flex items-center justify-center"
                  :class="index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'"
                >
                  {{ index + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-sm text-gray-900 dark:text-white truncate">{{ product.name }}</p>
                </div>
                <p class="font-medium text-gray-900 dark:text-white tabular-nums text-xs">
                  {{ product.quantity }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Orders -->
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.recentOrders') }}</h3>
              <NuxtLink to="/orders" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                {{ t('common.viewAll') }}
              </NuxtLink>
            </div>
            
            <div v-if="recentOrders.length === 0" class="text-center py-6 text-gray-500">
              <UIcon name="i-heroicons-inbox" class="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p class="text-xs">{{ t('dashboard.noOrdersYet') }}</p>
            </div>
            <div v-else class="space-y-1.5">
              <NuxtLink
                v-for="order in recentOrders"
                :key="order.id"
                :to="`/orders/${order.id}`"
                class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <UIcon name="i-heroicons-receipt-percent" class="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p class="text-sm text-gray-900 dark:text-white">#{{ order.id?.slice(-6).toUpperCase() || '------' }}</p>
                    <p class="text-[10px] text-gray-400">{{ formatTime(order.date) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <p class="font-medium text-gray-900 dark:text-white tabular-nums text-sm">
                    {{ currency.format(order.total, 'LAK') }}
                  </p>
                  <UBadge :color="getStatusColor(order.status)" variant="soft" size="xs">
                    {{ t(`orders.status.${order.status}`) }}
                  </UBadge>
                </div>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Low Stock -->
        <div class="col-span-12 lg:col-span-6">
          <div class="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 class="font-medium text-gray-900 dark:text-white text-sm">{{ t('dashboard.lowStock') }}</h3>
              </div>
              <NuxtLink to="/inventory" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                {{ t('common.viewAll') }}
              </NuxtLink>
            </div>
            
            <div v-if="lowStockProducts.length === 0" class="text-center py-6">
              <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                <UIcon name="i-heroicons-check-circle" class="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p class="text-xs text-green-600 dark:text-green-400">{{ t('dashboard.allStocked') }}</p>
            </div>
            <div v-else class="space-y-1.5">
              <div
                v-for="product in lowStockProducts"
                :key="product.id"
                class="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-900/10"
              >
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <UIcon name="i-heroicons-cube" class="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  </div>
                  <p class="text-sm text-gray-900 dark:text-white">{{ product.name }}</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-semibold text-red-600 dark:text-red-400 tabular-nums">{{ product.stock }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="col-span-12">
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <NuxtLink to="/pos" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-shopping-cart" class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('pos.terminal') }}</p>
              </div>
            </NuxtLink>
            
            <NuxtLink to="/pos/shift" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-green-300 dark:hover:border-green-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-currency-dollar" class="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('pos.shift.title') }}</p>
              </div>
            </NuxtLink>
            
            <NuxtLink to="/pos/tables" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-table-cells" class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('pos.tables.title') }}</p>
              </div>
            </NuxtLink>
            
            <NuxtLink to="/kitchen" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-fire" class="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('kitchen.title') }}</p>
              </div>
            </NuxtLink>
            
            <NuxtLink to="/accounting/expenses" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-red-300 dark:hover:border-red-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-arrow-trending-down" class="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('accounting.tabs.expenses') }}</p>
              </div>
            </NuxtLink>
            
            <NuxtLink to="/reports" class="group">
              <div class="p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-center">
                <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-2">
                  <UIcon name="i-heroicons-chart-bar-square" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ t('reports.title') }}</p>
              </div>
            </NuxtLink>
          </div>
        </div>
        
      </div>
    </template>
  </div>
</template>

<style scoped>
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
</style>
