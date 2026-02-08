<template>
  <UModal
    v-model:open="isOpen"
    title="Voice Order"
    description="Voice Order Control"
    prevent-close
  >
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              {{ $t("voice.title") }}
            </h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              @click="handleClose"
            />
          </div>
        </template>

        <!-- Main Content -->
        <div class="space-y-6">
          <!-- Language Selector -->
          <div class="flex justify-center">
            <div
              class="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-1 bg-gray-50 dark:bg-gray-800"
            >
              <button
                @click="setLanguage('en-US')"
                :class="[
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  settings.language === 'en-US'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                ]"
              >
                🇺🇸 EN
              </button>
              <button
                @click="setLanguage('lo-LA')"
                :class="[
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  settings.language === 'lo-LA'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                ]"
              >
                🇱🇦 LA
              </button>
              <button
                @click="setLanguage('th-TH')"
                :class="[
                  'px-4 py-2 rounded-md text-sm font-medium transition-all',
                  settings.language === 'th-TH'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
                ]"
              >
                🇹🇭 TH
              </button>
            </div>
          </div>

          <!-- Microphone Button -->
          <div class="flex justify-center">
            <button
              :class="[
                'relative flex items-center justify-center',
                'w-32 h-32 rounded-full',
                'transition-all duration-300',
                'focus:outline-none focus:ring-4',
                isListening
                  ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300 scale-110'
                  : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-300',
                hasError ? 'bg-red-600' : '',
              ]"
              @click="toggleListening"
              :disabled="!isSupported || isProcessing"
            >
              <!-- Pulse animation when listening -->
              <span
                v-if="isListening"
                class="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"
              />

              <!-- Icon -->
              <UIcon
                :name="getMicrophoneIcon"
                class="relative z-10 text-white"
                :class="isListening ? 'text-5xl' : 'text-4xl'"
              />
            </button>
          </div>

          <!-- Status Text -->
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">
              {{ getStatusText }}
            </p>
          </div>

          <!-- Transcript Display -->
          <div
            v-if="displayText || isListening"
            class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 min-h-[100px]"
          >
            <p class="text-base text-gray-900 dark:text-gray-100">
              {{ displayText }}
              <span
                v-if="state.interimTranscript"
                class="text-gray-400 dark:text-gray-500 italic"
              >
                {{ state.interimTranscript }}
              </span>
              <span
                v-if="isListening && !displayText"
                class="text-gray-400 dark:text-gray-500 animate-pulse"
              >
                {{ $t("voice.listening") }}
              </span>
            </p>

            <!-- Confidence indicator -->
            <div
              v-if="state.confidence > 0"
              class="mt-3 flex items-center gap-2"
            >
              <span class="text-xs text-gray-500">
                {{ $t("voice.confidence") }}:
              </span>
              <div
                class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
              >
                <div
                  class="h-full transition-all duration-300"
                  :class="getConfidenceColor"
                  :style="{ width: `${state.confidence * 100}%` }"
                />
              </div>
              <span class="text-xs font-medium">
                {{ Math.round(state.confidence * 100) }}%
              </span>
            </div>
          </div>

          <!-- Error Display -->
          <UAlert
            v-if="hasError"
            icon="i-heroicons-exclamation-triangle"
            color="red"
            variant="soft"
            :title="state.error?.message || 'Error'"
            :description="state.error?.details"
          >
            <template #actions>
              <UButton
                v-if="canRetry"
                color="red"
                variant="outline"
                size="xs"
                @click="retry"
              >
                {{ $t("voice.tryAgain") }}
              </UButton>
            </template>
          </UAlert>

          <!-- Voice Order Preview -->
          <PosVoiceOrderBuilder
            v-if="currentPreview"
            :preview="currentPreview"
            @confirm="handleConfirm"
            @cancel="handleCancel"
            @edit="handleEdit"
          />

          <!-- Help Text -->
          <div
            v-if="!isListening && !currentPreview && !hasError"
            class="text-center space-y-2"
          >
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ $t("voice.help.tapToSpeak") }}
            </p>
            <details class="text-xs text-gray-400 dark:text-gray-500">
              <summary
                class="cursor-pointer hover:text-gray-600 dark:hover:text-gray-300"
              >
                {{ $t("voice.help.examples") }}
              </summary>
              <ul class="mt-2 space-y-1 text-left list-disc list-inside">
                <li v-for="example in exampleCommands" :key="example">
                  "{{ example }}"
                </li>
              </ul>
            </details>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              v-if="isListening"
              color="gray"
              variant="outline"
              @click="stopListening"
            >
              {{ $t("voice.stop") }}
            </UButton>
            <UButton color="gray" variant="ghost" @click="handleClose">
              {{ $t("common.close") }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "command-applied": [];
}>();

const { t } = useI18n();

// Voice order composable
const {
  state,
  settings,
  currentPreview,
  isActive,
  hasError,
  canRetry,
  displayText,
  startListening,
  stopListening,
  retry,
  reset,
  applyCommand,
  updateLanguage,
} = useVoiceOrder();

// Language switching method
const setLanguage = (lang: "en-US" | "lo-LA" | "th-TH") => {
  updateLanguage(lang);
  // If currently listening, restart with new language
  if (state.value.isListening) {
    stopListening();
    setTimeout(() => {
      startListening();
    }, 100);
  }
};

// Modal state
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

// Computed properties
const isListening = computed(() => state.value.isListening);
const isProcessing = computed(() => state.value.isProcessing);
const isSupported = computed(() => state.value.isSupported);

const getMicrophoneIcon = computed(() => {
  if (!isSupported.value) return "i-heroicons-microphone-slash";
  if (isListening.value) return "i-heroicons-stop-circle";
  if (isProcessing.value) return "i-heroicons-arrow-path";
  return "i-heroicons-microphone";
});

const getStatusText = computed(() => {
  if (!isSupported.value) return t("voice.errors.notSupported");
  if (isProcessing.value) return t("voice.processing");
  if (isListening.value) return t("voice.listening");
  if (hasError.value) return t("voice.error");
  if (currentPreview.value) return t("voice.reviewOrder");
  return t("voice.start");
});

const getConfidenceColor = computed(() => {
  const confidence = state.value.confidence;
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
});

const exampleCommands = computed(() => [
  t("voice.help.example1"),
  t("voice.help.example2"),
  t("voice.help.example3"),
  t("voice.help.example4"),
]);

// Methods
const toggleListening = async () => {
  if (isListening.value) {
    stopListening();
  } else {
    reset();
    await startListening();
  }
};

const handleConfirm = async () => {
  if (currentPreview.value) {
    await applyCommand(currentPreview.value.command);
    emit("command-applied");
    handleClose();
  }
};

const handleCancel = () => {
  reset();
};

const handleEdit = (index: number) => {
  // TODO: Implement edit functionality
  console.log("Edit item:", index);
};

const handleClose = () => {
  if (isListening.value) {
    stopListening();
  }
  reset();
  isOpen.value = false;
};

// Watch for modal close
watch(isOpen, (newValue) => {
  if (!newValue && isListening.value) {
    stopListening();
  }
});

// Intelligent auto-confirm system
let autoConfirmTimer: NodeJS.Timeout | null = null;

watch(
  () => currentPreview.value,
  (newPreview) => {
    // Clear any existing timer
    if (autoConfirmTimer) {
      clearTimeout(autoConfirmTimer);
      autoConfirmTimer = null;
    }

    if (!newPreview || !newPreview.isValid) return;

    // High confidence (90%+): Auto-confirm after short delay
    if (newPreview.overallConfidence >= 0.9) {
      autoConfirmTimer = setTimeout(() => {
        if (
          currentPreview.value?.isValid &&
          currentPreview.value.overallConfidence >= 0.9
        ) {
          handleConfirm();
        }
      }, 1500); // 1.5 second preview
    }
    // Medium confidence (60-89%): Wait for manual confirmation or voice "OK"
    // Low confidence (<60%): Requires manual review
  },
  { deep: true },
);

// Voice confirmation (for medium confidence orders)
watch(
  () => state.value.transcript,
  (newTranscript) => {
    // Check if user said a confirmation word
    if (newTranscript && currentPreview.value?.isValid) {
      const lang = settings.value.language;
      const text = newTranscript.toLowerCase();

      // Confirmation patterns
      const confirmPatterns = {
        "en-US": /\b(ok|yes|confirm|correct|that's right|looks good)\b/i,
        "lo-LA": /\b(ຕົກລົງ|ແມ່ນແລ້ວ|ຖືກຕ້ອງ|ໂອເຄ)\b/,
        "th-TH": /\b(ตกลง|ใช่|ถูกต้อง|โอเค|ดี)\b/,
      };

      const pattern = confirmPatterns[lang as keyof typeof confirmPatterns];
      if (pattern && pattern.test(text)) {
        // Cancel auto-timer if exists
        if (autoConfirmTimer) {
          clearTimeout(autoConfirmTimer);
          autoConfirmTimer = null;
        }
        // Confirm immediately
        setTimeout(() => {
          if (currentPreview.value?.isValid) {
            handleConfirm();
          }
        }, 300);
      }
    }
  },
);

// Cleanup timer on unmount
onUnmounted(() => {
  if (autoConfirmTimer) {
    clearTimeout(autoConfirmTimer);
  }
});

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  // Space bar to toggle listening
  if (event.code === "Space" && !event.repeat && isOpen.value) {
    event.preventDefault();
  }
  // Escape to close
  if (event.code === "Escape" && isOpen.value) {
    handleClose();
  }
};

// Add keyboard listener when modal is open
if (typeof window !== "undefined") {
  window.addEventListener("keydown", handleKeydown);
}

// Cleanup
onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", handleKeydown);
  }
});
</script>
