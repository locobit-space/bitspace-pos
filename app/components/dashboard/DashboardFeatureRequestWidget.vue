<script setup lang="ts">
import type { FeedbackType } from "~/composables/use-feedback";

const { t } = useI18n();
const feedback = useFeedback();

// State
const isDismissed = ref(false);
const shouldShow = ref(false);

// Storage key for daily dismissal
const DISMISS_KEY = "bitspace_feature_widget_last_shown";

// Check if we should show based on daily limit
const checkVisibility = () => {
  if (import.meta.server) return;

  const lastShown = localStorage.getItem(DISMISS_KEY);
  if (!lastShown) {
    shouldShow.value = true;
    return;
  }

  const lastDate = new Date(parseInt(lastShown)).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  // Show if last shown was before today (yesterday or earlier)
  if (today > lastDate) {
    shouldShow.value = true;
  } else {
    shouldShow.value = false;
  }
};

const openFeatureRequest = () => {
  feedback.feedbackType.value = "feature" as FeedbackType;
  feedback.isModalOpen.value = true;
};

const dismiss = () => {
  isDismissed.value = true;
  if (import.meta.client) {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }
};

onMounted(() => {
  checkVisibility();
});
</script>

<template>
  <div
    v-if="shouldShow && !isDismissed"
    class="bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/30 dark:to-blue-950/30 rounded-xl border border-primary-200 dark:border-primary-800 p-4 relative overflow-hidden mb-6 max-w-2xl"
  >
    <!-- Decoration -->
    <div
      class="absolute -top-6 -right-6 w-24 h-24 bg-primary-400/20 rounded-full blur-2xl"
    ></div>

    <div class="flex items-center gap-4 relative z-10">
      <div class="shrink-0">
        <div
          class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-2xl text-primary-500"
        >
          <Icon name="solar:lightbulb-linear" />
        </div>
      </div>

      <div class="flex-1 min-w-0">
        <h3
          class="text-base font-semibold text-gray-900 dark:text-white truncate"
        >
          {{ t("dashboard.feature.title", "Have an idea?") }}
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
          {{
            t(
              "dashboard.feature.subtitle",
              "Help us improve BNOS with your feedback.",
            )
          }}
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          icon="solar:lightbulb-bold"
          @click="openFeatureRequest"
        >
          {{ t("dashboard.feature.button", "Request Feature") }}
        </UButton>
        <UButton
          color="gray"
          variant="ghost"
          size="sm"
          icon="solar:close-circle-linear"
          @click="dismiss"
        />
      </div>
    </div>
  </div>
</template>
