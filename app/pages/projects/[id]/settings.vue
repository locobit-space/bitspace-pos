<script setup lang="ts">
import { useProjects } from "~/composables/useProjects";

const route = useRoute();
const projectId = route.params.id as string;
const toast = useToast();

const { projects, saveProject } = useProjects();

const project = computed(() => projects.value.find((p) => p.id === projectId));

const isSaving = ref(false);
const formData = ref({
  name: "",
  description: "",
});

// Initialize form data when project loads
watchEffect(() => {
  if (project.value && !formData.value.name) {
    formData.value.name = project.value.name;
    formData.value.description = project.value.description;
  }
});

const saveSettings = async () => {
  if (!project.value) return;
  if (!formData.value.name.trim()) {
    toast.add({ title: "Project name is required", color: "red" });
    return;
  }

  isSaving.value = true;
  try {
    await saveProject({
      id: project.value.id,
      name: formData.value.name,
      description: formData.value.description,
      members: project.value.members,
    });
    toast.add({ title: "Project Settings Updated", color: "green" });
  } catch (error) {
    console.error(error);
  } finally {
    isSaving.value = false;
  }
};

const copyProjectId = () => {
  navigator.clipboard.writeText(projectId);
  toast.add({ title: "Copied to clipboard!", color: "gray" });
};
</script>

<template>
  <div class="h-full flex justify-center p-6 sm:p-10 overflow-auto">
    <div class="w-full max-w-2xl space-y-6">
      <!-- General Settings -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h2
                class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
              >
                General Settings
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage the details and configuration of your project.
              </p>
            </div>
          </div>
        </template>

        <form @submit.prevent="saveSettings" class="space-y-6">
          <UFormField label="Project Name" required>
            <UInput
              v-model="formData.name"
              placeholder="e.g. BnOS Core Development"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="formData.description"
              placeholder="What is this project about?"
              :rows="4"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Project ID"
            help="This is the unique Nostr d-tag for your project."
          >
            <div class="flex items-center gap-2 w-full">
              <UInput :model-value="projectId" disabled class="flex-1" />
              <UButton
                icon="i-heroicons-clipboard-document"
                color="gray"
                variant="ghost"
                @click="copyProjectId"
              />
            </div>
          </UFormField>

          <div
            class="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800"
          >
            <UButton
              type="submit"
              label="Save Changes"
              color="primary"
              :loading="isSaving"
            />
          </div>
        </form>
      </UCard>

      <!-- Member Management Placeholder -->
      <UCard>
        <template #header>
          <div>
            <h2
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Project Members
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Currently, {{ project?.members?.length || 1 }} member(s) have
              access to this project.
            </p>
          </div>
        </template>

        <div
          class="p-4 border border-gray-200 dark:border-gray-800 rounded-lg flex items-center justify-between bg-gray-50 dark:bg-gray-900/50"
        >
          <div class="flex items-center gap-3">
            <UAvatar size="md" icon="i-heroicons-user" />
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                You (Owner)
              </p>
              <p class="text-xs text-gray-500 font-mono">
                {{ project?.pubkey?.slice(0, 16) }}...
              </p>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between w-full">
            <span class="text-xs text-gray-500"
              >Member invites mapping to be added in Phase 3.</span
            >
            <UButton
              label="Invite Member"
              color="gray"
              disabled
              icon="i-heroicons-user-plus"
            />
          </div>
        </template>
      </UCard>

      <!-- Danger Zone -->
      <UCard :ui="{ ring: 'ring-red-500 dark:ring-red-400' }">
        <template #header>
          <h2
            class="text-base font-semibold leading-6 text-red-600 dark:text-red-400"
          >
            Danger Zone
          </h2>
        </template>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">
              Archive Project
            </h3>
            <p class="text-sm text-gray-500 mt-1">
              Hide this project from the main dashboard.
            </p>
          </div>
          <UButton label="Archive" color="red" variant="soft" />
        </div>
      </UCard>
    </div>
  </div>
</template>
