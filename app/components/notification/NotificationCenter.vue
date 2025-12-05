<template>
  <UPopover
    :ui="{
      content:
        'w-80 p-0 backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 rounded-2xl shadow-2xl border-white/20 dark:border-gray-700/50 overflow-hidden',
    }"
  >
    <!-- Bell Button - styled like sidebar nav items -->
    <button
      class="flex p-2 w-full transition-all px-3 justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 items-center group relative"
    >
      <span class="relative">
        <Icon name="i-heroicons-bell" size="24" :class="{ 'animate-pulse text-primary-500': unreadCount > 0 }" />
        <!-- Unread badge -->
        <span
          v-if="unreadCount > 0"
          class="absolute -top-2 -right-2 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-lg animate-bounce"
        >
          {{ unreadCount > 99 ? "99+" : unreadCount }}
        </span>
      </span>
      <!-- Tooltip -->
      <span
        class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50"
      >
        {{ $t("notifications.title") }}
      </span>
    </button>

    <template #content>
      <!-- Header -->
      <div
        class="flex items-center justify-between px-4 py-3 bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
      >
        <div class="flex items-center gap-2">
          <Icon name="i-heroicons-bell" size="18" class="text-primary-500" />
          <span class="font-semibold text-gray-900 dark:text-white">
            {{ $t("notifications.title") }}
          </span>
          <UBadge
            v-if="unreadCount > 0"
            :label="String(unreadCount)"
            size="xs"
            color="primary"
          />
        </div>
        <div class="flex items-center gap-1">
          <UButton
            v-if="unreadCount > 0"
            icon="i-heroicons-check-circle"
            variant="ghost"
            size="xs"
            :title="$t('notifications.markAllRead')"
            @click="markAllAsRead"
          />
          <UButton
            v-if="notifications.length > 0"
            icon="i-heroicons-trash"
            variant="ghost"
            size="xs"
            color="error"
            :title="$t('notifications.clearAll')"
            @click="clearAll"
          />
        </div>
      </div>

      <!-- Notification List -->
      <div class="max-h-96 overflow-y-auto">
        <!-- Empty State -->
        <div v-if="notifications.length === 0" class="p-8 text-center">
          <Icon
            name="i-heroicons-bell-slash"
            size="48"
            class="text-gray-300 dark:text-gray-600 mx-auto mb-3"
          />
          <p class="text-gray-500 dark:text-gray-400">
            {{ $t("notifications.empty") }}
          </p>
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
          <div
            v-for="notification in notifications"
            :key="notification.id"
            class="group p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
            :class="{
              'bg-primary-50/50 dark:bg-primary-900/10': !notification.read,
              'bg-red-50/50 dark:bg-red-900/10': notification.priority === 'critical' && !notification.read,
              'bg-orange-50/50 dark:bg-orange-900/10': notification.priority === 'high' && !notification.read,
            }"
            @click="handleNotificationClick(notification)"
          >
            <div class="flex items-start gap-3">
              <!-- Icon with priority ring -->
              <div
                class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative"
                :class="[getIconBgClass(notification.type, notification.priority)]"
              >
                <Icon
                  :name="getIcon(notification.type)"
                  size="20"
                  :class="getIconClass(notification.type, notification.priority)"
                />
                <!-- Priority indicator -->
                <span
                  v-if="notification.priority === 'critical'"
                  class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"
                />
                <span
                  v-else-if="notification.priority === 'high'"
                  class="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <p
                      class="font-medium text-gray-900 dark:text-white text-sm truncate"
                      :class="{
                        'text-red-600 dark:text-red-400': notification.priority === 'critical',
                        'text-orange-600 dark:text-orange-400': notification.priority === 'high',
                      }"
                    >
                      {{ notification.title }}
                    </p>
                    <!-- Priority badge -->
                    <UBadge
                      v-if="notification.priority && notification.priority !== 'low'"
                      :label="$t(`notifications.priority.${notification.priority}`)"
                      size="xs"
                      :color="getPriorityColor(notification.priority)"
                    />
                  </div>
                  <UButton
                    icon="i-heroicons-x-mark"
                    variant="ghost"
                    size="xs"
                    class="opacity-0 group-hover:opacity-100 shrink-0"
                    @click.stop="deleteNotification(notification.id)"
                  />
                </div>
                <p
                  class="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2"
                >
                  {{ notification.message }}
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {{ formatTime(notification.createdAt) }}
                </p>
              </div>

              <!-- Unread indicator -->
              <div
                v-if="!notification.read"
                class="shrink-0 w-2 h-2 rounded-full"
                :class="{
                  'bg-red-500': notification.priority === 'critical',
                  'bg-orange-500': notification.priority === 'high',
                  'bg-primary-500': !notification.priority || notification.priority === 'low' || notification.priority === 'medium',
                }"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div
        v-if="notifications.length > 0"
        class="p-3 border-t border-gray-200 dark:border-gray-700"
      >
        <NuxtLinkLocale
          to="/notifications"
          class="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
        >
          <Icon name="i-heroicons-arrow-right" size="16" />
          {{ $t("notifications.viewAll") }}
        </NuxtLinkLocale>
      </div>
    </template>
  </UPopover>
</template>

<script setup lang="ts">
import type { POSNotification, NotificationPriority } from "~/types";

const { t } = useI18n();
const router = useRouter();
const {
  notifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
} = useNotifications();

// Handle notification click - mark as read and navigate if has actionUrl
function handleNotificationClick(notification: POSNotification) {
  markAsRead(notification.id);
  if (notification.actionUrl) {
    router.push(notification.actionUrl);
  }
}

// Icon helpers
function getIcon(type: POSNotification["type"]): string {
  const icons: Record<POSNotification["type"], string> = {
    payment: "i-heroicons-bolt",
    order: "i-heroicons-shopping-bag",
    stock: "i-heroicons-archive-box",
    loyalty: "i-heroicons-star",
    ai_insight: "i-heroicons-sparkles",
    alert: "i-heroicons-exclamation-triangle",
    system: "i-heroicons-cog-6-tooth",
  };
  return icons[type] || "i-heroicons-bell";
}

function getIconClass(type: POSNotification["type"], priority?: NotificationPriority): string {
  // Override colors for high priority
  if (priority === 'critical') return "text-red-600 dark:text-red-400";
  if (priority === 'high') return "text-orange-600 dark:text-orange-400";

  const classes: Record<POSNotification["type"], string> = {
    payment: "text-green-600 dark:text-green-400",
    order: "text-blue-600 dark:text-blue-400",
    stock: "text-yellow-600 dark:text-yellow-400",
    loyalty: "text-purple-600 dark:text-purple-400",
    ai_insight: "text-cyan-600 dark:text-cyan-400",
    alert: "text-orange-600 dark:text-orange-400",
    system: "text-gray-600 dark:text-gray-400",
  };
  return classes[type] || "text-gray-600 dark:text-gray-400";
}

function getIconBgClass(type: POSNotification["type"], priority?: NotificationPriority): string {
  // Override colors for high priority
  if (priority === 'critical') return "bg-red-100 dark:bg-red-900/30";
  if (priority === 'high') return "bg-orange-100 dark:bg-orange-900/30";

  const classes: Record<POSNotification["type"], string> = {
    payment: "bg-green-100 dark:bg-green-900/30",
    order: "bg-blue-100 dark:bg-blue-900/30",
    stock: "bg-yellow-100 dark:bg-yellow-900/30",
    loyalty: "bg-purple-100 dark:bg-purple-900/30",
    ai_insight: "bg-cyan-100 dark:bg-cyan-900/30",
    alert: "bg-orange-100 dark:bg-orange-900/30",
    system: "bg-gray-100 dark:bg-gray-800",
  };
  return classes[type] || "bg-gray-100 dark:bg-gray-800";
}

function getPriorityColor(priority: NotificationPriority): 'red' | 'orange' | 'yellow' | 'gray' {
  const colors: Record<NotificationPriority, 'red' | 'orange' | 'yellow' | 'gray'> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'gray',
  };
  return colors[priority] || 'gray';
}

// Format relative time
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("time.justNow");
  if (minutes < 60) return t("time.minutesAgo", { count: minutes });
  if (hours < 24) return t("time.hoursAgo", { count: hours });
  if (days < 7) return t("time.daysAgo", { count: days });

  return date.toLocaleDateString();
}
</script>
