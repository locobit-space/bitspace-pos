<template>
  <div class="flex gap-4 divide-x divide-slate-100 h-full">
    <aside class="w-48">
      <UNavigationMenu orientation="vertical" :items="items" />
    </aside>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const items = ref<NavigationMenuItem[]>([
  {
    label: "General",
    to: "/settings/general",
    icon: "i-heroicons-cog",
  },
  {
    label: "Branches",
    to: "/settings/branches",
    icon: "mynaui:git-branch",
  },
  {
    label: "Units",
    to: "/settings/units",
    icon: "i-heroicons-scale",
  },
  {
    label: "Categories",
    to: "/settings/categories",
    icon: "i-heroicons-tag",
  },
]);
</script>

<style scoped></style>
