<template>
  <div class="h-dvh flex flex-col">
    <!-- Top Header (always visible) -->
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex-1 flex overflow-hidden">
      <!-- Desktop Sidebar - Always visible on large screens -->
      <aside
        v-if="showNavigation"
        class="shrink-0 hidden lg:block border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <AppSideBar @navigate="sidebarOpen = false" />
      </aside>

      <!-- Mobile/Tablet Drawer Sidebar -->
      <UDrawer
        v-model:open="sidebarOpen"
        title="Menu"
        description="Side Menu"
        direction="left"
      >
        <template #content>
          <div class="h-full">
            <AppSideBar @navigate="sidebarOpen = false" />
          </div>
        </template>
      </UDrawer>

      <!-- Main Content -->
      <main
        class="flex-1 overflow-y-auto"
        :class="showNavigation ? 'pb-16 lg:pb-0' : ''"
      >
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation (hidden when sidebar is open) -->
    <AppBottomNav
      v-if="!sidebarOpen && showNavigation"
      @open-menu="sidebarOpen = true"
    />

    <!-- Help System -->
    <CommonHelpButton />
    <CommonHelpDrawer />
  </div>
</template>

<script setup lang="ts">
const appConfig = useAppConfig();
const { initSystemNotifications } = useNotifications();
const usersComposable = useUsers();
const shop = useShop();

// Sidebar state for mobile
const sidebarOpen = ref(false);

// Get navigation visibility from page (if provided)
const pageNavigationControl = inject<Ref<boolean> | undefined>(
  "shouldShowNavigation",
  undefined
);

// Fast setup check using localStorage (synchronous, no delay)
const hasCompletedSetup = ref(false);

// Initialize setup check immediately from localStorage
if (import.meta.client) {
  const companyCode = localStorage.getItem("bitspace_company_code");
  const shopConfigStr = localStorage.getItem("shopConfig");

  // Shop is setup if we have a company code OR a shop config with name
  if (companyCode) {
    hasCompletedSetup.value = true;
  } else if (shopConfigStr) {
    try {
      const shopConfig = JSON.parse(shopConfigStr);
      hasCompletedSetup.value = !!shopConfig?.name;
    } catch {
      hasCompletedSetup.value = false;
    }
  }
}

// Check if navigation should be shown
const showNavigation = computed(() => {
  // If page provides explicit control, use that (more accurate)
  if (pageNavigationControl !== undefined) {
    return pageNavigationControl.value;
  }
  // Otherwise use fast localStorage check
  return hasCompletedSetup.value;
});

// Close sidebar on route change
const route = useRoute();
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

// Load saved theme color on layout mount
onMounted(async () => {
  const savedColor = localStorage.getItem("theme-color");
  if (savedColor) {
    appConfig.ui.colors.primary = savedColor;
  }
  // Initialize system notifications
  initSystemNotifications();

  // Initialize users and shop in background (non-blocking)
  // Navigation is already shown via localStorage check above
  usersComposable.initialize();
  shop.init();
});
</script>
