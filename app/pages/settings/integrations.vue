<!-- pages/settings/integrations.vue -->
<!-- Cloudinary and other integrations configuration -->
<script setup lang="ts">
definePageMeta({
  layout: "default",
  middleware: ["auth"],
});

const { t } = useI18n();
const toast = useToast();
const cloudinary = useCloudinary();

// Form state
const cloudinaryForm = ref({
  cloudName: "",
  uploadPreset: "",
  useOwnKey: false,
});

// Load existing config
onMounted(() => {
  const config = cloudinary.getConfig();
  if (config) {
    cloudinaryForm.value.cloudName = config.cloudName;
    cloudinaryForm.value.uploadPreset = config.uploadPreset;
    cloudinaryForm.value.useOwnKey = true;
  }
});

// Save config
function saveCloudinaryConfig() {
  if (!cloudinaryForm.value.useOwnKey) {
    cloudinary.clearConfig();
    toast.add({
      title: t("settings.integrations.saved") || "Saved",
      description:
        t("settings.integrations.usingSystemDefault") ||
        "Using system default configuration",
      color: "success",
    });
  } else {
    if (!cloudinaryForm.value.cloudName || !cloudinaryForm.value.uploadPreset) {
      toast.add({
        title: t("common.error") || "Error",
        description:
          t("settings.integrations.fillRequired") ||
          "Please fill in Cloud Name and Upload Preset",
        color: "error",
      });
      return;
    }

    cloudinary.saveConfig({
      cloudName: cloudinaryForm.value.cloudName,
      uploadPreset: cloudinaryForm.value.uploadPreset,
    });

    toast.add({
      title: t("settings.integrations.saved") || "Saved",
      description:
        t("settings.integrations.cloudinarySaved") ||
        "Cloudinary configuration saved",
      color: "success",
    });
  }
}

// Test connection
const testing = ref(false);
async function testCloudinaryConnection() {
  testing.value = true;

  // Create a small test image
  const canvas = document.createElement("canvas");
  canvas.width = 10;
  canvas.height = 10;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#ccc";
    ctx.fillRect(0, 0, 10, 10);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const result = await cloudinary.uploadDataUrl(dataUrl);

  testing.value = false;

  if (result) {
    toast.add({
      title:
        t("settings.integrations.connectionSuccess") || "Connection Successful",
      description:
        t("settings.integrations.cloudinaryWorking") ||
        "Cloudinary is configured correctly",
      color: "success",
    });
  } else {
    toast.add({
      title: t("settings.integrations.connectionFailed") || "Connection Failed",
      description: cloudinary.error.value || "Could not connect to Cloudinary",
      color: "error",
    });
  }
}

useHead({
  title: t("settings.integrations.title") || "Integrations",
});
</script>

<template>
  <div class="p-4 max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        to="/settings"
      />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ t("settings.integrations.title") || "Integrations" }}
        </h1>
        <p class="text-sm text-gray-500">
          {{
            t("settings.integrations.subtitle") || "Configure external services"
          }}
        </p>
      </div>
    </div>

    <!-- Cloudinary Configuration -->
    <div
      class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
    >
      <div
        class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"
          >
            <UIcon name="i-heroicons-cloud" class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Cloudinary
            </h3>
            <p class="text-xs text-gray-500">
              {{
                t("settings.integrations.cloudinaryDesc") ||
                "Image hosting and optimization"
              }}
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 space-y-4">
        <!-- Use Custom API Key Toggle -->
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
        >
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ t("settings.integrations.useOwnKey") || "Use My Own API Key" }}
            </p>
            <p class="text-sm text-gray-500">
              {{
                t("settings.integrations.useOwnKeyDesc") ||
                "Configure your own Cloudinary account"
              }}
            </p>
          </div>
          <UCheckbox v-model="cloudinaryForm.useOwnKey" />
        </div>

        <!-- Custom Configuration -->
        <div v-if="cloudinaryForm.useOwnKey" class="space-y-4">
          <UFormField label="Cloud Name" required>
            <UInput
              v-model="cloudinaryForm.cloudName"
              placeholder="your-cloud-name"
              icon="i-heroicons-cloud"
            />
          </UFormField>

          <UFormField label="Upload Preset" required>
            <UInput
              v-model="cloudinaryForm.uploadPreset"
              placeholder="unsigned-preset"
              icon="i-heroicons-cog-6-tooth"
            />
            <template #hint>
              <p class="text-xs text-gray-500">
                {{
                  t("settings.integrations.uploadPresetHint") ||
                  "Create an unsigned upload preset in your Cloudinary dashboard"
                }}
              </p>
            </template>
          </UFormField>

          <div
            class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          >
            <UIcon
              name="i-heroicons-information-circle"
              class="w-5 h-5 text-blue-600 dark:text-blue-400"
            />
            <p class="text-sm text-blue-700 dark:text-blue-300">
              {{
                t("settings.integrations.cloudinaryHelp") ||
                "Get your Cloud Name from cloudinary.com → Settings → Account"
              }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <UButton color="primary" @click="saveCloudinaryConfig">
            {{ t("common.save") || "Save" }}
          </UButton>
          <UButton
            v-if="cloudinaryForm.useOwnKey"
            color="neutral"
            variant="outline"
            :loading="testing"
            @click="testCloudinaryConnection"
          >
            {{ t("settings.integrations.testConnection") || "Test Connection" }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
