<!-- components/common/UPageHeader.vue -->
<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  title: {
    type: String as PropType<string>,
    required: true,
  },
  description: {
    type: String as PropType<string | null>,
    default: null,
  },
});
</script>

<template>
  <div class=" w-full p-4">
    <div
      class="flex flex-col justify-between gap-4 md:flex-row md:items-center"
    >
      <div class="flex-1">
        <h1 class="truncate text-2xl font-bold text-gray-900 dark:text-white">
          {{ title }}
        </h1>
        <p
          v-if="description"
          class="mt-1.5 text-base text-gray-500 dark:text-gray-400"
        >
          {{ description }}
        </p>
      </div>

      <div v-if="$slots.right" class="flex-shrink-0">
        <div class="flex flex-wrap gap-2">
          <slot name="right" />
        </div>
      </div>

       <div v-if="$slots.actions" class="flex-shrink-0">
        <div class="flex flex-wrap gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>

    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>

    <div v-if="$slots.tabs" class="mt-6">
      <slot name="tabs" />
    </div>
  </div>
</template>
