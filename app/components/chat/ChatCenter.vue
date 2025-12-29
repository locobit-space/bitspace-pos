<script setup lang="ts">
/**
 * 💬 Chat Center
 * Main slideover component for employee messaging
 */
import type { ChatContact, ChatConversation } from "~/composables/use-chat";

const { t } = useI18n();
const chat = useChat();

// Local state
const messageInput = ref("");
const showNewChatModal = ref(false);
const showEmojiPicker = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Initialize chat on mount
onMounted(async () => {
  await chat.init();
});

onUnmounted(() => {
  chat.cleanup();
});

// Auto-scroll to bottom when new messages arrive
watch(
  () => chat.activeMessages.value.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop =
          messagesContainer.value.scrollHeight;
      }
    });
  }
);

// Handle sending message
const sendMessage = async () => {
  if (!messageInput.value.trim() || !chat.activeConversation.value) return;

  const recipient = chat.activeConversation.value.participants.find(
    (p) => p.pubkey !== useUsers().currentUser.value?.pubkeyHex
  );

  if (!recipient) return;

  const content = messageInput.value.trim();
  messageInput.value = "";

  await chat.sendMessage(recipient.pubkey, content, recipient.name);
};

// Handle Enter key
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

// Format timestamp
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `Yesterday ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Get other participant in direct chat
const getOtherParticipant = (conversation: ChatConversation) => {
  const currentPubkey = useUsers().currentUser.value?.pubkeyHex;
  return conversation.participants.find((p) => p.pubkey !== currentPubkey);
};

// Check if message is from current user
const isMyMessage = (senderPubkey: string) => {
  return senderPubkey === useUsers().currentUser.value?.pubkeyHex;
};

// Start new chat with selected contact
const startChat = async (contact: ChatContact) => {
  await chat.startNewChat(contact);
  showNewChatModal.value = false;
};

// Simple emojis for quick access
const quickEmojis = ["👍", "❤️", "😊", "🎉", "👏", "🙏", "✅", "💯"];

const insertEmoji = (emoji: string) => {
  messageInput.value += emoji;
  showEmojiPicker.value = false;
};
</script>

<template>
  <USlideover
    v-model:open="chat.isOpen.value"
    :title="t('chat.title', 'Team Chat')"
    :description="t('chat.description', 'Message your team members')"
    side="right"
    :ui="{ content: 'max-w-2xl', body: 'p-0 sm:p-0' }"
  >
    <template #body>
      <div class="flex h-full">
        <!-- Conversation List (Left Side) -->
        <div
          class="w-72 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900/50"
        >
          <!-- Search & New Chat -->
          <div class="p-3 border-b border-gray-200 dark:border-gray-700">
            <div class="flex gap-2">
              <UInput
                v-model="chat.searchQuery.value"
                :placeholder="t('chat.search', 'Search chats...')"
                icon="i-heroicons-magnifying-glass"
                size="sm"
                class="flex-1"
              />
              <UButton
                icon="i-heroicons-plus"
                color="primary"
                size="sm"
                variant="soft"
                @click="showNewChatModal = true"
              />
            </div>
          </div>

          <!-- Conversations -->
          <div class="flex-1 overflow-y-auto">
            <div
              v-if="chat.sortedConversations.value.length === 0"
              class="p-4 text-center"
            >
              <div class="text-4xl mb-2">💬</div>
              <p class="text-sm text-gray-500">
                {{ t("chat.noConversations", "No conversations yet") }}
              </p>
              <UButton
                variant="link"
                size="sm"
                class="mt-2"
                @click="showNewChatModal = true"
              >
                {{ t("chat.startFirst", "Start your first chat") }}
              </UButton>
            </div>

            <div class="divide-y divide-slate-100 dark:divide-slate-800">
              <div
                v-for="conversation in chat.sortedConversations.value"
                :key="conversation.id"
              >
                <button
                  class="w-full text-left p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                  :class="{
                    'bg-primary-50 dark:bg-primary-900/20':
                      chat.activeConversationId.value === conversation.id,
                  }"
                  @click="chat.selectConversation(conversation.id)"
                >
                  <div class="flex items-center gap-3">
                    <!-- Avatar -->
                    <div class="relative flex-shrink-0">
                      <div
                        v-if="conversation.type === 'direct'"
                        class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
                      >
                        {{
                          getOtherParticipant(conversation)?.name?.charAt(0) ||
                          "?"
                        }}
                      </div>
                      <div
                        v-else
                        class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white"
                      >
                        👥
                      </div>
                      <!-- Pinned indicator -->
                      <div
                        v-if="conversation.isPinned"
                        class="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center text-[10px]"
                      >
                        📌
                      </div>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span
                          class="font-medium text-gray-900 dark:text-white truncate"
                          :class="{
                            'font-bold': conversation.unreadCount > 0,
                          }"
                        >
                          {{
                            conversation.type === "direct"
                              ? getOtherParticipant(conversation)?.name
                              : conversation.groupName
                          }}
                        </span>
                        <span
                          class="text-[10px] text-gray-400 whitespace-nowrap"
                        >
                          {{ formatTime(conversation.lastMessage.timestamp) }}
                        </span>
                      </div>
                      <div
                        class="flex items-center justify-between gap-2 mt-0.5"
                      >
                        <p
                          class="text-sm text-gray-500 truncate"
                          :class="{
                            'font-medium text-gray-700 dark:text-gray-300':
                              conversation.unreadCount > 0,
                          }"
                        >
                          {{
                            conversation.lastMessage.content ||
                            t("chat.noMessages", "No messages yet")
                          }}
                        </p>
                        <!-- Unread badge -->
                        <span
                          v-if="conversation.unreadCount > 0"
                          class="flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 text-white text-xs flex items-center justify-center font-medium"
                        >
                          {{
                            conversation.unreadCount > 9
                              ? "9+"
                              : conversation.unreadCount
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Area (Right Side) -->
        <div class="flex-1 flex flex-col bg-white dark:bg-gray-900">
          <!-- Chat Header -->
          <div
            v-if="chat.activeConversation.value"
            class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
              >
                {{
                  getOtherParticipant(
                    chat.activeConversation.value
                  )?.name?.charAt(0) || "?"
                }}
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{
                    chat.activeConversation.value.type === "direct"
                      ? getOtherParticipant(chat.activeConversation.value)?.name
                      : chat.activeConversation.value.groupName
                  }}
                </h3>
                <p class="text-xs text-gray-500">
                  {{ t("chat.online", "Online") }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UButton
                icon="i-heroicons-phone"
                variant="ghost"
                color="gray"
                size="sm"
              />
              <UDropdownMenu
                :items="[
                  [
                    {
                      label: chat.activeConversation.value.isPinned
                        ? t('chat.unpin', 'Unpin')
                        : t('chat.pin', 'Pin'),
                      icon: 'i-heroicons-bookmark',
                      onClick: () => chat.togglePinConversation(chat.activeConversationId.value!),
                    },
                    {
                      label: chat.activeConversation.value.isMuted
                        ? t('chat.unmute', 'Unmute')
                        : t('chat.mute', 'Mute'),
                      icon: 'i-heroicons-bell-slash',
                      onClick: () => chat.toggleMuteConversation(chat.activeConversationId.value!),
                    },
                  ],
                  [
                    {
                      label: t('chat.delete', 'Delete chat'),
                      icon: 'i-heroicons-trash',
                      color: 'red',
                      onClick: () => chat.deleteConversation(chat.activeConversationId.value!),
                    },
                  ],
                ]"
              >
                <UButton
                  icon="i-heroicons-ellipsis-vertical"
                  variant="ghost"
                  color="gray"
                  size="sm"
                />
              </UDropdownMenu>
            </div>
          </div>

          <!-- Messages -->
          <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <!-- No conversation selected -->
            <div
              v-if="!chat.activeConversation.value"
              class="h-full flex flex-col items-center justify-center text-center"
            >
              <div class="text-6xl mb-4">💬</div>
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white mb-2"
              >
                {{ t("chat.selectConversation", "Select a conversation") }}
              </h3>
              <p class="text-sm text-gray-500 max-w-xs">
                {{
                  t(
                    "chat.selectHint",
                    "Choose a conversation from the list or start a new chat with a team member"
                  )
                }}
              </p>
            </div>

            <!-- Messages list -->
            <template v-else>
              <div
                v-for="message in chat.activeMessages.value"
                :key="message.id"
                class="flex"
                :class="{
                  'justify-end': isMyMessage(message.senderPubkey),
                  'justify-start': !isMyMessage(message.senderPubkey),
                }"
              >
                <div
                  class="max-w-[75%] rounded-2xl px-4 py-2"
                  :class="{
                    'bg-primary-500 text-white rounded-br-md': isMyMessage(
                      message.senderPubkey
                    ),
                    'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md':
                      !isMyMessage(message.senderPubkey),
                  }"
                >
                  <!-- Sender name (for non-self messages) -->
                  <p
                    v-if="!isMyMessage(message.senderPubkey)"
                    class="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1"
                  >
                    {{ message.senderName }}
                  </p>
                  <p class="text-sm leading-relaxed whitespace-pre-wrap">
                    {{ message.content }}
                  </p>
                  <div
                    class="flex items-center gap-1 mt-1"
                    :class="{
                      'justify-end': isMyMessage(message.senderPubkey),
                    }"
                  >
                    <span
                      class="text-[10px]"
                      :class="{
                        'text-primary-200': isMyMessage(message.senderPubkey),
                        'text-gray-400': !isMyMessage(message.senderPubkey),
                      }"
                    >
                      {{ formatTime(message.timestamp) }}
                    </span>
                    <!-- Status icons for sent messages -->
                    <UIcon
                      v-if="isMyMessage(message.senderPubkey)"
                      :name="
                        message.status === 'read'
                          ? 'i-heroicons-check-circle-solid'
                          : message.status === 'sent'
                          ? 'i-heroicons-check'
                          : message.status === 'failed'
                          ? 'i-heroicons-exclamation-circle'
                          : 'i-heroicons-clock'
                      "
                      class="w-3 h-3"
                      :class="{
                        'text-primary-200': message.status !== 'failed',
                        'text-red-300': message.status === 'failed',
                      }"
                    />
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div
                v-if="chat.activeMessages.value.length === 0"
                class="h-full flex flex-col items-center justify-center text-center"
              >
                <div class="text-4xl mb-2">👋</div>
                <p class="text-sm text-gray-500">
                  {{ t("chat.startConversation", "Start the conversation!") }}
                </p>
              </div>
            </template>
          </div>

          <!-- Message Input -->
          <div
            v-if="chat.activeConversation.value"
            class="p-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div class="flex items-end gap-2">
              <!-- Emoji picker -->
              <div class="relative">
                <UButton
                  icon="i-heroicons-face-smile"
                  variant="ghost"
                  color="gray"
                  size="sm"
                  @click="showEmojiPicker = !showEmojiPicker"
                />
                <!-- Quick emoji panel -->
                <div
                  v-if="showEmojiPicker"
                  class="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1"
                >
                  <button
                    v-for="emoji in quickEmojis"
                    :key="emoji"
                    class="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl transition-colors"
                    @click="insertEmoji(emoji)"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <!-- Input -->
              <div class="flex-1">
                <UTextarea
                  v-model="messageInput"
                  :placeholder="t('chat.typeMessage', 'Type a message...')"
                  :rows="1"
                  autoresize
                  :maxrows="4"
                  class="w-full"
                  @keydown="handleKeydown"
                />
              </div>

              <!-- Send button -->
              <UButton
                icon="i-heroicons-paper-airplane"
                color="primary"
                :loading="chat.isSending.value"
                :disabled="!messageInput.trim()"
                @click="sendMessage"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </USlideover>

  <!-- New Chat Modal -->
  <UModal v-model:open="showNewChatModal">
    <template #header>
      <h3 class="text-lg font-semibold">{{ t("chat.newChat", "New Chat") }}</h3>
    </template>
    <template #body>
      <div class="p-4">
        <UInput
          :placeholder="t('chat.searchContacts', 'Search team members...')"
          icon="i-heroicons-magnifying-glass"
          class="mb-4"
        />

        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="contact in chat.availableContacts.value"
            :key="contact.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            @click="startChat(contact)"
          >
            <div
              class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
            >
              {{ contact.name.charAt(0) }}
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900 dark:text-white">
                {{ contact.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{
                  contact.isOnline
                    ? t("chat.online", "Online")
                    : t("chat.offline", "Offline")
                }}
              </p>
            </div>
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500': contact.isOnline,
                'bg-gray-400': !contact.isOnline,
              }"
            />
          </div>

          <div
            v-if="chat.availableContacts.value.length === 0"
            class="text-center py-8"
          >
            <div class="text-4xl mb-2">👥</div>
            <p class="text-sm text-gray-500">
              {{ t("chat.noContacts", "No team members available") }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
