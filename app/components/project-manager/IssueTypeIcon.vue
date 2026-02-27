<script setup lang="ts">
import type { PmIssue } from "~/types/project-manager";

const props = defineProps<{
  type: PmIssue["type"];
}>();

const iconConfig = computed(() => {
  switch (props.type) {
    case "epic":
      return {
        name: "i-heroicons-bolt-solid",
        color: "text-indigo-500 bg-indigo-100 dark:bg-indigo-900",
      };
    case "bug":
      return {
        name: "i-heroicons-bug-ant-solid",
        color: "text-red-500 bg-red-100 dark:bg-red-900",
      };
    case "story":
      return {
        name: "i-heroicons-bookmark-solid",
        color: "text-green-500 bg-green-100 dark:bg-green-900",
      };
    case "task":
    default:
      return {
        name: "i-heroicons-check-circle-solid",
        color: "text-blue-500 bg-blue-100 dark:bg-blue-900",
      };
  }
});
</script>

<template>
  <div
    :class="[
      'flex items-center justify-center p-0.5 rounded flex-none',
      iconConfig.color,
    ]"
  >
    <UIcon :name="iconConfig.name" class="w-3 h-3 text-current" />
  </div>
</template>
