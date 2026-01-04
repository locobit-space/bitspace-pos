<!-- components/products/PromotionTableRow.vue -->
<script setup lang="ts">
import type { Promotion } from "~/types";

interface Props {
  promotion: Promotion;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  toggleStatus: [promotion: Promotion];
  delete: [promotion: Promotion];
}>();

const { 
  getProductName, 
  getStatusColor, 
  getStatusText 
} = usePromotionHelpers();

// Computed properties
const additionalTriggerCount = computed(() => 
  Math.max(0, props.promotion.triggerProductIds.length - 1)
);

const additionalRewardCount = computed(() => 
  Math.max(0, props.promotion.rewardProductIds.length - 1)
);

const statusColor = computed(() => getStatusColor(props.promotion.status));
const statusText = computed(() => getStatusText(props.promotion.status));

// Event handlers
function handleToggleStatus() {
  emit('toggleStatus', props.promotion);
}

function handleDelete() {
  emit('delete', props.promotion);
}
</script>

<template>
  <tr 
    class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
  >
    <!-- Name Column -->
    <td class="py-3 px-4">
      <div>
        <div class="font-medium text-gray-900 dark:text-white">
          {{ promotion.name }}
        </div>
        <div class="text-sm text-gray-500">
          {{ promotion.badgeText }}
        </div>
      </div>
    </td>

    <!-- Trigger Column -->
    <td class="py-3 px-4">
      <div class="text-sm">
        <span class="font-medium">Buy {{ promotion.triggerQuantity }}×</span>
        <span class="text-primary-600 dark:text-primary-400 ml-1">
          {{ getProductName(promotion.triggerProductIds[0] || '') }}
        </span>
        <span 
          v-if="additionalTriggerCount > 0" 
          class="text-gray-400 ml-1"
        >
          +{{ additionalTriggerCount }} more
        </span>
      </div>
    </td>

    <!-- Reward Column -->
    <td class="py-3 px-4">
      <div class="text-sm">
        <span class="font-medium">Get {{ promotion.rewardQuantity }}×</span>
        <span class="text-green-600 dark:text-green-400 ml-1">
          {{ getProductName(promotion.rewardProductIds[0] || '') }}
        </span>
        <UBadge 
          color="green" 
          variant="subtle" 
          size="xs" 
          class="ml-1"
        >
          FREE
        </UBadge>
        <span 
          v-if="additionalRewardCount > 0" 
          class="text-gray-400 ml-1"
        >
          +{{ additionalRewardCount }} more
        </span>
      </div>
    </td>

    <!-- Status Column -->
    <td class="py-3 px-4">
      <UBadge 
        :color="statusColor"
        :label="statusText"
      />
    </td>

    <!-- Uses Column -->
    <td class="py-3 px-4">
      <span class="text-sm font-medium text-gray-900 dark:text-white">
        {{ promotion.usageCount }}
      </span>
    </td>

    <!-- Actions Column -->
    <td class="py-3 px-4">
      <div class="flex items-center gap-2">
        <USwitch 
          :model-value="promotion.status === 'active'" 
          size="sm"
          :disabled="isLoading"
          @update:model-value="handleToggleStatus"
        />
        <UButton 
          color="red" 
          variant="ghost" 
          size="sm" 
          icon="i-heroicons-trash"
          :disabled="isLoading"
          @click="handleDelete"
        />
      </div>
    </td>
  </tr>
</template>
