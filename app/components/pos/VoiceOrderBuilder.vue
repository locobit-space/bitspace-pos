<template>
  <div
    v-if="preview"
    class="rounded-lg overflow-y-auto h-full max-h-72 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4"
  >
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {{ $t("voice.matchedProducts") }}
      </h4>
      <UBadge :color="preview.isValid ? 'green' : 'red'" variant="subtle">
        {{ Math.round(preview.overallConfidence * 100) }}%
        {{ $t("voice.confidence") }}
      </UBadge>
    </div>

    <!-- Items List -->
    <div class="space-y-2">
      <div
        v-for="(item, index) in preview.items"
        :key="index"
        class="flex items-start gap-3 rounded-md p-3"
        :class="
          item.issues
            ? 'bg-red-50 dark:bg-red-900/10'
            : 'bg-gray-50 dark:bg-gray-800'
        "
      >
        <!-- Product Icon/Image -->
        <div class="flex-shrink-0">
          <div
            class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center"
          >
            <UIcon
              :name="
                item.item.product
                  ? 'i-heroicons-check-circle'
                  : 'i-heroicons-question-mark-circle'
              "
              :class="
                item.item.product
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400'
              "
              class="text-xl"
            />
          </div>
        </div>

        <!-- Product Details -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ item.formattedName }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ $t("common.quantity") }}: {{ item.item.quantity }}
              </p>

              <!-- Notes -->
              <p
                v-if="item.item.notes"
                class="text-xs text-gray-600 dark:text-gray-400 mt-1"
              >
                {{ $t("common.notes") }}: {{ item.item.notes }}
              </p>

              <!-- Issues/Warnings -->
              <div v-if="item.issues" class="mt-1 space-y-0.5">
                <p
                  v-for="(issue, i) in item.issues"
                  :key="i"
                  class="text-xs text-red-600 dark:text-red-400"
                >
                  ⚠️ {{ issue }}
                </p>
              </div>

              <!-- Alternatives -->
              <div
                v-if="
                  item.item.alternatives && item.item.alternatives.length > 0
                "
                class="mt-2"
              >
                <details class="text-xs">
                  <summary
                    class="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {{ $t("voice.alternatives") }} ({{
                      item.item.alternatives.length
                    }})
                  </summary>
                  <ul class="mt-1 ml-4 space-y-1">
                    <li
                      v-for="alt in item.item.alternatives"
                      :key="alt.productId"
                      class="text-gray-600 dark:text-gray-400 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400"
                      @click="() => selectAlternative(index, alt.productId)"
                    >
                      {{ alt.product.name }} ({{
                        Math.round(alt.confidence * 100)
                      }}%)
                    </li>
                  </ul>
                </details>
              </div>
            </div>

            <!-- Price -->
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {{ formatCurrency(item.subtotal) }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                @{{ formatCurrency(item.item.product?.price || 0) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Edit/Remove buttons -->
        <div class="flex-shrink-0 flex flex-col gap-1">
          <UButton
            icon="i-heroicons-pencil"
            size="xs"
            color="gray"
            variant="ghost"
            @click="() => $emit('edit', index)"
          />
          <UButton
            icon="i-heroicons-trash"
            size="xs"
            color="red"
            variant="ghost"
            @click="() => removeItem(index)"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="preview.items.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      <UIcon name="i-heroicons-shopping-cart" class="text-4xl mb-2" />
      <p class="text-sm">{{ $t("voice.noMatch") }}</p>
    </div>

    <!-- Errors -->
    <div v-if="preview.errors.length > 0" class="space-y-1">
      <UAlert
        v-for="(error, index) in preview.errors"
        :key="index"
        icon="i-heroicons-exclamation-circle"
        color="red"
        variant="soft"
        :description="error"
      />
    </div>

    <!-- Warnings -->
    <div v-if="preview.warnings.length > 0" class="space-y-1">
      <UAlert
        v-for="(warning, index) in preview.warnings"
        :key="index"
        icon="i-heroicons-exclamation-triangle"
        color="yellow"
        variant="soft"
        :description="warning"
      />
    </div>

    <!-- Order Summary -->
    <div
      v-if="preview.items.length > 0"
      class="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2"
    >
      <div class="flex justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">
          {{ $t("common.items") }}
        </span>
        <span class="font-medium text-gray-900 dark:text-gray-100">
          {{ preview.itemCount }}
        </span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">
          {{ $t("common.subtotal") }}
        </span>
        <span class="font-medium text-gray-900 dark:text-gray-100">
          {{ formatCurrency(preview.subtotal) }}
        </span>
      </div>
      <div
        class="flex justify-between text-base font-semibold border-t border-gray-200 dark:border-gray-700 pt-2"
      >
        <span class="text-gray-900 dark:text-gray-100">
          {{ $t("common.total") }}
        </span>
        <span class="text-primary-600 dark:text-primary-400">
          {{ formatCurrency(preview.total) }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 pt-2">
      <UButton
        block
        color="gray"
        variant="outline"
        @click="() => $emit('cancel')"
      >
        {{ $t("common.cancel") }}
      </UButton>
      <UButton
        block
        color="primary"
        :disabled="!preview.isValid"
        @click="() => $emit('confirm')"
      >
        <UIcon name="i-heroicons-check-circle" class="mr-2" />
        {{ $t("voice.confirm") }}
      </UButton>
    </div>

    <!-- Review notice -->
    <p
      v-if="preview.needsReview"
      class="text-xs text-center text-yellow-600 dark:text-yellow-400"
    >
      {{ $t("voice.reviewNotice") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { VoiceOrderPreview } from "~/types/voice";

const props = defineProps<{
  preview: VoiceOrderPreview | null;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  edit: [index: number];
}>();

const { t } = useI18n();
const currency = useCurrency();

// Format currency
const formatCurrency = (amount: number) => {
  return currency.format(amount, props.preview?.currency || "LAK");
};

// Remove item from preview
const removeItem = (index: number) => {
  if (props.preview) {
    props.preview.items.splice(index, 1);
    // Recalculate totals
    const subtotal = props.preview.items.reduce(
      (sum, i) => sum + i.subtotal,
      0,
    );
    props.preview.subtotal = subtotal;
    props.preview.total = subtotal;
    props.preview.itemCount = props.preview.items.reduce(
      (sum, i) => sum + i.item.quantity,
      0,
    );
  }
};

// Select alternative product
const selectAlternative = (itemIndex: number, productId: string) => {
  if (!props.preview) return;

  const item = props.preview.items[itemIndex];
  const alternative = item?.item.alternatives?.find(
    (alt) => alt.productId === productId,
  );

  if (alternative) {
    // Replace with alternative
    item.item.product = alternative.product;
    item.item.productId = alternative.productId;
    item.item.confidence = alternative.confidence;
    item.formattedName = alternative.product.name;

    // Recalculate subtotal
    const price = alternative.product.price || 0;
    item.subtotal = price * (item?.item?.quantity || 1);

    // Recalculate totals
    const subtotal = props.preview.items.reduce(
      (sum, i) => sum + i.subtotal,
      0,
    );
    props.preview.subtotal = subtotal;
    props.preview.total = subtotal;
  }
};
</script>
