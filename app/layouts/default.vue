<template>
  <div class="h-dvh flex flex-col">
    <!-- Top Header (always visible) -->
    <AppHeader @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar Overlay (mobile/tablet) -->
      <Transition name="fade">
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 z-40 lg:hidden bg-black/60 backdrop-blur-sm"
          @click="sidebarOpen = false"
        />
      </Transition>

      <!-- Sidebar - Hidden on mobile/tablet, always visible on desktop -->
      <aside
        class="shrink-0 hidden lg:block border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <AppSideBar @navigate="sidebarOpen = false" />
      </aside>

      <!-- Mobile Sidebar (Slide-out drawer) -->
      <Transition name="slide">
        <aside
          v-if="sidebarOpen"
          class="fixed left-0 top-14 bottom-0 z-50 lg:hidden bg-white dark:bg-gray-900 shadow-[4px_0_24px_-4px_rgba(0,0,0,0.15)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.5)]"
        >
          <AppSideBar @navigate="sidebarOpen = false" />
        </aside>
      </Transition>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <slot />
      </main>
    </div>

    <!-- Mobile Bottom Navigation (hidden when sidebar is open) -->
    <AppBottomNav v-if="!sidebarOpen" @open-menu="sidebarOpen = true" />

    <!-- Help System -->
    <CommonHelpButton />
    <CommonHelpDrawer />
  </div>
</template>

<script setup lang="ts">
const appConfig = useAppConfig();

// Sidebar state for mobile
const sidebarOpen = ref(false);

// Close sidebar on route change
const route = useRoute();
watch(
  () => route.path,
  () => {
    sidebarOpen.value = false;
  }
);

// Load saved theme color on layout mount
onMounted(() => {
  const savedColor = localStorage.getItem("theme-color");
  if (savedColor) {
    appConfig.ui.colors.primary = savedColor;
  }
});
</script>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for mobile sidebar */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
