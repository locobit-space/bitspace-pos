<!-- components/common/CommonDateRangeSelector.vue -->
<!-- 📅 Reusable Date Range Selector with Badge Presets -->
<script setup lang="ts">
export interface DateRangePreset {
  label: string;
  value: string;
  days?: number;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    showCustom?: boolean;
    compact?: boolean;
    customStartDate?: string;
    customEndDate?: string;
  }>(),
  {
    modelValue: "month",
    showCustom: true,
    compact: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:dateRange": [range: { start: string; end: string }];
}>();

const { t } = useI18n();

// Internal state for custom dates
const customStart = ref(props.customStartDate || "");
const customEnd = ref(props.customEndDate || "");
const showCustomPicker = ref(false);

// Preset options
const presets = computed<DateRangePreset[]>(() => [
  { label: t("reports.dateRange.day", "Day"), value: "day", days: 1 },
  { label: t("reports.dateRange.week", "Week"), value: "week", days: 7 },
  { label: t("reports.dateRange.month", "Month"), value: "month", days: 30 },
  {
    label: t("reports.dateRange.threeMonths", "3M"),
    value: "3months",
    days: 90,
  },
  {
    label: t("reports.dateRange.sixMonths", "6M"),
    value: "6months",
    days: 180,
  },
  { label: t("reports.dateRange.year", "Year"), value: "year", days: 365 },
]);

// Calculate date range from preset
const calculateDateRange = (preset: string): { start: string; end: string } => {
  const today = new Date();
  const end = today.toISOString().split("T")[0];
  let start = new Date();

  switch (preset) {
    case "day":
      // Today only
      break;
    case "week":
      start.setDate(today.getDate() - 7);
      break;
    case "month":
      start.setDate(today.getDate() - 30);
      break;
    case "3months":
      start.setDate(today.getDate() - 90);
      break;
    case "6months":
      start.setDate(today.getDate() - 180);
      break;
    case "year":
      start.setDate(today.getDate() - 365);
      break;
    case "custom":
      return {
        start: customStart.value || end,
        end: customEnd.value || end,
      };
    default:
      start.setDate(today.getDate() - 30);
  }

  return {
    start: start.toISOString().split("T")[0],
    end,
  };
};

// Handle preset selection (toggle on click active to unselect)
const selectPreset = (value: string) => {
  // If clicking on already selected preset, unselect it
  if (value === props.modelValue && value !== "custom") {
    showCustomPicker.value = false;
    emit("update:modelValue", "");
    emit("update:dateRange", { start: "", end: "" });
    return;
  }

  if (value === "custom") {
    showCustomPicker.value = true;
    return;
  }

  showCustomPicker.value = false;
  emit("update:modelValue", value);
  emit("update:dateRange", calculateDateRange(value));
};

// Handle custom date change
const applyCustomRange = () => {
  emit("update:modelValue", "custom");
  emit("update:dateRange", {
    start: customStart.value,
    end: customEnd.value,
  });
  showCustomPicker.value = false;
};

// Current date range display
const currentRange = computed(() => {
  if (!props.modelValue || props.modelValue === "") {
    return { start: "", end: "" };
  }
  return calculateDateRange(props.modelValue);
});

// Watch for external changes
watch(
  () => props.modelValue,
  (newVal) => {
    // If unselected (empty), emit empty range
    if (!newVal || newVal === "") {
      emit("update:dateRange", { start: "", end: "" });
      return;
    }
    if (newVal !== "custom") {
      emit("update:dateRange", calculateDateRange(newVal));
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-3">
    <!-- Preset Badges -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
        :class="[
          modelValue === preset.value
            ? 'bg-primary-500 text-white shadow-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        ]"
        @click="selectPreset(preset.value)"
      >
        {{ preset.label }}
      </button>

      <!-- Custom Button -->
      <button
        v-if="showCustom"
        type="button"
        class="px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1"
        :class="[
          modelValue === 'custom'
            ? 'bg-primary-500 text-white shadow-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        ]"
        @click="selectPreset('custom')"
      >
        <UIcon name="solar:calendar-linear" class="w-4 h-4" />
        {{ t("reports.dateRange.custom", "Custom") }}
      </button>
    </div>

    <!-- Custom Date Picker -->
    <div
      v-if="showCustomPicker || modelValue === 'custom'"
      class="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl max-w-[400px]"
    >
      <div class="flex-1 min-w-[140px]">
        <label class="block text-xs text-gray-500 mb-1">{{
          t("reports.startDate", "Start Date")
        }}</label>
        <CommonDatePicker v-model="customStart" size="xs" class="w-full" />
      </div>
      <div class="flex-1 min-w-[140px]">
        <label class="block text-xs text-gray-500 mb-1">
          {{ t("reports.endDate", "End Date") }}
        </label>
        <CommonDatePicker v-model="customEnd" size="xs" class="w-full" />
      </div>
      <UButton
        color="primary"
        size="sm"
        icon="solar:check-circle-linear"
        @click="applyCustomRange"
      >
        {{ t("common.apply", "Apply") }}
      </UButton>
    </div>

    <!-- Current Range Display -->
    <div
      v-if="!showCustomPicker && modelValue !== 'custom' && modelValue"
      class="text-xs text-gray-500"
    >
      {{ currentRange.start }} → {{ currentRange.end }}
    </div>
    <div
      v-else-if="!modelValue && !showCustomPicker"
      class="text-xs text-gray-400 italic"
    >
      {{ t("reports.allDates", "All dates") }}
    </div>
  </div>
</template>
