<script setup lang="ts">
import { useSprints } from "~/composables/useSprints";
import { useIssues } from "~/composables/useIssues";
import VueDraggable from "vuedraggable";
import type { PmSprint, PmIssue, PmIssueType } from "~/types/project-manager";

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;
const toast = useToast();

const { sprints, fetchSprintsForProject, saveSprint, updateSprintStatus } =
  useSprints();
const { issues, fetchIssuesForProject, saveIssue } = useIssues();

const isCreateModalOpen = ref(false);
const isStartModalOpen = ref(false);
const isSaving = ref(false);

// Create Sprint State
const newSprintName = ref("");
const newSprintGoal = ref("");
const newSprintDurationWeeks = ref<number | "custom">(2);
const newSprintStartDate = ref<string>("");
const newSprintEndDate = ref<string>("");

// Start Sprint State
const sprintToStart = ref<PmSprint | null>(null);
const startSprintDate = ref<string>(""); // YYYY-MM-DD
const endSprintDate = ref<string>(""); // YYYY-MM-DD

onMounted(() => {
  fetchSprintsForProject(projectId);
  fetchIssuesForProject(projectId);
});

// Issues not assigned to any sprint
const backlogIssues = computed(() => {
  return issues.value.filter((i) => !i.sprintId);
});

// Issues grouped by sprint
const getIssuesForSprint = (sprintId: string) => {
  return issues.value.filter((i) => i.sprintId === sprintId);
};

// Find parent epic for an issue
const getEpicForIssue = (issue: PmIssue) => {
  if (!issue.parentIssueId) return null;
  return issues.value.find((i) => i.id === issue.parentIssueId);
};

// Handle dragging an issue between sprints or backlog
const onIssueDragChange = async (
  event: any,
  newSprintId: string | undefined,
) => {
  if (event.added) {
    const issue = event.added.element as PmIssue;
    // Optimistic update
    const oldSprintId = issue.sprintId;
    issue.sprintId = newSprintId;

    try {
      // Create a fresh copy to send to Nostr
      await saveIssue({
        ...issue,
        sprintId: newSprintId,
      });
    } catch (e) {
      issue.sprintId = oldSprintId; // Revert explicitly on failure
    }
  }
};

const submitNewSprint = async () => {
  if (!newSprintName.value) return;

  isSaving.value = true;
  try {
    const id = crypto.randomUUID();

    let startDate: number;
    let endDate: number;

    if (newSprintDurationWeeks.value === "custom") {
      if (!newSprintStartDate.value || !newSprintEndDate.value) return;
      startDate = Math.floor(
        new Date(newSprintStartDate.value).getTime() / 1000,
      );
      endDate = Math.floor(new Date(newSprintEndDate.value).getTime() / 1000);
    } else {
      // Calculate basic dates based on duration
      startDate = Math.floor(Date.now() / 1000);
      endDate = startDate + newSprintDurationWeeks.value * 7 * 24 * 60 * 60;
    }

    await saveSprint({
      id,
      projectId,
      name: newSprintName.value,
      goal: newSprintGoal.value,
      status: "planned",
      startDate,
      endDate,
    });

    isCreateModalOpen.value = false;
    newSprintName.value = "";
    newSprintGoal.value = "";
    newSprintDurationWeeks.value = 2;
    newSprintStartDate.value = "";
    newSprintEndDate.value = "";
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};

// Format a Date object to YYYY-MM-DD for native date input
const formatDateForInput = (date: Date) => {
  return date.toISOString().split("T")[0];
};

const startSprint = (sprint: PmSprint) => {
  sprintToStart.value = sprint;

  // Pre-fill dates based on sprint's planned dates, or fallback to today
  const startD = sprint.startDate
    ? new Date(sprint.startDate * 1000)
    : new Date();
  startSprintDate.value = formatDateForInput(startD) || "";

  const endD = sprint.endDate
    ? new Date(sprint.endDate * 1000)
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks default
  endSprintDate.value = formatDateForInput(endD) || "";

  isStartModalOpen.value = true;
};

const confirmStartSprint = async () => {
  if (!sprintToStart.value) return;
  if (!startSprintDate.value || !endSprintDate.value) return;

  isSaving.value = true;
  try {
    const sDate = Math.floor(new Date(startSprintDate.value).getTime() / 1000);
    const eDate = Math.floor(new Date(endSprintDate.value).getTime() / 1000);

    // Save the updated dates back to the sprint
    await saveSprint({
      ...sprintToStart.value,
      startDate: sDate,
      endDate: eDate,
      status: "active",
    });

    isStartModalOpen.value = false;
    sprintToStart.value = null;

    toast.add({
      title: "Sprint Started!",
      color: "green",
      icon: "i-heroicons-play",
    });
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};

const completeSprint = async (sprint: PmSprint) => {
  await updateSprintStatus(sprint.id, "completed");
  toast.add({
    title: "Sprint Completed!",
    color: "blue",
    icon: "i-heroicons-check-circle",
  });
};

const activeSprint = computed(() =>
  sprints.value.find((s) => s.status === "active"),
);
const plannedSprints = computed(() =>
  sprints.value.filter((s) => s.status === "planned"),
);

// Quick Add Issue State
const quickAddSprintId = ref<string | null>(null);
const quickAddTitle = ref("");
const quickAddType = ref<PmIssueType>("task");

const typeOptions = [
  { label: "Task", value: "task" },
  { label: "Bug", value: "bug" },
  { label: "Story", value: "story" },
  { label: "Epic", value: "epic" },
];

const submitQuickAdd = async () => {
  if (!quickAddTitle.value.trim()) {
    quickAddSprintId.value = null;
    return;
  }

  isSaving.value = true;
  try {
    const targetSprintId =
      quickAddSprintId.value === "backlog"
        ? undefined
        : (quickAddSprintId.value ?? undefined);

    await saveIssue({
      id: crypto.randomUUID(),
      projectId,
      sprintId: targetSprintId,
      title: quickAddTitle.value,
      description: "",
      type: quickAddType.value,
      status: "todo",
      priority: "medium",
      assignees: [],
      labels: [],
    });

    quickAddTitle.value = "";
    // Keep to add another quickly until clicked away
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="h-full flex flex-col pt-6 overflow-hidden">
    <!-- Header -->
    <div class="flex-none flex justify-between items-center mb-6 px-4">
      <div class="relative w-full max-w-md">
        <UIcon
          name="i-heroicons-magnifying-glass"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search backlog and sprints..."
          class="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>

    <div class="flex-1 overflow-auto pb-10 space-y-8">
      <!-- Active Sprint -->
      <div v-if="activeSprint" class="mb-6">
        <div
          class="bg-gray-100/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 flex justify-between items-center px-4 py-2"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
              {{ activeSprint.name }}
            </h3>
            <span
              v-if="activeSprint.startDate && activeSprint.endDate"
              class="text-xs text-gray-500 font-medium"
            >
              {{
                new Date(activeSprint.startDate * 1000).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                })
              }}
              -
              {{
                new Date(activeSprint.endDate * 1000).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                })
              }}
            </span>
            <span class="text-xs text-gray-400"
              >({{ getIssuesForSprint(activeSprint.id).length }} issues)</span
            >
            <UBadge color="blue" variant="subtle" size="xs">ACTIVE</UBadge>
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="activeSprint.goal"
              class="text-xs text-gray-500 italic max-w-sm truncate"
              >{{ activeSprint.goal }}</span
            >
            <UButton
              size="xs"
              color="gray"
              variant="solid"
              label="Complete sprint"
              @click="completeSprint(activeSprint)"
            />
          </div>
        </div>

        <VueDraggable
          :list="getIssuesForSprint(activeSprint.id)"
          group="issues"
          item-key="id"
          tag="div"
          class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 min-h-[40px]"
          @change="
            (e: any) => activeSprint && onIssueDragChange(e, activeSprint.id)
          "
        >
          <template #item="{ element }">
            <div
              class="flex items-center justify-between p-2 pl-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group flex-1"
              @click="
                router.push({ query: { ...route.query, issueId: element.id } })
              "
            >
              <div class="flex items-center gap-3 min-w-0 pr-4 w-1/2">
                <UIcon
                  name="i-heroicons-bars-2"
                  class="text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-none transition-opacity"
                />
                <span
                  class="font-mono text-xs text-gray-500 uppercase w-16 truncate flex-none"
                  >{{
                    element.id.split("-").slice(0, 2).join("-") ||
                    element.id.substring(0, 8)
                  }}</span
                >
                <ProjectManagerIssueTypeIcon :type="element.type" />
                <div class="flex items-center gap-2 truncate">
                  <span
                    class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 transition-colors"
                    >{{ element.title }}</span
                  >
                  <UBadge
                    v-if="getEpicForIssue(element)"
                    color="indigo"
                    variant="subtle"
                    size="xs"
                    class="truncate flex-none"
                    >{{ getEpicForIssue(element)?.title }}</UBadge
                  >
                </div>
              </div>
              <div class="flex gap-4 items-center flex-none pr-2">
                <div
                  v-if="element.points !== undefined"
                  class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 w-6 text-center"
                >
                  {{ element.points }}
                </div>
                <div v-else class="w-6"></div>
                <UBadge
                  :color="
                    element.status === 'done'
                      ? 'green'
                      : element.status === 'in_progress'
                        ? 'blue'
                        : 'gray'
                  "
                  variant="soft"
                  size="xs"
                  class="w-24 justify-center uppercase"
                  >{{ element.status.replace("_", " ") }}</UBadge
                >
                <div class="w-16 flex justify-end">
                  <UAvatarGroup
                    v-if="element.assignees?.length"
                    size="xs"
                    :max="3"
                  >
                    <UAvatar
                      v-for="member in element.assignees"
                      :key="member"
                      :alt="member.slice(0, 4)"
                    />
                  </UAvatarGroup>
                  <UAvatar
                    v-else
                    size="xs"
                    icon="i-heroicons-user"
                    class="opacity-30"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="pt-1">
              <form
                v-if="quickAddSprintId === activeSprint.id"
                @submit.prevent="submitQuickAdd"
                class="m-2 flex items-center gap-2 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded shadow-sm focus-within:ring-1 focus-within:ring-blue-500 overflow-visible"
              >
                <USelectMenu
                  v-model="quickAddType"
                  :items="typeOptions"
                  value-key="value"
                  label-key="label"
                  class="flex-none"
                >
                  <div
                    class="flex items-center justify-center w-7 h-7 ml-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Change Issue Type"
                  >
                    <ProjectManagerIssueTypeIcon :type="quickAddType" />
                  </div>
                </USelectMenu>
                <input
                  v-model="quickAddTitle"
                  type="text"
                  placeholder="What needs to be done?"
                  class="flex-1 bg-transparent py-1.5 pr-2 text-sm focus:outline-none border-none ring-0 w-full"
                  autofocus
                  @blur="
                    () => {
                      if (!quickAddTitle) quickAddSprintId = null;
                    }
                  "
                />
              </form>
              <button
                v-else
                @click="quickAddSprintId = activeSprint.id"
                class="w-full text-left py-2 px-3 rounded-b text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-2"
              >
                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                <span>Create issue</span>
              </button>
            </div>
          </template>
        </VueDraggable>
      </div>

      <!-- Planned Sprints -->
      <div v-for="sprint in plannedSprints" :key="sprint.id" class="mb-6">
        <div
          class="bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 flex justify-between items-center p-2 px-4"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
              {{ sprint.name }}
            </h3>
            <span
              v-if="sprint.startDate && sprint.endDate"
              class="text-xs text-gray-500 font-medium"
            >
              {{
                new Date(sprint.startDate * 1000).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                })
              }}
              -
              {{
                new Date(sprint.endDate * 1000).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                })
              }}
            </span>
            <span class="text-xs text-gray-400"
              >({{ getIssuesForSprint(sprint.id).length }} issues)</span
            >
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="sprint.goal"
              class="text-xs text-gray-500 italic max-w-sm truncate"
              >{{ sprint.goal }}</span
            >
            <UButton
              v-if="!activeSprint"
              size="xs"
              color="gray"
              variant="solid"
              label="Start sprint"
              @click="startSprint(sprint)"
            />
          </div>
        </div>

        <VueDraggable
          :list="getIssuesForSprint(sprint.id)"
          group="issues"
          item-key="id"
          tag="div"
          class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 min-h-[40px]"
          @change="(e: any) => onIssueDragChange(e, sprint.id)"
        >
          <template #item="{ element }">
            <div
              class="flex items-center justify-between p-2 pl-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group flex-1"
              @click="
                router.push({ query: { ...route.query, issueId: element.id } })
              "
            >
              <div class="flex items-center gap-3 min-w-0 pr-4 w-1/2">
                <UIcon
                  name="i-heroicons-bars-2"
                  class="text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-none transition-opacity"
                />
                <span
                  class="font-mono text-xs text-gray-500 uppercase w-16 truncate flex-none"
                  >{{
                    element.id.split("-").slice(0, 2).join("-") ||
                    element.id.substring(0, 8)
                  }}</span
                >
                <ProjectManagerIssueTypeIcon :type="element.type" />
                <div class="flex items-center gap-2 truncate">
                  <span
                    class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 transition-colors"
                    >{{ element.title }}</span
                  >
                  <UBadge
                    v-if="getEpicForIssue(element)"
                    color="indigo"
                    variant="subtle"
                    size="xs"
                    class="truncate flex-none"
                    >{{ getEpicForIssue(element)?.title }}</UBadge
                  >
                </div>
              </div>
              <div class="flex gap-4 items-center flex-none pr-2">
                <div
                  v-if="element.points !== undefined"
                  class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 w-6 text-center"
                >
                  {{ element.points }}
                </div>
                <div v-else class="w-6"></div>
                <UBadge
                  :color="
                    element.status === 'done'
                      ? 'green'
                      : element.status === 'in_progress'
                        ? 'blue'
                        : 'gray'
                  "
                  variant="soft"
                  size="xs"
                  class="w-24 justify-center uppercase"
                  >{{ element.status.replace("_", " ") }}</UBadge
                >
                <div class="w-16 flex justify-end">
                  <UAvatarGroup
                    v-if="element.assignees?.length"
                    size="xs"
                    :max="3"
                  >
                    <UAvatar
                      v-for="member in element.assignees"
                      :key="member"
                      :alt="member.slice(0, 4)"
                    />
                  </UAvatarGroup>
                  <UAvatar
                    v-else
                    size="xs"
                    icon="i-heroicons-user"
                    class="opacity-30"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="pt-1">
              <form
                v-if="quickAddSprintId === sprint.id"
                @submit.prevent="submitQuickAdd"
                class="m-2 flex items-center gap-2 bg-white dark:bg-gray-900 border border-blue-300 dark:border-blue-700 rounded shadow-sm focus-within:ring-1 focus-within:ring-blue-500 overflow-visible"
              >
                <USelectMenu
                  v-model="quickAddType"
                  :items="typeOptions"
                  value-key="value"
                  label-key="label"
                  class="flex-none"
                >
                  <div
                    class="flex items-center justify-center w-7 h-7 ml-1 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Change Issue Type"
                  >
                    <ProjectManagerIssueTypeIcon :type="quickAddType" />
                  </div>
                </USelectMenu>
                <input
                  v-model="quickAddTitle"
                  type="text"
                  placeholder="What needs to be done?"
                  class="flex-1 bg-transparent py-1.5 pr-2 text-sm focus:outline-none border-none ring-0 w-full"
                  autofocus
                  @blur="
                    () => {
                      if (!quickAddTitle) quickAddSprintId = null;
                    }
                  "
                />
              </form>
              <button
                v-else
                @click="quickAddSprintId = sprint.id"
                class="w-full text-left py-2 px-3 rounded-b text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-2"
              >
                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                <span>Create issue</span>
              </button>
            </div>
          </template>
        </VueDraggable>
      </div>

      <!-- Backlog -->
      <div class="mb-6">
        <div
          class="bg-gray-100/50 dark:bg-gray-800/30 flex justify-between items-center px-4 py-2"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
              BACKLOG
            </h3>
            <span class="text-xs text-gray-400"
              >({{ backlogIssues.length }} issues)</span
            >
          </div>
          <div class="flex items-center gap-3">
            <UButton
              size="xs"
              color="gray"
              variant="solid"
              label="Create sprint"
              @click="isCreateModalOpen = true"
            />
          </div>
        </div>

        <VueDraggable
          :list="backlogIssues"
          group="issues"
          item-key="id"
          tag="div"
          class="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 min-h-[40px]"
          @change="(e: any) => onIssueDragChange(e, undefined)"
        >
          <template #item="{ element }">
            <div
              class="flex items-center justify-between p-2 pl-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group flex-1"
              @click="
                router.push({
                  query: { ...route.query, issueId: element.id },
                })
              "
            >
              <div class="flex items-center gap-3 min-w-0 pr-4 w-1/2">
                <UIcon
                  name="i-heroicons-bars-2"
                  class="text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-none transition-opacity"
                />
                <span
                  class="font-mono text-xs text-gray-500 uppercase w-16 truncate flex-none"
                  >{{
                    element.id.split("-").slice(0, 2).join("-") ||
                    element.id.substring(0, 8)
                  }}</span
                >
                <ProjectManagerIssueTypeIcon :type="element.type" />
                <div class="flex items-center gap-2 truncate">
                  <span
                    class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate hover:text-primary-500 transition-colors"
                    >{{ element.title }}</span
                  >
                  <UBadge
                    v-if="getEpicForIssue(element)"
                    color="indigo"
                    variant="subtle"
                    size="xs"
                    class="truncate flex-none"
                    >{{ getEpicForIssue(element)?.title }}</UBadge
                  >
                </div>
              </div>
              <div class="flex gap-4 items-center flex-none pr-2">
                <div
                  v-if="element.points !== undefined"
                  class="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300 w-6 text-center"
                >
                  {{ element.points }}
                </div>
                <div v-else class="w-6"></div>
                <UBadge
                  :color="
                    element.status === 'done'
                      ? 'green'
                      : element.status === 'in_progress'
                        ? 'blue'
                        : 'gray'
                  "
                  variant="soft"
                  size="xs"
                  class="w-24 justify-center uppercase"
                  >{{ element.status.replace("_", " ") }}</UBadge
                >
                <div class="w-16 flex justify-end">
                  <UAvatarGroup
                    v-if="element.assignees?.length"
                    size="xs"
                    :max="3"
                  >
                    <UAvatar
                      v-for="member in element.assignees"
                      :key="member"
                      :alt="member.slice(0, 4)"
                    />
                  </UAvatarGroup>
                  <UAvatar
                    v-else
                    size="xs"
                    icon="i-heroicons-user"
                    class="opacity-30"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <div class="pt-2">
              <form
                v-if="quickAddSprintId === 'backlog'"
                @submit.prevent="submitQuickAdd"
                class="mb-2 mx-1 flex items-center gap-2 bg-white dark:bg-gray-950 border border-primary-300 dark:border-primary-700 rounded shadow-sm focus-within:ring-1 focus-within:ring-primary overflow-visible"
              >
                <USelectMenu
                  v-model="quickAddType"
                  :items="typeOptions"
                  value-key="value"
                  label-key="label"
                  class="flex-none"
                >
                  <div
                    class="flex items-center justify-center w-7 h-7 ml-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Change Issue Type"
                  >
                    <ProjectManagerIssueTypeIcon :type="quickAddType" />
                  </div>
                </USelectMenu>
                <input
                  v-model="quickAddTitle"
                  type="text"
                  placeholder="What needs to be done?"
                  class="flex-1 bg-transparent py-2 pr-3 text-sm focus:outline-none border-none ring-0 w-full"
                  autofocus
                  @blur="
                    () => {
                      if (!quickAddTitle) quickAddSprintId = null;
                    }
                  "
                />
              </form>
              <button
                v-else
                @click="quickAddSprintId = 'backlog'"
                class="w-full text-left py-2 px-3 rounded text-sm text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
              >
                <UIcon name="i-heroicons-plus" class="w-4 h-4" />
                <span>Create issue</span>
              </button>
            </div>
          </template>
        </VueDraggable>
      </div>
    </div>

    <!-- Create Sprint Modal -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Create sprint
            </h3>
          </template>

          <form @submit.prevent="submitNewSprint" class="space-y-4">
            <UFormField label="Sprint Name" required>
              <UInput
                v-model="newSprintName"
                placeholder="e.g. Sprint 1"
                autofocus
                class="w-full"
              />
            </UFormField>

            <UFormField label="Duration (Weeks)">
              <USelect
                v-model="newSprintDurationWeeks"
                :items="[
                  { label: '1 Week', value: 1 },
                  { label: '2 Weeks', value: 2 },
                  { label: '3 Weeks', value: 3 },
                  { label: '4 Weeks', value: 4 },
                  { label: 'Custom', value: 'custom' },
                ]"
                class="w-full"
              />
            </UFormField>

            <div
              v-if="newSprintDurationWeeks === 'custom'"
              class="grid grid-cols-2 gap-4"
            >
              <UFormField label="Start Date" required>
                <UInput
                  v-model="newSprintStartDate"
                  type="date"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="End Date" required>
                <UInput v-model="newSprintEndDate" type="date" class="w-full" />
              </UFormField>
            </div>

            <UFormField label="Sprint Goal">
              <UTextarea
                v-model="newSprintGoal"
                placeholder="What exactly is the team aiming to accomplish in this sprint?"
                :rows="3"
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
                label="Create"
                color="primary"
                :loading="isSaving"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Start Sprint Modal -->
    <UModal v-model:open="isStartModalOpen">
      <template #content>
        <UCard v-if="sprintToStart">
          <template #header>
            <h3
              class="text-base font-semibold leading-6 text-gray-900 dark:text-white"
            >
              Start Sprint: {{ sprintToStart.name }}
            </h3>
          </template>

          <form @submit.prevent="confirmStartSprint" class="space-y-4">
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {{ getIssuesForSprint(sprintToStart.id).length }} issues will be
              included in this sprint.
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Start Date" required>
                <UInput v-model="startSprintDate" type="date" class="w-full" />
              </UFormField>

              <UFormField label="End Date" required>
                <UInput v-model="endSprintDate" type="date" class="w-full" />
              </UFormField>
            </div>

            <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-md mt-4">
              <span class="text-xs font-medium text-gray-500 block mb-1"
                >Sprint Goal</span
              >
              <span class="text-sm text-gray-900 dark:text-gray-100">{{
                sprintToStart.goal || "No goal defined."
              }}</span>
            </div>

            <div class="flex justify-end gap-3 pt-4">
              <UButton
                label="Cancel"
                color="gray"
                variant="ghost"
                @click="isStartModalOpen = false"
              />
              <UButton
                type="submit"
                label="Start"
                color="blue"
                :loading="isSaving"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

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
