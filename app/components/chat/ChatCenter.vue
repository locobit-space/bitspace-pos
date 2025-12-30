<script setup lang="ts">
/**
 * 💬 Chat Center
 * Main slideover component for employee messaging
 */
import type { ChatContact, ChatConversation } from "~/composables/use-chat";

const { t } = useI18n();
const chat = useChat();
const pos = usePOS();

// Local state
const messageInput = ref("");
const showNewChatModal = ref(false);
const showCreateChannelModal = ref(false);
const showEmojiPicker = ref(false);
const messagesContainer = ref<HTMLElement | null>(null);

// Create Channel Form
const newChannelName = ref("");
const newChannelAbout = ref("");
const isCreatingChannel = ref(false);
const isPrivateChannel = ref(false);
const newChannelScope = ref<"shop" | "company" | "department">("shop");
const newChannelTags = ref<string[]>([]);
const newChannelShopId = ref<string | undefined>(undefined);

// Invite Modal
const showInviteModal = ref(false);
const inviteSearchQuery = ref("");

// Get current shop ID
const currentShopId = computed(() => {
  const shop = useShop();
  return shop.currentBranch.value?.id || "";
});

const directMessages = computed(() => {
  return chat.sortedConversations.value.filter((c) => c.type === "direct");
});

// TEMPORARY: Keep old channels computed for backward compatibility
// TODO: Remove after template is fully updated
const channels = computed(() => {
  return chat.sortedConversations.value.filter(
    (c) => c.type === "channel" || c.type === "group"
  );
});

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

  const content = messageInput.value.trim();
  messageInput.value = "";

  if (chat.activeConversation.value.type === "channel") {
    await chat.sendChannelMessage(chat.activeConversation.value.id, content);
  } else {
    const recipient = chat.activeConversation.value.participants.find(
      (p) => p.pubkey !== useUsers().currentUser.value?.pubkeyHex
    );

    if (!recipient) return;

    await chat.sendMessage(recipient.pubkey, content, recipient.name);
  }
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

const createChannel = async () => {
  if (!newChannelName.value.trim()) return;

  isCreatingChannel.value = true;

  // Determine shopId based on scope
  const shopId =
    newChannelScope.value === "shop"
      ? newChannelShopId.value || currentShopId.value
      : undefined;

  await chat.createChannel(
    newChannelName.value,
    newChannelAbout.value,
    isPrivateChannel.value,
    shopId,
    newChannelScope.value,
    newChannelTags.value
  );

  isCreatingChannel.value = false;
  showCreateChannelModal.value = false;

  // Reset form
  newChannelName.value = "";
  newChannelAbout.value = "";
  isPrivateChannel.value = false;
  newChannelScope.value = "shop";
  newChannelTags.value = [];
  newChannelShopId.value = undefined;
};

const inviteUser = async (user: ChatContact) => {
  if (!chat.activeConversationId.value) return;

  await chat.inviteToChannel(chat.activeConversationId.value, user.pubkey);
  showInviteModal.value = false;
  // Optional: show toast notification
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
          <div
            class="p-3 border-b border-gray-200 dark:border-gray-700 space-y-2"
          >
            <div class="flex gap-2">
              <UInput
                v-model="chat.searchQuery.value"
                :placeholder="t('chat.search', 'Search...')"
                icon="i-heroicons-magnifying-glass"
                size="sm"
                class="flex-1"
              />
            </div>
            <div class="flex gap-2">
              <UButton
                block
                icon="i-heroicons-hashtag"
                color="gray"
                size="sm"
                variant="solid"
                class="flex-1"
                @click="showCreateChannelModal = true"
              >
                {{ t("chat.newChannel", "New Channel") }}
              </UButton>
              <UButton
                block
                icon="i-heroicons-user-plus"
                color="primary"
                size="sm"
                variant="solid"
                class="flex-1"
                @click="showNewChatModal = true"
              >
                {{ t("chat.newDM", "New DM") }}
              </UButton>
            </div>
          </div>

          <!-- Conversations -->
          <div class="flex-1 overflow-y-auto p-2 space-y-4">
            <!-- Channels Section -->
            <div v-if="channels.length > 0 || chat.searchQuery.value">
              <h4
                class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                {{ t("chat.channels", "Channels") }}
              </h4>
              <div class="space-y-1">
                <button
                  v-for="conversation in channels"
                  :key="conversation.id"
                  class="w-full text-left p-2 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                  :class="{
                    'bg-primary-50 dark:bg-primary-900/20':
                      chat.activeConversationId.value === conversation.id,
                  }"
                  @click="chat.selectConversation(conversation.id)"
                >
                  <div class="flex items-center gap-2">
                    <div
                      class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400"
                    >
                      <UIcon
                        v-if="conversation.isPrivate"
                        name="i-heroicons-lock-closed"
                        class="w-4 h-4"
                      />
                      <span v-else>#</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span
                          class="font-medium text-sm text-gray-900 dark:text-white truncate"
                        >
                          {{ conversation.groupName }}
                        </span>
                        <span
                          v-if="conversation.unreadCount > 0"
                          class="flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary-500 text-white text-[10px] px-1 flex items-center justify-center font-bold"
                        >
                          {{
                            conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  v-if="channels.length === 0 && chat.searchQuery.value"
                  class="px-2 text-sm text-gray-400"
                >
                  {{ t("chat.noChannelsFound", "No channels found") }}
                </div>
              </div>
            </div>

            <!-- DMs Section -->
            <div>
              <h4
                class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2"
              >
                {{ t("chat.directMessages", "Direct Messages") }}
              </h4>
              <div class="space-y-1">
                <button
                  v-for="conversation in directMessages"
                  :key="conversation.id"
                  class="w-full text-left p-2 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                  :class="{
                    'bg-primary-50 dark:bg-primary-900/20':
                      chat.activeConversationId.value === conversation.id,
                  }"
                  @click="chat.selectConversation(conversation.id)"
                >
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div
                        class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold"
                      >
                        {{
                          getOtherParticipant(conversation)?.name?.charAt(0) ||
                          "?"
                        }}
                      </div>
                      <div
                        v-if="conversation.isPinned"
                        class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full flex items-center justify-center text-[8px]"
                      >
                        📌
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span
                          class="font-medium text-sm text-gray-900 dark:text-white truncate"
                        >
                          {{ getOtherParticipant(conversation)?.name }}
                        </span>
                        <span class="text-[10px] text-gray-400">
                          {{ formatTime(conversation.lastMessage.timestamp) }}
                        </span>
                      </div>
                      <div class="flex items-center justify-between mt-0.5">
                        <p class="text-xs text-gray-500 truncate max-w-[120px]">
                          {{ conversation.lastMessage.content }}
                        </p>
                        <span
                          v-if="conversation.unreadCount > 0"
                          class="flex-shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary-500 text-white text-[10px] px-1 flex items-center justify-center font-bold"
                        >
                          {{
                            conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
                <div
                  v-if="directMessages.length === 0"
                  class="px-2 text-sm text-gray-400 italic"
                >
                  {{ t("chat.noDMs", "No direct messages") }}
                </div>
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
                v-if="chat.activeConversation.value.type === 'direct'"
                class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold"
              >
                {{
                  getOtherParticipant(
                    chat.activeConversation.value
                  )?.name?.charAt(0) || "?"
                }}
              </div>
              <div
                v-else
                class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold"
              >
                <UIcon
                  v-if="chat.activeConversation.value.isPrivate"
                  name="i-heroicons-lock-closed"
                  class="w-5 h-5"
                />
                <span v-else>#</span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{
                    chat.activeConversation.value.type === "direct"
                      ? getOtherParticipant(chat.activeConversation.value)?.name
                      : chat.activeConversation.value.groupName
                  }}
                </h3>
                <p
                  v-if="chat.activeConversation.value.type === 'direct'"
                  class="text-xs text-gray-500"
                >
                  {{ t("chat.online", "Online") }}
                </p>
                <p
                  v-else-if="chat.activeConversation.value.isPrivate"
                  class="text-xs text-gray-500 flex items-center gap-1"
                >
                  <UIcon name="i-heroicons-lock-closed" class="w-3 h-3" />
                  {{ t("chat.privateChannel", "Private Channel") }}
                </p>
                <p v-else class="text-xs text-gray-500">
                  {{ t("chat.channel", "Public Channel") }}
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1">
              <UButton
                v-if="chat.activeConversation.value.type === 'direct'"
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
                  ...(chat.activeConversation.value.isPrivate && chat.activeConversation.value.key ? [{
                    label: t('chat.invite', 'Invite Member'),
                    icon: 'i-heroicons-user-plus',
                    onClick: () => showInviteModal = true
                  }] : []),
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
                v-for="(message, index) in chat.activeMessages.value"
                :key="message.id"
                class="flex flex-col"
                :class="{
                  'items-end': isMyMessage(message.senderPubkey),
                  'items-start': !isMyMessage(message.senderPubkey),
                  'mt-1':
                    index > 0 &&
                    chat.activeMessages.value?.[index - 1]?.senderPubkey ===
                      message.senderPubkey,
                  'mt-4':
                    index > 0 &&
                    chat.activeMessages.value?.[index - 1]?.senderPubkey !==
                      message.senderPubkey,
                }"
              >
                <!-- Sender Name (only in channels/groups and not me) -->
                <span
                  v-if="
                    !isMyMessage(message.senderPubkey) &&
                    chat.activeConversation.value.type !== 'direct' &&
                    (index === 0 ||
                      chat.activeMessages.value?.[index - 1]?.senderPubkey !==
                        message.senderPubkey)
                  "
                  class="text-xs text-gray-500 mb-1 ml-1"
                >
                  {{ message.senderName }}
                </span>

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
                  <p class="text-sm leading-relaxed whitespace-pre-wrap">
                    {{ message.content }}
                  </p>
                  <div
                    class="flex items-center gap-1 mt-1 opacity-70"
                    :class="{
                      'justify-end': isMyMessage(message.senderPubkey),
                    }"
                  >
                    <span class="text-[10px]">
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
                    />
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div
                v-if="chat.activeMessages.value.length === 0"
                class="h-full flex flex-col items-center justify-center text-center opacity-50"
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
                  class="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1 z-10"
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
                  :placeholder="
                    'Message ' +
                    (chat.activeConversation.value.type === 'direct'
                      ? getOtherParticipant(chat.activeConversation.value)
                          ?.name || ''
                      : '#' + chat.activeConversation.value.groupName)
                  "
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
          class="mb-4 w-full"
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

  <!-- Create Channel Modal -->
  <UModal v-model:open="showCreateChannelModal">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t("chat.createChannel", "Create Channel") }}
      </h3>
    </template>
    <template #body>
      <div class="p-4 space-y-4">
        <UFormField :label="t('chat.channelName', 'Channel Name')" required>
          <UInput
            v-model="newChannelName"
            placeholder="e.g. general, support"
            icon="i-heroicons-hashtag"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('chat.description', 'Description')">
          <UTextarea
            v-model="newChannelAbout"
            placeholder="What is this channel about?"
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center gap-2">
          <UCheckbox
            v-model="isPrivateChannel"
            :label="t('chat.privateChannel', 'Private Channel')"
          />
          <div class="text-xs text-gray-500">
            {{
              t("chat.privateHint", "Only invited members can read messages.")
            }}
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            color="gray"
            variant="ghost"
            @click="showCreateChannelModal = false"
          >
            {{ t("common.cancel", "Cancel") }}
          </UButton>
          <UButton
            color="primary"
            :loading="isCreatingChannel"
            :disabled="!newChannelName.trim()"
            @click="createChannel"
          >
            {{ t("chat.create", "Create") }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Invite Member Modal -->
  <UModal v-model:open="showInviteModal">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ t("chat.inviteToChannel", "Invite to Channel") }}
      </h3>
    </template>
    <template #body>
      <div class="p-4">
        <UInput
          v-model="inviteSearchQuery"
          :placeholder="t('chat.searchContacts', 'Search team members...')"
          icon="i-heroicons-magnifying-glass"
          class="mb-4"
        />

        <div class="space-y-2 max-h-80 overflow-y-auto">
          <div
            v-for="contact in chat.availableContacts.value"
            :key="contact.id"
            class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            @click="inviteUser(contact)"
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
            </div>
            <UButton
              size="xs"
              color="gray"
              variant="ghost"
              icon="i-heroicons-plus"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
