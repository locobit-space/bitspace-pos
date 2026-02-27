<script setup lang="ts">
import { usePages } from "~/composables/usePages";
import { parseMarkdown } from "~/utils/markdown";

definePageMeta({
  layout: "default",
});

const route = useRoute();
const projectId = route.params.id as string;
const pageId = route.params.pageId as string;

const { pages, fetchPagesForProject, savePage, isLoadingPages } = usePages();
const toast = useToast();

const mode = ref<"edit" | "preview">("edit");
const isSaving = ref(false);
const hasUnsaved = ref(false);

const formData = ref({
  title: "",
  content: "",
  summary: "",
});

onMounted(async () => {
  fetchPagesForProject(projectId);
  // Wait a tick for pages to potentially populate from cache
  await nextTick();
  loadPageFromState();
});

// Load from composable state once pages are fetched
watch(
  () => pages.value,
  () => loadPageFromState(),
  { once: true },
);

const loadPageFromState = () => {
  const match = pages.value.find((p) => p.id === pageId);
  if (match) {
    formData.value.title = match.title;
    formData.value.content = match.content;
    formData.value.summary = match.summary || "";
    hasUnsaved.value = false;
  }
};

const markDirty = () => {
  hasUnsaved.value = true;
};

const save = async () => {
  if (!formData.value.title.trim() && !formData.value.content.trim()) return;
  isSaving.value = true;
  try {
    await savePage({
      id: pageId,
      projectId,
      title: formData.value.title || "Untitled",
      content: formData.value.content,
      summary: formData.value.summary || formData.value.content.slice(0, 120),
    });
    hasUnsaved.value = false;
    toast.add({
      title: "Page saved",
      color: "gray",
      icon: "i-heroicons-check",
    });
  } catch (e) {
    console.error(e);
    toast.add({ title: "Failed to save", color: "red" });
  } finally {
    isSaving.value = false;
  }
};

const renderedContent = computed(() => parseMarkdown(formData.value.content));

// Word count
const wordCount = computed(() => {
  return (
    formData.value.content
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length || 0
  );
});
</script>

<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
    <!-- Editor Toolbar -->
    <div
      class="flex-none flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur sticky top-0 z-10"
    >
      <!-- Left: Back + Breadcrumb -->
      <div
        class="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400"
      >
        <UButton
          :to="`/projects/${projectId}/pages`"
          icon="i-heroicons-chevron-left"
          variant="ghost"
          color="gray"
          size="xs"
          label="Pages"
        />
        <span class="text-gray-300 dark:text-gray-700">/</span>
        <span class="text-gray-900 dark:text-white truncate max-w-xs">{{
          formData.title || "Untitled"
        }}</span>
        <span
          v-if="hasUnsaved"
          class="ml-2 text-xs text-orange-500 font-normal"
        >
          Unsaved
        </span>
      </div>

      <!-- Right: Mode Toggle + Save -->
      <div class="flex items-center gap-2">
        <div
          class="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 text-xs font-medium"
        >
          <button
            @click="mode = 'edit'"
            class="px-3 py-1 rounded-md transition-all"
            :class="
              mode === 'edit'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            "
          >
            <UIcon name="i-heroicons-pencil" class="w-3.5 h-3.5 mr-1 inline" />
            Edit
          </button>
          <button
            @click="mode = 'preview'"
            class="px-3 py-1 rounded-md transition-all"
            :class="
              mode === 'preview'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            "
          >
            <UIcon name="i-heroicons-eye" class="w-3.5 h-3.5 mr-1 inline" />
            Preview
          </button>
        </div>

        <UButton
          @click="save"
          :loading="isSaving"
          :disabled="!hasUnsaved"
          label="Publish"
          color="primary"
          size="sm"
          icon="i-heroicons-cloud-arrow-up"
        />
      </div>
    </div>

    <!-- Editor Body -->
    <div class="flex-1 overflow-y-auto">
      <!-- EDIT MODE -->
      <div
        v-if="mode === 'edit'"
        class="h-full flex flex-col max-w-4xl mx-auto px-6 md:px-16 py-10 gap-4"
      >
        <!-- Title -->
        <textarea
          v-model="formData.title"
          @input="markDirty"
          class="w-full text-4xl font-bold bg-transparent border-none focus:outline-none resize-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700 leading-snug"
          placeholder="Untitled"
          rows="1"
          style="field-sizing: content"
        />

        <!-- Summary / Subtitle -->
        <textarea
          v-model="formData.summary"
          @input="markDirty"
          class="w-full text-lg bg-transparent border-none focus:outline-none resize-none text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed"
          placeholder="Add a short summary..."
          rows="1"
          style="field-sizing: content"
        />

        <div class="h-px w-full bg-gray-100 dark:bg-gray-800" />

        <!-- Content -->
        <textarea
          v-model="formData.content"
          @input="markDirty"
          class="flex-1 w-full text-base bg-transparent border-none focus:outline-none resize-none text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-700 leading-relaxed font-mono min-h-[400px]"
          placeholder="Start writing... (Markdown supported)"
        />
      </div>

      <!-- PREVIEW MODE -->
      <div v-else class="max-w-4xl mx-auto px-6 md:px-16 py-10">
        <div v-if="isLoadingPages" class="flex justify-center py-24">
          <UIcon
            name="i-heroicons-arrow-path"
            class="w-8 h-8 animate-spin text-gray-400"
          />
        </div>
        <div v-else class="space-y-4">
          <h1
            class="text-4xl font-bold text-gray-900 dark:text-white leading-snug"
          >
            {{ formData.title || "Untitled" }}
          </h1>
          <p
            v-if="formData.summary"
            class="text-lg text-gray-500 dark:text-gray-400"
          >
            {{ formData.summary }}
          </p>
          <div class="h-px w-full bg-gray-100 dark:bg-gray-800" />
          <div
            class="prose prose-base dark:prose-invert prose-headings:font-bold prose-a:text-primary max-w-none text-gray-800 dark:text-gray-200"
            v-html="renderedContent"
          />
          <div
            v-if="!formData.content"
            class="text-gray-400 dark:text-gray-600 text-sm italic"
          >
            Nothing written yet. Switch to Edit mode to start writing.
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Status Bar -->
    <div
      class="flex-none flex items-center justify-between px-6 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-900/50"
    >
      <div class="flex items-center gap-4">
        <span>{{ wordCount }} words</span>
        <span
          v-if="formData.content"
          class="text-gray-400 dark:text-gray-600 truncate max-w-xs"
        >
          {{ formData.content.length }} chars
        </span>
      </div>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-heroicons-lock-closed"
          class="w-3.5 h-3.5 text-gray-400"
        />
        <span>Published to Nostr</span>
      </div>
    </div>
  </div>
</template>
