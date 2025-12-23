<template>
  <div class="flex flex-col h-full">
    <!-- Navigation Items -->
    <ul class="p-1 flex-1 space-y-1">
      <!-- Notification Center -->

      <li v-for="(item, index) in items" :key="index">
        <NuxtLinkLocale
          :to="item.to"
          class="flex p-2 transition-all px-3 justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center group relative"
          active-class="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
        >
          <span><Icon :name="item.icon" size="24" /></span>
          <!-- Tooltip -->
          <span
            class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
          >
            {{ item.label }}
          </span>
        </NuxtLinkLocale>
      </li>
    </ul>

    <!-- Notification Center -->
    <div class="p-1">
      <NotificationCenter />
    </div>

    <!-- User Profile Section -->
    <div class="p-1 border-t border-gray-200 dark:border-gray-700">
      <!-- Profile Dropdown -->
      <UPopover
        :ui="{
          content:
            'w-72 p-4 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl border-white/20 dark:border-gray-700/50',
        }"
      >
        <button
          class="flex p-2 w-full transition-all px-3 justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center"
        >
          <div v-if="userAvatar" class="w-8 h-8 rounded-full overflow-hidden">
            <img
              :src="userAvatar"
              alt="Profile"
              class="w-full h-full object-cover"
            />
          </div>
          <div
            v-else
            class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
          >
            <Icon
              name="i-heroicons-user"
              size="18"
              class="text-primary-600 dark:text-primary-400"
            />
          </div>
        </button>

        <template #content>
          <div class="">
            <!-- User Info with linear accent -->
            <div
              class="relative px-3 py-3 mb-4 rounded-xl bg-linear-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border border-primary-100 dark:border-primary-800/30"
            >
              <div class="flex items-center gap-3">
                <div
                  v-if="userAvatar"
                  class="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-md"
                >
                  <img
                    :src="userAvatar"
                    alt="Profile"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div
                  v-else
                  class="w-10 h-10 rounded-full bg-linear-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-md"
                >
                  <Icon name="i-heroicons-user" size="20" class="text-white" />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-semibold text-gray-900 dark:text-white truncate"
                  >
                    {{ userDisplayName }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {{ userIdentifier }}
                  </p>
                </div>
              </div>
              <span
                class="inline-flex items-center mt-2 text-xs px-2.5 py-1 rounded-full font-medium shadow-sm"
                :class="providerBadgeClass"
              >
                {{
                  userProvider === "nostr"
                    ? "⚡ Nostr"
                    : userProvider === "password"
                    ? "🔑 Password"
                    : "🔢 PIN"
                }}
              </span>
            </div>

            <!-- Account Switcher Button -->
            <button
              class="flex w-full items-center gap-3 px-3 py-2.5 mb-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-200"
              @click="openAccountSwitcher"
            >
              <Icon
                name="i-heroicons-arrows-right-left"
                size="18"
                class="text-primary-500"
              />
              {{ $t("account.switchAccount") }}
              <span
                class="ml-auto text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full"
              >
                {{ accountCount }}
              </span>
            </button>

            <!-- Quick Settings with glass cards -->
            <div class="space-y-4 mb-4">
              <!-- Dark Mode Toggle -->
              <div
                class="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-linear-to-br from-amber-400 to-orange-500 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center shadow-sm"
                  >
                    <Icon
                      :name="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'"
                      size="16"
                      class="text-white"
                    />
                  </div>
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {{ $t("account.dark_mode") }}
                  </span>
                </div>
                <USwitch v-model="isDark" size="sm" />
              </div>

              <!-- Theme Color Selector -->
              <div
                class="px-3 py-3 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50"
              >
                <div class="flex items-center gap-3 mb-3">
                  <div
                    class="w-8 h-8 rounded-lg bg-linear-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm"
                  >
                    <Icon
                      name="i-heroicons-swatch"
                      size="16"
                      class="text-white"
                    />
                  </div>
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {{ $t("account.theme_color") }}
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 pl-11">
                  <button
                    v-for="color in themeColors"
                    :key="color.value"
                    :title="color.label"
                    :class="[
                      'w-6 h-6 rounded-full transition-all duration-200 shadow-sm',
                      color.class,
                      selectedColor === color.value
                        ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 ring-gray-900 dark:ring-white scale-110 shadow-md'
                        : 'hover:scale-110 hover:shadow-md opacity-80 hover:opacity-100',
                    ]"
                    @click="setThemeColor(color.value)"
                  />
                </div>
              </div>
            </div>

            <!-- Language Selector -->
            <div>
              <div class="flex items-center gap-2 mb-2">
                <UIcon
                  name="i-heroicons-language"
                  class="w-5 h-5 text-gray-600 dark:text-gray-400"
                />
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ $t("account.language") }}
                </span>
              </div>
              <CommonSwitchLanguage />
            </div>

            <!-- Divider -->
            <div
              class="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-3"
            />

            <!-- Menu Items -->
            <ul class="space-y-1">
              <li>
                <NuxtLinkLocale
                  to="/settings/account"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-user-circle"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("settings.account.title") }}
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/settings"
                  class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-xl transition-all duration-200"
                >
                  <Icon
                    name="i-heroicons-cog-6-tooth"
                    size="18"
                    class="text-gray-500 dark:text-gray-400"
                  />
                  {{ $t("settings.general.title") }}
                </NuxtLinkLocale>
              </li>
            </ul>

            <!-- Divider -->
            <div
              class="h-px bg-linear-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-3"
            />

            <!-- Sign Out -->
            <button
              class="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
              @click="handleLogout"
            >
              <Icon name="i-heroicons-arrow-right-on-rectangle" size="18" />
              {{ $t("common.signOut") }}
            </button>
          </div>
        </template>
      </UPopover>
    </div>
  </div>

  <!-- Account Switch Modal -->
  <AccountSwitchModal
    v-model:open="showAccountSwitcher"
    @switched="onAccountSwitched"
  />
</template>

<script setup lang="ts">
const { t } = useI18n();
const usersComposable = useUsers();
const colorMode = useColorMode();
const appConfig = useAppConfig();
const nostrStorage = useNostrStorage();
// Account switcher state
const showAccountSwitcher = ref(false);
const allAccounts = ref<
  Array<{
    pubkey: string;
    displayName?: string;
    name?: string;
    picture?: string;
  }>
>([]);
const currentUserInfo = ref<{
  pubkey?: string;
  displayName?: string;
  name?: string;
  picture?: string;
} | null>(null);

// Load accounts on mount
onMounted(async () => {
  await usersComposable.initialize();
  allAccounts.value = nostrStorage.loadAllAccounts();
  const { userInfo } = nostrStorage.loadCurrentUser();
  if (userInfo) {
    currentUserInfo.value = userInfo;
  }
});

// Computed for user display
const userDisplayName = computed(() => {
  return (
    currentUserInfo.value?.displayName ||
    currentUserInfo.value?.name ||
    usersComposable.currentUser.value?.name ||
    "User"
  );
});

const userAvatar = computed(() => {
  return (
    currentUserInfo.value?.picture || usersComposable.currentUser.value?.avatar
  );
});

const userIdentifier = computed(() => {
  return (
    usersComposable.currentUser.value?.email ||
    formatPubkey(
      currentUserInfo.value?.pubkey || usersComposable.currentUser.value?.npub
    )
  );
});

// Determine user provider (nostr if we have pubkey from nostrStorage)
const userProvider = computed(() => {
  if (currentUserInfo.value?.pubkey) return "nostr";
  return usersComposable.currentUser.value?.authMethod || "nostr";
});

// Computed for account switcher
const _hasMultipleAccounts = computed(() => allAccounts.value.length > 1);
const accountCount = computed(() => allAccounts.value.length);

// Methods for account switcher
const openAccountSwitcher = () => {
  showAccountSwitcher.value = true;
};

const onAccountSwitched = (pubkey: string) => {
  console.log("Switched to account:", pubkey);
};

// Dark mode
const isDark = computed({
  get: () => colorMode.value === "dark",
  set: (value: boolean) => {
    colorMode.preference = value ? "dark" : "light";
  },
});

// Theme colors
const themeColors = [
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "orange", label: "Orange", class: "bg-orange-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
  { value: "lime", label: "Lime", class: "bg-lime-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
  { value: "teal", label: "Teal", class: "bg-teal-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
  { value: "sky", label: "Sky", class: "bg-sky-500" },
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "purple", label: "Purple", class: "bg-purple-500" },
  { value: "fuchsia", label: "Fuchsia", class: "bg-fuchsia-500" },
  { value: "pink", label: "Pink", class: "bg-pink-500" },
  { value: "rose", label: "Rose", class: "bg-rose-500" },
];

const selectedColor = ref(appConfig.ui?.colors?.primary || "purple");

const setThemeColor = (color: string) => {
  selectedColor.value = color;
  appConfig.ui.colors.primary = color;
  localStorage.setItem("theme-color", color);
};

// Load saved color on mount
onMounted(() => {
  const savedColor = localStorage.getItem("theme-color");
  if (savedColor) {
    selectedColor.value = savedColor;
    appConfig.ui.colors.primary = savedColor;
  }
});

const shop = useShop();

// Feature to route mapping
const featureRoutes = {
  products: '/products',
  orders: '/orders',
  pos: '/pos',
  reports: '/reports',
  settings: '/settings',
  customers: '/customers',
  inventory: '/inventory',
  kitchen: '/kitchen',
  recipes: '/recipes',
  ingredients: '/ingredients',
  memberships: '/memberships',
  accounting: '/accounting',
};

// All navigation items with their feature key
const allItems = computed(() => [
  {
    label: t("navigation.dashboard"),
    to: "/",
    icon: "i-heroicons-home",
    feature: null, // Always visible
  },
  {
    label: t("navigation.pos"),
    to: "/pos",
    icon: "i-heroicons-bolt",
    feature: 'pos',
  },
  {
    label: t("navigation.orders"),
    to: "/orders",
    icon: "i-heroicons-shopping-bag",
    feature: 'orders',
  },
  {
    label: t("navigation.products"),
    to: "/products",
    icon: "i-heroicons-cube",
    feature: 'products',
  },
  {
    label: "Recipes",
    to: "/recipes",
    icon: "i-heroicons-beaker",
    feature: 'recipes',
  },
  {
    label: "Ingredients",
    to: "/ingredients",
    icon: "i-heroicons-variable",
    feature: 'ingredients',
  },
  {
    label: t("navigation.customers"),
    to: "/customers",
    icon: "i-heroicons-users",
    feature: 'customers',
  },
  {
    label: t("memberships.title") || "Memberships",
    to: "/memberships",
    icon: "i-heroicons-credit-card",
    feature: 'memberships',
  },
  {
    label: t("navigation.inventory"),
    to: "/inventory",
    icon: "i-heroicons-archive-box",
    feature: 'inventory',
  },
  {
    label: t("navigation.kitchen"),
    to: "/kitchen",
    icon: "i-heroicons-fire",
    feature: 'kitchen',
  },
  {
    label: t("navigation.reports"),
    to: "/reports",
    icon: "i-heroicons-chart-bar",
    feature: 'reports',
  },
  {
    label: t("navigation.accounting"),
    to: "/accounting",
    icon: "i-heroicons-calculator",
    feature: 'accounting',
  },
  {
    label: t("navigation.settings"),
    to: "/settings",
    icon: "i-heroicons-cog-6-tooth",
    feature: 'settings',
  },
]);

// Filter items based on enabled features
const items = computed(() => {
  const enabledFeatures = shop.shopConfig.value?.enabledFeatures;
  if (!enabledFeatures) return allItems.value;
  
  return allItems.value.filter(item => {
    // Always show items without a feature requirement
    if (!item.feature) return true;
    // Check if feature is enabled
    return (enabledFeatures as any)[item.feature] === true;
  });
});

// Provider badge styling
const providerBadgeClass = computed(() => {
  switch (userProvider.value) {
    case "nostr":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "password":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "pin":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400";
  }
});

// Format public key for display
const formatPubkey = (pubkey?: string) => {
  if (!pubkey) return "";
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
};

// Handle logout
const handleLogout = async () => {
  await usersComposable.logout();
  navigateTo("/auth/signin");
};
</script>

<style scoped></style>
