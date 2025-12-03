<template>
  <div class="h-dvh flex divide-x divide-slate-100 dark:divide-slate-800">
    <aside>
      <AppSideBar class="" />
    </aside>
    <main class="flex-grow overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const appConfig = useAppConfig();

// Load saved theme color on layout mount
onMounted(() => {
  const savedColor = localStorage.getItem('theme-color');
  if (savedColor) {
    appConfig.ui.colors.primary = savedColor;
  }
});
</script>

<style scoped></style>
