<template>
  <div class="flex h-full">
    <!-- Sidebar Navigation -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4 space-y-1 overflow-y-auto">
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white px-3">
          {{ $t('settings.title') }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 px-3">
          {{ $t('settings.description') }}
        </p>
      </div>
      
      <nav class="space-y-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          ]"
        >
          <UIcon :name="item.icon" class="w-5 h-5 flex-shrink-0" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>
      
      <!-- Quick Actions -->
      <div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
        <p class="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {{ $t('dashboard.quickActions') }}
        </p>
        <NuxtLink
          to="/pos"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5" />
          <span>{{ $t('pos.terminal') }}</span>
        </NuxtLink>
        <NuxtLink
          to="/"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <UIcon name="i-heroicons-home" class="w-5 h-5" />
          <span>{{ $t('navigation.dashboard') }}</span>
        </NuxtLink>
      </div>
    </aside>
    
    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const navItems = computed(() => [
  {
    label: t('settings.general.title'),
    to: '/settings/general',
    icon: 'i-heroicons-cog-6-tooth',
  },
  {
    label: t('settings.account.title'),
    to: '/settings/account',
    icon: 'i-heroicons-user-circle',
  },
  {
    label: t('settings.lightning.title'),
    to: '/settings/lightning',
    icon: 'i-heroicons-bolt',
  },
  {
    label: t('settings.users.title'),
    to: '/settings/users',
    icon: 'i-heroicons-users',
  },
  {
    label: t('settings.tax.title'),
    to: '/settings/tax',
    icon: 'i-heroicons-receipt-percent',
  },
  {
    label: t('settings.receipt.title'),
    to: '/settings/receipt',
    icon: 'i-heroicons-document-text',
  },
  {
    label: t('settings.backup.title'),
    to: '/settings/backup',
    icon: 'i-heroicons-cloud-arrow-up',
  },
  {
    label: t('settings.auditLog.title'),
    to: '/settings/audit-log',
    icon: 'i-heroicons-shield-check',
  },
])

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped></style>
