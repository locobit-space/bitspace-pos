<!-- components/common/CameraModal.vue -->
<script setup lang="ts">
import { resizeImage } from "~/utils/image";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  capture: [file: File];
}>();

const { t } = useI18n();

const isOpen = computed({
  get: () => props.open,
  set: (val) => emit("update:open", val),
});

const videoRef = ref<HTMLVideoElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stream = ref<MediaStream | null>(null);
const error = ref<string | null>(null);
const isStreaming = ref(false);

// Start camera when modal opens
watch(isOpen, async (val) => {
  if (val) {
    await startCamera();
  } else {
    stopCamera();
  }
});

onUnmounted(() => {
  stopCamera();
});

async function startCamera() {
  error.value = null;
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
      audio: false,
    });

    if (videoRef.value) {
      videoRef.value.srcObject = stream.value;
      await videoRef.value.play();
      isStreaming.value = true;
    }
  } catch (err) {
    console.error("Failed to access camera:", err);
    error.value = t(
      "camera.accessDenied",
      "Camera access denied or not available.",
    );
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((track) => track.stop());
    stream.value = null;
  }
  isStreaming.value = false;
}

// ... (props, emits, i18n remain same)

// ... (isOpen computed, refs, states remain same)

// ... (watch, onUnmounted, startCamera, stopCamera remain same)

async function capturePhoto() {
  if (!videoRef.value || !canvasRef.value) return;

  const video = videoRef.value;
  const canvas = canvasRef.value;
  const context = canvas.getContext("2d");

  if (context) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        // Resize before emitting
        try {
          const resizedFile = await resizeImage(file, {
            maxWidth: 1200,
            quality: 0.8,
            format: "image/jpeg",
          });
          emit("capture", resizedFile);
          isOpen.value = false;
        } catch (e) {
          console.error("Failed to resize image", e);
          emit("capture", file); // Fallback to original
          isOpen.value = false;
        }
      }
    }, "image/jpeg");
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-4 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t("camera.takePhoto", "Take Photo") }}
          </h3>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            class="-my-1"
            @click="isOpen = false"
          />
        </div>

        <div
          class="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center"
        >
          <video
            ref="videoRef"
            class="w-full h-full object-cover transform -scale-x-100"
            :class="{ hidden: !isStreaming }"
            autoplay
            playsinline
            muted
          ></video>

          <div v-if="!isStreaming && !error" class="text-white">
            <UIcon name="i-heroicons-camera" class="w-12 h-12 mb-2 mx-auto" />
            <p>{{ t("camera.starting", "Starting camera...") }}</p>
          </div>

          <div v-if="error" class="text-red-500 text-center p-4">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-8 h-8 mb-2 mx-auto"
            />
            <p>{{ error }}</p>
          </div>
        </div>

        <div class="flex justify-end w-full gap-2">
          <UButton color="gray" block variant="soft" @click="isOpen = false">
            {{ t("common.cancel", "Cancel") }}
          </UButton>
          <UButton
            color="primary"
            block
            icon="i-heroicons-camera"
            :disabled="!isStreaming"
            @click="capturePhoto"
          >
            {{ t("camera.capture", "Capture") }}
          </UButton>
        </div>

        <canvas ref="canvasRef" class="hidden"></canvas>
      </div>
    </template>
  </UModal>
</template>
