<script setup lang="ts">
import { usePages } from "~/composables/usePages";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const projectId = route.params.id as string;

const { pages, isLoadingPages, fetchPagesForProject } = usePages();

onMounted(() => {
  fetchPagesForProject(projectId);
});

const createNewPage = () => {
  const newId = crypto.randomUUID().split("-")[0];
  navigateTo(`/projects/${projectId}/pages/${newId}`);
};

// Based on Atlassian Confluence/Jira Pages sidebar templates
const templateCategories = [
  {
    icon: "i-heroicons-document-text",
    title: "Blank page",
    description: "Start a page from scratch.",
    color: "bg-blue-600",
  },
  {
    icon: "i-heroicons-clipboard-document-list",
    title: "Product requirements",
    description:
      "Define, track and scope requirements for your product or feature.",
    color: "bg-fuchsia-500",
  },
  {
    icon: "i-heroicons-arrow-split-up-right",
    title: "Decision",
    description:
      "Record important project decisions and communicate them with your team.",
    color: "bg-emerald-500",
  },
  {
    icon: "i-heroicons-users",
    title: "Meeting notes",
    description:
      "Set meeting agendas, take notes, and share action items with your team.",
    color: "bg-cyan-500",
  },
];
</script>

<template>
  <div class="h-full w-full flex overflow-hidden bg-white dark:bg-gray-950">
    <!-- Main Content -->
    <div
      class="flex-1 overflow-y-auto p-6 lg:p-10 hide-scrollbar flex flex-col items-center"
    >
      <div class="w-full max-w-4xl space-y-8">
        <!-- Header -->
        <div class="space-y-2">
          <div
            class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium"
          >
            <span>Spaces</span>
            <span>/</span>
            <span class="uppercase tracking-wider">{{ projectId }}</span>
          </div>
          <div class="flex items-center justify-between">
            <h1
              class="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3"
            >
              Pages
              <UBadge color="blue" variant="soft" size="xs">BETA</UBadge>
            </h1>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm pt-2">
            Capture your team's knowledge and improve the way you get work done.
            P2P markdown pages backed by Nostr relays.
          </p>
        </div>

        <!-- Project Pages Directory -->
        <div class="pt-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Pages
            </h2>
            <div class="flex gap-2">
              <UInput
                icon="i-heroicons-magnifying-glass"
                placeholder="Search pages..."
                size="sm"
                class="w-64"
              />
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                label="New Page"
                @click="createNewPage"
              />
            </div>
          </div>

          <div v-if="isLoadingPages" class="py-12 flex justify-center">
            <UIcon
              name="i-heroicons-arrow-path"
              class="w-8 h-8 animate-spin text-gray-400"
            />
          </div>

          <div
            v-else-if="pages.length === 0"
            class="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center bg-gray-50/50 dark:bg-gray-900/30"
          >
            <div
              class="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4"
            >
              <UIcon name="i-heroicons-document-text" class="w-8 h-8" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-white">
              Start from scratch with a blank page
            </h3>
            <p
              class="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto"
            >
              Pages are the place to capture all your important information.
              Start with a blank page and add rich content such as tasks,
              images, macros, Jira Software issues, and roadmaps.
            </p>
            <div class="mt-6">
              <UButton
                color="primary"
                label="Publish your first page"
                @click="createNewPage"
              />
            </div>
          </div>

          <div
            v-else
            class="bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800"
          >
            <NuxtLink
              v-for="page in pages"
              :key="page.id"
              :to="`/projects/${projectId}/pages/${page.id}`"
              class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
            >
              <div class="flex items-center gap-4">
                <div
                  class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0"
                >
                  <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
                </div>
                <div>
                  <h3
                    class="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  >
                    {{ page.title || "Untitled Document" }}
                  </h3>
                  <div
                    class="text-xs text-gray-500 flex items-center gap-2 mt-0.5"
                  >
                    <span>{{
                      new Date(page.createdAt * 1000).toLocaleDateString()
                    }}</span>
                    <span>•</span>
                    <span class="flex items-center gap-1 font-mono">
                      <UAvatar
                        size="3xs"
                        :src="`https://robohash.org/${page.authorPubkey}?set=set3&bgset=bg2`"
                      />
                      {{ page.authorPubkey.slice(0, 8) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                <UButton
                  icon="i-heroicons-chevron-right"
                  color="gray"
                  variant="ghost"
                />
              </div>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Sidebar: Templates Drawer (Optional Jira/Confluence Parity) -->
    <div
      class="w-80 border-l border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 hidden xl:flex flex-col flex-shrink-0"
    >
      <div class="p-6 border-b border-gray-200 dark:border-gray-800">
        <h3
          class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider"
        >
          Preview templates
        </h3>
        <p
          class="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1"
        >
          Popular with teams like yours
        </p>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div
          v-for="(template, idx) in templateCategories"
          :key="idx"
          @click="createNewPage"
          class="flex gap-4 p-3 rounded-xl hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm"
          :class="
            idx === 0
              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
              : ''
          "
        >
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-inner"
            :class="template.color"
          >
            <UIcon :name="template.icon" class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ template.title }}
            </h4>
            <p class="text-xs text-gray-500 mt-1 leading-relaxed">
              {{ template.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
