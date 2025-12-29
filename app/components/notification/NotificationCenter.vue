<script setup lang="ts">
import { useNotifications } from "~/composables/use-notifications";
import type { POSNotification, NotificationPriority } from "~/types";

const notificationsStore = useNotifications();
const { t } = useI18n();
const router = useRouter();

// We use local state for the slideover if it's not controlled globally,
// but the store has `isNotificationCenterOpen`. Let's sync them.
const isOpen = computed({
  get: () => notificationsStore.isNotificationCenterOpen.value,
  set: (value) => (notificationsStore.isNotificationCenterOpen.value = value),
});

const searchQuery = ref("");
const activeTab = ref<"all" | "unread" | "system">("all");

const filteredNotifications = computed(() => {
  let list = notificationsStore.notifications.value;

  // Filter by tab
  if (activeTab.value === "unread") {
    list = list.filter((n) => !n.read);
  } else if (activeTab.value === "system") {
    list = list.filter(
      (n) => n.type === "system_update" || n.type === "system"
    );
  }

  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    list = list.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
    );
  }

  return list;
});

const unreadCount = computed(() => {
  return notificationsStore.notifications.value.filter(
    (n) => !n.read && n.type !== "system_update"
  ).length;
});

const systemUnreadCount = computed(() => {
  return notificationsStore.notifications.value.filter(
    (n) => !n.read && n.type === "system_update"
  ).length;
});

function getIcon(type: string) {
  switch (type) {
    case "payment":
      return "i-heroicons-bolt";
    case "order":
      return "i-heroicons-shopping-bag";
    case "stock":
      return "i-heroicons-archive-box";
    case "loyalty":
      return "i-heroicons-star";
    case "ai_insight":
      return "i-heroicons-sparkles";
    case "alert":
      return "i-heroicons-exclamation-triangle";
    case "system":
      return "i-heroicons-cog-6-tooth";
    case "system_update":
      return "i-heroicons-megaphone";
    default:
      return "i-heroicons-bell";
  }
}

function getColor(type: string, priority?: NotificationPriority) {
  if (priority === "critical")
    return "text-red-500 bg-red-50 dark:bg-red-900/20";
  if (priority === "high")
    return "text-orange-500 bg-orange-50 dark:bg-orange-900/20";

  switch (type) {
    case "payment":
      return "text-green-500 bg-green-50 dark:bg-green-900/20";
    case "order":
      return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
    case "stock":
      return "text-amber-500 bg-amber-50 dark:bg-amber-900/20";
    case "loyalty":
      return "text-purple-500 bg-purple-50 dark:bg-purple-900/20";
    case "ai_insight":
      return "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20";
    case "alert":
      return "text-red-500 bg-red-50 dark:bg-red-900/20";
    case "system":
      return "text-gray-500 bg-gray-50 dark:bg-gray-900/20";
    case "system_update":
      return "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20";
    default:
      return "text-gray-500 bg-gray-50 dark:bg-gray-900/20";
  }
}

function markAsRead(id: string) {
  notificationsStore.markAsRead(id);
}

function markAllAsRead() {
  notificationsStore.markAllAsRead();
}

function clearAll() {
  notificationsStore.clearAll();
}

function deleteNotification(id: string) {
  notificationsStore.deleteNotification(id);
}

function handleNotificationClick(notification: POSNotification) {
  markAsRead(notification.id);
  // Close slideover on click if mobile? Or maybe keep open.
  // If it has a link, we navigate.
  if (notification.actionUrl) {
    router.push(notification.actionUrl);
    isOpen.value = false;
  }
}

const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "";
  }
};
</script>

<template>
  <div>
    <div class="inline-block">
      <!-- Trigger Button (Bell) -->
      <UButton
        variant="ghost"
        color="gray"
        class="relative"
        @click="isOpen = true"
      >
        <UIcon name="i-heroicons-bell" class="w-6 h-6" />

        <!-- Unread Badge -->
        <span
          v-if="notificationsStore.unreadCount.value > 0"
          class="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"
        >
          {{
            notificationsStore.unreadCount.value > 99
              ? "99+"
              : notificationsStore.unreadCount.value
          }}
        </span>
      </UButton>
    </div>
    <!-- Slideover -->
    <USlideover
      v-model:open="isOpen"
      title="Notifications"
      description="Notifications"
    >
      <template #content>
        <div class="flex flex-col h-full bg-white dark:bg-gray-900">
          <!-- Header -->
          <div
            class="px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10"
          >
            <h2
              class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
            >
              <UIcon name="i-heroicons-bell" class="w-5 h-5 text-gray-400" />
              {{ t("notifications.title", "Notifications") }}
            </h2>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="isOpen = false"
            />
          </div>

          <!-- Tabs -->
          <div
            class="p-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800"
          >
            <div class="flex p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
              <button
                v-for="tab in ['all', 'unread', 'system'] as const"
                :key="tab"
                class="flex-1 py-1.5 text-xs font-medium rounded-md transition-all relative"
                :class="
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                "
                @click="activeTab = tab"
              >
                <span class="capitalize">{{ tab }}</span>
                <!-- Tab Badge -->
                <span
                  v-if="tab === 'unread' && unreadCount > 0"
                  class="absolute top-0 right-1 w-2 h-2 bg-red-500 rounded-full"
                ></span>
                <span
                  v-if="tab === 'system' && systemUnreadCount > 0"
                  class="absolute top-0 right-1 w-2 h-2 bg-indigo-500 rounded-full"
                ></span>
              </button>
            </div>

            <!-- Search -->
            <div class="mt-3">
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search..."
                size="sm"
                class="w-full"
              >
                <template #trailing>
                  <UButton
                    v-if="searchQuery !== ''"
                    color="gray"
                    variant="link"
                    icon="i-heroicons-x-mark"
                    :padded="false"
                    @click="searchQuery = ''"
                  />
                </template>
              </UInput>
            </div>
          </div>

          <!-- List -->
          <div
            class="flex-1 overflow-y-auto bg-gray-50/50 divide-y divide-gray-200 dark:divide-gray-800"
          >
            <div
              v-if="filteredNotifications.length === 0"
              class="flex flex-col items-center justify-center h-48 text-gray-400"
            >
              <UIcon
                name="i-heroicons-bell-slash"
                class="w-12 h-12 mb-2 opacity-30"
              />
              <p class="text-sm font-medium">No notifications</p>
              <p class="text-xs opacity-70">You're all caught up!</p>
            </div>

            <TransitionGroup name="list">
              <div
                v-for="notification in filteredNotifications"
                :key="notification.id"
                class="group relative bg-white dark:bg-gray-800 p-4 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                :class="[
                  notification.read
                    ? 'border-gray-100 dark:border-gray-800 opacity-75 hover:opacity-100'
                    : 'border-gray-100 dark:border-gray-800 bg-primary-50/10',
                ]"
                @click="handleNotificationClick(notification)"
              >
                <div class="flex gap-4">
                  <!-- Icon -->
                  <div
                    class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                    :class="getColor(notification.type, notification.priority)"
                  >
                    <UIcon :name="getIcon(notification.type)" class="w-5 h-5" />
                  </div>

                  <!-- Content -->
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start gap-2">
                      <h3
                        class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate pr-6"
                      >
                        {{ notification.title }}
                      </h3>
                      <span
                        class="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap"
                      >
                        {{ formatTime(notification.createdAt) }}
                      </span>
                    </div>

                    <div
                      class="mt-1 text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words"
                      :class="{
                        'line-clamp-2': !notification.message.includes('\n'),
                        'whitespace-pre-line': true,
                      }"
                    >
                      {{ notification.message }}
                    </div>

                    <!-- Metadata Badge -->
                    <div
                      v-if="notification.type === 'system_update'"
                      class="mt-3 flex items-center gap-2"
                    >
                      <UBadge
                        size="xs"
                        color="indigo"
                        variant="subtle"
                        class="rounded-full px-2"
                      >
                        <UIcon
                          name="i-heroicons-shield-check"
                          class="w-3 h-3 mr-1"
                        />
                        Official Announcement
                      </UBadge>
                    </div>
                  </div>

                  <!-- Unread Dot -->
                  <div
                    v-if="!notification.read"
                    class="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-gray-800"
                  ></div>
                </div>

                <!-- Delete Action (On Hover) -->
                <div
                  class="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                >
                  <UButton
                    color="gray"
                    variant="solid"
                    icon="i-heroicons-trash"
                    size="xs"
                    class="rounded-full"
                    @click.stop="deleteNotification(notification.id)"
                  />
                </div>
              </div>
            </TransitionGroup>
          </div>

          <!-- Footer -->
          <div
            v-if="notificationsStore.notifications.value.length > 0"
            class="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <div class="grid grid-cols-2 gap-3">
              <UButton
                block
                variant="soft"
                color="gray"
                size="sm"
                icon="i-heroicons-check-circle"
                @click="markAllAsRead"
              >
                Mark all read
              </UButton>
              <UButton
                block
                variant="ghost"
                color="red"
                size="sm"
                icon="i-heroicons-trash"
                @click="clearAll"
              >
                Clear all
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
