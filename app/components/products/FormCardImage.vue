<!-- components/products/FormCardImage.vue -->
<!-- Product Image Form Card -->
<script setup lang="ts">
const { t } = useI18n();

interface FormData {
  image: string;
}

interface Props {
  emojis?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  emojis: () => [
    '📦', '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍜', '🍝', '🍣',
    '🍱', '🍛', '🍲', '🥘', '🍳', '🥚', '🥞', '🧇', '🥐', '🍞',
    '🥖', '🧀', '🥩', '🍗', '🍖', '🌭', '🥪', '🥙', '🧆', '🍿',
    '🥜', '☕', '🍵', '🥤', '🧃', '🧋', '🍺', '🍷', '🥂', '🍹',
    '🍦', '🍧', '🍨', '🎂', '🍰', '🧁', '🍩', '🍪', '🍫', '🍬',
  ],
});

const form = defineModel<FormData>({ required: true });

const emojiOptions = computed(() => props.emojis);
const _emojiOptions = emojiOptions; // Used in template

const imageUrlInput = ref('');

watch(() => form.value.image, (newVal) => {
  if (newVal?.startsWith('http')) {
    imageUrlInput.value = newVal;
  }
}, { immediate: true });

function selectEmoji(emoji: string) {
  form.value.image = emoji;
  imageUrlInput.value = '';
}

const previewImage = computed(() => {
  if (form.value.image?.startsWith('http')) return form.value.image;
  return null;
});

const selectedEmoji = computed(() => {
  return form.value.image && !form.value.image.startsWith('http')
    ? form.value.image
    : '';
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
          <UIcon name="i-heroicons-photo" class="w-5 h-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">
            {{ t('products.image') || 'Product Image' }}
          </h3>
          <p class="text-xs text-gray-500">
            {{ t('products.imageHint') || 'Add image URL or select emoji' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-4">
      <!-- Image Preview -->
      <div class="flex justify-center">
        <div
          class="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800"
        >
          <img
            v-if="previewImage"
            :src="previewImage"
            alt="Product preview"
            class="w-full h-full object-cover"
          >
          <span
            v-else-if="selectedEmoji"
            class="text-6xl"
          >
            {{ selectedEmoji }}
          </span>
          <UIcon
            v-else
            name="i-heroicons-photo"
            class="w-12 h-12 text-gray-400"
          />
        </div>
      </div>

      <!-- Image URL -->
      <UFormField :label="t('products.imageUrl') || 'Image URL'" name="image">
        <UInput
          v-model="imageUrlInput"
          type="url"
          :placeholder="t('products.imageUrlPlaceholder') || 'https://example.com/image.jpg'"
          icon="i-heroicons-link"
          @update:model-value="(val: string) => { if (val) form.image = val }"
        />
      </UFormField>

      <!-- Emoji Selector -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('products.orSelectEmoji') || 'Or select an emoji' }}
        </label>
        <div class="h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
          <div class="grid grid-cols-10 gap-1">
            <button
              v-for="emoji in emojiOptions"
              :key="emoji"
              type="button"
              class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
              :class="{ 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500': selectedEmoji === emoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
