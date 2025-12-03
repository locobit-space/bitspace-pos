<template>
  <div class="flex flex-col h-full">
    <!-- Navigation Items -->
    <ul class="p-1 flex-1 space-y-1">
      <li v-for="(item, index) in items" :key="index">
        <NuxtLinkLocale
          :to="item.to"
          class="flex p-2 transition-all px-3 justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center group relative"
          active-class="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
        >
          <span><Icon :name="item.icon" size="24" /></span>
          <!-- Tooltip -->
          <span class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {{ item.label }}
          </span>
        </NuxtLinkLocale>
      </li>
    </ul>

    <!-- User Profile Section -->
    <div class="p-1 border-t border-gray-200 dark:border-gray-700">
      <!-- Profile Dropdown -->
      <UPopover>
        <button
          class="flex p-2 w-full transition-all px-3 justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
        >
          <div v-if="auth.user.value?.avatarUrl" class="w-8 h-8 rounded-full overflow-hidden">
            <img :src="auth.user.value.avatarUrl" alt="Profile" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
            <Icon name="i-heroicons-user" size="18" class="text-primary-600 dark:text-primary-400" />
          </div>
        </button>

        <template #content>
          <div class="w-64 p-3">
            <!-- User Info -->
            <div class="px-2 py-2 border-b border-gray-200 dark:border-gray-700 mb-3">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                {{ auth.user.value?.displayName || 'User' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ auth.user.value?.email || formatPubkey(auth.user.value?.nostrPubkey) }}
              </p>
              <span 
                class="inline-block mt-1 text-xs px-2 py-0.5 rounded-full"
                :class="providerBadgeClass"
              >
                {{ auth.user.value?.provider === 'nostr' ? '⚡ Nostr' : 
                   auth.user.value?.provider === 'google' ? '🔷 Google' : '📧 Email' }}
              </span>
            </div>

            <!-- Quick Settings -->
            <div class="px-2 py-3 border-b border-gray-200 dark:border-gray-700 mb-3 space-y-3">
              <!-- Dark Mode Toggle -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon 
                    :name="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'" 
                    size="18" 
                    class="text-gray-600 dark:text-gray-400" 
                  />
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    {{ $t('account.dark_mode') }}
                  </span>
                </div>
                <USwitch v-model="isDark" size="sm" />
              </div>

              <!-- Theme Color Selector -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="i-heroicons-swatch" size="18" class="text-gray-600 dark:text-gray-400" />
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    {{ $t('account.theme_color') }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="color in themeColors"
                    :key="color.value"
                    :title="color.label"
                    :class="[
                      'w-5 h-5 rounded-full ring-1 ring-offset-1 ring-offset-white dark:ring-offset-gray-800 transition-all',
                      color.class,
                      selectedColor === color.value 
                        ? 'ring-gray-900 dark:ring-white scale-110' 
                        : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'
                    ]"
                    @click="setThemeColor(color.value)"
                  />
                </div>
              </div>
            </div>

            <!-- Menu Items -->
            <ul class="space-y-1">
              <li>
                <NuxtLinkLocale
                  to="/settings/account"
                  class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon name="i-heroicons-user-circle" size="18" />
                  {{ $t('settings.account.title') }}
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/settings"
                  class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon name="i-heroicons-cog-6-tooth" size="18" />
                  {{ $t('settings.general.title') }}
                </NuxtLinkLocale>
              </li>
              <li class="border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                <button
                  class="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  @click="handleLogout"
                >
                  <Icon name="i-heroicons-arrow-right-on-rectangle" size="18" />
                  {{ $t('auth.signOut') }}
                </button>
              </li>
            </ul>
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const auth = useAuth();
const colorMode = useColorMode();
const appConfig = useAppConfig();

// Dark mode
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
});

// Theme colors
const themeColors = [
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
];

const selectedColor = ref(appConfig.ui?.primary || 'purple');

const setThemeColor = (color: string) => {
  selectedColor.value = color;
  appConfig.ui.primary = color;
  localStorage.setItem('theme-color', color);
};

// Load saved color on mount
onMounted(() => {
  const savedColor = localStorage.getItem('theme-color');
  if (savedColor) {
    selectedColor.value = savedColor;
    appConfig.ui.primary = savedColor;
  }
});

const items = computed(() => [
  {
    label: t('navigation.dashboard'),
    to: "/",
    icon: "i-heroicons-home",
  },
  {
    label: t('navigation.pos'),
    to: "/pos",
    icon: "i-heroicons-bolt",
  },
  {
    label: t('navigation.orders'),
    to: "/orders",
    icon: "i-heroicons-shopping-bag",
  },
  {
    label: t('navigation.products'),
    to: "/products",
    icon: "i-heroicons-cube",
  },
  {
    label: t('navigation.customers'),
    to: "/customers",
    icon: "i-heroicons-users",
  },
  {
    label: t('navigation.inventory'),
    to: "/inventory",
    icon: "i-heroicons-archive-box",
  },
  {
    label: t('navigation.kitchen'),
    to: "/kitchen",
    icon: "i-heroicons-fire",
  },
  {
    label: t('navigation.reports'),
    to: "/reports",
    icon: "i-heroicons-chart-bar",
  },
  {
    label: t('navigation.accounting'),
    to: "/accounting",
    icon: "i-heroicons-calculator",
  },
  {
    label: t('navigation.settings'),
    to: "/settings",
    icon: "i-heroicons-cog-6-tooth",
  },
]);

// Provider badge styling
const providerBadgeClass = computed(() => {
  switch (auth.user.value?.provider) {
    case 'nostr':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'google':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
  }
});

// Format public key for display
const formatPubkey = (pubkey?: string) => {
  if (!pubkey) return '';
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
};

// Handle logout
const handleLogout = async () => {
  await auth.signOut();
};
</script>

<style scoped></style>
