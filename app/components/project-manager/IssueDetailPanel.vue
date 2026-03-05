<script setup lang="ts">
import type {
  PmIssue,
  PmIssueStatus,
  PmIssueType,
  PmIssuePriority,
} from "~/types/project-manager";
import { useIssues } from "~/composables/useIssues";
import { useComments } from "~/composables/useComments";
import { parseMarkdown } from "~/utils/markdown";

const props = defineProps<{
  issueId: string;
  projectId: string;
}>();

const emit = defineEmits(["close"]);
const toast = useToast();

const { issues, saveIssue } = useIssues();
const {
  getComments,
  fetchCommentsForIssue,
  postComment,
  isLoading: isLoadingComments,
} = useComments();

const issue = computed(() => issues.value.find((i) => i.id === props.issueId));
const issueComments = computed(() => getComments(props.issueId));

const isSaving = ref(false);
const newCommentBody = ref("");

// Local state for two-way binding before hitting save
const formData = ref({
  title: "",
  description: "",
  status: "todo" as PmIssueStatus,
  type: "task" as PmIssueType,
  priority: "medium" as PmIssuePriority,
  points: undefined as number | undefined,
  parentIssueId: undefined as string | undefined, // Epic Link
});

// Sync local state ONLY when the issue id changes or first loads
watch(
  () => props.issueId,
  () => {
    if (issue.value) {
      formData.value.title = issue.value.title;
      formData.value.description = issue.value.description;
      formData.value.status = issue.value.status;
      formData.value.type = issue.value.type;
      formData.value.priority = issue.value.priority || "medium";
      formData.value.points = issue.value.points;
      formData.value.parentIssueId = issue.value.parentIssueId;

      // Fetch comments once we mount the issue details
      fetchCommentsForIssue(issue.value.id);
    }
  },
  { immediate: true },
);

const submitComment = async () => {
  if (!newCommentBody.value.trim() || !issue.value) return;
  await postComment(issue.value.id, newCommentBody.value);
  newCommentBody.value = "";
};

// Automatically save changes when the status/type/priority selects change
const autoSave = async () => {
  if (!issue.value) return;
  isSaving.value = true;
  try {
    await saveIssue({
      ...issue.value,
      ...formData.value,
    });
  } catch (e) {
    console.error(e);
  } finally {
    isSaving.value = false;
  }
};

const statusOptions = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "In Review", value: "in_review" },
  { label: "Done", value: "done" },
];

const typeOptions = [
  { label: "Task", value: "task" },
  { label: "Bug", value: "bug" },
  { label: "Story", value: "story" },
  { label: "Epic", value: "epic" },
];

const priorityOptions = [
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const availableEpics = computed(() => {
  return issues.value
    .filter((i) => i.type === "epic" && i.id !== props.issueId)
    .map((e) => ({ label: e.title, value: e.id }));
});
</script>

<template>
  <USlideover
    :open="!!issueId"
    @update:open="!$event && emit('close')"
    prevent-close
    class="w-screen max-w-2xl"
  >
    <template #content>
      <div
        class="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800"
        v-if="issue"
      >
        <!-- Header -->
        <div
          class="px-5 py-3 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-10 border-b border-gray-100 dark:border-gray-800"
        >
          <div
            class="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            <span
              class="flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
            >
              <span class="uppercase tracking-wider">{{
                props.projectId
              }}</span>
            </span>
            <span>/</span>
            <span
              class="flex items-center gap-1.5 text-gray-900 dark:text-white"
            >
              <ProjectManagerIssueTypeIcon
                :type="formData.type"
                class="w-4 h-4"
              />
              <span class="font-mono uppercase">{{
                issue.id.split("-").slice(0, 2).join("-") ||
                issue.id.substring(0, 8)
              }}</span>
            </span>
          </div>

          <div class="flex items-center gap-1 text-gray-400">
            <UButton
              icon="i-heroicons-paper-clip"
              color="gray"
              variant="ghost"
              size="sm"
            />
            <UButton
              icon="i-heroicons-ellipsis-horizontal"
              color="gray"
              variant="ghost"
              size="sm"
            />
            <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              size="sm"
              @click="emit('close')"
            />
          </div>
        </div>

        <!-- Body Layout -->
        <div class="flex-1 overflow-y-auto flex flex-col md:flex-row">
          <!-- Main Content (Left) -->
          <div class="flex-1 p-6 md:p-8 space-y-8 min-w-0">
            <div class="space-y-4">
              <!-- Title Input -->
              <UTextarea
                v-model="formData.title"
                @blur="autoSave"
                autoresize
                :rows="1"
                class="w-full text-2xl font-semibold bg-transparent border-none focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-400 placeholder:font-normal -ml-2 px-2 focus:bg-white dark:focus:bg-gray-900 rounded transition-colors"
                :ui="{
                  base: 'text-2xl font-semibold !border-none !ring-0 !shadow-none resize-none',
                }"
                placeholder="Issue title"
              />
            </div>

            <div class="space-y-3">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                Description
              </h3>
              <UTextarea
                v-model="formData.description"
                @blur="autoSave"
                autoresize
                placeholder="Add a more detailed description..."
                :rows="4"
                class="w-full text-sm transition-shadow"
                :ui="{ base: 'resize-y' }"
              />
            </div>

            <!-- Activity Section -->
            <div class="space-y-4 pt-6 mt-6">
              <div
                class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2"
              >
                <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                  Activity
                </h3>
                <UButton
                  v-if="isLoadingComments"
                  loading
                  variant="ghost"
                  color="gray"
                  size="xs"
                  label="Syncing..."
                />
              </div>

              <div class="space-y-6">
                <!-- Comment Thread -->
                <div class="space-y-5">
                  <div
                    v-for="comment in issueComments"
                    :key="comment.id"
                    class="flex gap-4 group"
                  >
                    <UAvatar
                      :src="`https://robohash.org/${comment.authorPubkey}?set=set3&bgset=bg2`"
                      size="sm"
                      :alt="comment.authorPubkey.slice(0, 4)"
                      class="mt-1 flex-shrink-0"
                    />
                    <div class="flex-1 space-y-1.5 min-w-0">
                      <div class="flex items-center gap-2">
                        <span
                          class="text-sm font-medium text-gray-900 dark:text-white font-mono truncate"
                        >
                          {{ comment.authorPubkey.slice(0, 8) }}
                        </span>
                        <span class="text-xs text-gray-500 shrink-0">
                          {{
                            new Date(comment.createdAt * 1000).toLocaleString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              },
                            )
                          }}
                        </span>
                      </div>
                      <div
                        class="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none break-words"
                        v-html="parseMarkdown(comment.content)"
                      />
                    </div>
                  </div>
                </div>

                <!-- Comment Input -->
                <div class="flex gap-4 pt-4">
                  <UAvatar
                    size="sm"
                    icon="i-heroicons-user"
                    class="flex-shrink-0"
                  />
                  <div
                    class="flex-1 flex flex-col gap-2 border border-gray-200 dark:border-gray-700 rounded-lg focus-within:ring-1 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all overflow-hidden bg-white dark:bg-gray-900"
                  >
                    <UTextarea
                      v-model="newCommentBody"
                      placeholder="Add a comment..."
                      autoresize
                      :rows="1"
                      class="w-full text-sm"
                      :ui="{
                        base: '!border-none !ring-0 !shadow-none bg-transparent resize-none rounded-none',
                      }"
                    />
                    <div class="flex justify-between items-center px-2 pb-2">
                      <div class="text-xs text-gray-400 pl-2">
                        <span class="hidden sm:inline">Markdown supported</span>
                      </div>
                      <UButton
                        @click="submitComment"
                        :disabled="!newCommentBody.trim()"
                        label="Save"
                        color="blue"
                        size="sm"
                        class="font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Sidebar (Right) -->
          <div
            class="w-full md:w-72 bg-gray-50/50 dark:bg-gray-900/30 p-6 md:border-l border-gray-100 dark:border-gray-800 space-y-6"
          >
            <div class="space-y-5">
              <!-- Status -->
              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Status</label
                >
                <USelectMenu
                  v-model="formData.status"
                  :items="statusOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                  @change="autoSave"
                >
                </USelectMenu>
              </div>

              <!-- Type -->
              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Type</label
                >
                <USelectMenu
                  v-model="formData.type"
                  :items="typeOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                  @change="autoSave"
                >
                  <UButton
                    color="white"
                    trailing-icon="i-heroicons-chevron-down-20-solid"
                  >
                    <div class="flex items-center gap-2">
                      <ProjectManagerIssueTypeIcon
                        :type="formData.type"
                        class="w-4 h-4"
                      />
                      <span
                        class="capitalize text-gray-700 dark:text-gray-300 text-sm"
                      >
                        {{ formData.type }}
                      </span>
                    </div>
                  </UButton>
                </USelectMenu>
              </div>

              <!-- Priority -->
              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Priority</label
                >
                <USelectMenu
                  v-model="formData.priority"
                  :items="priorityOptions"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                  @change="autoSave"
                >
                  <UButton
                    color="white"
                    trailing-icon="i-heroicons-chevron-down-20-solid"
                  >
                    <div
                      class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <UIcon
                        name="i-heroicons-chevron-double-up"
                        class="w-4 h-4 text-red-500"
                        v-if="formData.priority === 'urgent'"
                      />
                      <UIcon
                        name="i-heroicons-chevron-up"
                        class="w-4 h-4 text-orange-500"
                        v-else-if="formData.priority === 'high'"
                      />
                      <UIcon
                        name="i-heroicons-minus"
                        class="w-4 h-4 text-gray-400"
                        v-else-if="formData.priority === 'medium'"
                      />
                      <UIcon
                        name="i-heroicons-chevron-down"
                        class="w-4 h-4 text-blue-400"
                        v-else
                      />
                      <span class="capitalize">{{ formData.priority }}</span>
                    </div>
                  </UButton>
                </USelectMenu>
              </div>

              <!-- Assignee -->
              <div>
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Assignee</label
                >
                <div
                  class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors w-fit"
                >
                  <UAvatar size="2xs" icon="i-heroicons-user-circle" />
                  <span>Unassigned</span>
                </div>
              </div>

              <UDivider class="my-4" />

              <!-- Story Points -->
              <div v-if="formData.type !== 'epic'">
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Story Points</label
                >
                <UInput
                  v-model.number="formData.points"
                  type="number"
                  placeholder="None"
                  @blur="autoSave"
                  class="w-full"
                  :ui="{ base: 'bg-white dark:bg-gray-900 text-sm' }"
                />
              </div>

              <!-- Epic Link -->
              <div v-if="formData.type !== 'epic'">
                <label
                  class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                  >Epic Link</label
                >
                <USelectMenu
                  v-model="formData.parentIssueId"
                  :items="availableEpics"
                  value-key="value"
                  label-key="label"
                  placeholder="Select an Epic"
                  searchable
                  searchable-placeholder="Search epics..."
                  @change="autoSave"
                  class="w-full"
                >
                  <UButton
                    color="white"
                    trailing-icon="i-heroicons-chevron-down-20-solid"
                  >
                    <template v-if="formData.parentIssueId">
                      <div class="flex items-center gap-2 truncate">
                        <ProjectManagerIssueTypeIcon
                          type="epic"
                          class="w-4 h-4 text-purple-500 flex-shrink-0"
                        />
                        <span class="truncate">{{
                          availableEpics.find(
                            (e) => e.value === formData.parentIssueId,
                          )?.label || "Unknown Epic"
                        }}</span>
                      </div>
                    </template>
                    <template v-else>
                      <span class="text-gray-400 dark:text-gray-500 font-normal"
                        >Select an Epic</span
                      >
                    </template>
                  </UButton>
                </USelectMenu>
              </div>

              <!-- Reporter & Dates -->
              <div class="pt-4 space-y-3">
                <div>
                  <label
                    class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
                    >Reporter</label
                  >
                  <div
                    class="flex items-center gap-2 p-1.5 -ml-1.5 rounded-md w-fit"
                  >
                    <UAvatar
                      size="2xs"
                      :src="`https://robohash.org/${issue.reporter}?set=set3&bgset=bg2`"
                    />
                    <span
                      class="text-xs text-gray-900 dark:text-white font-mono truncate"
                      >{{ issue.reporter.slice(0, 8) }}</span
                    >
                  </div>
                </div>

                <div class="pt-2 text-xs text-gray-500 space-y-1">
                  <div class="flex justify-between">
                    <span>Created</span>
                    <span>{{
                      new Date(issue.createdAt * 1000).toLocaleDateString()
                    }}</span>
                  </div>
                  <div
                    class="flex justify-between"
                    v-if="
                      issue.updatedAt && issue.updatedAt !== issue.createdAt
                    "
                  >
                    <span>Updated</span>
                    <span>{{
                      new Date(issue.updatedAt * 1000).toLocaleDateString()
                    }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
