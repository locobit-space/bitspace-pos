<template>
  <div class="flex gap-4 divide-x divide-slate-100 h-full dark:divide-slate-800">
    <aside class="w-48  p-2">
      <UNavigationMenu orientation="vertical" :items="items" />
    </aside>
    <main class="flex-grow overflow-y-auto">
      <NuxtPage />
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
    label: "Account  ",
    to: "/settings/account",
    icon: "i-heroicons-user",
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
