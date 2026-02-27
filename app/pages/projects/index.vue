<script setup lang="ts">
import { useProjects } from "~/composables/useProjects";
import type { PmProject } from "~/types/project-manager";

definePageMeta({
  layout: "default",
});

const { projects, isLoading, fetchProjects, saveProject } = useProjects();

const isCreateModalOpen = ref(false);
const newProjectName = ref("");
const newProjectDescription = ref("");
const isSaving = ref(false);

onMounted(() => {
  fetchProjects();
});

const submitNewProject = async () => {
  if (!newProjectName.value) return;

  isSaving.value = true;
  try {
    const id = crypto.randomUUID();

    await saveProject({
      id,
      name: newProjectName.value,
      description: newProjectDescription.value,
      members: [], // self is added automatically by composable
    });

    isCreateModalOpen.value = false;
    newProjectName.value = "";
    newProjectDescription.value = "";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="h-full w-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Projects</h1>
        <p class="text-gray-500 dark:text-gray-400">
          Manage your decentralized workspaces and tasks.
        </p>
      </div>

      <UButton
        icon="i-heroicons-plus"
        color="primary"
        label="New Project"
        @click="isCreateModalOpen = true"
      />
    </div>

    <!-- Loading State -->
    <div
      v-if="isLoading && projects.length === 0"
      class="flex justify-center p-12"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-8 h-8 animate-spin text-gray-400"
      />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="projects.length === 0"
      class="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl p-12 text-center"
    >
      <div
        class="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4"
      >
        <UIcon name="i-heroicons-folder-open" class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">
        No projects found
      </h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Get started by creating a new decentralized project workspace.
      </p>
      <div class="mt-6">
        <UButton
          icon="i-heroicons-plus"
          label="Create Project"
          @click="isCreateModalOpen = true"
        />
      </div>
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="project in projects"
        :key="project.id"
        class="transition-all hover:shadow-md dark:hover:shadow-primary/5 cursor-pointer ring-1 ring-gray-200 dark:ring-gray-800 hover:ring-primary/50 dark:hover:ring-primary/50"
        @click="navigateTo(`/projects/${project.id}/board`)"
      >
        <template #header>
          <div class="flex justify-between items-start">
            <h3 class="font-semibold text-lg line-clamp-1">
              {{ project.name }}
            </h3>
            <UBadge color="gray" variant="soft">{{ project.id }}</UBadge>
          </div>
        </template>

        <p
          class="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 min-h-[4.5rem]"
        >
          {{ project.description || "No description provided." }}
        </p>

        <template #footer>
          <div class="flex items-center justify-between text-xs text-gray-500">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-heroicons-users" class="w-4 h-4" />
              <span>{{ project.members.length }} members</span>
            </div>
            <span>Updated {{ project.updatedAt }}</span>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Create Project Modal -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Create New Project
            </h3>
          </template>

          <form @submit.prevent="submitNewProject" class="space-y-4">
            <UFormField label="Project Name" required>
              <UInput
                v-model="newProjectName"
                placeholder="e.g. BnOS Core Development"
                autofocus
                class="w-full"
              />
            </UFormField>

            <UFormField label="Description">
              <UTextarea
                v-model="newProjectDescription"
                placeholder="What is this project about?"
                :rows="4"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                label="Cancel"
                color="gray"
                variant="ghost"
                @click="isCreateModalOpen = false"
              />
              <UButton
                type="submit"
                label="Create Project"
                color="primary"
                :loading="isSaving"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
