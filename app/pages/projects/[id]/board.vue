<script setup lang="ts">
import VueDraggable from "vuedraggable";
import type { PmIssue, PmIssueStatus } from "~/types/project-manager";

const route = useRoute();
const projectId = route.params.id as string;
const router = useRouter();

const { issues, fetchIssuesForProject, saveIssue, updateIssueStatus } =
  useIssues();

onMounted(() => {
  fetchIssuesForProject(projectId);
});

// Configure default board columns
const columns = ref([
  { id: "todo", name: "To Do", status: "todo" as PmIssueStatus },
  {
    id: "in_progress",
    name: "In Progress",
    status: "in_progress" as PmIssueStatus,
  },
  { id: "in_review", name: "In Review", status: "in_review" as PmIssueStatus },
  { id: "done", name: "Done", status: "done" as PmIssueStatus },
]);

// Computed property to group issues by column status
const columnsData = computed(() => {
  return columns.value.map((col) => ({
    ...col,
    issues: issues.value.filter((i) => i.status === col.status),
  }));
});

// Handle dragging an issue to a new column
const onDragChange = (event: any, newStatus: string) => {
  if (event.added) {
    const issue = event.added.element as PmIssue;
    updateIssueStatus(issue.id, newStatus);
  }
};

// Quick Create Issue
const isCreating = ref<string | null>(null); // the status col ID
const quickTitle = ref("");

const startCreate = (status: string) => {
  isCreating.value = status;
  quickTitle.value = "";
  // Focus logic would go here
};

const submitQuickCreate = async () => {
  if (!quickTitle.value || !isCreating.value) return;

  const id = crypto.randomUUID();

  await saveIssue({
    id,
    projectId,
    title: quickTitle.value,
    description: "---",
    status: isCreating.value as PmIssueStatus,
    type: "task",
    priority: "medium",
    assignees: [],
    labels: [],
  });

  isCreating.value = null;
  quickTitle.value = "";
};
</script>

<template>
  <div class="h-full flex items-start gap-6 p-4 pb-4">
    <div
      v-for="col in columnsData"
      :key="col.id"
      class="flex-shrink-0 w-80 flex flex-col max-h-full bg-gray-100 dark:bg-gray-900 rounded-xl"
    >
      <!-- Column Header -->
      <div
        class="p-3 pb-2 flex items-center justify-between font-medium text-sm text-gray-700 dark:text-gray-300"
      >
        <div class="flex items-center gap-2">
          <span>{{ col.name }}</span>
          <UBadge color="gray" variant="subtle" size="xs">{{
            col.issues.length
          }}</UBadge>
        </div>
        <UButton
          icon="i-heroicons-plus"
          color="gray"
          variant="ghost"
          size="xs"
          @click="startCreate(col.status)"
        />
      </div>

      <!-- Quick Create Input -->
      <div v-if="isCreating === col.status" class="px-3 pb-3 py-0.5">
        <UInput
          v-model="quickTitle"
          placeholder="What needs to be done?"
          size="sm"
          @keyup.enter="submitQuickCreate"
          @keyup.escape="isCreating = null"
          autofocus
          class="w-full"
        />
        <div class="flex gap-2 mt-2">
          <UButton
            label="Save"
            size="xs"
            color="primary"
            @click="submitQuickCreate"
          />
          <UButton
            label="Cancel"
            size="xs"
            color="gray"
            variant="ghost"
            @click="isCreating = null"
          />
        </div>
      </div>

      <!-- Draggable Area -->
      <VueDraggable
        v-model="col.issues"
        :group="'board'"
        item-key="id"
        class="flex-1 p-3 pt-0 overflow-y-auto space-y-3 min-h-[150px]"
        ghost-class="opacity-50"
        @change="(e) => onDragChange(e, col.status)"
      >
        <template #item="{ element }">
          <UCard
            class="cursor-grab my-3 active:cursor-grabbing hover:ring-1 ring-primary/50 transition-shadow"
            @click="
              router.push({ query: { ...route.query, issueId: element.id } })
            "
          >
            <div class="flex items-start justify-between gap-2">
              <p
                class="text-sm font-medium text-gray-900 dark:text-white leading-tight"
              >
                {{ element.title }}
              </p>
            </div>

            <div class="mt-3 flex items-center justify-between">
              <div
                class="flex items-center gap-2 text-xs text-gray-500 font-medium"
              >
                <ProjectManagerIssueTypeIcon :type="element.type" />
                <span>{{
                  element.id.split("-").slice(0, 2).join("-") ||
                  element.id.substring(0, 8)
                }}</span>
              </div>
              <UAvatarGroup v-if="element.assignees?.length" size="xs" :max="2">
                <UAvatar
                  v-for="member in element.assignees"
                  :key="member"
                  :alt="member.slice(0, 4)"
                />
              </UAvatarGroup>
            </div>
          </UCard>
        </template>
      </VueDraggable>
    </div>

    <!-- Add Column Placeholder -->
    <button
      class="flex-shrink-0 w-80 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-800 hover:border-primary/50 flex items-center gap-2 justify-center p-4 text-gray-500 hover:text-primary transition-colors my-2 h-14"
    >
      <UIcon name="i-heroicons-plus" class="w-5 h-5" />
      <span class="font-medium text-sm">Add Column</span>
    </button>

    <ProjectManagerIssueDetailPanel
      v-if="route.query.issueId"
      :issue-id="route.query.issueId as string"
      :project-id="projectId"
      @close="
        router.push({
          query: { ...route.query, issueId: undefined },
        })
      "
    />
  </div>
</template>
