<script setup lang="ts">
import { useIssues } from "~/composables/useIssues";
import { useTimeAgo } from "@vueuse/core";

const route = useRoute();
const router = useRouter();
const projectId = route.params.id as string;

const { issues, fetchIssuesForProject } = useIssues();

onMounted(() => {
  fetchIssuesForProject(projectId);
});

// Using a native table so we define headers mostly in the template now,
// but we keep the column list for easy referencing if needed later.
const columns = [
  { key: "id", label: "ID" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "type", label: "Type" },
  { key: "priority", label: "Priority" },
  { key: "assignees", label: "Assignees" },
  { key: "updatedAt", label: "Last Updated" },
];

const statusColors: Record<string, any> = {
  todo: "gray",
  in_progress: "blue",
  in_review: "yellow",
  done: "green",
};

const typeIcons: Record<string, string> = {
  task: "i-heroicons-check-circle",
  bug: "i-heroicons-bug-ant",
  story: "i-heroicons-book-open",
  epic: "i-heroicons-bolt",
};

const typeColors: Record<string, string> = {
  task: "text-blue-500",
  bug: "text-red-500",
  story: "text-green-500",
  epic: "text-purple-500",
};
</script>

<template>
  <div class="h-full bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
    <!-- Toolbar -->
    <div
      class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <UInput
          icon="i-heroicons-magnifying-glass"
          placeholder="Filter issues..."
          size="sm"
          class="w-64"
        />
        <USelectMenu
          placeholder="Status"
          :items="['To Do', 'In Progress', 'In Review', 'Done']"
          size="sm"
          multiple
          class="w-40"
        />
      </div>
    </div>

    <!-- Data Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full text-left border-collapse text-sm whitespace-nowrap">
        <thead
          class="sticky top-0 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur z-10"
        >
          <tr
            class="text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700"
          >
            <th class="px-3 py-2 font-medium w-24">ID</th>
            <th class="px-3 py-2 font-medium w-full">Title</th>
            <th class="px-3 py-2 font-medium w-32">Status</th>
            <th class="px-3 py-2 font-medium w-32">Type</th>
            <th class="px-3 py-2 font-medium w-32">Priority</th>
            <th class="px-3 py-2 font-medium w-32">Assignees</th>
            <th class="px-3 py-2 font-medium w-40">Last Updated</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr
            v-for="row in issues"
            :key="row.id"
            class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
            @click="router.push({ query: { ...route.query, issueId: row.id } })"
          >
            <!-- ID -->
            <td class="px-3 py-1.5 font-mono text-xs text-gray-500 uppercase">
              {{
                row.id.split("-").slice(0, 2).join("-") ||
                row.id.substring(0, 8)
              }}
            </td>

            <!-- Title -->
            <td class="px-3 py-1.5">
              <span
                class="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors"
              >
                {{ row.title }}
              </span>
            </td>

            <!-- Status -->
            <td class="px-3 py-1.5">
              <UBadge
                :color="statusColors[row.status] || 'gray'"
                variant="subtle"
                size="xs"
                class="rounded-md"
              >
                {{ row.status.replace("_", " ").toUpperCase() }}
              </UBadge>
            </td>

            <!-- Type -->
            <td class="px-3 py-1.5">
              <div class="flex items-center gap-1.5">
                <ProjectManagerIssueTypeIcon :type="row.type" />
                <span class="capitalize text-gray-600 dark:text-gray-300">{{
                  row.type
                }}</span>
              </div>
            </td>

            <!-- Priority -->
            <td class="px-3 py-1.5">
              <div
                class="flex items-center gap-1.5 capitalize text-gray-600 dark:text-gray-300"
              >
                <UIcon
                  name="i-heroicons-chevron-double-up"
                  class="w-4 h-4 text-red-500"
                  v-if="row.priority === 'urgent'"
                />
                <UIcon
                  name="i-heroicons-chevron-up"
                  class="w-4 h-4 text-orange-500"
                  v-else-if="row.priority === 'high'"
                />
                <UIcon
                  name="i-heroicons-minus"
                  class="w-4 h-4 text-gray-400"
                  v-else-if="row.priority === 'medium'"
                />
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="w-4 h-4 text-blue-400"
                  v-else
                />
                {{ row.priority }}
              </div>
            </td>

            <!-- Assignees -->
            <td class="px-3 py-1.5">
              <UAvatarGroup v-if="row.assignees?.length" size="2xs" :max="3">
                <UAvatar
                  v-for="member in row.assignees"
                  :key="member"
                  :alt="member.slice(0, 4)"
                />
              </UAvatarGroup>
              <span v-else class="text-gray-400 text-xs italic"
                >Unassigned</span
              >
            </td>

            <!-- Last Updated -->
            <td class="px-3 py-1.5 text-gray-500 text-xs">
              {{ useTimeAgo(row.updatedAt * 1000).value }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State inside the scrolling container so it takes space if no issues -->
      <div
        v-if="issues.length === 0"
        class="flex flex-col items-center justify-center p-12 text-center text-gray-500 mt-10"
      >
        <UIcon
          name="i-heroicons-document-magnifying-glass"
          class="w-12 h-12 mb-4 text-gray-300 dark:text-gray-700"
        />
        <p>No issues found for this project.</p>
      </div>
    </div>

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
