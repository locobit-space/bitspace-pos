<template>
  <!-- Mobile Bottom Navigation -->
  <nav
    class="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 px-2 bg-white/20 dark:bg-gray-900/20 backdrop-blur-lg safe-area-bottom"
  >
    <NuxtLinkLocale
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="flex flex-col items-center relative justify-center flex-1 py-2 transition-colors"
      :class="[
        isActive(item.to)
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      ]"
    >
      <div
        class="h-0.5 mx-auto w-1/2 rounded-full bg-primary-500 absolute top-1"
        :class="isActive(item.to) ? 'block' : 'hidden'"
      ></div>
      <div
        class="relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
      >
        <Icon :name="item.icon" size="22" />
        <!-- Badge for orders -->
        <span
          v-if="item.badge && item.badge > 0"
          class="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
        >
          {{ item.badge > 9 ? "9+" : item.badge }}
        </span>
      </div>
      <span class="text-xs font-medium">{{ item.label }}</span>
    </NuxtLinkLocale>

    <!-- More Menu (Apps Page) -->
    <NuxtLinkLocale
      to="/apps"
      class="flex flex-col relative items-center justify-center flex-1 py-2 transition-colors"
      :class="[
        isActive('/apps')
          ? 'text-primary-600 dark:text-primary-400'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      ]"
    >
      <div
        class="h-0.5 mx-auto w-1/2 rounded-full bg-primary-500 absolute top-1"
        :class="isActive('/apps') ? 'block' : 'hidden'"
      ></div>
      <div
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
      >
        <Icon name="solar:widget-2-linear" size="22" />
      </div>
      <span class="text-xs font-medium">{{
        $t("navigation.more", "More")
      }}</span>
    </NuxtLinkLocale>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute();
const { t } = useI18n();
const ordersStore = useOrders();

defineEmits(["open-menu"]);

// Core navigation items for bottom bar
const navItems = computed(() => [
  {
    label: t("navigation.dashboard", "Home"),
    to: "/",
    icon: "solar:home-smile-linear",
  },
  {
    label: t("navigation.pos", "POS"),
    to: "/pos",
    icon: "solar:shop-2-linear",
  },
  {
    label: t("navigation.orders", "Orders"),
    to: "/orders",
    icon: "solar:bag-4-linear",
    badge: ordersStore.pendingOrders.value?.length || 0,
  },
  {
    label: t("navigation.products", "Products"),
    to: "/products",
    icon: "solar:box-minimalistic-linear",
  },
]);

function isActive(path: string): boolean {
  if (path === "/") {
    return route.path === "/";
  }
  // ignore locale in path
  const locale = useI18n().locale.value;
  const pathWithoutLocale = route.path.replace(`/${locale}/`, "/");
  return pathWithoutLocale.startsWith(path);
}
</script>

<style scoped>
/* Safe area inset for mobile devices with home indicators */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
</style>
