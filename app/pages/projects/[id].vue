<script setup lang="ts">
import IssueDetailPanel from "~/components/project-manager/IssueDetailPanel.vue";

definePageMeta({
  pageTransition: {
    name: "page",
    mode: "out-in",
  },
});

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const { projects, fetchProjects } = useProjects();

const project = computed(() => projects.value.find((p) => p.id === projectId));

onMounted(() => {
  if (projects.value.length === 0) {
    fetchProjects();
  }
});

const tabs = [
  {
    label: "Board",
    to: `/projects/${projectId}/board`,
    icon: "i-heroicons-view-columns",
  },
  {
    label: "List",
    to: `/projects/${projectId}/list`,
    icon: "i-heroicons-list-bullet",
  },
  {
    label: "Sprints",
    to: `/projects/${projectId}/sprints`,
    icon: "i-heroicons-calendar-days",
  },
  {
    label: "Pages",
    to: `/projects/${projectId}/pages`,
    icon: "i-heroicons-document-text",
  },
  {
    label: "Settings",
    to: `/projects/${projectId}/settings`,
    icon: "i-heroicons-cog-6-tooth",
  },
];

// Handle opening the details panel via a query param `?issueId=`
const activeIssueId = computed(() => route.query.issueId as string | undefined);
const closeIssuePanel = () => {
  const query = { ...route.query };
  delete query.issueId;
  router.push({ query });
};
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Context Header -->
    <div
      class="flex-none border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-10 px-4 py-3 sm:px-6"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-heroicons-arrow-left"
            color="gray"
            variant="ghost"
            to="/projects"
            size="sm"
          />
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                {{ project?.name || "Loading Project..." }}
              </h1>
              <UBadge color="gray" variant="soft" size="sm">{{
                projectId
              }}</UBadge>
            </div>
            <p
              v-if="project?.description"
              class="text-sm text-gray-500 dark:text-gray-400 truncate max-w-2xl mt-0.5"
            >
              {{ project.description }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <UAvatarGroup v-if="project" size="sm" :max="3">
            <UAvatar
              v-for="member in project.members"
              :key="member"
              :alt="member.slice(0, 4)"
            />
          </UAvatarGroup>
          <UButton
            icon="i-heroicons-user-plus"
            color="gray"
            variant="ghost"
            size="sm"
          />
          <!-- <UButton label="New Issue" color="primary" icon="i-heroicons-plus" /> -->
        </div>
      </div>

      <!-- Sub Navigation -->
      <div class="mt-4 -mb-3 flex space-x-4">
        <ULink
          v-for="tab in tabs"
          :key="tab.label"
          :to="tab.to"
          class="flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors duration-200"
          active-class="border-primary text-primary"
          inactive-class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
        >
          <UIcon :name="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </ULink>
      </div>
    </div>

    <!-- Board Content Area -->
    <div
      class="flex-1 overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-950"
    >
      <NuxtPage />
    </div>

    <!-- Global Issue Detail Panel -->
    <IssueDetailPanel
      v-if="activeIssueId"
      :issue-id="activeIssueId"
      :project-id="projectId"
      @close="closeIssuePanel"
    />
  </div>
</template>
