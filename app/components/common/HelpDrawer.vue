<!-- components/common/HelpDrawer.vue -->
<script setup lang="ts">
const help = useHelp();
const feedback = useFeedback();
const { t } = useI18n();

const searchQuery = ref("");
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return [];
  return help.searchHelp(searchQuery.value);
});

const showSearch = computed(() => searchQuery.value.trim().length > 0);
</script>

<template>
  <USlideover v-model:open="help.isDrawerOpen.value" side="right">
    <template #content>
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <Icon
                name="i-heroicons-question-mark-circle"
                class="text-xl text-primary-500"
              />
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t("help.title") || "Help" }}
              </h2>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="help.closeHelp()"
            />
          </div>

          <!-- Search -->
          <UInput
            v-model="searchQuery"
            :placeholder="t('help.searchPlaceholder') || 'Search help...'"
            icon="i-heroicons-magnifying-glass"
            class="w-full"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <!-- Search Results -->
          <div v-if="showSearch" class="space-y-3">
            <p class="text-sm text-gray-500">
              {{ searchResults.length }}
              {{ t("help.resultsFound") || "results found" }}
            </p>
            <div
              v-for="result in searchResults"
              :key="result.id"
              class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div class="flex items-start gap-2">
                <Icon
                  v-if="result.icon"
                  :name="result.icon"
                  class="text-primary-500 mt-0.5"
                />
                <div>
                  <h4 class="font-medium text-gray-900 dark:text-white">
                    {{ result.title }}
                  </h4>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ result.content }}
                  </p>
                </div>
              </div>
            </div>
            <div v-if="searchResults.length === 0" class="text-center py-8">
              <Icon
                name="i-heroicons-magnifying-glass"
                class="text-4xl text-gray-400 mb-2"
              />
              <p class="text-gray-500">
                {{ t("help.noResults") || "No results found" }}
              </p>
            </div>
          </div>

          <!-- Page Help Content -->
          <div v-else-if="help.currentHelp.value" class="space-y-6">
            <div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {{ help.currentHelp.value.title }}
              </h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ help.currentHelp.value.description }}
              </p>
            </div>

            <!-- Sections -->
            <div class="space-y-4">
              <div
                v-for="section in help.currentHelp.value.sections"
                :key="section.id"
                class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div class="flex items-start gap-3">
                  <div
                    v-if="section.icon"
                    class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0"
                  >
                    <Icon :name="section.icon" class="text-primary-500" />
                  </div>
                  <div>
                    <h4 class="font-medium text-gray-900 dark:text-white mb-1">
                      {{ section.title }}
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                      {{ section.content }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No Help Available -->
          <div v-else class="text-center py-12">
            <Icon
              name="i-heroicons-document-text"
              class="text-5xl text-gray-400 mb-4"
            />
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">
              {{ t("help.noHelpAvailable") || "No help available" }}
            </h3>
            <p class="text-sm text-gray-500">
              {{
                t("help.noHelpDesc") ||
                "Help content for this page is coming soon."
              }}
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
        >
          <p class="text-xs text-gray-500 mb-3 text-center">
            {{ t("help.needMoreHelp") || "Need more help?" }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              color="gray"
              variant="soft"
              icon="i-heroicons-bug-ant"
              size="sm"
              block
              @click="
                feedback.openFeedback('bug');
                help.closeHelp();
              "
            >
              {{ t("help.reportBug") || "Report Bug" }}
            </UButton>
            <UButton
              color="primary"
              variant="soft"
              icon="i-heroicons-light-bulb"
              size="sm"
              block
              @click="
                feedback.openFeedback('feature');
                help.closeHelp();
              "
            >
              {{ t("help.requestFeature") || "Request Feature" }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>
