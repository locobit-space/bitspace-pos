<template>
  <div class="flex flex-col h-full">
    <!-- Navigation Items -->
    <ul class="p-1 flex-1">
      <li v-for="(item, index) in items" :key="index">
        <NuxtLinkLocale
          :to="item.to"
          class="flex p-2 transition-all px-3 justify-center rounded-xl hover:bg-gray-100 items-center"
          active-class="bg-primary-100 text-primary-600"
        >
          <span><Icon :name="item.icon" size="24" /></span>
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
          <div class="w-56 p-2">
            <!-- User Info -->
            <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
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

            <!-- Menu Items -->
            <ul class="space-y-1">
              <li>
                <NuxtLinkLocale
                  to="/settings/account"
                  class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon name="i-heroicons-user-circle" size="18" />
                  View Profile
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/settings/account"
                  class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon name="i-heroicons-cog-6-tooth" size="18" />
                  Account Settings
                </NuxtLinkLocale>
              </li>
              <li>
                <NuxtLinkLocale
                  to="/settings"
                  class="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Icon name="i-heroicons-adjustments-horizontal" size="18" />
                  General Settings
                </NuxtLinkLocale>
              </li>
              <li class="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                <button
                  class="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  @click="handleLogout"
                >
                  <Icon name="i-heroicons-arrow-right-on-rectangle" size="18" />
                  Sign Out
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
const auth = useAuth();

const items = [
  {
    label: "Home",
    to: "/",
    icon: "i-heroicons-home",
  },
  {
    label: "Orders",
    to: "/orders",
    icon: "i-heroicons-truck",
  },
  {
    label: "Customers",
    to: "/customers",
    icon: "i-heroicons-users",
  },
  {
    label: "Products",
    to: "/products",
    icon: "i-heroicons-cube",
  },

  {
    label: "Settings",
    to: "/settings",
    icon: "i-heroicons-cog",
  },
];

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
