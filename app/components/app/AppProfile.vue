<template>
  <UPopover>
    <UButton
      icon="i-heroicons-user-circle"
      variant="ghost"
      size="lg"
      class="rounded-full"
    />

    <template #content>
      <div class="w-72 p-4">
        <!-- User Info -->
        <div class="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <UAvatar
            :alt="userName"
            size="lg"
          />
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 dark:text-white truncate">
              {{ userName }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
              {{ userIdentifier }}
            </p>
            <UBadge v-if="authMethod" :color="authMethodColor" variant="subtle" size="xs" class="mt-1">
              <UIcon :name="authMethodIcon" class="w-3 h-3 mr-1" />
              {{ authMethodLabel }}
            </UBadge>
          </div>
        </div>

        <!-- Quick Settings -->
        <div class="py-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
          <!-- Dark/Light Mode Toggle -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon 
                :name="isDark ? 'i-heroicons-moon' : 'i-heroicons-sun'" 
                class="w-5 h-5 text-gray-600 dark:text-gray-400" 
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {{ $t('account.dark_mode') }}
              </span>
            </div>
            <USwitch v-model="isDark" size="sm" />
          </div>

          <!-- Theme Color Selector -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <UIcon name="i-heroicons-swatch" class="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span class="text-sm text-gray-700 dark:text-gray-300">
                {{ $t('account.theme_color') }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in themeColors"
                :key="color.value"
                :title="color.label"
                :class="[
                  'w-6 h-6 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 transition-all',
                  color.class,
                  selectedColor === color.value 
                    ? 'ring-gray-900 dark:ring-white scale-110' 
                    : 'ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600'
                ]"
                @click="setThemeColor(color.value)"
              />
            </div>
          </div>
        </div>

        <!-- Navigation Links -->
        <div class="py-2">
          <NuxtLink
            to="/settings/account"
            class="flex items-center gap-3 px-2 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <UIcon name="i-heroicons-user-circle" class="w-5 h-5" />
            <span class="text-sm">{{ $t('settings.account') }}</span>
          </NuxtLink>

          <NuxtLink
            to="/settings/general"
            class="flex items-center gap-3 px-2 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5" />
            <span class="text-sm">{{ $t('settings.general.title') }}</span>
          </NuxtLink>
        </div>

        <!-- Sign Out -->
        <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            class="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            @click="signOut"
          >
            <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
            <span class="text-sm font-medium">{{ $t('auth.signOut') }}</span>
          </button>
        </div>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
const { t } = useI18n()
const colorMode = useColorMode()
const appConfig = useAppConfig()

// User info from auth
const userName = computed(() => 'nostr:243a7ccb...')
const userIdentifier = computed(() => '243a7ccb...bd005eaf')
const authMethod = computed(() => 'nostr' as 'nostr' | 'password' | 'pin' | null)

// Auth method display
const authMethodColor = computed(() => {
  const colors: Record<string, 'warning' | 'primary' | 'info'> = {
    nostr: 'warning',
    password: 'primary',
    pin: 'info'
  }
  return colors[authMethod.value || 'nostr'] || 'primary'
})

const authMethodIcon = computed(() => {
  const icons: Record<string, string> = {
    nostr: 'i-heroicons-bolt',
    password: 'i-heroicons-key',
    pin: 'i-heroicons-hashtag'
  }
  return icons[authMethod.value || 'nostr'] || 'i-heroicons-user'
})

const authMethodLabel = computed(() => {
  const labels: Record<string, string> = {
    nostr: 'Nostr',
    password: t('auth.passwordAuth'),
    pin: t('auth.pinAuth')
  }
  return labels[authMethod.value || 'nostr'] || ''
})

// Dark mode
const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value: boolean) => {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

// Theme colors
const themeColors = [
  { value: 'red', label: 'Red', class: 'bg-red-500' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
  { value: 'lime', label: 'Lime', class: 'bg-lime-500' },
  { value: 'green', label: 'Green', class: 'bg-green-500' },
  { value: 'emerald', label: 'Emerald', class: 'bg-emerald-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'cyan', label: 'Cyan', class: 'bg-cyan-500' },
  { value: 'sky', label: 'Sky', class: 'bg-sky-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
  { value: 'violet', label: 'Violet', class: 'bg-violet-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'fuchsia', label: 'Fuchsia', class: 'bg-fuchsia-500' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
]

const selectedColor = ref(appConfig.ui?.colors?.primary || 'purple')

const setThemeColor = (color: string) => {
  selectedColor.value = color
  appConfig.ui.colors.primary = color
  // Persist to localStorage
  localStorage.setItem('theme-color', color)
}

// Load saved color on mount
onMounted(() => {
  const savedColor = localStorage.getItem('theme-color')
  if (savedColor) {
    selectedColor.value = savedColor
    appConfig.ui.colors.primary = savedColor
  }
})

// Sign out
const signOut = async () => {
  // TODO: Implement sign out logic
  await navigateTo('/auth/signin')
}
</script>