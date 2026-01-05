<!-- components/products/PromotionTable.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  promotions: Promotion[];
  isLoading?: boolean;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  toggleStatus: [promotion: Promotion];
  delete: [promotion: Promotion];
  create: [];
}>();

const { t } = useI18n();

// Event handlers
function handleToggleStatus(promotion: Promotion) {
  emit("toggleStatus", promotion);
}

function handleDelete(promotion: Promotion) {
  emit("delete", promotion);
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("common.name", "Name") }}
          </th>
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("promotions.trigger", "Trigger") }}
          </th>
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("promotions.reward", "Reward") }}
          </th>
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("common.status", "Status") }}
          </th>
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("promotions.uses", "Uses") }}
          </th>
          <th
            class="text-left py-3 px-4 font-medium text-gray-900 dark:text-white"
          >
            {{ t("common.actions", "Actions") }}
          </th>
        </tr>
      </thead>
      <tbody>
        <!-- Empty State -->
        <tr v-if="promotions.length === 0 && !isLoading">
          <td colspan="6" class="py-16 text-center">
            <div class="flex flex-col items-center">
              <div
                class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4"
              >
                <UIcon name="i-heroicons-gift" class="w-8 h-8 text-gray-400" />
              </div>
              <h3
                class="text-lg font-medium text-gray-900 dark:text-white mb-2"
              >
                {{ t("promotions.noPromotions", "No Promotions Yet") }}
              </h3>
              <p class="text-gray-500 mb-4">
                {{
                  t(
                    "promotions.noPromotionsDescription",
                    "Create your first BOGO promotion to get started"
                  )
                }}
              </p>
              <UButton
                color="primary"
                icon="i-heroicons-plus"
                @click="emit('create')"
              >
                {{ t("promotions.create", "Create Promotion") }}
              </UButton>
            </div>
          </td>
        </tr>

        <!-- Loading State -->
        <tr v-if="isLoading && promotions.length === 0">
          <td colspan="6" class="py-8">
            <div class="flex justify-center">
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"
              />
            </div>
          </td>
        </tr>

        <!-- Promotion Rows -->
        <ProductsPromotionTableRow
          v-for="promotion in promotions"
          :key="promotion.id"
          :promotion="promotion"
          :is-loading="isLoading"
          @toggle-status="handleToggleStatus"
          @delete="handleDelete"
        />
      </tbody>
    </table>
  </div>
</template>
