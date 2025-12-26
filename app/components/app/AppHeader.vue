<template>
  <header
    class="sticky top-0 z-40 flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl"
  >
    <!-- Left: Hamburger (mobile) + Logo -->
    <div class="flex items-center gap-1">
      <!-- Hamburger Menu (Mobile Only) -->
      <button
        class="lg:hidden p-2 -ml-2 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="$emit('toggle-sidebar')"
      >
        <Icon name="i-heroicons-bars-3" size="24" />
      </button>

      <!-- Logo -->
      <NuxtLinkLocale to="/" class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow"
        >
          <span class="text-white font-bold text-sm">⚡</span>
        </div>
        <span class="hidden sm:block font-bold text-gray-900 dark:text-white">
          BitSpace POS
        </span>
      </NuxtLinkLocale>
    </div>

    <!-- Right: Notifications + Profile -->
    <div class="flex items-center gap-1">
      <!-- Notification Bell -->
      <UPopover
        :ui="{
          content:
            'w-80 p-0 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl border-white/20 dark:border-gray-700/50 overflow-hidden',
        }"
      >
        <span class="relative">
          <button
            class="p-2 rounded-xl size-10 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Icon
              name="i-heroicons-bell"
              size="22"
              :class="{ 'text-primary-500': unreadCount > 0 }"
            />
            <!-- Badge -->
            <span
              v-if="unreadCount > 0"
              class="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
            >
              {{ unreadCount > 9 ? "9+" : unreadCount }}
            </span>
          </button>
        </span>

        <template #content>
          <!-- Notification Header -->
          <div
            class="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-center gap-2">
              <Icon
                name="i-heroicons-bell"
                size="18"
                class="text-primary-500"
              />
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ $t("notifications.title") }}
              </span>
              <UBadge
                v-if="unreadCount > 0"
                :label="String(unreadCount)"
                size="xs"
                color="primary"
              />
            </div>
            <div class="flex items-center gap-1">
              <UButton
                v-if="unreadCount > 0"
                icon="i-heroicons-check-circle"
                variant="ghost"
                size="xs"
                :title="$t('notifications.markAllRead')"
                @click="markAllAsRead"
              />
              <UButton
                v-if="notifications.length > 0"
                icon="i-heroicons-trash"
                variant="ghost"
                size="xs"
                color="error"
                :title="$t('notifications.clearAll')"
                @click="clearAll"
              />
            </div>
          </div>

          <!-- Notification List -->
          <div class="max-h-80 overflow-y-auto">
            <div v-if="notifications.length === 0" class="p-8 text-center">
              <Icon
                name="i-heroicons-bell-slash"
                size="40"
                class="text-gray-300 dark:text-gray-600 mx-auto mb-2"
              />
              <p class="text-gray-500 dark:text-gray-400 text-sm">
                {{ $t("notifications.empty") }}
              </p>
            </div>

            <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
              <div
                v-for="notification in notifications.slice(0, 5)"
                :key="notification.id"
                class="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                :class="{
                  'bg-primary-50/50 dark:bg-primary-900/10': !notification.read,
                }"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex items-start gap-3">
                  <div
                    class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-100 dark:bg-primary-900/30"
                  >
                    <Icon
                      :name="getNotificationIcon(notification.type)"
                      size="16"
                      class="text-primary-600 dark:text-primary-400"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p
                      class="font-medium text-gray-900 dark:text-white text-sm truncate"
                    >
                      {{ notification.title }}
                    </p>
                    <p
                      class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1"
                    >
                      {{ notification.message }}
                    </p>
                  </div>
                  <div
                    v-if="!notification.read"
                    class="shrink-0 w-2 h-2 rounded-full bg-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div
            v-if="notifications.length > 0"
            class="p-2 border-t border-gray-200 dark:border-gray-700"
          >
            <NuxtLinkLocale
              to="/notifications"
              class="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              {{ $t("notifications.viewAll") }}
              <Icon name="i-heroicons-arrow-right" size="14" />
            </NuxtLinkLocale>
          </div>
        </template>
      </UPopover>

      <!-- Profile Avatar -->
      <UPopover
        :ui="{
          content:
            'w-72 p-4 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl border-white/20 dark:border-gray-700/50',
        }"
      >
        <button
          class="p-1 overflow-hidden rounded-full hover:ring-2 hover:ring-primary-500/50 transition-all"
        >
          <div
            v-if="userAvatar"
            class="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800"
          >
            <img
              :src="userAvatar"
              alt="Profile"
              class="w-full h-full object-cover"
            />
          </div>
          <div
            v-else
            class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-primary-300 dark:ring-gray-800"
          >
            <Icon name="i-heroicons-user" size="16" class="text-white" />
          </div>
        </button>

        <template #content>
          <div class="">
            <!-- User Info with gradient accent -->
            <div
              class="relative px-3 py-3 mb-4 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 border border-primary-100 dark:border-primary-800/30"
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
                  class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-md"
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
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 dark:from-indigo-500 dark:to-purple-600 flex items-center justify-center shadow-sm"
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
                    class="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-sm"
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
              class="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-3"
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
              class="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-3"
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
  </header>

  <!-- Account Switch Modal -->
  <AccountSwitchModal
    v-model:open="showAccountSwitcher"
    @switched="onAccountSwitched"
  />
</template>

<script setup lang="ts">
import type { POSNotification } from "~/types";

defineEmits(["toggle-sidebar"]);

const colorMode = useColorMode();
const usersComposable = useUsers();
const nostrStorage = useNostrStorage();
const router = useRouter();
const appConfig = useAppConfig();

const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
  useNotifications();

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

// User data
const currentUserInfo = ref<{
  pubkey?: string;
  displayName?: string;
  name?: string;
  picture?: string;
} | null>(null);

onMounted(async () => {
  await usersComposable.initialize();
  allAccounts.value = nostrStorage.loadAllAccounts();
  const { userInfo } = nostrStorage.loadCurrentUser();
  if (userInfo) {
    currentUserInfo.value = userInfo;
  }
});

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
  const pubkey =
    currentUserInfo.value?.pubkey || usersComposable.currentUser.value?.npub;
  if (!pubkey) return "";
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
});

// Determine user provider
const userProvider = computed(() => {
  if (currentUserInfo.value?.pubkey) return "nostr";
  return usersComposable.currentUser.value?.authMethod || "nostr";
});

// Computed for account switcher
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

// Notification helpers
function getNotificationIcon(type: POSNotification["type"]): string {
  const icons: Record<POSNotification["type"], string> = {
    payment: "i-heroicons-bolt",
    order: "i-heroicons-shopping-bag",
    stock: "i-heroicons-archive-box",
    loyalty: "i-heroicons-star",
    ai_insight: "i-heroicons-sparkles",
    alert: "i-heroicons-exclamation-triangle",
    system: "i-heroicons-cog-6-tooth",
  };
  return icons[type] || "i-heroicons-bell";
}

function handleNotificationClick(notification: POSNotification) {
  markAsRead(notification.id);
  if (notification.actionUrl) {
    router.push(notification.actionUrl);
  }
}

// Logout
const handleLogout = async () => {
  await usersComposable.logout();
  navigateTo("/auth/signin");
};
</script>
