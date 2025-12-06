<!-- components/common/StatCard.vue -->
<script setup lang="ts">
interface Props {
  icon: string;
  iconColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  } | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  iconColor: 'blue',
  loading: false,
  trend: null,
});

const colorClasses = computed(() => {
  const colors: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900', icon: 'text-blue-500 dark:text-blue-400' },
    green: { bg: 'bg-green-100 dark:bg-green-900', icon: 'text-green-500 dark:text-green-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900', icon: 'text-yellow-500 dark:text-yellow-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900', icon: 'text-red-500 dark:text-red-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900', icon: 'text-purple-500 dark:text-purple-400' },
    gray: { bg: 'bg-gray-100 dark:bg-gray-800', icon: 'text-gray-500 dark:text-gray-400' },
  };
  return colors[props.iconColor] || colors.blue;
});
</script>

<template>
  <UCard>
    <div class="flex items-center">
      <div :class="[colorClasses.bg, 'p-3 rounded-full']">
        <Icon :name="icon" :class="[colorClasses.icon, 'w-6 h-6']" />
      </div>
      <div class="ml-4 flex-1">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
        <div v-if="loading" class="animate-pulse">
          <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mt-1" />
        </div>
        <p v-else class="text-2xl font-bold text-gray-900 dark:text-white">{{ value }}</p>
      </div>
      <div v-if="trend" class="flex items-center gap-1" :class="trend.direction === 'up' ? 'text-green-500' : 'text-red-500'">
        <Icon 
          :name="trend.direction === 'up' ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" 
          class="w-5 h-5" 
        />
        <span class="text-sm font-medium">{{ trend.value }}%</span>
      </div>
    </div>
    <slot />
  </UCard>
</template>
