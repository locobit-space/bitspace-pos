<!-- components/products/PromotionForm.vue -->
<script setup lang="ts">
interface Props {
  modelValue: boolean;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [];
}>();

const { t } = useI18n();
const productsStore = useProducts();
const { form, validateForm, showValidationError } = usePromotionForm();

// Product options for select
const productItems = computed(() =>
  productsStore.products.value.map((p) => ({
    value: p.id,
    label: p.name,
  }))
);

// Computed for v-model binding
const isVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit("update:modelValue", value),
});

// Form submission handler
async function handleSubmit() {
  const validation = validateForm();

  if (!validation.isValid) {
    showValidationError(validation.errors);
    return;
  }

  emit("submit");
}

// Close modal handler
function handleClose() {
  isVisible.value = false;
}
</script>

<template>
  <UModal v-model:open="isVisible" @update:model-value="handleClose">
    <template #header>
      <h3
        class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"
      >
        <span>🎁</span>
        {{ t("promotions.create", "Create BOGO Promotion") }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <!-- Promotion Name -->
        <UFormField :label="t('common.name', 'Promotion Name')" required>
          <UInput
            v-model="form.name"
            placeholder="e.g., Buy 1 Get 1 Free Coffee"
            :disabled="isLoading"
          />
        </UFormField>

        <!-- Trigger Products -->
        <UFormField
          :label="t('promotions.triggerProduct', 'When Customer Buys')"
          required
        >
          <div class="flex gap-2 items-center">
            <UInput
              v-model.number="form.triggerQuantity"
              type="number"
              min="1"
              class="w-20"
              :disabled="isLoading"
            />
            <span class="text-gray-500">×</span>
            <USelectMenu
              v-model="form.triggerProductIds"
              :items="productItems"
              multiple
              searchable
              value-key="value"
              label-key="label"
              placeholder="Select products..."
              class="flex-1"
              :disabled="isLoading"
            />
          </div>
        </UFormField>

        <!-- Reward Products -->
        <UFormField
          :label="t('promotions.rewardProduct', 'They Get FREE')"
          required
        >
          <div class="flex gap-2 items-center">
            <UInput
              v-model.number="form.rewardQuantity"
              type="number"
              min="1"
              class="w-20"
              :disabled="isLoading"
            />
            <span class="text-gray-500">×</span>
            <USelectMenu
              v-model="form.rewardProductIds"
              :items="productItems"
              multiple
              searchable
              value-key="value"
              label-key="label"
              placeholder="Same as trigger (or select different)"
              class="flex-1"
              :disabled="isLoading"
            />
          </div>
        </UFormField>

        <!-- Badge Text -->
        <UFormField :label="t('promotions.badgeText', 'Badge Text')" required>
          <UInput
            v-model="form.badgeText"
            placeholder="BUY 1 GET 1 FREE"
            :disabled="isLoading"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="gray"
          variant="outline"
          :label="t('common.cancel')"
          :disabled="isLoading"
          @click="handleClose"
        />
        <UButton
          color="primary"
          :loading="isLoading"
          :label="t('common.create')"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
